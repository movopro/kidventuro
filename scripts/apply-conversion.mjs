// Adds the conversion layer to every destination page (idempotent, marker-delimited, safe to re-run after generate-seo):
//   - offer bar (hidden unless the launch offer is running), quick-buy form, trust block, real sample pages, free sample PDF
//   - hero CTA now points at the order form on the same page
// Run: node scripts/apply-conversion.mjs      (called by `npm run generate-seo` after the generators)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'destinations');
const SAMPLED = ['orlando', 'paris', 'london', 'rome', 'barcelona', 'vienna', 'prague', 'dubai', 'rovaniemi', 'reykjavik'];
const SEASON = [['Orlando', 'orlando'], ['Paris', 'paris'], ['London', 'london'], ['Rome', 'rome'], ['Barcelona', 'barcelona'], ['Vienna', 'vienna'], ['Prague', 'prague'], ['Dubai', 'dubai'], ['Rovaniemi', 'rovaniemi'], ['Reykjavik', 'reykjavik']];
const V = '20261018';
const HERO = /(<section class="(?:seo-hero|guide-hero)">[\s\S]*?<\/section>)/;
const START = '<!-- kv-conversion:start -->';
const END = '<!-- kv-conversion:end -->';
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const offerBar = '<div class="kv-offer-bar kv-scope" data-kv-offer><span><b><span data-kv-percent>30</span>% off</b> your first trip pack · code <span class="kv-code" data-kv-code>FIRSTTRIP</span></span><span>ends in <span class="kv-countdown" data-kv-countdown>3d 00h 00m 00s</span></span></div>';

function gallery(slug, dest) {
  const has = SAMPLED.includes(slug);
  const g = has ? slug : 'rome';
  const label = has ? dest : 'Rome';
  const img = (kind, caption) => `<figure><img data-kv-sample-img="${kind}" src="/assets/samples/${g}-${kind}.webp" width="1172" height="1658" alt="${esc(label)} sample page: ${caption.toLowerCase()}"${kind === "cover" ? "" : " loading=\"lazy\""}><figcaption>${caption}</figcaption></figure>`;
  const note = has ? `Real pages from a ${esc(dest)} pack made for “Mia”, age 7.` : `Real sample pages (shown for Rome). Your pack is built for ${esc(dest)}, with your child's name.`;
  return `<div class="kv-gallery">${img('cover', 'Personalized cover')}${img('bingo', 'Travel bingo')}${img('puzzle', 'Word search')}${img('cert', 'Explorer certificate')}</div><p class="kv-page-cap">${note}</p>`;
}

function block(slug, dest) {
  const sampleSlug = SAMPLED.includes(slug) ? slug : 'rome';
  const sampleName = SAMPLED.includes(slug) ? dest : 'Rome';
  return `${START}
      <section class="kv-block kv-scope" id="get-pack">
        <div class="kv-buy">
          <div>
            <h2>Get the ${esc(dest)} pack</h2>
            <p>25 printable pages with your child's name, age and favourite thing. Ready in minutes, print at home.</p>
            <ul class="kv-trust">
              <li>25 A4 pages for ages 4–12</li>
              <li>One-time purchase, no app, no subscription</li>
              <li>Opens right after payment, then Print / Save as PDF</li>
              <li>Fix or refund if something goes wrong</li>
            </ul>
            <p class="kv-fine" style="margin:14px 0 0;font-size:.9rem">Quick pack (10 pages) from <span data-kv-price="mini">€5.90</span>, Family pack (up to 3 kids) <span data-kv-price="family">€14.90</span>. <a href="/#pricing">Compare packs</a></p>
          </div>
          <div data-kv-quickbuy data-destination="${esc(dest)}"></div>
        </div>
        ${gallery(slug, dest)}
        <a class="kv-sample-cta" href="/assets/samples/${sampleSlug}-free-sample.pdf" data-kv-sample download>Free ${esc(sampleName)} sample page (PDF)</a>
      </section>
      ${END}`;
}

let changed = 0, skipped = 0;
for (const file of fs.readdirSync(DIR).filter(f => f.endsWith('.html'))) {
  const full = path.join(DIR, file);
  const raw = fs.readFileSync(full, 'utf8');
  const crlf = raw.includes('\r\n');
  let s = raw.replace(/\r\n/g, '\n');
  const prev = s.match(/data-kv-quickbuy data-destination="([^"]+)"/);                 // destination from an earlier run
  s = s.replace(new RegExp(`\\s*${START}[\\s\\S]*?${END}`, 'g'), '');          // drop any previous block
  s = s.replace(/<link rel="stylesheet" href="\/conversion\.css[^>]*>\n?\s*/g, '').replace(/<script src="\/quickbuy\.js[^>]*><\/script>\n?\s*/g, '').replace(/<div class="kv-offer-bar[\s\S]*?<\/div>\n?\s*/g, '');
  const slug = file.replace(/\.html$/, '');

  if (slug === 'index') {                                                     // destinations hub
    const chips = SEASON.map(([d, sl]) => `<a href="/destinations/${sl}.html?utm_source=site&amp;utm_medium=hub&amp;utm_campaign=season">${d}</a>`).join('');
    const hub = `${START}
      <section class="kv-block kv-scope">
        <h2>Autumn break, Christmas and New Year trips</h2>
        <p>The destinations families are booking right now. Each page has a free sample page and a pack you can order in two taps.</p>
        <div class="kv-season">${chips}</div>
      </section>
      ${END}`;
    if (!HERO.test(s)) { skipped++; continue; }
    s = s.replace(HERO, `$1\n      ${hub}`);
  } else {
    const m = s.match(/<a class="seo-cta" href="\/\?destination=([^#"]+)#create">/);
    const dest = m ? decodeURIComponent(m[1]).replace(/\+/g, ' ') : (prev ? prev[1].replace(/&amp;/g, '&') : '');
    if (!dest || !HERO.test(s)) { skipped++; continue; }
    s = s.replace(/<a class="seo-cta" href="(?:\/\?destination=[^#"]+#create|#get-pack)">[^<]*<\/a>/g, `<a class="seo-cta" href="#get-pack">Get the ${esc(dest)} pack</a>`);
    s = s.replace(HERO, `$1\n      ${block(slug, dest)}`);
  }
  s = s.replace('</head>', '  <link rel="stylesheet" href="/conversion.css?v=' + V + '">\n</head>');
  s = s.replace(/<body[^>]*>\n?/, m => m.replace(/\n$/, '') + '\n  ' + offerBar + '\n');
  s = s.replace(/(<script src="[./]*analytics\.js[^>]*><\/script>)/, `$1\n  <script src="/quickbuy.js?v=${V}" defer></script>`);
  if (!s.includes('/quickbuy.js')) { skipped++; continue; }
  fs.writeFileSync(full, crlf ? s.replace(/\n/g, '\r\n') : s);
  changed++;
}
console.log(`conversion layer applied to ${changed} destination pages (${skipped} skipped)`);

// Image sitemap: every sample page image used on a page is listed under that page's <url> (test-seo-images enforces it).
{
  const smPath = path.join(ROOT, 'sitemap.xml');
  const raw = fs.readFileSync(smPath, 'utf8');
  const crlf = raw.includes('\r\n');
  let sm = raw.replace(/\r\n/g, '\n');
  let added = 0;
  if (!sm.includes('<loc>https://kidventuro.com/free-sample.html</loc>')) sm = sm.replace('</urlset>', '  <url><loc>https://kidventuro.com/free-sample.html</loc><lastmod>2026-10-18</lastmod></url>\n</urlset>');
  sm = sm.replace(/<url><loc>(https:\/\/kidventuro\.com\/([^<]*))<\/loc>([\s\S]*?)<\/url>/g, (whole, url, rel, rest) => {
    const file = rel === '' ? 'index.html' : rel.endsWith('/') ? rel + 'index.html' : rel;
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full) || rel.startsWith('es/')) return whole;
    const html = fs.readFileSync(full, 'utf8');
    const imgs = [...new Set([...html.matchAll(/src="(\/assets\/samples\/[^"]+\.webp)"/g)].map(m => 'https://kidventuro.com' + m[1]))];
    let extra = '';
    for (const i of imgs) if (!whole.includes(`<image:loc>${i}</image:loc>`)) { extra += `<image:image><image:loc>${i}</image:loc></image:image>`; added++; }
    return extra ? `<url><loc>${url}</loc>${rest}${extra}</url>` : whole;
  });
  fs.writeFileSync(smPath, crlf ? sm.replace(/\n/g, '\r\n') : sm);
  console.log(`sitemap: ${added} sample image entries added`);
}
