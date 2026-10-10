import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { validateGuide } from './scripts/validate-family-guides.mjs';

// Every family guide must be complete (no thin pages) and its generated outputs must exist and agree with the source.
const dir = new URL('./destinations/guides/', import.meta.url);
const files = (await readdir(dir)).filter(f => f.endsWith('.json')).sort();
const index = JSON.parse(await readFile(new URL('./destinations/guide-index.json', import.meta.url), 'utf8'));
assert.ok(files.length >= 40, `expected at least 40 family guides, found ${files.length}`);
assert.equal(index.length, files.length, 'guide-index.json is stale: run node scripts/build-family-guides.mjs');
const regions = { europe: 0, americas: 0, asia: 0 }, winter = [];
for (const f of files) {
  const g = JSON.parse(await readFile(new URL(f, dir), 'utf8'));
  const errors = validateGuide(g, f);
  assert.deepEqual(errors, [], errors.join('\n'));
  regions[g.region]++;
  if (g.bestMonths.some(m => m === 12 || m <= 2)) winter.push(g.slug);
  for (const [path, lang] of [[`./destinations/${g.slug}.html`, 'en'], [`./es/destinos/${g.slug}.html`, 'es']]) {
    const html = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.ok(html.includes(`<html lang="${lang}">`), `${path}: wrong lang`);
    assert.ok(html.includes(g[lang].mustDos[0].title.replaceAll('&', '&amp;').replaceAll('"', '&quot;')), `${path}: stale content, rebuild`);
    assert.ok(html.includes('"@type":"FAQPage"'), `${path}: FAQ structured data missing`);
    assert.ok(!/\bundefined\b|\bnull\b|\[object Object\]/.test(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')), `${path}: template hole`);
  }
  await readFile(new URL(`./assets/destinations/${g.slug}.svg`, import.meta.url), 'utf8');
}
for (const [r, n] of Object.entries(regions)) assert.ok(n >= 10, `region ${r} has only ${n} guides`);
assert.ok(winter.length >= 10, `only ${winter.length} guides are good in winter`);
for (const page of ['packing-list.html', 'es/lista-de-equipaje.html', 'best-family-destinations-this-month.html', 'es/mejores-destinos-familiares-este-mes.html', 'travel-journal.html', 'es/diario-de-viaje.html']) {
  const html = await readFile(new URL(`./${page}`, import.meta.url), 'utf8');
  assert.ok(html.includes('rel="canonical"') && html.includes('application/ld+json') && (html.match(/<h1[ >]/g) || []).length === 1, `${page}: SEO basics`);
}
// The free tools run only in the browser: nothing typed into them is sent or stored.
for (const tool of ['packing.js', 'journal.js']) {
  const src = await readFile(new URL(`./tools/${tool}`, import.meta.url), 'utf8');
  assert.equal(/fetch\(|sendBeacon|localStorage|sessionStorage|XMLHttpRequest/.test(src), false, `${tool} must not send or store anything`);
}
// Regression: the preview card must not fall back to Rome's missions for destinations added outside app.js.
for (const file of ['site-expansion.js', 'site-expansion-3.js']) {
  const src = await readFile(new URL(`./${file}`, import.meta.url), 'utf8');
  assert.ok(/destinationData\[name\]=|destinationData\[r\[0\]\]=/.test(src), `${file} must register its missions in app.js destinationData`);
}
console.log(`Family guides passed: ${files.length} guides (${Object.entries(regions).map(([r, n]) => `${r} ${n}`).join(', ')}, ${winter.length} winter-friendly), feature pages present.`);
