/**
 * Local speech-to-text for reels/videos — no external API key.
 *
 * Uses:
 *   - ffmpeg-static (bundled ffmpeg binary) to extract a 16kHz mono PCM stream
 *   - @huggingface/transformers Whisper (default Xenova/whisper-tiny) to transcribe
 *
 * Override model via WHISPER_MODEL (e.g. Xenova/whisper-base, Xenova/whisper-small).
 * The model is downloaded on first use and cached under node_modules/.cache.
 */
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { createHash } from 'crypto';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import prisma from '../../config/database';
import { analyzeTranscript } from './ai.service';

const MODEL = () => process.env.WHISPER_MODEL || 'Xenova/whisper-tiny';

const VIDEO_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/mov', 'video/mpeg']);
const AUDIO_MIME = new Set(['audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/webm', 'audio/ogg']);

export function isVideoMime(mime?: string): boolean {
  if (!mime) return false;
  return VIDEO_MIME.has(mime) || AUDIO_MIME.has(mime);
}

/** Cache the pipeline promise so the model loads once per process. */
let pipelinePromise: Promise<any> | null = null;

async function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      console.log(`[transcription] Loading Whisper model ${MODEL()}...`);
      const asr = await pipeline('automatic-speech-recognition', MODEL(), {
        dtype: 'fp32',
        progress_callback: undefined,
      });
      console.log('[transcription] Whisper model ready');
      return asr;
    })();
  }
  return pipelinePromise;
}

/** Extract a 16kHz mono float32 PCM stream from any audio/video buffer via ffmpeg. */
async function extractAudioPcm(buffer: Buffer): Promise<Float32Array> {
  // Write to a temp file first: ffmpeg can't seek a pipe, and MP4/MOV often have
  // the moov atom at the end of the file (so pipe:0 input fails silently).
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mismo-stt-'));
  const input = path.join(tmpDir, 'input.bin');
  try {
    await fs.writeFile(input, buffer);

    return await new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath!, [
        '-hide_banner', '-loglevel', 'error',
        '-i', input,
        '-vn', // drop video
        '-ac', '1', // mono
        '-ar', '16000', // 16 kHz
        '-f', 'f32le', // raw 32-bit float little-endian PCM
        'pipe:1',
      ], { stdio: ['ignore', 'pipe', 'pipe'] });

      const chunks: Buffer[] = [];
      ffmpeg.stdout.on('data', (c: Buffer) => chunks.push(c));
      ffmpeg.on('error', reject);
      ffmpeg.on('close', (code) => {
        if (code !== 0) return reject(new Error(`ffmpeg exited with code ${code}`));
        const out = Buffer.concat(chunks);
        const floats = new Float32Array(out.buffer, out.byteOffset, Math.floor(out.length / 4));
        resolve(floats);
      });
    });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export interface TranscriptionResult {
  transcript: string | null;
  hasSpeech: boolean;
}

/** Transcribe an audio/video buffer. Returns null transcript when no speech detected. */
export async function transcribeBuffer(buffer: Buffer): Promise<TranscriptionResult> {
  const pcm = await extractAudioPcm(buffer);
  if (pcm.length < 1600) { // < 0.1s — nothing to transcribe
    return { transcript: null, hasSpeech: false };
  }

  const asr = await getPipeline();
  const out = await asr(pcm, {
    language: 'italian',
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  const text = (out?.text || '').trim();
  return { transcript: text || null, hasSpeech: !!text };
}

/** Stable fingerprint of media to avoid re-transcribing unchanged content. */
export function mediaFingerprint(contactId: number, url: string): string {
  return createHash('md5').update(`${contactId}:${url}`).digest('hex').slice(0, 16);
}

/**
 * Transcribe a post's reel/video media, save the transcript, then run the AI analysis
 * (actors, themes, trend) and store it on the post. Finally enqueue a brief refresh.
 */
export async function transcribePostMedia(postId: number): Promise<void> {
  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      contactId: true,
      content: true,
      postType: true,
      mediaUrls: true,
      metadata: true,
    },
  });
  if (!post) return;

  // Gather candidate video URLs: primary media + per-platform overrides
  const candidates: { url: string; mime?: string }[] = [];
  for (const url of (post.mediaUrls as string[] | undefined) || []) {
    candidates.push({ url });
  }
  const pm = (post.metadata as any)?.platformMedia as Record<string, { mediaUrls?: string[]; coverImageUrl?: string }> | undefined;
  if (pm) {
    for (const entry of Object.values(pm)) {
      for (const url of entry?.mediaUrls || []) candidates.push({ url });
    }
  }

  if (!candidates.length) return;

  // Only transcribe when it looks like a reel/video post OR the URL has a video extension
  const looksVideo = post.postType === 'REEL'
    || candidates.some(c => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(c.url))
    || candidates.some(c => (c.mime && isVideoMime(c.mime)));

  if (!looksVideo) return;

  const { downloadFromR2 } = await import('./r2.service');

  let transcript: string | null = null;
  let lastError = '';
  for (const c of candidates.slice(0, 3)) {
    try {
      const buf = await downloadFromR2(c.url);
      const res = await transcribeBuffer(buf);
      if (res.transcript) {
        transcript = res.transcript;
        break;
      }
    } catch (err: any) {
      lastError = err.message;
    }
  }

  if (!transcript) {
    console.warn(`[transcription] No speech for post ${postId}: ${lastError || 'empty transcript'}`);
    await prisma.socialPost.update({
      where: { id: postId },
      data: { mediaTranscript: '', mediaAiAnalysis: { hasSpeech: false } },
    });
    return;
  }

  // Save raw transcript immediately (before AI analysis)
  await prisma.socialPost.update({
    where: { id: postId },
    data: { mediaTranscript: transcript },
  });

  // AI analysis: actors, themes, trend
  let analysis: any = { hasSpeech: true };
  try {
    analysis = await analyzeTranscript(post.contactId, transcript, post.content);
  } catch (err: any) {
    console.error('[transcription] AI analysis failed', err.message);
    analysis = { hasSpeech: true, summary: transcript.slice(0, 200) };
  }

  await prisma.socialPost.update({
    where: { id: postId },
    data: { mediaAiAnalysis: { hasSpeech: true, ...analysis } },
  });

  console.log(`[transcription] Post ${postId} transcribed (${transcript.length} chars)`);

  // Enqueue a brief refresh so the new knowledge lands in the client brief
  try {
    const { briefRefreshQueue } = await import('../../queues');
    await briefRefreshQueue.add('refresh', { contactId: post.contactId }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 30_000 },
      jobId: `brief-${post.contactId}`,
    });
  } catch (_) { /* worker not running */ }
}
