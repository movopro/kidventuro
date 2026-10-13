// The visible "N destinations" counts must equal the number of destinations the paid generator accepts (worker ALLOWED_DESTINATIONS).
// 2026-10-14: after 40 guide destinations were added (90 in total) the runtime scripts still printed "50 destinations" and re-titled
// both destination hubs to 50 while the static pages said 90.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDE_DESTINATIONS } from './worker/src/guide-destinations.js';

const root = dirname(fileURLToPath(import.meta.url));
const worker = readFileSync(join(root, 'worker/src/index.js'), 'utf8');
const block = worker.match(/const ALLOWED_DESTINATIONS = new Set\(\[([\s\S]*?)\]\);/);
assert.ok(block, 'ALLOWED_DESTINATIONS not found in worker/src/index.js');
const legacy = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const total = new Set([...legacy, ...GUIDE_DESTINATIONS]).size;
assert.ok(total >= 50, `implausible destination total ${total}`);

const COUNT = /\b(\d{2,3})\s+(?:supported\s+)?(?:family\s+)?(?:Kidventuro\s+)?(destinations|destination activity guides|travel activity guides|дестинации|destinos|guías|гидове)\b/giu;
const skip = new Set(['node_modules', '.git', 'worker', 'tools', 'scripts', 'docs', 'assets']);
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!skip.has(name)) walk(p); continue; }
    // site-expansion-2.js is a 100-destination draft that no page loads (test-catalog.mjs still reads it).
    if (/\.(html|js)$/.test(name) && !/^test-/.test(name) && name !== 'site-expansion-2.js') files.push(p);
  }
};
walk(root);

// The month-by-month page is about the destinations that have a full family guide, not the whole catalogue.
const GUIDE_ONLY = new Set(['best-family-destinations-this-month.html', 'es/mejores-destinos-familiares-este-mes.html']);
const wrong = [];
let seen = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(COUNT)) {
    seen++;
    const rel = relative(root, file).replace(/\\/g, '/');
    const expected = GUIDE_ONLY.has(rel) ? GUIDE_DESTINATIONS.length : total;
    if (Number(m[1]) !== expected) wrong.push(`${rel}: "${m[0]}" (expected ${expected})`);
  }
}
assert.ok(seen >= 10, `only ${seen} destination counts found: the pattern no longer matches the copy`);
assert.deepEqual(wrong, [], `destination counts differ from the ${total} supported destinations`);

// The hubs must not be re-titled or truncated at run time.
const analytics = readFileSync(join(root, 'analytics.js'), 'utf8');
assert.ok(!/seo-card'\)\.forEach\(\(card,index\)=>\{if\(index>=/.test(analytics), 'analytics.js still truncates the hub cards');
assert.ok(!/document\.title=spanish\?/.test(analytics), 'analytics.js still rewrites the hub titles');

// The hubs link every destination.
for (const hub of ['destinations/index.html', 'es/destinos/index.html']) {
  const html = readFileSync(join(root, hub), 'utf8');
  const links = new Set([...html.matchAll(/class="seo-(?:card|dest)"[^>]*href="([^"]+)\.html"|href="([^"]+)\.html"[^>]*class="seo-(?:card|dest)"/g)].map((m) => m[1] || m[2]));
  assert.equal(links.size, total, `${hub} links ${links.size} destinations, expected ${total}`);
}
console.log(`destination counts ok: ${seen} mentions, all ${total}`);
