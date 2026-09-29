import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferClient, instagramInput, isCompleteOrInFlight, pinterestInput, tiktokInput } from './buffer.mjs';
import { claimSlot } from './claim.mjs';
import { CloudinaryStore } from './cloudinary.mjs';
import { generateContent, loadQueuePosts } from './content.mjs';
import { destinationSet, renderPost } from './studio/studio.mjs';
import { aiDisclosure } from './studio/schema.mjs';
import { ensureDirectory, localDateKey, requiredEnv } from './utils.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const autopilotRoot = path.resolve(here, '..');
const config = JSON.parse(await fs.readFile(path.join(autopilotRoot, 'config.json'), 'utf8'));
const argumentsList = process.argv.slice(2);
const flag = (name) => argumentsList.includes(name);
const option = (name) => {
  const index = argumentsList.indexOf(name);
  return index >= 0 ? argumentsList[index + 1] : undefined;
};

const dryRun = flag('--dry-run');
const force = flag('--force');
const slot = option('--slot') || process.env.SOCIAL_SLOT?.trim();
if (!slot || !(slot in config.slots)) throw new Error(`Valid --slot is required: ${Object.keys(config.slots).join(', ')}`);

const now = new Date();
const localHour = Number(new Intl.DateTimeFormat('en-GB', {
  timeZone: config.timezone,
  hour: '2-digit',
  hourCycle: 'h23'
}).format(now));
if (!force && localHour !== config.slots[slot]) {
  console.log(`Skipping ${slot}: local hour is ${localHour}, expected ${config.slots[slot]}`);
  process.exit(0);
}

const contentDateOffsetRaw = process.env.SOCIAL_CONTENT_DATE_OFFSET_DAYS?.trim();
const contentDateOffsetDays = contentDateOffsetRaw ? Number(contentDateOffsetRaw) : 0;
if (!Number.isInteger(contentDateOffsetDays) || Math.abs(contentDateOffsetDays) > 365) {
  throw new Error(`Invalid social content date offset: ${contentDateOffsetRaw}`);
}
const contentDate = new Date(now.getTime() + contentDateOffsetDays * 86_400_000);
const dateKey = localDateKey(now, config.timezone);
const requestedSlotKey = option('--slot-key') || process.env.SOCIAL_SLOT_KEY?.trim();
const slotKey = requestedSlotKey || `${dateKey}-${slot}`;
if (!/^[a-zA-Z0-9._-]+$/.test(slotKey)) throw new Error(`Unsafe social slot key: ${slotKey}`);
const outputDirectory = path.join(autopilotRoot, dryRun ? 'out/preview' : '.tmp', slotKey);
await ensureDirectory(outputDirectory);

const requestedResultPath = process.env.SOCIAL_RESULT_PATH?.trim();
const resultPath = requestedResultPath
  ? (path.isAbsolute(requestedResultPath) ? requestedResultPath : path.resolve(autopilotRoot, '..', requestedResultPath))
  : null;
const runReport = {
  startedAt: now.toISOString(),
  slot,
  slotKey,
  outcome: 'running',
  platforms: {}
};
const persistReport = async () => {
  if (!resultPath) return;
  await ensureDirectory(path.dirname(resultPath));
  await fs.writeFile(resultPath, JSON.stringify(runReport, null, 2), 'utf8');
};

let cloudinary;
if (!dryRun) {
  cloudinary = new CloudinaryStore({
    cloudName: requiredEnv('CLOUDINARY_CLOUD_NAME'),
    apiKey: requiredEnv('CLOUDINARY_API_KEY'),
    apiSecret: requiredEnv('CLOUDINARY_API_SECRET')
  });

  const runner = process.env.RUNNER_NAME?.trim() || 'github';
  const claim = await claimSlot({ repoRoot: path.resolve(autopilotRoot, '..'), autopilotRoot, slotKey, runner });
  if (!claim.claimed) {
    console.log(`Kidventuro social slot ${slotKey} not claimed by ${runner} (${claim.reason}); exiting quietly`);
    process.exit(0);
  }
}

// Every platform the brand wants; ones not (yet) connected in Buffer and
// listed as optional - Instagram until the owner connects it - are skipped
// with a note instead of failing the slot. SOCIAL_ACTIVE_PLATFORMS overrides.
const wantedPlatforms = (process.env.SOCIAL_ACTIVE_PLATFORMS?.trim() || (config.platforms || ['pinterest', 'tiktok']).join(','))
  .split(',').map((platform) => platform.trim()).filter(Boolean);
const optionalPlatforms = new Set(config.optionalPlatforms || []);
let activePlatforms = wantedPlatforms;
let buffer;
if (!dryRun) {
  buffer = new BufferClient(requiredEnv('BUFFER_API_KEY'));
  const connected = await buffer.connectedServices();
  const missing = wantedPlatforms.filter((platform) => !connected.has(platform));
  const fatal = missing.filter((platform) => !optionalPlatforms.has(platform));
  if (fatal.length) throw new Error(`Required platform(s) not connected in Buffer: ${fatal.join(', ')}`);
  if (missing.length) console.log(`Skipping platform(s) not connected in Buffer yet: ${missing.join(', ')}`);
  activePlatforms = wantedPlatforms.filter((platform) => connected.has(platform));
  runReport.skippedPlatforms = missing;
}

const markerIds = Object.fromEntries(activePlatforms.map((platform) => [
  platform,
  `kidventuro-social/state/${slotKey}/${platform}.json`
]));
const existingMarkers = dryRun ? {} : Object.fromEntries(await Promise.all(
  Object.entries(markerIds).map(async ([platform, markerId]) => [platform, await cloudinary.getJson(markerId)])
));

const contentStateId = `kidventuro-social/state/${slotKey}/content.json`;
let content = dryRun ? null : await cloudinary.getJson(contentStateId);
// Content cached by the pre-studio generator has no post; choose again.
if (!content?.post) {
  content = await generateContent({ slot, date: contentDate, config, destinations: await destinationSet() });
  content.slotKey = slotKey;
  content.createdAt = now.toISOString();
  if (!dryRun) await cloudinary.putJson(contentStateId, content);
}
runReport.generator = content.generator;
runReport.theme = content.theme;
runReport.bankId = content.seed?.bankId || null;

runReport.contentSource = content.seed?.source || null;
runReport.aiLabel = content.ai || null;

if (dryRun) {
  const assets = await renderPost({ post: content.post, outDir: outputDirectory, config });
  await fs.writeFile(path.join(outputDirectory, 'content.json'), JSON.stringify(content, null, 2), 'utf8');
  runReport.outcome = 'preview';
  runReport.assets = { instagram: assets.videoPath, pinterest: assets.coverPath, tiktok: assets.videoPath, sheet: assets.sheetPath, active: activePlatforms };
  await persistReport();
  console.log(`Preview created in ${outputDirectory}`);
  console.log(JSON.stringify({ slotKey, generator: content.generator, theme: content.theme, bankId: content.seed.bankId }, null, 2));
  process.exit(0);
}

const boardName = process.env.PINTEREST_BOARD_NAME?.trim()
  || content.pinterestBoard
  || config.pinterestBoardName;
const setup = await buffer.discover({
  pinterestBoardName: boardName,
  requiredServices: activePlatforms,
  channelOverrides: {
    instagram: process.env.BUFFER_INSTAGRAM_CHANNEL_ID?.trim(),
    pinterest: process.env.BUFFER_PINTEREST_CHANNEL_ID?.trim(),
    tiktok: process.env.BUFFER_TIKTOK_CHANNEL_ID?.trim()
  }
});

const verifiedMarkers = {};
for (const [platform, marker] of Object.entries(existingMarkers)) {
  if (!marker?.postId) continue;
  const current = await buffer.getPost(marker.postId);
  if (isCompleteOrInFlight(current)) {
    verifiedMarkers[platform] = current;
    runReport.platforms[platform] = {
      postId: current.id,
      status: current.status,
      sentAt: current.sentAt || null,
      externalLink: current.externalLink || null,
      source: 'verified-marker'
    };
  } else {
    console.warn(`${platform}: stale marker ${marker.postId} has Buffer status ${current?.status || 'missing'}; retrying`);
    runReport.platforms[platform] = {
      postId: marker.postId,
      status: current?.status || 'missing',
      source: 'stale-marker-retry'
    };
  }
}

if (Object.keys(verifiedMarkers).length === Object.keys(markerIds).length) {
  runReport.outcome = Object.values(verifiedMarkers).every((post) => post.status === 'sent') ? 'sent' : 'pending';
  runReport.finishedAt = new Date().toISOString();
  await persistReport();
  console.log(`Kidventuro social slot already verified: ${slotKey}`);
  process.exit(0);
}

let coverUrl;
let videoUrl;
let aiLabel = Boolean(content.ai?.label);
if (content.media) {
  // Rendered, checked and uploaded by the weekly studio run.
  ({ cover: coverUrl, video: videoUrl } = content.media);
  runReport.media = 'studio';
} else {
  const assets = await renderPost({ post: content.post, outDir: outputDirectory, config, withSheet: false });
  await fs.writeFile(path.join(outputDirectory, 'content.json'), JSON.stringify(content, null, 2), 'utf8');
  const mediaPrefix = `kidventuro-social/media/${slotKey}`;
  [coverUrl, videoUrl] = await Promise.all([
    cloudinary.uploadFile({ filePath: assets.coverPath, publicId: `${mediaPrefix}/cover`, resourceType: 'image' }),
    cloudinary.uploadFile({ filePath: assets.videoPath, publicId: `${mediaPrefix}/short-video`, resourceType: 'video' })
  ]);
  runReport.media = 'rendered-at-publish';
  // The label follows the video actually made here: narrated only where this
  // runner has the voice installed (Node 2 does, GitHub's publisher does not).
  aiLabel = aiDisclosure(content.post, { voiceRendered: Boolean(assets.voiced) }).label;
  runReport.aiLabel = { ...(runReport.aiLabel || {}), label: aiLabel, voiceRendered: Boolean(assets.voiced) };
}
const ai = { label: aiLabel, assisted: Boolean(content.ai?.textAssisted) };

const campaign = encodeURIComponent(slotKey);
const destinationUrl = content.productUrl
  ? `${content.productUrl}?utm_source=pinterest&utm_medium=organic&utm_campaign=social_autopilot&utm_content=${campaign}`
  : `${config.siteUrl}?utm_source=pinterest&utm_medium=organic&utm_campaign=social_autopilot&utm_content=${campaign}`;
const allPostBuilders = {
  instagram: () => instagramInput({
    channelId: setup.channels.instagram.id,
    text: content.instagram.caption,
    imageUrl: coverUrl,
    videoUrl,
    altText: content.instagram.altText,
    asReel: true,
    ai
  }),
  pinterest: () => pinterestInput({
    channelId: setup.channels.pinterest.id,
    text: content.pinterest.description,
    imageUrl: coverUrl,
    boardServiceId: setup.board.serviceId,
    title: content.pinterest.title,
    destinationUrl,
    ai
  }),
  tiktok: () => tiktokInput({
    channelId: setup.channels.tiktok.id,
    text: content.tiktok.caption,
    videoUrl,
    ai
  })
};
const posts = Object.fromEntries(activePlatforms.map((platform) => [
  platform,
  { channelId: setup.channels[platform].id, input: allPostBuilders[platform]() }
]));

for (const [platform, post] of Object.entries(posts)) {
  const markerId = markerIds[platform];
  const verified = verifiedMarkers[platform];
  if (verified) {
    console.log(`${platform}: verified as ${verified.status} (${verified.id})`);
    continue;
  }

  try {
    const matching = await buffer.matchingRecentPost({
      organizationId: setup.organizationId,
      channelId: post.channelId,
      text: post.input.text
    });

    let published = isCompleteOrInFlight(matching) ? matching : null;
    let recoveredExistingPost = Boolean(published);
    if (!published) {
      if (matching?.status === 'error') {
        console.warn(`${platform}: recent Buffer post ${matching.id} is in error; creating a replacement`);
      } else if (matching) {
        console.warn(`${platform}: recent Buffer post ${matching.id} cannot be recovered (${matching.status}); creating a replacement`);
      }
      published = await buffer.createPost(post.input);
      recoveredExistingPost = false;
    }

    let observed = published.status === 'sent'
      ? published
      : await buffer.waitForPost(published.id);

    if (!observed) throw new Error(`Buffer post ${published.id} disappeared after creation`);
    if (observed.status === 'error') {
      console.warn(`${platform}: Buffer post ${observed.id} failed; retrying once with a replacement`);
      published = await buffer.createPost(post.input);
      recoveredExistingPost = false;
      observed = published.status === 'sent'
        ? published
        : await buffer.waitForPost(published.id);
    }
    if (!observed) throw new Error(`Buffer replacement post ${published.id} disappeared after creation`);
    if (observed.status === 'error') throw new Error(`Buffer reported publishing error for ${observed.id} after retry`);
    if (!isCompleteOrInFlight(observed)) {
      throw new Error(`Buffer post ${observed.id} remained in unexpected status ${observed.status}`);
    }

    await cloudinary.putJson(markerId, {
      platform,
      postId: observed.id,
      status: observed.status,
      slotKey,
      recordedAt: new Date().toISOString(),
      sentAt: observed.sentAt || null,
      externalLink: observed.externalLink || null,
      recoveredExistingPost
    });
    runReport.platforms[platform] = {
      postId: observed.id,
      status: observed.status,
      sentAt: observed.sentAt || null,
      externalLink: observed.externalLink || null,
      source: recoveredExistingPost ? 'recovered-buffer-post' : 'created'
    };
    await persistReport();
    console.log(`${platform}: Buffer status ${observed.status} as ${observed.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${platform}: ${message}`);
    runReport.platforms[platform] = {
      status: 'error',
      error: message,
      source: 'platform-error'
    };
    await persistReport();
  }
}

const oldDate = new Date(now.getTime() - config.retentionDays * 86_400_000);
const oldDateKey = localDateKey(oldDate, config.timezone);
for (const oldSlot of Object.keys(config.slots)) {
  const oldKey = `${oldDateKey}-${oldSlot}`;
  await Promise.all([
    cloudinary.destroy(`kidventuro-social/media/${oldKey}/cover`, 'image'),
    cloudinary.destroy(`kidventuro-social/media/${oldKey}/short-video`, 'video'),
    cloudinary.destroy(`kidventuro-social/state/${oldKey}/content.json`, 'raw'),
    ...activePlatforms.map((platform) => cloudinary.destroy(`kidventuro-social/state/${oldKey}/${platform}.json`, 'raw'))
  ]);
}
// Studio media of queued posts that ran on that date.
for (const post of (await loadQueuePosts()).filter((entry) => entry.date === oldDateKey)) {
  await Promise.all([
    cloudinary.destroy(`kidventuro-social/studio/${post.id}/cover`, 'image'),
    cloudinary.destroy(`kidventuro-social/studio/${post.id}/video`, 'video')
  ]);
}

const platformResults = Object.values(runReport.platforms);
const hasErrors = platformResults.some((platform) => platform.status === 'error');
const allSent = platformResults.length === Object.keys(posts).length && platformResults.every((platform) => platform.status === 'sent');
runReport.outcome = allSent ? 'sent' : hasErrors ? 'partial' : 'pending';
runReport.finishedAt = new Date().toISOString();
await persistReport();
console.log(`Kidventuro social slot complete: ${slotKey} (${runReport.outcome})`);
