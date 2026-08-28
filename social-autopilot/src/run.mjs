import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferClient, instagramInput, pinterestInput, tiktokInput } from './buffer.mjs';
import { CloudinaryStore } from './cloudinary.mjs';
import { generateContent } from './content.mjs';
import { loadDestinations } from './destinations.mjs';
import { renderAssets } from './render.mjs';
import { ensureDirectory, localDateKey, requiredEnv } from './utils.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const autopilotRoot = path.resolve(here, '..');
const repositoryRoot = path.resolve(autopilotRoot, '..');
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

const dateKey = localDateKey(now, config.timezone);
const slotKey = `${dateKey}-${slot}`;
const outputDirectory = path.join(autopilotRoot, dryRun ? 'preview' : '.tmp', slotKey);
await ensureDirectory(outputDirectory);

const destinations = await loadDestinations(repositoryRoot);
let cloudinary;
if (!dryRun) {
  cloudinary = new CloudinaryStore({
    cloudName: requiredEnv('CLOUDINARY_CLOUD_NAME'),
    apiKey: requiredEnv('CLOUDINARY_API_KEY'),
    apiSecret: requiredEnv('CLOUDINARY_API_SECRET')
  });
}

const markerIds = Object.fromEntries(['instagram', 'pinterest', 'tiktok'].map((platform) => [
  platform,
  `kidventuro-social/state/${slotKey}/${platform}.json`
]));
const existingMarkers = dryRun ? {} : Object.fromEntries(await Promise.all(
  Object.entries(markerIds).map(async ([platform, markerId]) => [platform, await cloudinary.getJson(markerId)])
));
if (!dryRun && Object.values(existingMarkers).every((marker) => marker?.postId)) {
  console.log(`Kidventuro social slot already complete: ${slotKey}`);
  process.exit(0);
}

const contentStateId = `kidventuro-social/state/${slotKey}/content.json`;
let content = dryRun ? null : await cloudinary.getJson(contentStateId);
if (!content) {
  content = await generateContent({
    destinations,
    slot,
    date: now,
    config,
    apiKey: process.env.OPENAI_API_KEY?.trim(),
    useAi: !dryRun || flag('--live-ai')
  });
  content.slotKey = slotKey;
  content.createdAt = now.toISOString();
  if (!dryRun) await cloudinary.putJson(contentStateId, content);
}

const assets = await renderAssets({ content, outputDirectory, config });
await fs.writeFile(path.join(outputDirectory, 'content.json'), JSON.stringify(content, null, 2), 'utf8');

if (dryRun) {
  console.log(`Preview created in ${outputDirectory}`);
  console.log(JSON.stringify({ slotKey, generator: content.generator, theme: content.theme }, null, 2));
  process.exit(0);
}

const mediaPrefix = `kidventuro-social/media/${slotKey}`;
const [instagramUrl, pinterestUrl, videoUrl] = await Promise.all([
  cloudinary.uploadFile({ filePath: assets.instagramPath, publicId: `${mediaPrefix}/instagram`, resourceType: 'image' }),
  cloudinary.uploadFile({ filePath: assets.pinterestPath, publicId: `${mediaPrefix}/pinterest`, resourceType: 'image' }),
  cloudinary.uploadFile({ filePath: assets.videoPath, publicId: `${mediaPrefix}/short-video`, resourceType: 'video' })
]);

const buffer = new BufferClient(requiredEnv('BUFFER_API_KEY'));
const boardName = process.env.PINTEREST_BOARD_NAME?.trim() || config.pinterestBoardName;
const setup = await buffer.discover({
  pinterestBoardName: boardName,
  channelOverrides: {
    instagram: process.env.BUFFER_INSTAGRAM_CHANNEL_ID?.trim(),
    pinterest: process.env.BUFFER_PINTEREST_CHANNEL_ID?.trim(),
    tiktok: process.env.BUFFER_TIKTOK_CHANNEL_ID?.trim()
  }
});

const campaign = encodeURIComponent(slotKey);
const destinationUrl = `${config.siteUrl}?utm_source=pinterest&utm_medium=organic&utm_campaign=social_autopilot&utm_content=${campaign}`;
const posts = {
  instagram: {
    channelId: setup.channels.instagram.id,
    input: instagramInput({
      channelId: setup.channels.instagram.id,
      text: content.instagram.caption,
      imageUrl: instagramUrl,
      altText: content.instagram.altText
    })
  },
  pinterest: {
    channelId: setup.channels.pinterest.id,
    input: pinterestInput({
      channelId: setup.channels.pinterest.id,
      text: content.pinterest.description,
      imageUrl: pinterestUrl,
      boardServiceId: setup.board.serviceId,
      title: content.pinterest.title,
      destinationUrl
    })
  },
  tiktok: {
    channelId: setup.channels.tiktok.id,
    input: tiktokInput({
      channelId: setup.channels.tiktok.id,
      text: content.tiktok.caption,
      videoUrl
    })
  }
};

for (const [platform, post] of Object.entries(posts)) {
  const markerId = markerIds[platform];
  const marker = existingMarkers[platform];
  if (marker?.postId) {
    console.log(`${platform}: already published as ${marker.postId}`);
    continue;
  }
  const existing = await buffer.matchingRecentPost({
    organizationId: setup.organizationId,
    channelId: post.channelId,
    text: post.input.text
  });
  const published = existing || await buffer.createPost(post.input);
  await cloudinary.putJson(markerId, {
    platform,
    postId: published.id,
    status: published.status,
    slotKey,
    recordedAt: new Date().toISOString(),
    recoveredExistingPost: Boolean(existing)
  });
  console.log(`${platform}: published as ${published.id}`);
}

const oldDate = new Date(now.getTime() - config.retentionDays * 86_400_000);
const oldDateKey = localDateKey(oldDate, config.timezone);
for (const oldSlot of Object.keys(config.slots)) {
  const oldKey = `${oldDateKey}-${oldSlot}`;
  await Promise.all([
    cloudinary.destroy(`kidventuro-social/media/${oldKey}/instagram`, 'image'),
    cloudinary.destroy(`kidventuro-social/media/${oldKey}/pinterest`, 'image'),
    cloudinary.destroy(`kidventuro-social/media/${oldKey}/short-video`, 'video'),
    cloudinary.destroy(`kidventuro-social/state/${oldKey}/content.json`, 'raw'),
    ...['instagram', 'pinterest', 'tiktok'].map((platform) => cloudinary.destroy(`kidventuro-social/state/${oldKey}/${platform}.json`, 'raw'))
  ]);
}

console.log(`Kidventuro social slot complete: ${slotKey}`);
