// The Kidventuro motion studio: renders studio posts into a narrated vertical
// video, a Pinterest pin and a QA contact sheet, and (on `build --upload`)
// stores the finished media in Cloudinary so the publisher only posts it.
//
//   node src/studio/studio.mjs validate content/queue/2026-W41.json
//   node src/studio/studio.mjs preview  content/queue/2026-W41.json [--id kv-...]
//   node src/studio/studio.mjs build    content/queue/2026-W41.json --upload
//
// Narration needs STUDIO_TTS_PYTHON (a Python with kokoro-onnx) plus
// KOKORO_MODEL and KOKORO_VOICES; without them videos render silent of voice,
// music and effects only, and are not given an AI label.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { contactSheet, ensureSfx, renderStill, renderVideo } from './engine.mjs';
import { ENGINE_VERSION, contentHash, validateBatch, validatePost } from './schema.mjs';
import * as theme from './kid-theme.mjs';
import { loadDestinations } from '../destinations.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const autopilotRoot = path.resolve(here, '..', '..');
const repositoryRoot = path.resolve(autopilotRoot, '..');
export { contentHash, ENGINE_VERSION };

export async function loadConfig() {
  return JSON.parse(await fs.readFile(path.join(autopilotRoot, 'config.json'), 'utf8'));
}

export async function destinationSet() {
  return new Set((await loadDestinations(repositoryRoot)).map((entry) => entry.slug));
}

export function selectAudioClip(key, config) {
  const tracks = config.audio?.tracks || [];
  if (!tracks.length) throw new Error('No audio tracks configured');
  const digest = crypto.createHash('sha256').update(String(key)).digest();
  const rangeMilliseconds = Math.max(1, Math.floor((config.audio.excerptStartRangeSeconds || 60) * 1000));
  return { track: tracks[digest.readUInt8(4) % tracks.length], startSeconds: (digest.readUInt32BE(0) % rangeMilliseconds) / 1000 };
}

export function ttsAvailable() {
  return Boolean(process.env.STUDIO_TTS_PYTHON && process.env.KOKORO_MODEL && process.env.KOKORO_VOICES);
}

function narrate(post, assets, outDir, config) {
  if (post.ai?.voice !== 'synthetic' || !ttsAvailable()) return null;
  const lines = theme.voiceLines(post, assets.names);
  const request = { voice: config.voice?.name || 'af_heart', speed: config.voice?.speed || 1.0, out: outDir, lines };
  const result = spawnSync(process.env.STUDIO_TTS_PYTHON, [path.join(here, 'tts.py')], {
    input: JSON.stringify(request), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: process.env
  });
  if (result.status !== 0) throw new Error(`Narration failed: ${result.stderr.slice(-800)}`);
  const { seconds } = JSON.parse(result.stdout);
  return seconds.map((value, index) => ({ path: path.join(outDir, `voice-${index}.wav`), seconds: value, text: lines[index] }));
}

export function sampleTimes(timeline) {
  return timeline.scenes.map((scene) => scene.start + Math.max(0.3, Math.min(scene.duration * 0.8, scene.duration - 0.25)));
}

export async function renderPost({ post, outDir, config, withSheet = true }) {
  const errors = validatePost(post, { destinations: await destinationSet() });
  if (errors.length) throw new Error(`Post is invalid:\n  ${errors.join('\n  ')}`);
  await fs.mkdir(outDir, { recursive: true });
  const assets = await theme.prepareAssets(post);
  const voice = narrate(post, assets, outDir, config);
  const timeline = theme.buildScenes(post, assets, config, voice);
  const sfx = await ensureSfx(path.join(autopilotRoot, '.tmp', 'sfx'));
  const clip = selectAudioClip(post.id, config);
  const musicPath = path.join(autopilotRoot, 'assets', 'audio', clip.track);
  let music = null;
  try {
    await fs.access(musicPath);
    // The bed sits lower under a narrator; sidechain ducking does the rest.
    music = { path: musicPath, start: clip.startSeconds, volume: voice ? 0.3 : 0.42 };
  } catch {
    console.warn(`Music track ${clip.track} missing; rendering with effects only`);
  }
  const videoPath = path.join(outDir, 'video.mp4');
  const video = await renderVideo({
    duration: timeline.duration,
    drawFrame: theme.frameDrawer(post, assets, timeline),
    audio: { music, sfx: theme.soundDesign(timeline, sfx), voice: theme.voiceTrack(timeline) },
    outPath: videoPath,
    samples: withSheet ? sampleTimes(timeline) : []
  });
  const coverPath = await renderStill({ width: 1000, height: 1500, outPath: path.join(outDir, 'cover.jpg'), draw: (ctx) => theme.drawPin(ctx, post, assets, config) });
  const sheetPath = withSheet ? await contactSheet({ stills: video.stills, outPath: path.join(outDir, 'sheet.jpg') }) : null;
  if (voice) await fs.writeFile(path.join(outDir, 'narration.txt'), voice.map((line) => `${line.seconds}s  ${line.text}`).join('\n'), 'utf8');
  return { videoPath, coverPath, sheetPath, duration: timeline.duration, scenes: timeline.scenes.length, music: clip.track, voiced: Boolean(voice) };
}

const sha256File = async (file) => crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');

async function main() {
  const [command, file, ...rest] = process.argv.slice(2);
  const option = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };
  if (!command || !file) {
    console.error('usage: studio.mjs <validate|preview|build> <batch.json> [--id <post id>] [--upload]');
    process.exit(2);
  }
  const config = await loadConfig();
  const batch = JSON.parse(await fs.readFile(file, 'utf8'));
  const posts = (batch.posts || []).filter((post) => !option('--id') || post.id === option('--id'));
  const errors = validateBatch({ kind: batch.kind, posts }, { destinations: await destinationSet() });
  if (errors.length) {
    console.error(`${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  const { hunspellAvailable, spellcheckPosts } = await import('./spellcheck.mjs');
  if (hunspellAvailable({ dictionary: 'en_US' })) {
    const unknown = await spellcheckPosts(posts, autopilotRoot);
    if (unknown.length) {
      console.error(`Spelling: ${unknown.length} word(s) not in the dictionary or content/spell-allow.txt:`);
      for (const { word, posts: ids } of unknown) console.error(`  ${word}  (${ids.join(', ')})`);
      if (command === 'build' && !rest.includes('--allow-spelling')) process.exit(1);
    } else {
      console.log('Spelling: clean');
    }
  } else if (command === 'build') {
    console.error('Spelling: hunspell with en_US is not installed here - pass --allow-spelling to build anyway');
    if (!rest.includes('--allow-spelling')) process.exit(1);
  }
  if (command === 'validate') {
    console.log(`${posts.length} post(s) valid`);
    return;
  }
  if (command === 'build' && !ttsAvailable()) console.warn('Narration: TTS is not configured; voiced posts render without voice');
  const outRoot = path.join(autopilotRoot, 'out', 'studio');
  let store = null;
  if (command === 'build' && rest.includes('--upload')) {
    const { CloudinaryStore } = await import('../cloudinary.mjs');
    const { requiredEnv } = await import('../utils.mjs');
    store = new CloudinaryStore({
      cloudName: requiredEnv('CLOUDINARY_CLOUD_NAME'),
      apiKey: requiredEnv('CLOUDINARY_API_KEY'),
      apiSecret: requiredEnv('CLOUDINARY_API_SECRET')
    });
  }
  let rendered = 0;
  for (const post of posts) {
    const hash = contentHash(post);
    // A voiced post rendered without its voice is re-rendered once TTS exists.
    const wantsVoice = post.ai?.voice === 'synthetic' && ttsAvailable();
    if (command === 'build' && post.media?.contentHash === hash && (!wantsVoice || post.media.voice) && !rest.includes('--force')) {
      console.log(`${post.id}: media current, skipped`);
      continue;
    }
    const started = Date.now();
    const result = await renderPost({ post, outDir: path.join(outRoot, post.id), config });
    rendered += 1;
    console.log(`${post.id}: ${result.duration.toFixed(1)} s, ${result.scenes} scenes, voice ${result.voiced ? 'yes' : 'no'}, rendered in ${((Date.now() - started) / 1000).toFixed(1)} s`);
    if (store) {
      const prefix = `kidventuro-social/studio/${post.id}`;
      const [video, cover] = await Promise.all([
        store.uploadFile({ filePath: result.videoPath, publicId: `${prefix}/video`, resourceType: 'video' }),
        store.uploadFile({ filePath: result.coverPath, publicId: `${prefix}/cover`, resourceType: 'image' })
      ]);
      post.media = {
        video, cover, contentHash: hash, engine: ENGINE_VERSION, durationSeconds: result.duration, voice: result.voiced,
        sha256: { video: await sha256File(result.videoPath), cover: await sha256File(result.coverPath) },
        renderedAt: new Date().toISOString()
      };
      await fs.writeFile(file, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
      console.log(`${post.id}: uploaded`);
    }
  }
  console.log(`done: ${rendered} rendered`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.stack || error.message); process.exit(1); });
}
