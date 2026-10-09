import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const groups = [
  { dir: './destinations/', lang: 'en', prefix: 'https://kidventuro.com/destinations/', alternatePrefix: 'https://kidventuro.com/es/destinos/' },
  { dir: './es/destinos/', lang: 'es', prefix: 'https://kidventuro.com/es/destinos/', alternatePrefix: 'https://kidventuro.com/destinations/' }
];
const seenTitles = new Set();
const stripMarkup = html => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z0-9#]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Only the 50 supported (paid-product) destinations are indexed: robots.txt allows exactly those pages. The
// folders also hold thin stubs for the other 50 catalog destinations, which crawlers are told to skip.
const robots = await readFile(new URL('./robots.txt', import.meta.url), 'utf8');
const supported = [...robots.matchAll(/^Allow: \/destinations\/([a-z0-9-]+)\.html$/gm)]
  .map(match => `${match[1]}.html`)
  .filter(file => file !== 'index.html');
const guideCount = JSON.parse(await readFile(new URL('./destinations/guide-index.json', import.meta.url), 'utf8')).length;
const expectedSupported = 50 + guideCount;
assert.equal(supported.length, expectedSupported, `robots.txt must allow exactly ${expectedSupported} supported destination pages`);

let checked = 0;
for (const group of groups) {
  const dirUrl = new URL(group.dir, import.meta.url);
  const present = new Set(await readdir(dirUrl));
  const files = supported.filter(file => present.has(file));
  assert.equal(files.length, expectedSupported, `${group.lang}: expected ${expectedSupported} supported destination pages`);

  for (const file of files) {
    const html = await readFile(new URL(file, dirUrl), 'utf8');
    const canonical = `${group.prefix}${file}`;
    const alternate = `${group.alternatePrefix}${file}`;
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
    const h1Count = (html.match(/<h1(?:\s|>)/g) || []).length;
    const wordCount = stripMarkup(html).split(/\s+/).length;

    assert.ok(html.includes(`<html lang="${group.lang}">`), `${file}: wrong document language`);
    assert.ok(title && !seenTitles.has(title), `${file}: missing or duplicate title`);
    assert.ok(description && description.length >= 110, `${file}: meta description is too short`);
    assert.ok(html.includes(`rel="canonical" href="${canonical}"`), `${file}: missing self-canonical`);
    assert.ok(html.includes(`href="${alternate}"`), `${file}: missing language alternate`);
    assert.equal(h1Count, 1, `${file}: expected one H1`);
    assert.ok(html.includes('<script type="application/ld+json">'), `${file}: missing structured data`);
    assert.ok(wordCount >= 180, `${file}: thin static content (${wordCount} words)`);
    seenTitles.add(title);
    checked += 1;
  }
}

assert.equal(seenTitles.size, expectedSupported * 2, 'Every destination page must have a unique title');
console.log(`Static SEO validation passed for ${checked} destination pages.`);
