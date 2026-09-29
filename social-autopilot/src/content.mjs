// Chooses what a slot publishes and turns a studio post into platform copy.
//
// Order: this week's queue (content/queue/*.json - written and proofread in
// weekly batches, usually with finished, narrated media already in
// Cloudinary), then the evergreen bank (content/evergreen.json) so a missing
// batch never means a missing post. Both are pure functions of the date and
// slot, so every runner picks the same post without shared state.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiDisclosure, contentHash, validatePost } from './studio/schema.mjs';
import { truncate } from './utils.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const autopilotRoot = path.resolve(here, '..');
export const SLOT_ORDER = ['morning', 'afternoon', 'evening'];

export function dayIndexFor(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
  return Math.floor(Date.UTC(get('year'), get('month') - 1, get('day')) / 86_400_000);
}

export async function loadQueuePosts(root = autopilotRoot) {
  const directory = path.join(root, 'content', 'queue');
  let files = [];
  try { files = (await fs.readdir(directory)).filter((name) => name.endsWith('.json')).sort(); } catch { return []; }
  const posts = [];
  for (const name of files) {
    const batch = JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'));
    for (const post of batch.posts || []) posts.push({ ...post, batchFile: name });
  }
  return posts;
}

export async function loadEvergreen(root = autopilotRoot) {
  const batch = JSON.parse(await fs.readFile(path.join(root, 'content', 'evergreen.json'), 'utf8'));
  return batch.posts || [];
}

export function pickPost({ queuePosts, evergreen, dateKey, slot, dayIndex, destinations = null }) {
  const scheduled = queuePosts.find((post) => post.date === dateKey && post.slot === slot);
  if (scheduled) {
    const errors = validatePost(scheduled, { requireSchedule: true, destinations });
    if (!errors.length) return { post: scheduled, source: 'queue' };
    console.warn(`Queue post ${scheduled.id} is invalid, using the evergreen bank instead:\n  ${errors.join('\n  ')}`);
  }
  if (!evergreen.length) throw new Error('Evergreen bank is empty');
  const slotIndex = Math.max(0, SLOT_ORDER.indexOf(slot));
  return { post: evergreen[(dayIndex * SLOT_ORDER.length + slotIndex) % evergreen.length], source: 'evergreen' };
}

const withTags = (text, tags) => (tags.length ? `${text.trim()}\n\n${tags.join(' ')}` : text.trim());

export function buildCaptions(post) {
  const tags = post.hashtags || [];
  return {
    tiktok: withTags(post.caption.tiktok, tags.slice(0, 5)),
    instagram: withTags(post.caption.instagram, tags.slice(0, 8)),
    pinterest: {
      title: truncate(post.caption.pinterest.title, 100),
      description: truncate(post.caption.pinterest.description, 500)
    }
  };
}

// Where a pin leads: the destination page when the post is about one place.
export function destinationUrl(post, config) {
  const place = post.destination || post.scenes.find((scene) => scene.type === 'booklet')?.destination;
  return place ? `${config.siteUrl}destinations/${encodeURIComponent(place)}.html` : config.siteUrl;
}

export async function generateContent({ slot, date, config, destinations = null, root = autopilotRoot }) {
  const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const dayIndex = dayIndexFor(date, config.timezone);
  const { post, source } = pickPost({ queuePosts: await loadQueuePosts(root), evergreen: await loadEvergreen(root), dateKey, slot, dayIndex, destinations });
  // Finished media is used only while it still matches this exact post.
  const media = post.media && post.media.contentHash === contentHash(post) ? post.media : null;
  const captions = buildCaptions(post);
  const disclosure = aiDisclosure(post, { voiceRendered: Boolean(media?.voice) });
  return {
    generator: `studio-${source}`,
    theme: post.format,
    seed: { format: post.format, bankId: post.id, source },
    post,
    media,
    ai: { ...disclosure, textAssisted: post.ai?.text === 'assisted' },
    instagram: { caption: captions.instagram, altText: truncate(`${post.caption.pinterest.title} – Kidventuro`, 250) },
    pinterest: captions.pinterest,
    tiktok: { caption: captions.tiktok },
    productUrl: destinationUrl(post, config),
    pinterestBoard: post.pinterestBoard || null
  };
}
