/**
 * Video Uniquifier — FFmpeg-based video fingerprint randomization.
 * Ported from AutoSocial/src/video-uniquifier.js.
 *
 * Makes each copy of a video unique at the binary/pixel level so platforms
 * don't flag it as a duplicate repost.
 */
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import os from 'os';

// --- Helpers ---

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function run(bin: string, args: string[], maxBuffer = 50 * 1024 * 1024): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { maxBuffer }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${bin} failed: ${error.message}\n${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

// --- Public API ---

export async function checkFfmpeg(): Promise<boolean> {
  try {
    await run('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

export async function getVideoInfo(inputPath: string): Promise<any> {
  const { stdout } = await run('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    inputPath,
  ], 10 * 1024 * 1024);
  return JSON.parse(stdout);
}

// --- Filter builders ---

function buildMetadataArgs(): string[] {
  const now = new Date();
  const fakeDate = new Date(
    now.getTime() + randInt(-365, 365) * 86400000 + randInt(-23, 23) * 3600000
  );

  const titles = [
    '',
    `clip_${crypto.randomBytes(8).toString('hex')}`,
    `VID_${randInt(20200101, 20261231)}_${randInt(100000, 999999)}`,
    `IMG_${randInt(1000, 9999)}`,
  ];

  const encoders = [
    `Lavf ${randInt(57, 61)}.${randInt(10, 99)}.${randInt(100, 999)}`,
    `HandBrake ${randInt(1, 2)}.${randInt(0, 8)}.${randInt(0, 4)}`,
    '',
  ];

  return [
    '-metadata', `title=${pick(titles)}`,
    '-metadata', `comment=${crypto.randomBytes(12).toString('hex')}`,
    '-metadata', `creation_time=${fakeDate.toISOString()}`,
    '-metadata', `encoder=${pick(encoders)}`,
    '-metadata', 'description=',
    '-metadata', 'artist=',
  ];
}

export interface UniquifyOptions {
  extendDuration?: boolean;
  freezeFrames?: boolean;
  colorShift?: boolean;
  hueShift?: boolean;
  channelMix?: boolean;
  noise?: boolean;
  pixelShift?: boolean;
  colorOverlay?: boolean;
  audioPitch?: boolean;
  audioEq?: boolean;
  audioReverb?: boolean;
  volumeShift?: boolean;
  audioFilter?: boolean;
  removeAudio?: boolean;
}

function buildVideoFilters(options: UniquifyOptions = {}): string[] {
  const filters: string[] = [];

  if (options.extendDuration !== false) {
    filters.push(`setpts=PTS/${randFloat(0.97, 0.995).toFixed(4)}`);
  }
  if (options.freezeFrames !== false) {
    filters.push(`tpad=start_duration=${randFloat(0.05, 0.3).toFixed(2)}:start_mode=clone:stop_duration=${randFloat(0.05, 0.3).toFixed(2)}:stop_mode=clone`);
  }
  if (options.colorShift !== false) {
    filters.push(
      `eq=brightness=${randFloat(-0.03, 0.03).toFixed(3)}` +
      `:contrast=${randFloat(0.97, 1.03).toFixed(3)}` +
      `:saturation=${randFloat(0.95, 1.05).toFixed(3)}` +
      `:gamma=${randFloat(0.97, 1.03).toFixed(3)}`
    );
  }
  if (options.hueShift !== false) {
    filters.push(`hue=h=${randFloat(-4, 4).toFixed(2)}:s=${randFloat(0.96, 1.04).toFixed(3)}`);
  }
  if (options.channelMix !== false) {
    const rr = randFloat(0.97, 1.0).toFixed(3);
    const rg = randFloat(0.0, 0.02).toFixed(3);
    const rb = randFloat(0.0, 0.02).toFixed(3);
    const gr = randFloat(0.0, 0.02).toFixed(3);
    const gg = randFloat(0.97, 1.0).toFixed(3);
    const gb = randFloat(0.0, 0.02).toFixed(3);
    const br = randFloat(0.0, 0.02).toFixed(3);
    const bg = randFloat(0.0, 0.02).toFixed(3);
    const bb = randFloat(0.97, 1.0).toFixed(3);
    filters.push(`colorchannelmixer=${rr}:${rg}:${rb}:0:${gr}:${gg}:${gb}:0:${br}:${bg}:${bb}:0`);
  }
  if (options.noise !== false) {
    filters.push(`noise=alls=${randInt(1, 3)}:allf=t`);
  }
  if (options.pixelShift !== false) {
    const px = randInt(1, 2);
    filters.push(`crop=iw-${px * 2}:ih-${px * 2}:${px}:${px}`);
    filters.push(`pad=iw+${px * 2}:ih+${px * 2}:${px}:${px}:black`);
  }
  if (options.colorOverlay !== false) {
    filters.push(
      `colorbalance=rs=${randFloat(-0.04, 0.04).toFixed(3)}` +
      `:gs=${randFloat(-0.04, 0.04).toFixed(3)}` +
      `:bs=${randFloat(-0.04, 0.04).toFixed(3)}`
    );
  }

  // Ensure even dimensions + standard pixel format
  filters.push('crop=trunc(iw/2)*2:trunc(ih/2)*2');
  filters.push('format=yuv420p');

  return filters;
}

function buildAudioFilters(options: UniquifyOptions = {}): string[] {
  const filters: string[] = [];

  if (options.extendDuration !== false) {
    filters.push(`atempo=${randFloat(0.97, 0.995).toFixed(4)}`);
  }
  if (options.audioPitch !== false) {
    const dir = Math.random() > 0.5 ? 1 : -1;
    const pct = randFloat(1.5, 3.5);
    const rate = Math.round(44100 * (1 + (dir * pct / 100)));
    filters.push(`asetrate=${rate}`);
    filters.push('aresample=44100');
  }
  if (options.audioEq !== false) {
    filters.push(`bass=g=${randFloat(-2.5, 2.5).toFixed(1)}:f=80`);
    filters.push(`equalizer=f=1000:t=h:w=500:g=${randFloat(-2, 2).toFixed(1)}`);
    filters.push(`treble=g=${randFloat(-2.5, 2.5).toFixed(1)}:f=5000`);
  }
  if (options.audioReverb !== false) {
    filters.push(`aecho=0.8:0.8:${randInt(10, 35)}:${randFloat(0.04, 0.12).toFixed(3)}`);
  }
  if (options.volumeShift !== false) {
    filters.push(`volume=${randFloat(0.95, 1.05).toFixed(3)}`);
  }
  if (options.audioFilter !== false) {
    filters.push(`highpass=f=${randInt(15, 40)}`);
    filters.push(`lowpass=f=${randInt(16000, 19000)}`);
  }

  return filters;
}

function buildEncodingArgs(options: UniquifyOptions = {}): string[] {
  const args: string[] = [];

  args.push('-c:v', 'libx264');
  args.push('-crf', String(randInt(23, 27)));
  args.push('-preset', pick(['fast', 'medium']));
  args.push('-profile:v', pick(['high', 'main']));
  args.push('-maxrate', '2M');
  args.push('-bufsize', '4M');

  const x264Params = [
    `ref=${randInt(2, 5)}`,
    `bframes=${randInt(2, 4)}`,
    `keyint=${randInt(120, 300)}`,
    `scenecut=${randInt(30, 45)}`,
    `aq-mode=${randInt(1, 3)}`,
    `aq-strength=${randFloat(0.8, 1.3).toFixed(2)}`,
  ];
  args.push('-x264-params', x264Params.join(':'));

  const maxThreads = Math.max(2, Math.floor(os.cpus().length / 2));
  args.push('-threads', String(maxThreads));

  if (!options.removeAudio) {
    args.push('-c:a', 'aac');
    args.push('-b:a', `${pick([96, 128, 160])}k`);
    args.push('-ar', '44100');
    args.push('-ac', '2');
  }

  return args;
}

// --- Main ---

export interface UniquifyResult {
  outputPath: string;
  modifications: string[];
}

export async function uniquifyVideo(
  inputPath: string,
  outputPath: string,
  options: UniquifyOptions = {}
): Promise<UniquifyResult> {
  const resolvedInput = path.resolve(inputPath);
  await fs.access(resolvedInput);

  const resolvedOutput = path.resolve(outputPath);
  const removeAudio = options.removeAudio === true;

  const args = ['-y', '-i', resolvedInput];

  const vFilters = buildVideoFilters(options);
  const aFilters = removeAudio ? [] : buildAudioFilters(options);

  if (vFilters.length > 0) args.push('-vf', vFilters.join(','));
  if (!removeAudio && aFilters.length > 0) args.push('-af', aFilters.join(','));

  const encArgs = buildEncodingArgs(options);
  args.push(...encArgs);

  if (removeAudio) args.push('-an');

  const metaArgs = buildMetadataArgs();
  args.push(...metaArgs);
  args.push('-map_metadata', '-1');
  args.push('-fflags', '+bitexact');
  args.push('-movflags', '+faststart');
  args.push(resolvedOutput);

  await run('ffmpeg', args);

  const modifications = [
    'extend-duration', 'freeze-frames', 'color-shift', 'hue-shift',
    'channel-mix', 'noise', 'pixel-shift', 'color-balance',
    ...(removeAudio ? ['audio-removed'] : ['pitch-shift', '3-band-eq', 'echo', 'volume-shift', 'freq-bounds']),
    're-encode', 'metadata-randomize',
  ];

  return { outputPath: resolvedOutput, modifications };
}
