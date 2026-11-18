// Last step of `npm run generate-seo` (and runnable alone: `npm run build-sitemaps`):
//
//   1. Honest <lastmod> in sitemap.xml. The generators stamp every page with the day they ran, which tells Google that all pages
//      changed daily. A page now gets today's date only when its HTML really changed: scripts/sitemap-lastmod.json remembers the
//      content hash and the date of every sitemap page. (First run: `--seed-from-git` seeds the dates from the git history.)
//   2. sitemap-images.xml: the image sitemap. One <url> per sitemap page that shows images, one <image:image><image:loc> per image
//      the page really contains (<img src>, srcset, og:image, JSON-LD ImageObject), read from the page itself, same host only.
//
// The tree is the source of truth, so change this script (never the output files). test-indexing.mjs pins both outputs.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const SITE = 'https://kidventuro.com';
export const SHARED_CARD = `${SITE}/assets/og-kidventuro.png`;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';

export const fileForUrl = loc => {
  const p = decodeURIComponent(new URL(loc).pathname);
  return p.endsWith('/') ? `${p.slice(1)}index.html` : p.slice(1);
};
export const hashPage = text => createHash('sha1').update(text.replace(/\r\n/g, '\n')).digest('hex');
export const sitemapLocs = xml => [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());

// ---- 1. lastmod ---------------------------------------------------------------------------------------------------------------
// readPage(loc) -> page text. manifest: { "<url path>": { sha1, lastmod } }. Returns the sitemap with every <lastmod> replaced and the new manifest.
export function applyLastmod(xml, manifest, readPage, today) {
  const next = {};
  const out = xml.replace(/<url>(\s*)<loc>([^<]+)<\/loc>(?:<lastmod>[^<]*<\/lastmod>)?/g, (whole, space, loc) => {
    const key = new URL(loc.trim()).pathname;
    const sha1 = hashPage(readPage(loc.trim()));
    const old = manifest[key];
    const lastmod = old && old.sha1 === sha1 ? old.lastmod : today;
    next[key] = { sha1, lastmod };
    return `<url>${space}<loc>${loc}</loc><lastmod>${lastmod}</lastmod>`;
  });
  return { xml: out, manifest: Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b))) };
}

// ---- 2. images ----------------------------------------------------------------------------------------------------------------
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))?.slice(1).find(v => v !== undefined);
const decodeEntities = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// Absolute same-host image URLs of one page, first appearance first, no duplicates, no query string.
export function imagesOfPage(html, loc) {
  const found = [];
  const add = raw => {
    if (!raw) return;
    let u;
    try { u = new URL(decodeEntities(raw.trim()), loc); } catch { return; }
    if (u.origin !== SITE) return;
    const clean = `${SITE}${u.pathname}`;
    if (!/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(u.pathname)) return;
    if (/\/assets\/favicon\.svg$/.test(clean)) return; // an icon, not page content
    if (!found.includes(clean)) found.push(clean);
  };
  const body = html.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  for (const m of body.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    add(attr(m[0], 'src'));
    for (const part of (attr(m[0], 'srcset') || '').split(',')) add(part.trim().split(/\s+/)[0]);
  }
  for (const m of body.matchAll(/<meta\b[^>]*>/gi)) if ((attr(m[0], 'property') || '').toLowerCase() === 'og:image') add(attr(m[0], 'content'));
  for (const m of body.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    const visit = n => {
      if (Array.isArray(n)) return n.forEach(visit);
      if (!n || typeof n !== 'object') return;
      if (n['@type'] === 'ImageObject') { add(n.contentUrl); add(n.url); }
      for (const k of ['image', 'logo', 'primaryImageOfPage']) for (const v of [n[k]].flat()) if (typeof v === 'string') add(v);
      Object.values(n).forEach(visit);
    };
    try { visit(JSON.parse(m[1])); } catch { /* the audit reports invalid JSON-LD */ }
  }
  // The shared brand card is every non-guide page's og:image; like sitemap.xml it is listed for the two home pages only.
  const isHome = loc === `${SITE}/` || loc === `${SITE}/es/`;
  return found.filter(u => isHome || u !== SHARED_CARD);
}

export function buildImageSitemap(entries) {
  const rows = entries.filter(e => e.images.length)
    .map(e => `  <url><loc>${e.loc}</loc>${e.images.map(i => `<image:image><image:loc>${i}</image:loc></image:image>`).join('')}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${NS}>\n${rows.join('\n')}\n</urlset>\n`;
}

// ---- main ---------------------------------------------------------------------------------------------------------------------
export async function buildSitemaps({ root = ROOT, today = process.env.SITEMAP_TODAY || new Date().toISOString().slice(0, 10), seedFromGit = false } = {}) {
  const read = rel => readFile(path.join(root, rel), 'utf8');
  const manifestPath = path.join(root, 'scripts', 'sitemap-lastmod.json');
  let manifest = {};
  if (existsSync(manifestPath)) manifest = JSON.parse(await read('scripts/sitemap-lastmod.json')).pages || {};

  const sitemap = await read('sitemap.xml');
  const locs = sitemapLocs(sitemap);
  const pages = new Map();
  for (const loc of locs) pages.set(loc, (await read(fileForUrl(loc))).replace(/\r\n/g, '\n'));

  if (seedFromGit) {
    manifest = {};
    for (const loc of locs) {
      let date = '';
      try { date = execFileSync('git', ['-c', 'core.quotepath=off', 'log', '-1', '--format=%cs', '--', fileForUrl(loc)], { cwd: root, encoding: 'utf8' }).trim(); } catch { /* not a git tree */ }
      manifest[new URL(loc).pathname] = { sha1: hashPage(pages.get(loc)), lastmod: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today };
    }
  }

  const stamped = applyLastmod(sitemap, manifest, loc => pages.get(loc), today);
  const entries = locs.map(loc => ({ loc, images: imagesOfPage(pages.get(loc), loc) }));
  for (const e of entries) for (const i of e.images) if (!existsSync(path.join(root, fileForUrl(i)))) throw new Error(`${e.loc}: image does not exist in the tree: ${i}`);

  await writeFile(path.join(root, 'sitemap.xml'), stamped.xml, 'utf8');
  await writeFile(manifestPath, `${JSON.stringify({ note: 'Written by scripts/build-sitemaps.mjs: the content hash and lastmod of every sitemap page. A page gets a new lastmod only when its HTML changes.', pages: stamped.manifest }, null, 1)}\n`, 'utf8');
  await writeFile(path.join(root, 'sitemap-images.xml'), buildImageSitemap(entries), 'utf8');
  const images = entries.reduce((n, e) => n + e.images.length, 0);
  console.log(`sitemaps: ${locs.length} pages with honest lastmod, sitemap-images.xml lists ${entries.filter(e => e.images.length).length} pages and ${images} images`);
  return { locs, entries };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildSitemaps({ seedFromGit: process.argv.includes('--seed-from-git') });
}
