// Static audit of everything Google Images and the index need from the built site: image markup, Open Graph / Twitter
// images, JSON-LD, canonicals, hreflang reciprocity, the sitemap (with <image:image> entries) and robots.txt.
//
//   node scripts/audit-seo-images.mjs                          audit the working tree, exit 1 on any error
//   node scripts/audit-seo-images.mjs --live https://kidventuro.com   also fetch sitemap URLs, images and a 404 over HTTP
//
// The tree is the source of truth; the generators (scripts/build-family-guides.mjs, generate-destination-pages.mjs) must
// produce output that passes. Fix the generator, never the generated file. Used by test-seo-images.mjs (part of npm test).
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const SITE = 'https://kidventuro.com';
const SKIP_DIRS = new Set(['node_modules', 'worker', '.git', '.github']);
const LEGAL = /^\/(privacy|terms|refunds)\.html$/;
const RASTER =/\.(png|jpe?g|gif|bmp)$/i;
const BAD_NAME = /^(img|image|photo|picture|screenshot|untitled|dsc|pxl|mvimg)[-_ ]?\d*\.|^\d+\.(png|jpe?g|webp|avif|gif|svg)$|^[0-9a-f]{16,}\.|^(download|unnamed)\b/i;

async function walk(dir, root, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, root, out);
    else out.push(path.relative(root, full).split(path.sep).join('/'));
  }
  return out;
}

export function urlPathFor(file) {
  if (file === 'index.html') return '/';
  if (file.endsWith('/index.html')) return `/${file.slice(0, -'index.html'.length)}`;
  return `/${file}`;
}

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    if (m[1].toLowerCase() === 'img') continue;
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(m => ({ raw: m[0], index: m.index, a: attrs(m[0].replace(new RegExp(`^<${name}`, 'i'), '')) }));
const metaContent = (html, key, val) => tags(html, 'meta').filter(t => (t.a[key] || '').toLowerCase() === val).map(t => t.a.content ?? '');
const linkHrefs = (html, rel) => tags(html, 'link').filter(t => (t.a.rel || '').toLowerCase().split(/\s+/).includes(rel));

// robots.txt matcher for `User-agent: *` (longest match wins, Allow wins a tie), as Google reads it.
export function parseRobots(text) {
  const rules = [];
  let applies = false, sawRule = false;
  for (const line of text.split(/\r?\n/)) {
    const m = line.replace(/#.*/, '').match(/^\s*([A-Za-z-]+)\s*:\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === 'user-agent') { if (sawRule) { applies = false; sawRule = false; } if (m[2] === '*') applies = true; continue; }
    if (!applies) continue;
    if (key === 'allow' || key === 'disallow') { sawRule = true; if (m[2]) rules.push({ allow: key === 'allow', pattern: m[2] }); }
  }
  const toRe = p => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
  const compiled = rules.map(r => ({ ...r, re: toRe(r.pattern), len: r.pattern.replace(/\*/g, '').length }));
  return { isAllowed(p) { let best = null; for (const r of compiled) if (r.re.test(p) && (!best || r.len > best.len || (r.len === best.len && r.allow))) best = r; return !best || best.allow; } };
}

function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

export function parseSitemap(xml) {
  const urls = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    urls.push({ loc: m[1].match(/<loc>([^<]*)<\/loc>/)?.[1]?.trim(), images: [...m[1].matchAll(/<image:image>[\s\S]*?<image:loc>([^<]*)<\/image:loc>[\s\S]*?<\/image:image>/g)].map(i => i[1].trim()) });
  }
  return urls;
}

const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export async function auditSite(root) {
  const errors = [], warnings = [], info = { externalImageHosts: new Set(), pages: 0, indexable: 0, images: 0, sitemapUrls: 0, sitemapImages: 0 };
  const err = (f, msg) => errors.push(`${f}: ${msg}`);
  const warn = (f, msg) => warnings.push(`${f}: ${msg}`);
  const files = await walk(root, root);
  const fileSet = new Set(files);
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  const exists = rel => fileSet.has(rel);
  const localFor = url => {
    if (!url.startsWith(`${SITE}/`) && !url.startsWith('/')) return null;
    const p = decode(url.replace(SITE, '').split(/[?#]/)[0]);
    if (p.endsWith('/')) return `${p.slice(1)}index.html`;
    return p.slice(1);
  };
  const robotsText = exists('robots.txt') ? await readFile(path.join(root, 'robots.txt'), 'utf8') : '';
  const robots = parseRobots(robotsText);
  if (!/^Sitemap:\s*https:\/\/kidventuro\.com\/sitemap\.xml\s*$/m.test(robotsText)) err('robots.txt', 'missing Sitemap: https://kidventuro.com/sitemap.xml');

  const pages = new Map(); // urlPath -> { file, html, indexable }
  for (const file of htmlFiles) {
    const html = await readFile(path.join(root, file), 'utf8');
    const robotsMeta = metaContent(html, 'name', 'robots').join(',').toLowerCase();
    pages.set(urlPathFor(file), { file, html, indexable: !/noindex/.test(robotsMeta), robotsMeta });
  }
  info.pages = pages.size;

  // ---- images, Open Graph, Twitter, JSON-LD, canonical per page
  const imageUrlsByPage = new Map();
  for (const [urlPath, page] of pages) {
    const { file, html } = page;
    const lang = html.match(/<html[^>]*\blang="([^"]+)"/i)?.[1];
    const imgs = tags(html, 'img');
    const pageImages = new Set();
    // The LCP candidate is the first <img> in the document (hero art sits in <main>, before any other image).
    imgs.forEach((img, i) => {
      info.images += 1;
      const a = img.a;
      const src = a.src || '';
      const decorative = a['aria-hidden'] === 'true' || a.role === 'presentation' || a.role === 'none';
      if (!src) { err(file, '<img> without src (JS-only image)'); return; }
      if (/^https?:\/\//i.test(src) && !src.startsWith(`${SITE}/`)) info.externalImageHosts.add(new URL(src).host);
      else if (src.startsWith('data:')) { /* inline, fine */ }
      else {
        const local = localFor(src.startsWith('/') || src.startsWith(SITE) ? src : `${urlPath.replace(/[^/]*$/, '')}${src}`);
        if (local && !exists(local)) err(file, `broken image URL ${src}`);
        if (local && exists(local)) pageImages.add(`${SITE}/${local}`);
      }
      if (!('alt' in a)) err(file, `<img ${src}> has no alt attribute`);
      else if (!a.alt.trim() && !decorative) err(file, `<img ${src}> has empty alt but is not marked decorative`);
      else if (a.alt.trim() && /\.(svg|png|jpe?g|webp|avif)$/i.test(a.alt.trim())) err(file, `<img ${src}> alt looks like a file name`);
      if (!/^\d+$/.test(a.width || '') || !/^\d+$/.test(a.height || '')) err(file, `<img ${src}> needs numeric width and height`);
      const base = decodeURIComponent(src.split(/[?#]/)[0].split('/').pop());
      if (BAD_NAME.test(base)) err(file, `<img ${src}> has a non-descriptive file name`);
      const lazy = (a.loading || '').toLowerCase() === 'lazy';
      if (lazy && (i === 0 || (a.fetchpriority || '').toLowerCase() === 'high')) err(file, `<img ${src}> is the LCP candidate but has loading="lazy"`);
      if (RASTER.test(src.split(/[?#]/)[0])) {
        const before = html.slice(0, img.index);
        const inPicture = before.lastIndexOf('<picture') > before.lastIndexOf('</picture>');
        if (!a.srcset && !inPicture) err(file, `<img ${src}> is a raster image without srcset/<picture> (needs responsive WebP/AVIF)`);
        else if (a.srcset && !a.sizes) err(file, `<img ${src}> has srcset without sizes`);
      }
    });
    if (/<img\b/i.test(html) === false && /document\.createElement\(['"]img['"]\)/.test(html)) warn(file, 'image injected only by inline JS');

    const og = metaContent(html, 'property', 'og:image');
    const tw = metaContent(html, 'name', 'twitter:image');
    const card = metaContent(html, 'name', 'twitter:card');
    if (page.indexable) {
      info.indexable += 1;
      if (og.length !== 1) err(file, `expected exactly one og:image, found ${og.length}`);
      if (tw.length !== 1) err(file, `expected exactly one twitter:image, found ${tw.length}`);
      if (card[0] !== 'summary_large_image') err(file, 'twitter:card must be summary_large_image');
      for (const u of [...og, ...tw]) {
        if (!u.startsWith(`${SITE}/`)) { err(file, `social image must be an absolute kidventuro.com URL: ${u}`); continue; }
        const local = localFor(u);
        if (!exists(local)) { err(file, `social image does not exist: ${u}`); continue; }
        if (!robots.isAllowed(`/${local}`)) err(file, `social image blocked by robots.txt: ${u}`);
        if (/\.png$/i.test(u)) {
          const sz = pngSize(await readFile(path.join(root, local)));
          if (!sz || sz.w !== 1200 || sz.h !== 630) err(file, `social image ${u} must be 1200x630 (is ${sz ? `${sz.w}x${sz.h}` : 'not a PNG'})`);
        } else err(file, `social image should be PNG or JPEG: ${u}`);
      }
      if (og[0] && metaContent(html, 'property', 'og:image:alt').length !== 1) err(file, 'missing og:image:alt');
      if (og[0]) pageImages.add(og[0]);
      if (!lang) err(file, 'missing <html lang>');
      if (!/max-image-preview:large/.test(page.robotsMeta)) err(file, 'robots meta lacks max-image-preview:large (large image previews in Search and Discover)');

      // canonical
      const canon = linkHrefs(html, 'canonical');
      if (canon.length !== 1) err(file, `expected one canonical, found ${canon.length}`);
      else if (canon[0].a.href !== `${SITE}${urlPath}`) err(file, `canonical ${canon[0].a.href} != ${SITE}${urlPath}`);
      if (!robots.isAllowed(urlPath)) err(file, 'indexable page is blocked by robots.txt');
    }

    // JSON-LD
    const lds = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    // Legal notices have no schema.org type that truly applies; every other indexable page must carry JSON-LD.
    if (page.indexable && !lds.length && !LEGAL.test(urlPath)) err(file, 'indexable page has no JSON-LD');
    for (const m of lds) {
      let data;
      try { data = JSON.parse(m[1]); } catch (e) { err(file, `JSON-LD does not parse: ${e.message}`); continue; }
      const nodes = data['@graph'] || [data];
      if (data['@context'] !== 'https://schema.org') err(file, 'JSON-LD @context must be https://schema.org');
      const walkLd = (n) => {
        if (Array.isArray(n)) return n.forEach(walkLd);
        if (!n || typeof n !== 'object') return;
        if (n['@type'] === 'ImageObject' || n.primaryImageOfPage || n.image || n.logo) {
          for (const v of [n['@type'] === 'ImageObject' ? n.url || n.contentUrl : null, n.image, n.logo, n.primaryImageOfPage?.url].flat()) {
            const u = typeof v === 'string' ? v : v?.url;
            if (!u) continue;
            if (!u.startsWith(`${SITE}/`)) { err(file, `JSON-LD image is not a kidventuro.com URL: ${u}`); continue; }
            const local = localFor(u);
            if (!exists(local)) err(file, `JSON-LD image does not exist: ${u}`); else pageImages.add(u);
          }
        }
        Object.values(n).forEach(walkLd);
      };
      nodes.forEach(walkLd);
      const types = nodes.map(n => n['@type']);
      // A page that shows a guide illustration must declare it as an ImageObject; guides must carry the destination schema.
      if (/\/destinations\/|\/destinos\//.test(urlPath) && page.indexable && /<figure class="guide-art"/.test(html)) {
        const primary = nodes.find(n => n['@type'] === 'WebPage')?.primaryImageOfPage;
        if (!primary || primary['@type'] !== 'ImageObject' || !primary.url || !primary.width || !primary.height || !primary.caption) err(file, 'guide primaryImageOfPage must be a full ImageObject (url, width, height, caption)');
        for (const t of ['BreadcrumbList', 'TouristDestination']) if (!types.includes(t)) err(file, `guide JSON-LD lacks ${t}`);
      }
    }
    imageUrlsByPage.set(urlPath, pageImages);
  }

  // ---- hreflang reciprocity (indexable pages only)
  for (const [urlPath, page] of pages) {
    if (!page.indexable) continue;
    const alts = linkHrefs(page.html, 'alternate').filter(t => t.a.hreflang);
    if (!alts.length) continue;
    const self = `${SITE}${urlPath}`;
    const map = new Map(alts.map(t => [t.a.hreflang, t.a.href]));
    if (![...map.values()].includes(self)) err(page.file, 'hreflang set does not include the page itself');
    if (!map.has('x-default')) err(page.file, 'hreflang set has no x-default');
    for (const [hl, href] of map) {
      const target = pages.get(href.replace(SITE, ''));
      if (!target) { err(page.file, `hreflang ${hl} target missing: ${href}`); continue; }
      if (!target.indexable) err(page.file, `hreflang ${hl} target is noindex: ${href}`);
      const back = new Map(linkHrefs(target.html, 'alternate').filter(t => t.a.hreflang).map(t => [t.a.hreflang, t.a.href]));
      if (back.get(hl) !== href) err(page.file, `hreflang not reciprocal: ${href} does not declare ${hl}=${href}`);
      for (const [h2, u2] of map) if (back.get(h2) !== u2) { err(page.file, `hreflang set differs from ${href} for ${h2}`); break; }
    }
  }

  // ---- sitemap
  if (!exists('sitemap.xml')) err('sitemap.xml', 'missing');
  else {
    const xml = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
    if (!/<urlset[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(xml)) err('sitemap.xml', 'missing sitemap namespace');
    if (/<url>/.test(xml) && /<image:image>/.test(xml) && !/xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/.test(xml)) err('sitemap.xml', 'uses <image:image> without the image namespace');
    const entries = parseSitemap(xml);
    info.sitemapUrls = entries.length;
    const seen = new Set(), listed = new Set();
    for (const e of entries) {
      if (!e.loc?.startsWith(`${SITE}/`)) { err('sitemap.xml', `foreign or empty <loc>: ${e.loc}`); continue; }
      if (seen.has(e.loc)) err('sitemap.xml', `duplicate <loc> ${e.loc}`);
      seen.add(e.loc);
      const p = e.loc.replace(SITE, '');
      listed.add(p);
      const page = pages.get(p);
      if (!page) { err('sitemap.xml', `URL has no page in the tree (would 404 or redirect): ${e.loc}`); continue; }
      if (!page.indexable) err('sitemap.xml', `noindex page listed: ${e.loc}`);
      if (!robots.isAllowed(p)) err('sitemap.xml', `URL blocked by robots.txt: ${e.loc}`);
      const expected = imageUrlsByPage.get(p) || new Set();
      for (const img of e.images) {
        info.sitemapImages += 1;
        if (!img.startsWith(`${SITE}/`)) err('sitemap.xml', `image on another host: ${img}`);
        else if (!exists(localFor(img))) err('sitemap.xml', `image does not exist: ${img}`);
        else if (!robots.isAllowed(`/${localFor(img)}`)) err('sitemap.xml', `image blocked by robots.txt: ${img}`);
      }
      // Every image the page really shows (not the shared social card) must be in its sitemap entry.
      for (const img of expected) if (!/og-kidventuro\.png$|favicon\.svg$/.test(img) && !e.images.includes(img)) err('sitemap.xml', `${e.loc} is missing <image:image> for ${img}`);
    }
    for (const [p, page] of pages) if (page.indexable && !listed.has(p) && robots.isAllowed(p)) err('sitemap.xml', `indexable page not in the sitemap: ${p}`);
  }

  // ---- 404 page and CNAME
  const nf = pages.get('/404.html');
  if (!nf) err('404.html', 'missing (GitHub Pages serves it with HTTP 404)');
  else if (nf.indexable) err('404.html', 'must be noindex');

  info.externalImageHosts = [...info.externalImageHosts];
  return { errors, warnings, info, pages };
}

// Live checks: sitemap URLs 200 without redirects, images 200 with an image type, unknown path 404.
export async function auditLive(base, root) {
  const errors = [];
  const get = async (u, method = 'GET') => fetch(u, { method, redirect: 'manual', headers: { 'user-agent': 'kidventuro-seo-audit' } });
  const xml = await (await get(`${base}/sitemap.xml`)).text();
  const entries = parseSitemap(xml);
  const imgs = new Set();
  for (const e of entries) e.images.forEach(i => imgs.add(i));
  const probe = async (u, check) => {
    try { const r = await get(u); const msg = check(r); if (msg) errors.push(`${u}: ${msg}`); await r.arrayBuffer?.(); } catch (e) { errors.push(`${u}: ${e.message}`); }
  };
  const queue = [...entries.map(e => [e.loc, r => (r.status !== 200 ? `HTTP ${r.status}` : /noindex/i.test(r.headers.get('x-robots-tag') || '') ? 'x-robots-tag noindex' : null)]),
    ...[...imgs, `${SITE}/assets/og-kidventuro.png`].map(u => [u, r => (r.status !== 200 ? `HTTP ${r.status}` : !/^image\//.test(r.headers.get('content-type') || '') ? `content-type ${r.headers.get('content-type')}` : null)])];
  for (let i = 0; i < queue.length; i += 12) await Promise.all(queue.slice(i, i + 12).map(([u, c]) => probe(u.replace(SITE, base), c)));
  await probe(`${base}/this-page-does-not-exist-${Date.now()}`, r => (r.status === 404 ? null : `expected 404, got ${r.status}`));
  return { errors, checked: queue.length + 1 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { errors, warnings, info } = await auditSite(root);
  console.log(`pages ${info.pages}, indexable ${info.indexable}, <img> ${info.images}, sitemap URLs ${info.sitemapUrls}, sitemap images ${info.sitemapImages}, external image hosts: ${info.externalImageHosts.join(', ') || 'none'}`);
  for (const w of warnings) console.log(`warn  ${w}`);
  for (const e of errors.slice(0, 60)) console.log(`ERROR ${e}`);
  if (errors.length > 60) console.log(`... ${errors.length - 60} more`);
  let liveErrors = 0;
  const li = process.argv.indexOf('--live');
  if (li > 0) {
    const live = await auditLive(process.argv[li + 1] || SITE, root);
    liveErrors = live.errors.length;
    live.errors.slice(0, 40).forEach(e => console.log(`LIVE ERROR ${e}`));
    console.log(`live: ${live.checked} URLs checked, ${live.errors.length} problems`);
  }
  console.log(`${errors.length} error(s)${liveErrors ? `, ${liveErrors} live problem(s)` : ''}`);
  process.exit(errors.length || liveErrors ? 1 : 0);
}
