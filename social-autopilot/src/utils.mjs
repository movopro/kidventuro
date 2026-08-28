import fs from 'node:fs/promises';

export const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

export async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) return response;
      lastError = new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleep(750 * (2 ** (attempt - 1)));
  }
  throw lastError;
}

export function localDateParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function localDateKey(date, timezone) {
  const { year, month, day } = localDateParts(date, timezone);
  return `${year}-${month}-${day}`;
}

export function dayNumber(date = new Date()) {
  return Math.floor(date.getTime() / 86_400_000);
}

export function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function wrapText(value, maxCharacters, maxLines = 4) {
  const words = String(value).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxCharacters || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  const used = lines.join(' ').split(' ').length;
  if (used < words.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:!?—-]+$/, '')}…`;
  }
  return lines;
}

export async function ensureDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
}

export function truncate(value, maximum) {
  const text = String(value).trim();
  if (text.length <= maximum) return text;
  return `${text.slice(0, maximum - 1).trimEnd()}…`;
}

export function safeJsonParse(value, label = 'JSON') {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid ${label}: ${error.message}`);
  }
}
