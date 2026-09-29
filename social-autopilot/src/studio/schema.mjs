// Validates Kidventuro studio posts before anything is rendered or published:
// known formats and scene types, destinations that exist in the catalogue, no
// emoji on screen (the video font has none), caption limits per platform, and
// a spoken line for every scene the narrator reads.
import crypto from 'node:crypto';

export const ENGINE_VERSION = 'kid-studio-1';
export const FORMATS = ['top3', 'didyouknow', 'wouldyourather', 'guess', 'myth', 'pov', 'tips', 'booklet'];
export const SLOTS = ['morning', 'afternoon', 'evening'];
const SCENE_TYPES = ['rank', 'fact', 'text', 'choice', 'items', 'claim', 'verdict', 'clue', 'answer', 'chat', 'booklet'];
const LIMITS = { tiktok: 2200, instagram: 2200, pinterestTitle: 100, pinterestDescription: 500 };
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

function check(errors, condition, message) {
  if (!condition) errors.push(message);
}

function onScreen(errors, where, text, { required = true } = {}) {
  if (text == null || text === '') {
    if (required) errors.push(`${where}: text is required`);
    return;
  }
  check(errors, typeof text === 'string', `${where}: text must be a string`);
  check(errors, !EMOJI.test(text), `${where}: emoji cannot be drawn on screen ("${text}")`);
  check(errors, (text.match(/\*/g) || []).length % 2 === 0, `${where}: unbalanced *accent* markers`);
  check(errors, !/\s{2,}/.test(text), `${where}: double spaces`);
}

export function validatePost(post, { requireSchedule = false, destinations = null } = {}) {
  const errors = [];
  const id = post?.id || '(no id)';
  const knownPlace = (key) => !destinations || destinations.has(key);
  check(errors, typeof post?.id === 'string' && /^[a-z0-9-]+$/.test(post.id), `${id}: id must be lower-case letters, digits and dashes`);
  check(errors, FORMATS.includes(post?.format), `${id}: unknown format ${post?.format}`);
  if (requireSchedule || post?.date || post?.slot) {
    check(errors, /^\d{4}-\d{2}-\d{2}$/.test(post?.date || ''), `${id}: date must be YYYY-MM-DD`);
    check(errors, SLOTS.includes(post?.slot), `${id}: slot must be one of ${SLOTS.join(', ')}`);
  }
  onScreen(errors, `${id} hook`, post?.hook?.text);
  onScreen(errors, `${id} hook kicker`, post?.hook?.kicker, { required: false });
  check(errors, Array.isArray(post?.scenes) && post.scenes.length >= 1 && post.scenes.length <= 8, `${id}: needs 1-8 scenes`);
  onScreen(errors, `${id} outro`, post?.outro?.text);
  onScreen(errors, `${id} outro sub`, post?.outro?.sub, { required: false });
  if (post?.destination !== undefined) check(errors, knownPlace(post.destination), `${id}: unknown destination ${post.destination}`);

  for (const [i, scene] of (post?.scenes || []).entries()) {
    const where = `${id} scene ${i + 1} (${scene?.type})`;
    check(errors, SCENE_TYPES.includes(scene?.type), `${where}: unknown scene type`);
    if (scene?.destination !== undefined) check(errors, knownPlace(scene.destination), `${where}: unknown destination ${scene.destination}`);
    if (scene?.say !== undefined) check(errors, typeof scene.say === 'string' && scene.say.trim().length > 0, `${where}: say must be text`);
    switch (scene?.type) {
      case 'rank':
        check(errors, [1, 2, 3, 4, 5].includes(scene.rank), `${where}: rank must be 1-5`);
        onScreen(errors, `${where} title`, scene.title);
        onScreen(errors, where, scene.text);
        break;
      case 'choice':
        onScreen(errors, `${where} a`, scene.a);
        onScreen(errors, `${where} b`, scene.b);
        break;
      case 'items':
        check(errors, Array.isArray(scene.items) && scene.items.length >= 1 && scene.items.length <= 3, `${where}: 1-3 items per scene`);
        for (const item of scene.items || []) onScreen(errors, where, item);
        onScreen(errors, `${where} title`, scene.title, { required: false });
        break;
      case 'verdict':
        check(errors, ['myth', 'fact'].includes(scene.verdict), `${where}: verdict must be myth or fact`);
        onScreen(errors, where, scene.text);
        break;
      case 'answer':
        check(errors, typeof scene.destination === 'string', `${where}: answer needs a destination`);
        onScreen(errors, where, scene.text);
        break;
      case 'chat':
        check(errors, Array.isArray(scene.messages) && scene.messages.length >= 1 && scene.messages.length <= 6, `${where}: 1-6 messages`);
        for (const message of scene.messages || []) {
          check(errors, ['kid', 'parent'].includes(message.from), `${where}: message.from must be kid or parent`);
          onScreen(errors, where, message.text);
        }
        onScreen(errors, `${where} title`, scene.title, { required: false });
        onScreen(errors, `${where} status`, scene.status, { required: false });
        break;
      case 'booklet':
        check(errors, typeof scene.destination === 'string', `${where}: booklet needs a destination`);
        onScreen(errors, `${where} child`, scene.child, { required: false });
        onScreen(errors, where, scene.text, { required: false });
        break;
      default:
        onScreen(errors, where, scene?.text);
        onScreen(errors, `${where} kicker`, scene?.kicker, { required: false });
    }
  }

  const caption = post?.caption || {};
  for (const platform of ['tiktok', 'instagram']) {
    check(errors, typeof caption[platform] === 'string' && caption[platform].trim().length > 0, `${id}: caption.${platform} is required`);
    check(errors, (caption[platform] || '').length <= LIMITS[platform], `${id}: caption.${platform} is over ${LIMITS[platform]} characters`);
  }
  check(errors, typeof caption.pinterest?.title === 'string' && caption.pinterest.title.length > 0, `${id}: caption.pinterest.title is required`);
  check(errors, (caption.pinterest?.title || '').length <= LIMITS.pinterestTitle, `${id}: Pinterest title over ${LIMITS.pinterestTitle} characters`);
  check(errors, typeof caption.pinterest?.description === 'string' && caption.pinterest.description.length > 0, `${id}: caption.pinterest.description is required`);
  check(errors, (caption.pinterest?.description || '').length <= LIMITS.pinterestDescription, `${id}: Pinterest description over ${LIMITS.pinterestDescription} characters`);
  const tags = post?.hashtags || [];
  check(errors, Array.isArray(tags) && tags.length >= 3 && tags.length <= 8, `${id}: 3-8 hashtags`);
  for (const tag of tags) check(errors, /^#[\p{L}\p{N}_]+$/u.test(tag), `${id}: malformed hashtag ${tag}`);
  const ai = post?.ai || {};
  check(errors, ['assisted', 'none'].includes(ai.text), `${id}: ai.text must be assisted or none`);
  check(errors, ['template', 'generated', 'photo'].includes(ai.visuals), `${id}: ai.visuals must be template, photo or generated`);
  check(errors, ['none', 'synthetic'].includes(ai.voice), `${id}: ai.voice must be none or synthetic`);
  return errors;
}

// Platform AI disclosure: synthetic media a viewer could take as real -
// generated visuals, or the narrator's synthetic voice when the video actually
// carries it. A post rendered without its voice (the publish-time fallback) is
// template graphics and reviewed copy, and is not labelled.
export function aiDisclosure(post, { voiceRendered = true } = {}) {
  const ai = post.ai || {};
  const voice = ai.voice === 'synthetic' && voiceRendered;
  const label = ai.visuals === 'generated' || voice;
  return { label, reason: label ? `ai.visuals=${ai.visuals}, synthetic voice=${voice}` : 'template visuals, no synthetic voice' };
}

// kind 'queue' (dated, one post per slot) or 'evergreen' (undated fallback bank).
export function validateBatch(batch, { destinations = null } = {}) {
  const requireSchedule = batch.kind !== 'evergreen';
  const errors = [];
  const seen = new Set();
  const slots = new Set();
  for (const post of batch.posts || []) {
    errors.push(...validatePost(post, { requireSchedule, destinations }));
    if (seen.has(post.id)) errors.push(`duplicate id ${post.id}`);
    seen.add(post.id);
    if (!requireSchedule) continue;
    const slot = `${post.date}-${post.slot}`;
    if (slots.has(slot)) errors.push(`two posts for ${slot}`);
    slots.add(slot);
  }
  return errors;
}

// Everything that changes the pixels or the sound (a post's spoken lines are
// part of the visual block). Stored media whose hash no longer matches is
// rendered again rather than posted stale.
export function contentHash(post) {
  const { media, date, slot, caption, hashtags, batchFile, ...visual } = post;
  return crypto.createHash('sha256').update(JSON.stringify({ visual, engine: ENGINE_VERSION })).digest('hex').slice(0, 16);
}
