import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { fetchWithRetry } from './utils.mjs';

function sign(parameters, secret) {
  const payload = Object.entries(parameters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return crypto.createHash('sha1').update(`${payload}${secret}`).digest('hex');
}

function encodedPublicId(publicId) {
  return publicId.split('/').map(encodeURIComponent).join('/');
}

export class CloudinaryStore {
  constructor({ cloudName, apiKey, apiSecret }) {
    this.cloudName = cloudName;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  deliveryUrl(resourceType, publicId) {
    return `https://res.cloudinary.com/${encodeURIComponent(this.cloudName)}/${resourceType}/upload/${encodedPublicId(publicId)}`;
  }

  async getJson(publicId) {
    const response = await fetch(this.deliveryUrl('raw', publicId), { headers: { Accept: 'application/json' } });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Cloudinary state read failed: HTTP ${response.status}`);
    return response.json();
  }

  async uploadFile({ filePath, publicId, resourceType }) {
    const bytes = await fs.readFile(filePath);
    const mimeType = resourceType === 'video' ? 'video/mp4' : 'image/jpeg';
    return this.uploadBytes({ bytes, mimeType, publicId, resourceType });
  }

  async putJson(publicId, value) {
    const bytes = Buffer.from(JSON.stringify(value, null, 2));
    return this.uploadBytes({ bytes, mimeType: 'application/json', publicId, resourceType: 'raw' });
  }

  async uploadBytes({ bytes, mimeType, publicId, resourceType }) {
    const timestamp = Math.floor(Date.now() / 1000);
    const parameters = { overwrite: 'true', public_id: publicId, timestamp };
    const form = new FormData();
    form.set('file', new Blob([bytes], { type: mimeType }), publicId.split('/').at(-1));
    for (const [key, value] of Object.entries(parameters)) form.set(key, String(value));
    form.set('api_key', this.apiKey);
    form.set('signature', sign(parameters, this.apiSecret));

    const response = await fetchWithRetry(`https://api.cloudinary.com/v1_1/${encodeURIComponent(this.cloudName)}/${resourceType}/upload`, {
      method: 'POST',
      body: form
    }, 3);
    const body = await response.json();
    if (!response.ok) throw new Error(`Cloudinary upload failed: ${body.error?.message || response.status}`);
    return body.secure_url;
  }

  async destroy(publicId, resourceType) {
    const timestamp = Math.floor(Date.now() / 1000);
    const parameters = { invalidate: 'true', public_id: publicId, timestamp };
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(parameters)) form.set(key, String(value));
    form.set('api_key', this.apiKey);
    form.set('signature', sign(parameters, this.apiSecret));
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(this.cloudName)}/${resourceType}/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
    if (!response.ok) console.warn(`Cloudinary cleanup failed for ${publicId}: HTTP ${response.status}`);
  }
}

export { sign };
