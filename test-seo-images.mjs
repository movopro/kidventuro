// Image + indexing audit: the built site must pass scripts/audit-seo-images.mjs, and the audit itself must catch each defect
// class (proved against fixtures, so a green run is not an empty one). Run with `npm --prefix worker test` or directly.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditSite, parseRobots, parseSitemap } from './scripts/audit-seo-images.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));

// ---- 1. the real tree
const real = await auditSite(root);
assert.deepEqual(real.errors.slice(0, 20), [], `${real.errors.length} image/indexing problem(s) in the built site`);
assert.ok(real.info.pages > 250 && real.info.images >= 80, 'audit must actually see the pages and images');
assert.ok(real.info.sitemapImages >= 80, 'sitemap must list the guide images');
assert.deepEqual(real.info.externalImageHosts, [], 'images must be served from kidventuro.com');

// ---- 2. fixtures: a clean mini site, then one defect at a time
const SITE = 'https://kidventuro.com';
const png = Buffer.alloc(33); png.writeUInt32BE(0x89504e47, 0); png.writeUInt32BE(1200, 16); png.writeUInt32BE(630, 20);
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><title>x</title></svg>';
const head = (p, { robots = 'index,follow,max-image-preview:large', og = `${SITE}/assets/og-kidventuro.png`, extra = '' } = {}) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title>
<meta name="robots" content="${robots}"><link rel="canonical" href="${SITE}${p}">
<link rel="alternate" hreflang="en" href="${SITE}${p}"><link rel="alternate" hreflang="x-default" href="${SITE}${p}">
${og ? `<meta property="og:image" content="${og}"><meta property="og:image:alt" content="card"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${og}">` : ''}
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"t"}</script>${extra}</head>`;
const IMG = '<img src="/assets/destinations/rome-postcard.svg" width="1200" height="675" alt="Illustrated postcard of Rome" fetchpriority="high">';
const goodSitemap = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>${SITE}/</loc></url><url><loc>${SITE}/rome.html</loc><image:image><image:loc>${SITE}/assets/destinations/rome-postcard.svg</image:loc></image:image></url></urlset>`;
const clean = () => ({
  'index.html': `${head('/')}<body><h1>Home</h1></body></html>`,
  'rome.html': `${head('/rome.html')}<body><main>${IMG}</main></body></html>`,
  '404.html': `${head('/404.html', { robots: 'noindex', og: '' })}<body></body></html>`,
  'assets/og-kidventuro.png': png,
  'assets/destinations/rome-postcard.svg': svg,
  'sitemap.xml': goodSitemap,
  'robots.txt': `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`
});
// A minimal JPEG header (SOI + SOF0 with the frame size) padded to a given length: all the audit reads is size and byte count.
const jpeg = (w, h, bytes = 4000) => { const b = Buffer.alloc(bytes); b.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08], 0); b.writeUInt16BE(h, 7); b.writeUInt16BE(w, 9); return b; };
const CARD = `${SITE}/assets/social/rome-kids-travel-guide.jpg`, CARD_ES = `${SITE}/assets/social/es/rome-guia-viaje-ninos.jpg`;
// A destination guide (EN) with its own card, listed in the image sitemap together with the card.
const withGuide = (f, { og = CARD, tw = og, sitemapCard = true } = {}) => {
  f['destinations/rome.html'] = head('/destinations/rome.html', { og }).replace(`<meta name="twitter:image" content="${og}">`, `<meta name="twitter:image" content="${tw}">`) + '<body><main></main></body></html>';
  f['assets/social/rome-kids-travel-guide.jpg'] = jpeg(1200, 630);
  f['sitemap.xml'] = f['sitemap.xml'].replace('</urlset>', `<url><loc>${SITE}/destinations/rome.html</loc>${sitemapCard ? `<image:image><image:loc>${CARD}</image:loc></image:image>` : ''}</url></urlset>`);
};
const OFFER = '{"@type":"Offer","price":"5.90","shippingDetails":{"@type":"OfferShippingDetails"},"hasMerchantReturnPolicy":{"@type":"MerchantReturnPolicy"}}';
const productPage = (image, offer) => head('/rome.html').replace('{"@context":"https://schema.org","@type":"WebPage","name":"t"}',
  JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: 'P', ...(image ? { image } : {}), offers: '__O__' }).replace('"__O__"', offer)) + '<body></body></html>';
// Same shape as the Product list launch-polish.js injects at run time.
const INJECTED = `(()=>{ const jsonLd=document.createElement('script');
    jsonLd.type='application/ld+json'; jsonLd.textContent=JSON.stringify({'@context':'https://schema.org','@type':'ItemList',itemListElement:[{'@type':'ListItem',position:1,item:{'@type':'Product',name:'N',image:SITE+'/assets/og-kidventuro.png',offers:${OFFER}}}]});
    document.head.appendChild(jsonLd);`;
async function audit(mutate) {
  const files = clean(); mutate(files);
  const dir = await mkdtemp(path.join(tmpdir(), 'kv-seo-'));
  try {
    for (const [rel, body] of Object.entries(files)) {
      if (body === null) continue;
      await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
      await writeFile(path.join(dir, rel), body);
    }
    return (await auditSite(dir)).errors;
  } finally { await rm(dir, { recursive: true, force: true }); }
}
const page = (img) => f => { f['rome.html'] = `${head('/rome.html')}<body><main>${img}</main></body></html>`; };

assert.deepEqual(await audit(() => {}), [], 'the clean fixture must pass');
assert.deepEqual(await audit(f => withGuide(f)), [], 'a guide page with its own card, listed in the sitemap, must pass');
assert.deepEqual(await audit(f => { f['rome.html'] = productPage(`${SITE}/assets/og-kidventuro.png`, OFFER); }), [], 'a complete Product must pass');
const cases = [
  ['guide page on the shared card', f => withGuide(f, { og: `${SITE}/assets/og-kidventuro.png` }), /must use its own social card/],
  ['guide page on another destination\'s card', f => { withGuide(f, { og: `${SITE}/assets/social/paris-kids-travel-guide.jpg` }); f['assets/social/paris-kids-travel-guide.jpg'] = jpeg(1200, 630); }, /must use its own social card/],
  ['guide card is not 1200x630', f => { withGuide(f); f['assets/social/rome-kids-travel-guide.jpg'] = jpeg(1200, 600); }, /must be 1200x630/],
  ['guide card over the byte budget', f => { withGuide(f); f['assets/social/rome-kids-travel-guide.jpg'] = jpeg(1200, 630, 160 * 1024); }, /budget/],
  ['guide card not in the image sitemap', f => withGuide(f, { sitemapCard: false }), /missing <image:image>/],
  ['guide twitter:image differs from og:image', f => withGuide(f, { tw: `${SITE}/assets/og-kidventuro.png` }), /twitter:image must equal og:image/],
  ['missing alt', page(IMG.replace(/ alt="[^"]*"/, '')), /no alt attribute/],
  ['empty alt', page(IMG.replace(/alt="[^"]*"/, 'alt=""')), /empty alt/],
  ['missing width', page(IMG.replace(' width="1200"', '')), /numeric width and height/],
  ['missing height', page(IMG.replace(' height="675"', '')), /numeric width and height/],
  ['lazy LCP image', page(IMG.replace('fetchpriority="high"', 'loading="lazy"')), /LCP candidate but has loading="lazy"/],
  ['broken image URL', page(IMG.replace('rome-postcard', 'nope')), /broken image URL/],
  ['non-descriptive file name', f => { f['assets/destinations/IMG_0042.jpg'] = png; f['rome.html'] = `${head('/rome.html')}<body>${IMG.replace('rome-postcard.svg', 'IMG_0042.jpg')}</body></html>`; }, /non-descriptive file name/],
  ['raster without srcset', f => { f['assets/destinations/rome-postcard.png'] = png; f['rome.html'] = `${head('/rome.html')}<body>${IMG.replace('.svg', '.png')}</body></html>`; }, /raster image without srcset/],
  ['missing og:image', f => { f['rome.html'] = `${head('/rome.html', { og: '' })}<body></body></html>`; }, /exactly one og:image/],
  ['og:image not on the domain', f => { f['rome.html'] = `${head('/rome.html', { og: 'https://cdn.example.com/c.png' })}<body></body></html>`; }, /absolute kidventuro\.com URL/],
  ['og:image file missing', f => { f['rome.html'] = `${head('/rome.html', { og: `${SITE}/assets/gone.png` })}<body></body></html>`; }, /does not exist/],
  ['og:image wrong size', f => { const b = Buffer.from(png); b.writeUInt32BE(600, 16); f['assets/og-kidventuro.png'] = b; }, /must be 1200x630/],
  ['no max-image-preview', f => { f['rome.html'] = `${head('/rome.html', { robots: 'index,follow' })}<body></body></html>`; }, /max-image-preview/],
  ['invalid JSON-LD', f => { f['rome.html'] = f['rome.html'].replace('"name":"t"}', '"name":"t"'); }, /JSON-LD does not parse/],
  ['wrong canonical', f => { f['rome.html'] = f['rome.html'].replace(`rel="canonical" href="${SITE}/rome.html"`, `rel="canonical" href="${SITE}/other.html"`); }, /canonical .* !=/],
  ['hreflang target missing', f => { f['rome.html'] = f['rome.html'].replace('<script', `<link rel="alternate" hreflang="es" href="${SITE}/es/rome.html"><script`); }, /hreflang es target missing/],
  ['hreflang not reciprocal', f => {
    f['es/rome.html'] = `${head('/es/rome.html')}<body></body></html>`;
    f['rome.html'] = f['rome.html'].replace('<script', `<link rel="alternate" hreflang="es" href="${SITE}/es/rome.html"><script`);
    f['sitemap.xml'] = f['sitemap.xml'].replace('</urlset>', `<url><loc>${SITE}/es/rome.html</loc></url></urlset>`); }, /not reciprocal/],
  ['sitemap URL without a page', f => { f['sitemap.xml'] = f['sitemap.xml'].replace('</urlset>', `<url><loc>${SITE}/ghost.html</loc></url></urlset>`); }, /no page in the tree/],
  ['noindex page in the sitemap', f => { f['sitemap.xml'] = f['sitemap.xml'].replace('</urlset>', `<url><loc>${SITE}/404.html</loc></url></urlset>`); }, /noindex page listed/],
  ['sitemap image on another host', f => { f['sitemap.xml'] = f['sitemap.xml'].replace(`${SITE}/assets/destinations/rome-postcard.svg`, 'https://cdn.example.com/rome.svg'); }, /image on another host/],
  ['sitemap lacks the page image', f => { f['sitemap.xml'] = goodSitemap.replace(/<image:image>.*<\/image:image>/, ''); }, /missing <image:image>/],
  ['indexable page missing from the sitemap', f => { f['sitemap.xml'] = goodSitemap.replace(/<url><loc>[^<]*\/<\/loc><\/url>/, ''); }, /not in the sitemap/],
  ['image blocked by robots.txt', f => { f['robots.txt'] += 'Disallow: /assets/\nAllow: /assets/og-kidventuro.png\n'; }, /image blocked by robots/],
  ['page blocked by robots.txt', f => { f['robots.txt'] += 'Disallow: /rome.html\n'; }, /blocked by robots/],
  ['Product without image', f => { f['rome.html'] = productPage(null, OFFER); }, /Product "P" has no image/],
  ['Product image on another host', f => { f['rome.html'] = productPage('https://cdn.example.com/p.png', OFFER); }, /image must be an absolute kidventuro\.com URL/],
  ['Product image file missing', f => { f['rome.html'] = productPage(`${SITE}/assets/gone.png`, OFFER); }, /image does not exist/],
  ['Product offer without shipping/return policy', f => { f['rome.html'] = productPage(`${SITE}/assets/og-kidventuro.png`, '{"@type":"Offer","price":"5.90"}'); }, /lacks shippingDetails/],
  ['injected Product list without image', f => { f['launch-polish.js'] = INJECTED.replace("image:SITE+'/assets/og-kidventuro.png',", ''); }, /Product "N" has no image/],
  ['404 page missing', f => { f['404.html'] = null; }, /404\.html: missing/],
  ['404 page indexable', f => { f['404.html'] = `${head('/404.html')}<body></body></html>`; }, /must be noindex/]
];
for (const [name, mutate, expected] of cases) {
  const errors = await audit(mutate);
  assert.ok(errors.some(e => expected.test(e)), `audit did not catch "${name}" (got: ${errors.join(' | ') || 'nothing'})`);
}

// ---- 3. helpers
const rb = parseRobots('User-agent: *\nDisallow: /d/\nAllow: /d/$\nAllow: /d/ok.html\nAllow: /d/*.js\n');
assert.ok(rb.isAllowed('/d/') && rb.isAllowed('/d/ok.html') && rb.isAllowed('/d/a.js') && !rb.isAllowed('/d/stub.html') && rb.isAllowed('/x'));
assert.equal(parseSitemap(goodSitemap).length, 2);

console.log(`Image + indexing audit passed: ${real.info.pages} pages, ${real.info.indexable} indexable, ${real.info.images} images, ${real.info.sitemapImages} sitemap images, ${cases.length} defect classes caught.`);
