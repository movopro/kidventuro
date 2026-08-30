import { CloudinaryStore } from './cloudinary.mjs';
import { generateDidYouKnowContent } from './did-you-know-content.mjs';
import { requiredEnv } from './utils.mjs';

const slotKey = process.env.SOCIAL_SLOT_KEY?.trim();
if (!slotKey || !/^[a-zA-Z0-9._-]+$/.test(slotKey)) throw new Error('Valid SOCIAL_SLOT_KEY is required');

const sourceDate = process.env.DID_YOU_KNOW_SOURCE_DATE?.trim();
const date = sourceDate ? new Date(sourceDate) : new Date();
if (Number.isNaN(date.getTime())) throw new Error(`Invalid DID_YOU_KNOW_SOURCE_DATE: ${sourceDate}`);

const cloudinary = new CloudinaryStore({
  cloudName: requiredEnv('CLOUDINARY_CLOUD_NAME'),
  apiKey: requiredEnv('CLOUDINARY_API_KEY'),
  apiSecret: requiredEnv('CLOUDINARY_API_SECRET')
});

const stateId = `kidventuro-social/state/${slotKey}/content.json`;
const existing = await cloudinary.getJson(stateId);
if (existing) {
  console.log(`Did You Know content already prepared for ${slotKey}: ${existing.theme || 'existing content'}`);
  process.exit(0);
}

const content = generateDidYouKnowContent({ date });
content.slotKey = slotKey;
content.createdAt = new Date().toISOString();
content.contentSeries = 'did-you-know';
await cloudinary.putJson(stateId, content);
console.log(JSON.stringify({ slotKey, theme: content.theme, country: content.seed?.country }, null, 2));
