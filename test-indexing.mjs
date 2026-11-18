// Indexing sweep: everything that helps Google and Bing find every page and every image, pinned so it cannot quietly rot.
//   1. sitemap.xml: every URL is a real, canonical, indexable page; lastmod is honest (it moves only when the page's HTML moves)
//   2. sitemap-images.xml: valid image sitemap derived from the pages themselves; robots.txt announces both sitemaps
//   3. the internal-link graph: no orphans, shallow click depth, the hubs and tools are linked in plain HTML (no JS needed)
//   4. IndexNow: key file, host, dry-run default, only changed pages, workflow wiring (no secret needed)
// Run with `npm --prefix worker test` or `node test-indexing.mjs`. Regenerate the outputs with `npm run generate-seo` (or `npm run build-sitemaps`).
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRobots } from './scripts/audit-seo-images.mjs';
import { applyLastmod, buildImageSitemap, fileForUrl, hashPage, imagesOfPage, sitemapLocs, SHARED_CARD } from './scripts/build-sitemaps.mjs';
import { HOST, KEY, KEY_LOCATION, MAX_URLS, fileToUrl, planUrls, payloadFor, urlsOf } from './scripts/submit-indexnow.mjs';
import { LEGACY_REGION, RELATED_GUIDES, RELATED_LEGACY, legacyRelated } from './scripts/related-links.mjs';
import { LEGACY_SLUGS } from './scripts/social-cards/cards-lib.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://kidventuro.com';
const read = rel => readFile(path.join(root, rel), 'utf8').then(t => t.replace(/\r\n/g, '\n'));
const todayIso = new Date().toISOString().slice(0, 10);
let checks = 0;
const ok = (cond, msg) => { checks += 1; assert.ok(cond, msg); };

// ---- the tree -----------------------------------------------------------------------------------------------------------------
const sitemapXml = await read('sitemap.xml');
const imageXml = await read('sitemap-images.xml');
const robotsText = await read('robots.txt');
const robots = parseRobots(robotsText);
const locs = sitemapLocs(sitemapXml);
const pages = new Map(); // loc -> html
for (const loc of locs) { ok(existsSync(path.join(root, fileForUrl(loc))), `sitemap.xml lists ${loc} but ${fileForUrl(loc)} does not exist`); pages.set(loc, await read(fileForUrl(loc))); }
ok(locs.length >= 190, `sitemap.xml lists only ${locs.length} pages`);

// ===== 1. sitemap.xml =========================================================================================================
ok(new Set(locs).size === locs.length, 'sitemap.xml lists a URL twice');
const manifest = JSON.parse(await read('scripts/sitemap-lastmod.json')).pages;
const stamped = new Map(urlsOf(sitemapXml).map(u => [u.loc, u.lastmod]));
for (const [loc, html] of pages) {
  const robotsMeta = html.match(/<meta[^>]*name="robots"[^>]*content="([^"]*)"/i)?.[1] || '';
  ok(!/noindex/i.test(robotsMeta), `${loc} is in the sitemap but is noindex`);
  ok(html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i)?.[1] === loc, `${loc} is in the sitemap but its canonical is another URL`);
  ok(robots.isAllowed(new URL(loc).pathname), `${loc} is in the sitemap but robots.txt blocks it`);
  const lastmod = stamped.get(loc);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(lastmod) && lastmod <= todayIso, `${loc}: lastmod "${lastmod}" is not a date in the past`);
  const entry = manifest[new URL(loc).pathname];
  ok(entry && entry.sha1 === hashPage(html), `${loc}: the page changed but sitemap lastmod was not refreshed (run npm run build-sitemaps)`);
  ok(entry.lastmod === lastmod, `${loc}: sitemap lastmod ${lastmod} differs from scripts/sitemap-lastmod.json (${entry.lastmod})`);
}
ok(Object.keys(manifest).length === locs.length, 'scripts/sitemap-lastmod.json lists pages that are no longer in the sitemap');
ok(new Set(stamped.values()).size > 1, 'every page has the same lastmod: it is being stamped with the run date again');

// lastmod logic on fixtures: unchanged keeps its date, a changed or new page gets today
{
  const xml = `<urlset><url><loc>${SITE}/a.html</loc><lastmod>2026-01-01</lastmod></url><url><loc>${SITE}/b.html</loc><lastmod>2026-01-01</lastmod></url><url><loc>${SITE}/c.html</loc></url></urlset>`;
  const text = { [`${SITE}/a.html`]: 'A\r\nsame', [`${SITE}/b.html`]: 'B changed', [`${SITE}/c.html`]: 'C new' };
  const before = { '/a.html': { sha1: hashPage('A\nsame'), lastmod: '2026-02-02' }, '/b.html': { sha1: hashPage('B'), lastmod: '2026-03-03' }, '/gone.html': { sha1: 'x', lastmod: '2026-04-04' } };
  const out = applyLastmod(xml, before, loc => text[loc], '2026-11-18');
  assert.deepEqual(urlsOf(out.xml).map(u => u.lastmod), ['2026-02-02', '2026-11-18', '2026-11-18']);
  assert.deepEqual(Object.keys(out.manifest), ['/a.html', '/b.html', '/c.html']);
  checks += 2;
}

// ===== 2. image sitemap =======================================================================================================
ok(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9" xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1">\n/.test(imageXml), 'sitemap-images.xml has no XML declaration / sitemap + image namespaces');
ok(Buffer.byteLength(imageXml) < 50 * 1024 * 1024, 'sitemap-images.xml is over 50 MB');
{
  const tagNames = new Set([...imageXml.matchAll(/<\/?([a-z:]+)/g)].map(m => m[1]));
  assert.deepEqual([...tagNames].sort(), ['image:image', 'image:loc', 'loc', 'url', 'urlset'], 'sitemap-images.xml may only contain url, loc, image:image and image:loc');
  checks += 1;
}
const imgEntries = [...imageXml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => ({ loc: m[1].match(/<loc>([^<]+)<\/loc>/)[1], images: [...m[1].matchAll(/<image:image><image:loc>([^<]+)<\/image:loc><\/image:image>/g)].map(i => i[1]) }));
ok(imgEntries.length <= 50000 && imgEntries.length >= 150, `sitemap-images.xml lists ${imgEntries.length} pages`);
for (const e of imgEntries) {
  ok(pages.has(e.loc), `sitemap-images.xml lists ${e.loc}, which is not in sitemap.xml`);
  ok(e.images.length >= 1 && e.images.length <= 1000, `${e.loc}: ${e.images.length} images (1 to 1000 allowed)`);
  ok(new Set(e.images).size === e.images.length, `${e.loc}: duplicate image entries`);
  for (const img of e.images) {
    ok(img.startsWith(`${SITE}/assets/`), `${e.loc}: image outside kidventuro.com/assets: ${img}`);
    ok(existsSync(path.join(root, fileForUrl(img))), `${e.loc}: image file does not exist: ${img}`);
    ok(robots.isAllowed(new URL(img).pathname), `${e.loc}: robots.txt blocks the image ${img}`);
  }
}
// every <img> a page really shows (and its social card) is in that page's entry; the file is exactly what the generator produces
for (const [loc, html] of pages) {
  const expected = imagesOfPage(html, loc);
  const entry = imgEntries.find(e => e.loc === loc);
  if (!expected.length) { ok(!entry, `${loc} shows no image but has an image sitemap entry`); continue; }
  ok(entry, `${loc} shows images but has no entry in sitemap-images.xml`);
  assert.deepEqual(entry.images, expected, `${loc}: sitemap-images.xml is out of date (run npm run build-sitemaps)`);
  for (const m of html.matchAll(/<img\b[^>]*\ssrc="(\/assets\/[^"?#]+)"/g)) ok(entry.images.includes(`${SITE}${m[1]}`), `${loc}: <img src="${m[1]}"> is missing from sitemap-images.xml`);
}
assert.equal(imageXml, buildImageSitemap(locs.map(loc => ({ loc, images: imagesOfPage(pages.get(loc), loc) }))), 'sitemap-images.xml is not what scripts/build-sitemaps.mjs produces');
checks += 1;
// the images inside sitemap.xml (kept for compatibility) are all in the image sitemap too
for (const u of sitemapXml.matchAll(/<url><loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g)) {
  const inline = [...u[0].matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(i => i[1]);
  const entry = imgEntries.find(e => e.loc === u[1]);
  for (const img of inline) ok(entry?.images.includes(img), `${u[1]}: ${img} is in sitemap.xml but not in sitemap-images.xml`);
}
// robots.txt announces both sitemaps
ok(/^Sitemap: https:\/\/kidventuro\.com\/sitemap\.xml$/m.test(robotsText), 'robots.txt lacks the sitemap.xml line');
ok(/^Sitemap: https:\/\/kidventuro\.com\/sitemap-images\.xml$/m.test(robotsText), 'robots.txt lacks the sitemap-images.xml line');
ok(robots.isAllowed('/sitemap-images.xml') && robots.isAllowed('/sitemap.xml'), 'robots.txt blocks a sitemap');

// image extraction on fixtures
{
  const html = `<html><head><meta property="og:image" content="${SITE}/assets/social/x.jpg"><link rel="icon" href="/assets/favicon.svg">
<script type="application/ld+json">{"@type":"WebPage","primaryImageOfPage":{"@type":"ImageObject","url":"${SITE}/assets/social/x.jpg","contentUrl":"${SITE}/assets/social/x.jpg"},"logo":"${SITE}/assets/favicon.svg","image":"https://other.example/y.png"}</script>
<script>var i='/assets/not-an-image-in-js.png'</script></head><body>
<img src="/assets/a.webp?v=3" srcset="/assets/a-2x.webp 2x, /assets/a-3x.webp 3x" width="1" height="1" alt="a"><img src="data:image/gif;base64,AAAA" alt=""><img src="https://other.example/b.png" alt="b">
<picture><source srcset="/assets/c.avif"><img src="c.png" alt="c"></picture><img src="/assets/og-kidventuro.png" alt="card"></body></html>`;
  assert.deepEqual(imagesOfPage(html, `${SITE}/p/q.html`), [`${SITE}/assets/a.webp`, `${SITE}/assets/a-2x.webp`, `${SITE}/assets/a-3x.webp`, `${SITE}/assets/c.avif`, `${SITE}/p/c.png`, `${SITE}/assets/social/x.jpg`]);
  assert.ok(imagesOfPage(html, `${SITE}/`).includes(SHARED_CARD) && !imagesOfPage(html, `${SITE}/p/q.html`).includes(SHARED_CARD));
  const xml = buildImageSitemap([{ loc: `${SITE}/a.html`, images: [`${SITE}/assets/a.webp`] }, { loc: `${SITE}/none.html`, images: [] }]);
  assert.ok(xml.includes('<url><loc>https://kidventuro.com/a.html</loc><image:image><image:loc>https://kidventuro.com/assets/a.webp</image:loc></image:image></url>') && !xml.includes('none.html'));
  checks += 3;
}

// ===== 3. internal links (plain HTML only: what a crawler sees before it runs any script) =====================================
const strip = h => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
const norm = p => p.replace(/\/index\.html$/, '/');
const allHtml = new Map(); // every page file in the tree, by URL path
async function walk(dir) {
  for (const e of await readdir(path.join(root, dir), { withFileTypes: true })) {
    if (e.name.startsWith('.') || ['node_modules', 'worker'].includes(e.name)) continue;
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) await walk(rel);
    else if (rel.endsWith('.html')) allHtml.set(norm(rel === 'index.html' ? '/' : `/${rel}`), await read(rel));
  }
}
await walk('');
const links = new Map();
for (const [p, html] of allHtml) {
  const out = new Set();
  for (const m of strip(html).matchAll(/<a\b[^>]*?\bhref\s*=\s*"([^"]*)"/gi)) {
    let h = m[1].trim().replace(/&amp;/g, '&');
    if (!h || /^(mailto:|tel:|javascript:|data:|#)/i.test(h)) continue;
    if (/^https?:\/\//i.test(h)) { if (!h.startsWith(`${SITE}/`)) continue; h = h.slice(SITE.length); }
    else if (!h.startsWith('/')) h = new URL(h, `http://x${p}`).pathname;
    h = norm(h.split('#')[0].split('?')[0]);
    if (h && h !== p) out.add(h);
  }
  links.set(p, out);
}
const inbound = new Map();
for (const [from, set] of links) for (const to of set) (inbound.get(to) || inbound.set(to, new Set()).get(to)).add(from);
const depth = new Map([['/', 0]]);
for (const queue = ['/']; queue.length;) { const c = queue.shift(); for (const t of links.get(c) || []) if (!depth.has(t) && allHtml.has(t)) { depth.set(t, depth.get(c) + 1); queue.push(t); } }
for (const loc of locs) {
  const p = norm(new URL(loc).pathname);
  ok((inbound.get(p)?.size || 0) >= 3, `${p} has only ${inbound.get(p)?.size || 0} internal link(s) from other pages (an orphan or a weakly linked page)`);
  ok(depth.has(p) && depth.get(p) <= 3, `${p} is ${depth.has(p) ? depth.get(p) : 'not reachable'} clicks from the home page (max 3, plain HTML links only)`);
}
// the home page links the hub, both free-tool families, the free samples and the Spanish section in its own HTML
for (const target of ['/destinations/', '/es/', '/free-sample.html', '/packing-list.html', '/best-family-destinations-this-month.html', '/travel-journal.html']) ok(links.get('/').has(target), `the home page does not link ${target} in plain HTML`);
for (const target of ['/es/lista-de-equipaje.html', '/es/mejores-destinos-familiares-este-mes.html', '/es/diario-de-viaje.html', '/es/destinos/']) ok(links.get('/es/').has(target), `the Spanish home does not link ${target}`);
for (const hub of ['/destinations/', '/es/destinos/']) for (const slug of LEGACY_SLUGS) ok(links.get(hub).has(`${hub}${slug}.html`), `${hub} does not link ${slug}`);
for (const target of ['/packing-list.html', '/best-family-destinations-this-month.html', '/travel-journal.html', '/free-sample.html']) ok(links.get('/destinations/').has(target), `the destinations hub does not link ${target}`);
for (const target of ['/es/lista-de-equipaje.html', '/es/mejores-destinos-familiares-este-mes.html', '/es/diario-de-viaje.html']) ok(links.get('/es/destinos/').has(target), `the Spanish hub does not link ${target}`);
// every destination has an English page, a Spanish twin, and each links the other (language switch)
for (const slug of LEGACY_SLUGS) {
  ok(links.get(`/destinations/${slug}.html`).has(`/es/destinos/${slug}.html`) && links.get(`/es/destinos/${slug}.html`).has(`/destinations/${slug}.html`), `${slug}: EN and ES pages do not link each other`);
}

// "More family destinations" on the 50 legacy pages
const guideSources = [];
for (const f of (await readdir(path.join(root, 'destinations', 'guides'))).filter(f => f.endsWith('.json')).sort()) guideSources.push(JSON.parse(await read(`destinations/guides/${f}`)));
ok(guideSources.length >= 40, 'guide sources missing');
for (const slug of LEGACY_SLUGS) ok(LEGACY_REGION[slug], `${slug} has no region in scripts/related-links.mjs`);
for (const slug of LEGACY_SLUGS) {
  const want = legacyRelated(slug, guideSources);
  ok(want.length === RELATED_LEGACY + RELATED_GUIDES, `${slug}: ${want.length} related pages (expected ${RELATED_LEGACY + RELATED_GUIDES})`);
  ok(new Set(want.map(w => w.slug)).size === want.length && !want.some(w => w.slug === slug), `${slug}: related pages repeat or include the page itself`);
  for (const w of want) ok((w.kind === 'legacy' ? LEGACY_REGION[w.slug] : guideSources.find(g => g.slug === w.slug).region) === LEGACY_REGION[slug], `${slug}: ${w.slug} is in another region`);
  for (const [dir, lang] of [['/destinations/', 'en'], ['/es/destinos/', 'es']]) {
    const html = allHtml.get(`${dir}${slug}.html`);
    const block = html.match(/<section class="seo-copy seo-related">([\s\S]*?)<\/section>/)?.[1];
    ok(block, `${dir}${slug}.html has no "More family destinations" block`);
    const hrefs = [...block.matchAll(/<a class="seo-dest" href="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(hrefs, want.map(w => `${dir}${w.slug}.html`), `${dir}${slug}.html: related links differ from scripts/related-links.mjs`);
    checks += 1;
    ok(block.includes(lang === 'es' ? '/es/lista-de-equipaje.html' : '/packing-list.html'), `${dir}${slug}.html: related block lacks the packing-list link`);
  }
}

// ===== 4. IndexNow ============================================================================================================
const keyFile = path.join(root, `${KEY}.txt`);
ok(existsSync(keyFile), `the key file ${KEY}.txt is not in the site root`);
ok((await readFile(keyFile, 'utf8')).trim() === KEY, 'the key file does not contain exactly the key');
ok(/^[A-Za-z0-9-]{8,128}$/.test(KEY), 'the IndexNow key is not valid');
ok(KEY_LOCATION === `https://${HOST}/${KEY}.txt`, 'keyLocation is not the key file at the site root');
ok(HOST === (await read('CNAME')).trim(), 'the IndexNow host is not the site host (CNAME)');
ok(robots.isAllowed(`/${KEY}.txt`), 'robots.txt blocks the key file');
{
  const all = planUrls({ sitemapXml, imageXml, all: true });
  ok(all.length === locs.length, '--all must plan every sitemap page');
  const one = planUrls({ sitemapXml, imageXml, changedFiles: ['destinations/munich.html', 'README.md', 'worker/src/index.js', 'destinations/not-a-page.html'] });
  assert.deepEqual(one.map(p => p.url), [`${SITE}/destinations/munich.html`], 'only changed sitemap pages may be planned');
  assert.deepEqual(planUrls({ sitemapXml, imageXml, changedFiles: ['index.html', 'es/destinos/index.html', 'es/index.html'] }).map(p => p.url), [`${SITE}/`, `${SITE}/es/destinos/`, `${SITE}/es/`]);
  assert.deepEqual(planUrls({ sitemapXml, imageXml, changedFiles: ['scripts/build-sitemaps.mjs', 'styles.css', 'app.js'] }), [], 'a script, css or js change announces nothing');
  const imgPages = planUrls({ sitemapXml, imageXml, changedFiles: ['assets/social/munich-kids-travel-guide.jpg'] });
  assert.deepEqual(imgPages.map(p => p.url), [`${SITE}/destinations/munich.html`], 'a changed image announces the page that lists it');
  const prev = sitemapXml.replace(/(<loc>https:\/\/kidventuro\.com\/destinations\/rome\.html<\/loc><lastmod>)[^<]+/, '$11999-01-01').replace(/<url><loc>https:\/\/kidventuro\.com\/destinations\/paris\.html<\/loc>[\s\S]*?<\/url>\n/, '');
  assert.deepEqual(planUrls({ sitemapXml, imageXml, previousSitemapXml: prev }).map(p => [p.url, p.why]), [[`${SITE}/destinations/rome.html`, 'lastmod changed'], [`${SITE}/destinations/paris.html`, 'new in sitemap']]);
  const recent = planUrls({ sitemapXml, imageXml, days: 1, today: [...stamped.values()].sort().at(-1) });
  ok(recent.length > 0 && recent.length < locs.length, 'the lastmod window must select some, not all, pages');
  ok(planUrls({ sitemapXml, imageXml, all: true }).every(p => p.url.startsWith(`${SITE}/`)), 'only https://kidventuro.com URLs');
  const payload = payloadFor(all.map(p => p.url));
  assert.deepEqual(Object.keys(payload), ['host', 'key', 'keyLocation', 'urlList']);
  ok(payload.urlList.length <= MAX_URLS && fileToUrl('index.html') === `${SITE}/` && fileToUrl('es/destinos/index.html') === `${SITE}/es/destinos/`, 'payload or url mapping is wrong');
  checks += 7;
}
// the script is a dry run unless --apply is given (nothing leaves the machine here)
{
  const out = execFileSync(process.execPath, ['scripts/submit-indexnow.mjs', '--all'], { cwd: root, encoding: 'utf8' });
  ok(out.startsWith('DRY RUN:') && out.includes('Dry run: nothing was sent'), 'submit-indexnow.mjs must default to a dry run');
}
// workflow wiring: runs for the image sitemap too, needs no secret, applies only on push or when asked, has the history it diffs against
{
  const wf = await read('.github/workflows/indexnow.yml');
  ok(wf.includes("'sitemap-images.xml'") && wf.includes("'sitemap.xml'") && wf.includes("'assets/**'") && wf.includes("'**.html'"), 'indexnow.yml does not run for pages, sitemaps and assets');
  ok(!/secrets\./.test(wf), 'indexnow.yml must not need a secret (the key is public)');
  ok(/fetch-depth:\s*0/.test(wf) && wf.includes('--before'), 'indexnow.yml must diff against the push\'s "before" commit');
  ok(/APPLY"\s*=\s*"true"/.test(wf), 'a manual run must be a dry run unless "apply" is ticked');
  const sync = await read('.github/workflows/final-catalog-sync.yml');
  for (const f of ['sitemap-images.xml', 'scripts/sitemap-lastmod.json', 'robots.txt']) ok(sync.includes(f), `final-catalog-sync.yml does not commit ${f}`);
}

console.log(`Indexing checks passed: ${locs.length} sitemap pages, ${imgEntries.length} pages and ${imgEntries.reduce((n, e) => n + e.images.length, 0)} images in the image sitemap, link graph (min ${Math.min(...locs.map(l => inbound.get(norm(new URL(l).pathname)).size))} inbound, max depth ${Math.max(...locs.map(l => depth.get(norm(new URL(l).pathname))))}), IndexNow key and plan rules (${checks} checks).`);
