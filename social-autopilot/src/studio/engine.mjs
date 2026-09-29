// Frame-by-frame video renderer. A theme supplies drawFrame(ctx, seconds);
// this draws every frame on one canvas, streams raw pixels into ffmpeg, and
// mixes music, sound effects and an optional voice track in the same pass.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createCanvas } from '@napi-rs/canvas';
import ffmpegStatic from 'ffmpeg-static';

export function ffmpegBinary() {
  const binary = process.env.FFMPEG_PATH?.trim() || ffmpegStatic;
  if (!binary) throw new Error('FFmpeg binary is unavailable');
  return binary;
}

export function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegBinary(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(stderr) : reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-1500)}`))));
  });
}

// Sound effects are synthesised, not downloaded: no licence question, no
// network fetch, identical on every runner. Generated once per cache dir.
const SFX = {
  whoosh: 'anoisesrc=d=0.45:c=pink:a=0.6:r=48000,highpass=f=350,lowpass=f=4200,afade=t=in:d=0.18,afade=t=out:st=0.18:d=0.27:curve=exp',
  pop: 'sine=f=740:d=0.09:r=48000,afade=t=out:d=0.09:curve=exp,volume=0.8',
  ding: 'sine=f=1318:d=0.6:r=48000,afade=t=out:d=0.6:curve=exp,volume=0.6',
  boom: 'sine=f=58:d=0.55:r=48000,afade=t=out:d=0.55:curve=exp,volume=1.6',
  tick: 'sine=f=2100:d=0.03:r=48000,afade=t=out:d=0.03,volume=0.5'
};

export async function ensureSfx(cacheDir) {
  await fs.mkdir(cacheDir, { recursive: true });
  const out = {};
  for (const [name, filter] of Object.entries(SFX)) {
    const file = path.join(cacheDir, `sfx-${name}.wav`);
    try { await fs.access(file); } catch {
      await runFfmpeg(['-y', '-f', 'lavfi', '-i', filter, '-ac', '2', '-ar', '48000', file]);
    }
    out[name] = file;
  }
  return out;
}

/**
 * @param {object} options
 * @param {number} options.duration seconds
 * @param {(ctx, seconds) => void} options.drawFrame
 * @param {{ music?: {path, start, volume}, voice?: {path, at}[], sfx?: {path, at, volume}[] }} options.audio
 * @param {number[]} [options.samples] seconds at which to keep a still (for QA sheets)
 */
export async function renderVideo({ width = 1080, height = 1920, fps = 30, duration, drawFrame, audio = {}, outPath, samples = [] }) {
  if (!(duration > 0)) throw new Error(`Invalid video duration ${duration}`);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const frames = Math.round(duration * fps);

  const inputs = ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-r', String(fps), '-i', '-'];
  const filters = [];
  const mixLabels = [];
  let index = 1;

  if (audio.music) {
    inputs.push('-ss', Number(audio.music.start || 0).toFixed(3), '-stream_loop', '-1', '-i', audio.music.path);
    filters.push(`[${index}:a]atrim=duration=${duration.toFixed(3)},asetpts=N/SR/TB,aformat=sample_rates=48000:channel_layouts=stereo,volume=${audio.music.volume ?? 0.5}[music]`);
    index += 1;
  }
  const voiceLabels = [];
  for (const clip of audio.voice || []) {
    inputs.push('-i', clip.path);
    const ms = Math.round(clip.at * 1000);
    filters.push(`[${index}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}|${ms},volume=${clip.volume ?? 1.25}[v${index}]`);
    voiceLabels.push(`[v${index}]`);
    index += 1;
  }
  for (const effect of audio.sfx || []) {
    inputs.push('-i', effect.path);
    const ms = Math.round(effect.at * 1000);
    filters.push(`[${index}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}|${ms},volume=${effect.volume ?? 0.35}[s${index}]`);
    mixLabels.push(`[s${index}]`);
    index += 1;
  }
  if (voiceLabels.length) {
    filters.push(`${voiceLabels.join('')}amix=inputs=${voiceLabels.length}:normalize=0,asplit=2[voice][voicekey]`);
    mixLabels.push('[voice]');
    if (audio.music) {
      // Duck the music under the narrator instead of fighting it.
      filters.push('[music][voicekey]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=350[ducked]');
      mixLabels.push('[ducked]');
    } else {
      filters.push('[voicekey]anullsink');
    }
  } else if (audio.music) {
    mixLabels.push('[music]');
  }

  const fade = Math.min(0.6, duration / 8);
  let audioMap = [];
  if (mixLabels.length) {
    filters.push(`${mixLabels.join('')}amix=inputs=${mixLabels.length}:normalize=0:duration=longest,atrim=duration=${duration.toFixed(3)},loudnorm=I=-14:TP=-1.5:LRA=9,afade=t=in:d=0.15,afade=t=out:st=${(duration - fade).toFixed(3)}:d=${fade.toFixed(3)},aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[aout]`);
    audioMap = ['-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000'];
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const args = [
    '-y', ...inputs,
    ...(filters.length ? ['-filter_complex', filters.join(';')] : []),
    '-map', '0:v', ...audioMap,
    '-t', duration.toFixed(3),
    '-c:v', 'libx264', '-preset', process.env.STUDIO_X264_PRESET || 'medium', '-crf', '19',
    '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(fps), '-g', String(fps * 2),
    '-movflags', '+faststart', outPath
  ];

  const child = spawn(ffmpegBinary(), args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); if (stderr.length > 20000) stderr = stderr.slice(-8000); });
  const closed = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg encode failed (${code}): ${stderr.slice(-1500)}`))));
  });
  let broken = null;
  child.stdin.on('error', (error) => { broken = error; });

  const wanted = [...samples].sort((a, b) => a - b);
  const stills = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const seconds = frame / fps;
    ctx.save();
    drawFrame(ctx, seconds);
    ctx.restore();
    while (wanted.length && wanted[0] <= seconds) {
      wanted.shift();
      stills.push({ seconds, png: await canvas.encode('png') });
    }
    if (broken) break;
    // canvas.data() is a live view of the pixels; copy before the next frame draws.
    if (!child.stdin.write(Buffer.from(canvas.data()))) {
      await new Promise((resolve) => child.stdin.once('drain', resolve));
    }
  }
  child.stdin.end();
  await closed;
  if (broken) throw broken;
  return { outPath, frames, duration, stills };
}

export async function renderStill({ width, height, draw, outPath, quality = 90 }) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  await draw(ctx);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const data = await canvas.encode('jpeg', quality);
  await fs.writeFile(outPath, data);
  return outPath;
}

// A single JPEG of sampled frames, so a person (or a reviewing session) can
// check a whole video's text and framing at a glance before it is posted.
export async function contactSheet({ stills, outPath, columns = 4, thumbWidth = 360 }) {
  const { loadImage } = await import('@napi-rs/canvas');
  if (!stills.length) return null;
  const thumbHeight = Math.round(thumbWidth * 16 / 9);
  const rows = Math.ceil(stills.length / columns);
  const gap = 12;
  const canvas = createCanvas(columns * (thumbWidth + gap) + gap, rows * (thumbHeight + gap) + gap);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const [i, still] of stills.entries()) {
    const image = await loadImage(still.png);
    const x = gap + (i % columns) * (thumbWidth + gap);
    const y = gap + Math.floor(i / columns) * (thumbHeight + gap);
    ctx.drawImage(image, x, y, thumbWidth, thumbHeight);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, 86, 30);
    ctx.fillStyle = '#fff';
    ctx.font = '600 20px sans-serif';
    ctx.fillText(`${still.seconds.toFixed(1)}s`, x + 8, y + 22);
  }
  await fs.writeFile(outPath, await canvas.encode('jpeg', 82));
  return outPath;
}
