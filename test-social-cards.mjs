// Per-destination social cards: every guide page (EN + ES) must carry its own 1200x630 card, rendered, current, small, wired into
// og:image / twitter:image / JSON-LD ImageObject / the image sitemap; hubs, home and legal pages keep the shared card; the home
// copy states the real destination count. Needs no renderer: it recomputes the input hashes the renderer recorded.
// Run with `npm --prefix worker test` or `node test-social-cards.mjs`; refresh the cards with `node scripts/social-cards/render.mjs`.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from './scripts/image-size.mjs';
import { guideSpecs, destinationCount, readManifest, specInputHash, rendererFingerprint, fileSha256, cardAlt, SHARED_CARD, SITE, MAX_BYTES, LEGACY_SLUGS } from './scripts/social-cards/cards-lib.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = rel => readFile(path.join(root, rel), 'utf8');
const meta = (html, attr, key) => [...html.matchAll(new RegExp(`<meta[^>]*\\b${attr}="${key}"[^>]*>`, 'gi'))].map(m => m[0].match(/\bcontent="([^"]*)"/)?.[1]);
const unesc = s => s.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');

const specs = guideSpecs();
const total = destinationCount();
assert.equal(total, 90, 'the site sells 50 legacy + 40 family-guide destinations');
assert.equal(specs.length, total * 2, 'one card per destination per language');
assert.equal(new Set(specs.map(s => s.file)).size, specs.length, 'card files are unique');

// ---- 1. the cards exist, are current for their inputs, 1200x630, under budget
const manifest = readManifest();
assert.ok(manifest?.files, 'assets/social/manifest.json is missing: run node scripts/social-cards/render.mjs');
const fp = rendererFingerprint();
for (const s of specs) {
  const m = manifest.files[s.file];
  assert.ok(m, `no manifest entry for ${s.file}`);
  assert.equal(m.inputHash, specInputHash(s, fp), `${s.file} is stale (data, art, layout or fonts changed): run node scripts/social-cards/render.mjs`);
  const buf = await readFile(path.join(root, s.file));
  assert.equal(fileSha256(s.file), m.sha256, `${s.file} differs from the manifest`);
  assert.ok(buf.length <= MAX_BYTES, `${s.file} is ${buf.length} bytes (budget ${MAX_BYTES})`);
  const sz = imageSize(buf);
  assert.ok(sz && sz.type === 'jpeg' && sz.w === 1200 && sz.h === 630, `${s.file} must be a 1200x630 JPEG`);
}
const sharedSz = imageSize(await readFile(path.join(root, SHARED_CARD)));
assert.ok(sharedSz && sharedSz.w === 1200 && sharedSz.h === 630, 'shared card must stay 1200x630');
assert.ok(manifest.files[SHARED_CARD], 'shared card is not in the manifest');

// The hash must really react to the inputs, otherwise "current" proves nothing.
const base = specs[0];
for (const change of [{ name: 'Elsewhere' }, { tagline: 'x' }, { scene: base.scene === 'city' ? 'snow' : 'city' }, { lang: base.lang === 'en' ? 'es' : 'en' }])
  assert.notEqual(specInputHash({ ...base, ...change }, fp), specInputHash(base, fp), `input hash ignores ${Object.keys(change)[0]}`);
assert.notEqual(specInputHash(base, 'other-renderer'), specInputHash(base, fp), 'input hash ignores the renderer fingerprint');

// ---- 2. every guide page points at its own card, in tags, JSON-LD and the image sitemap
const sitemap = await read('sitemap.xml');
for (const s of specs) {
  const where = s.lang === 'es' ? `es/destinos/${s.slug}.html` : `destinations/${s.slug}.html`;
  const html = await read(where);
  assert.deepEqual(meta(html, 'property', 'og:image'), [s.url], `${where}: og:image must be its own card`);
  assert.deepEqual(meta(html, 'name', 'twitter:image'), [s.url], `${where}: twitter:image must be its own card`);
  assert.deepEqual(meta(html, 'name', 'twitter:card'), ['summary_large_image'], `${where}: twitter:card`);
  assert.deepEqual(meta(html, 'property', 'og:image:width'), ['1200'], `${where}: og:image:width`);
  assert.deepEqual(meta(html, 'property', 'og:image:height'), ['630'], `${where}: og:image:height`);
  assert.deepEqual(meta(html, 'property', 'og:image:type'), ['image/jpeg'], `${where}: og:image:type`);
  assert.equal(unesc(meta(html, 'property', 'og:image:alt')[0]), cardAlt(s.name, s.lang), `${where}: og:image:alt`);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const wp = ld['@graph'].find(n => n['@type'] === 'WebPage');
  const img = wp.primaryImageOfPage;
  assert.ok(img && img['@type'] === 'ImageObject' && img.url === s.url && img.contentUrl === s.url && img.width === 1200 && img.height === 630 && img.encodingFormat === 'image/jpeg' && img.caption && img.inLanguage === s.lang, `${where}: primaryImageOfPage must be the card as a full ImageObject`);
  assert.equal(wp.image?.['@id'], img['@id'], `${where}: WebPage.image must reference the card`);
  const canonical = s.lang === 'es' ? `${SITE}/es/destinos/${s.slug}.html` : `${SITE}/destinations/${s.slug}.html`;
  const entry = sitemap.match(new RegExp(`<url><loc>${canonical.replaceAll('.', '\\.')}</loc>.*?</url>`))?.[0];
  assert.ok(entry && entry.includes(`<image:loc>${s.url}</image:loc>`), `sitemap.xml: ${canonical} must list its card`);
}

// ---- 3. everything that is not a destination page keeps the shared card
for (const p of ['index.html', 'es/index.html', 'destinations/index.html', 'es/destinos/index.html', 'privacy.html', 'terms.html', 'refunds.html']) {
  const html = await read(p);
  assert.deepEqual(meta(html, 'property', 'og:image'), [`${SITE}/${SHARED_CARD}`], `${p}: shared og:image`);
}
assert.equal(LEGACY_SLUGS.length, 50);

// ---- 4. home copy uses the real count (no hard-coded 50)
const home = await read('index.html'), homeEs = await read('es/index.html');
assert.match(meta(home, 'name', 'description')[0], new RegExp(`across ${total} destinations`), 'home meta description count');
assert.match(unesc(meta(homeEs, 'name', 'description')[0]), new RegExp(`${total} destinos`), 'es home meta description count');
assert.match(meta(homeEs, 'property', 'og:description')[0], new RegExp(`${total} destinos`), 'es home og:description count');
assert.ok(!/\b50 (destinations|DESTINATIONS|destinos)/.test(home + homeEs), 'home pages must not hard-code 50 destinations');
assert.ok(home.includes(`${total} DESTINATIONS`), 'home heading shows the real count');

console.log(`Social cards: ${specs.length} destination cards + shared card current, 1200x630, under ${MAX_BYTES / 1024} KB, wired into ${specs.length} pages and the image sitemap.`);
