const required = [
  'BUFFER_API_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];
const missing = required.filter((name) => !process.env[name]?.trim());
console.log(`configured=${missing.length === 0 ? 'true' : 'false'}`);
if (missing.length) console.error(`Social autopilot is not active. Missing GitHub secrets: ${missing.join(', ')}`);
