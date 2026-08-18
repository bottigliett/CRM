/**
 * Video processing helpers (FFmpeg): convert to MP4 + extract a cover frame.
 * Used for TikTok publishing (which requires MP4/H.264) and for generating
 * reel/video cover thumbnails shown in the calendar.
 */
import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

function run(bin: string, args: string[], maxBuffer = 64 * 1024 * 1024): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { maxBuffer }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`${bin} failed: ${error.message}\n${stderr?.slice(0, 500)}`));
        return;
      }
      resolve();
    });
  });
}

async function withTempFiles<T>(input: Buffer, ext: string, outExt: string, fn: (inputPath: string, outputPath: string) => Promise<T>): Promise<T> {
  const id = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const inPath = path.join(os.tmpdir(), `vp-in-${id}${ext}`);
  const outPath = path.join(os.tmpdir(), `vp-out-${id}${outExt}`);
  await fs.writeFile(inPath, input);
  try {
    return await fn(inPath, outPath);
  } finally {
    await fs.unlink(inPath).catch(() => {});
    await fs.unlink(outPath).catch(() => {});
  }
}

/**
 * Convert a video buffer to MP4 (H.264 + AAC, faststart). Returns the input
 * untouched if it is already an .mp4. TikTok only accepts MP4.
 */
export async function convertToMp4(input: Buffer, ext: string): Promise<Buffer> {
  if (ext.toLowerCase() === '.mp4') return input;
  return withTempFiles(input, ext, '.mp4', async (inPath, outPath) => {
    await run('ffmpeg', [
      '-y', '-i', inPath,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      outPath,
    ]);
    return fs.readFile(outPath);
  });
}

/**
 * Extract the first frame of a video as a JPEG cover. Returns null on failure
 * (e.g. no ffmpeg or unreadable video) so callers can fall back gracefully.
 */
export async function extractVideoThumbnail(input: Buffer, ext: string): Promise<Buffer | null> {
  try {
    return await withTempFiles(input, ext, '.jpg', async (inPath, outPath) => {
      await run('ffmpeg', [
        '-y', '-ss', '0', '-i', inPath,
        '-frames:v', '1', '-q:v', '2',
        outPath,
      ]);
      return fs.readFile(outPath);
    });
  } catch (err: any) {
    console.warn('[video-processing] thumbnail extraction failed:', err?.message || err);
    return null;
  }
}

export async function isVideoMimetype(mimetype: string): Promise<boolean> {
  return /^video\//i.test(mimetype || '');
}
