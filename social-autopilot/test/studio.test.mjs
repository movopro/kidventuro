import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenize } from '../src/studio/canvas-kit.mjs';
import { aiDisclosure, contentHash, validateBatch, validatePost } from '../src/studio/schema.mjs';
import { buildScenes, voiceLines, voiceTrack } from '../src/studio/kid-theme.mjs';
import { buildCaptions, destinationUrl, pickPost } from '../src/content.mjs';
import { dueSlot } from '../src/slots.mjs';
import { loadDestinations } from '../src/destinations.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const evergreen = JSON.parse(fs.readFileSync(path.join(root, 'content', 'evergreen.json'), 'utf8'));
const queueDir = path.join(root, 'content', 'queue');
const queueFiles = fs.existsSync(queueDir) ? fs.readdirSync(queueDir).filter((name) => name.endsWith('.json')) : [];
const destinationList = await loadDestinations(path.resolve(root, '..'));
const destinations = new Set(destinationList.map((entry) => entry.slug));
const names = Object.fromEntries(destinationList.map((entry) => [entry.slug, entry.name]));

const sample = (format) => structuredClone(evergreen.posts.find((post) => !format || post.format === format));

test('the evergreen bank is valid, varied and big enough for five days', () => {
  assert.equal(evergreen.kind, 'evergreen');
  assert.deepEqual(validateBatch(evergreen, { destinations }), []);
  assert.ok(evergreen.posts.length >= 15, `only ${evergreen.posts.length} evergreen posts`);
  assert.ok(new Set(evergreen.posts.map((post) => post.format)).size >= 6, 'evergreen needs at least six formats');
});

test('every queued batch is valid and names real destinations', () => {
  for (const name of queueFiles) {
    const batch = JSON.parse(fs.readFileSync(path.join(queueDir, name), 'utf8'));
    assert.deepEqual(validateBatch(batch, { destinations }), [], name);
  }
});

test('validation catches a made-up destination and on-screen emoji', () => {
  const post = sample('guess');
  post.scenes.find((scene) => scene.type === 'answer').destination = 'atlantis';
  assert.match(validatePost(post, { destinations }).join('\n'), /unknown destination atlantis/);
  const emoji = sample();
  emoji.hook.text = 'Road trip 🚗';
  assert.match(validatePost(emoji).join('\n'), /emoji/);
});

test('the narrator says every part once, in order, and speaks web addresses', () => {
  const post = sample();
  const lines = voiceLines(post, names);
  assert.equal(lines.length, post.scenes.length + 2);
  assert.ok(lines.every((line) => line && !line.includes('*')), 'no markup is read aloud');
  const url = sample();
  url.outro = { text: 'More at kidventuro.com' };
  assert.match(voiceLines(url, names).at(-1), /Kidventuro dot com/);
});

test('scenes stretch to fit the narration and carry their voice clip', () => {
  const post = sample();
  const count = post.scenes.length + 2;
  const silent = buildScenes(post, { names });
  const voice = Array.from({ length: count }, (_, i) => ({ path: `v${i}.wav`, seconds: 9 }));
  const voiced = buildScenes(post, { names }, {}, voice);
  assert.equal(voiceTrack(silent).length, 0);
  assert.equal(voiceTrack(voiced).length, count);
  for (const scene of voiced.scenes) assert.ok(scene.duration >= 9, 'a scene is never shorter than its line');
  assert.ok(voiced.duration > silent.duration);
  for (const [i, scene] of voiced.scenes.entries()) assert.ok(scene.voice.at >= scene.start, `line ${i} starts inside its scene`);
});

test('a missed slot is dropped once the next one opens', () => {
  const slots = Object.entries({ morning: 9, afternoon: 14, evening: 18 });
  const none = () => false;
  assert.equal(dueSlot(slots, 8, none), null);
  assert.equal(dueSlot(slots, 13, none), 'morning');
  assert.equal(dueSlot(slots, 14, none), 'afternoon');
  assert.equal(dueSlot(slots, 20, none), 'evening');
});

test('queued posts win; picks are deterministic and differ per slot', () => {
  const queued = { ...sample(), id: 'q-1', date: '2026-10-01', slot: 'afternoon' };
  assert.equal(pickPost({ queuePosts: [queued], evergreen: evergreen.posts, dateKey: '2026-10-01', slot: 'afternoon', dayIndex: 3 }).source, 'queue');
  const args = { queuePosts: [], evergreen: evergreen.posts, dateKey: '2026-10-01', dayIndex: 20_362 };
  const picks = ['morning', 'afternoon', 'evening'].map((slot) => pickPost({ ...args, slot }).post.id);
  assert.equal(new Set(picks).size, 3);
});

test('pins link to the destination page when the post is about one place', () => {
  const config = { siteUrl: 'https://kidventuro.com/' };
  const booklet = sample('booklet');
  assert.match(destinationUrl(booklet, config), /^https:\/\/kidventuro\.com\/destinations\/[a-z-]+\.html$/);
  assert.equal(destinationUrl({ scenes: [] }, config), 'https://kidventuro.com/');
});

test('the AI label follows the voice actually rendered', () => {
  const post = { ai: { text: 'assisted', visuals: 'template', voice: 'synthetic' } };
  assert.equal(aiDisclosure(post, { voiceRendered: true }).label, true);
  assert.equal(aiDisclosure(post, { voiceRendered: false }).label, false);
  assert.equal(aiDisclosure({ ai: { text: 'assisted', visuals: 'template', voice: 'none' } }).label, false);
});

test('captions cap TikTok at five hashtags; media goes stale when the script changes', () => {
  const post = sample();
  post.hashtags = ['#a1', '#b2', '#c3', '#d4', '#e5', '#f6'];
  assert.equal((buildCaptions(post).tiktok.match(/#/g) || []).length, 5);
  const edited = structuredClone(post);
  edited.scenes[0].say = 'A different spoken line.';
  assert.notEqual(contentHash(edited), contentHash(post), 'a new narration line must re-render');
  assert.equal(contentHash({ ...post, caption: { ...post.caption, tiktok: 'x' } }), contentHash(post));
});

test('accent markers survive trailing punctuation', () => {
  assert.deepEqual(tokenize('the *window seat*.').map((token) => token.accent), [false, true, true]);
});

test('spelling: hyphenated parts reported by hunspell still honour the allow list', async () => {
  const { spellcheckPosts } = await import('../src/studio/spellcheck.mjs');
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'spell-'));
  await fs.mkdir(path.join(dir, 'content'));
  await fs.writeFile(path.join(dir, 'content', 'spell-allow.txt'), 'deckers\n');
  // A fake dictionary that behaves like hunspell: it flags the part, not the whole.
  const check = (dictionary, list) => list.flatMap((word) => word.split('-')).filter((part) => ['deckers', 'teh'].includes(part));
  const post = { id: 'p1', hook: { text: 'Red double-deckers and teh bus' }, scenes: [], outro: { text: 'Bye' }, caption: {} };
  const unknown = await spellcheckPosts([post], dir, { check });
  assert.deepEqual(unknown.map((entry) => entry.word), ['teh']);
  assert.deepEqual(unknown[0].posts, ['p1']);
});