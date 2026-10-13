// Social cards (1200x630) for every destination guide: single source of truth for names, files, URLs, alt text and the
// card layout. Pure of any native dependency, so the page generators (build-family-guides.mjs,
// generate-destination-pages.mjs), the audit and the test can all import it; only render.mjs needs resvg + sharp.
//
// Card = brand colours + destination name + tagline on the left, the destination's own postcard illustration (the same art
// the guide page shows, assets/destinations/<slug>.svg, or the same engine for the 50 legacy pages) in a tilted frame on the right.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postcard } from '../postcard-art.mjs';

export const SITE = 'https://kidventuro.com';
export const CARD_W = 1200;
export const CARD_H = 630;
export const MAX_BYTES = 150 * 1024;
export const SOCIAL_DIR = 'assets/social';
export const MANIFEST = `${SOCIAL_DIR}/manifest.json`;
export const SHARED_CARD = 'assets/og-kidventuro.png';
export const SHARED_CARD_SVG = 'assets/og-kidventuro.svg';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// The 50 paid "legacy" destinations (short generated pages) and the scene of the postcard used on their card. The ORDER is the
// order generate-supported-destination-pages.mjs feeds to the legacy generator (it decides the sitemap order): do not sort.
export const LEGACY_SCENES = {
  rome: 'city', paris: 'city', london: 'city', barcelona: 'coast', dubai: 'desert', amsterdam: 'canals', vienna: 'city',
  prague: 'city', berlin: 'city', lisbon: 'coast', athens: 'temple', istanbul: 'city', 'new-york': 'city', orlando: 'island',
  tokyo: 'temple', kyoto: 'temple', singapore: 'island', sydney: 'coast', copenhagen: 'canals', budapest: 'city', venice: 'canals',
  florence: 'city', madrid: 'city', bangkok: 'temple', reykjavik: 'snow', munich: 'mountains', salzburg: 'mountains', zurich: 'lake',
  brussels: 'city', bruges: 'canals', dublin: 'coast', edinburgh: 'city', stockholm: 'canals', oslo: 'coast', helsinki: 'coast',
  milan: 'city', naples: 'coast', seville: 'city', valencia: 'coast', porto: 'coast', nice: 'coast', dubrovnik: 'coast',
  krakow: 'city', warsaw: 'city', bucharest: 'city', sofia: 'mountains', 'abu-dhabi': 'desert', seoul: 'temple',
  'hong-kong': 'city', 'kuala-lumpur': 'city'
};
export const LEGACY_SLUGS = Object.keys(LEGACY_SCENES);

export const LANGS = ['en', 'es'];
export const cardFile = (slug, lang) => (lang === 'es' ? `${SOCIAL_DIR}/es/${slug}-guia-viaje-ninos.jpg` : `${SOCIAL_DIR}/${slug}-kids-travel-guide.jpg`);
export const cardUrl = (slug, lang) => `${SITE}/${cardFile(slug, lang)}`;
export const cardAlt = (name, lang) => (lang === 'es'
  ? `Tarjeta de la guía de viaje con niños a ${name}: ilustración y aventura imprimible de Kidventuro`
  : `${name} family travel guide card with an illustration and Kidventuro's printable kids adventure`);
export const sharedCardAlt = lang => (lang === 'es'
  ? 'Kidventuro, aventuras de viaje imprimibles y personalizadas para niños' : 'Kidventuro printable travel adventures for kids');

const T = {
  en: { kicker: 'PRINTABLE TRAVEL ADVENTURE', ages: 'AGES', foot: 'kidventuro.com' },
  es: { kicker: 'AVENTURA DE VIAJE IMPRIMIBLE', ages: 'EDADES', foot: 'kidventuro.com/es' }
};

const readJson = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const readDestinationData = () => JSON.parse(readFileSync(path.join(ROOT, 'destinations/destination-data.js'), 'utf8').match(/^window\.KIDVENTURO_DESTINATION_SEO=(\{.*\});\s*$/s)[1]);

// Every destination guide that gets a card, both languages. Reads the committed data, never the network.
export function guideSpecs() {
  const data = readDestinationData();
  const guides = new Map();
  for (const g of readJson('destinations/guide-index.json')) guides.set(g.slug, g);
  const specs = [];
  const add = (slug, scene, art, nameEn, nameEs, kind) => {
    const d = data[slug];
    if (!d) throw new Error(`destination-data.js has no entry for ${slug}`);
    for (const lang of LANGS) {
      specs.push({ slug, lang, kind, scene, art, name: lang === 'es' ? nameEs : nameEn, tagline: d[lang], file: cardFile(slug, lang), url: cardUrl(slug, lang) });
    }
  };
  for (const slug of LEGACY_SLUGS) add(slug, LEGACY_SCENES[slug], 'generated', data[slug]?.name, data[slug]?.name, 'legacy');
  for (const [slug, g] of guides) add(slug, g.scene, 'file', g.name, g.nameEs || g.name, 'guide');
  return specs;
}

// Total number of destinations the site sells: the figure for the home page copy and the shared card.
export const destinationCount = () => LEGACY_SLUGS.length + readJson('destinations/guide-index.json').length;

export function artFor(spec) {
  if (spec.art === 'file') return readFileSync(path.join(ROOT, 'assets/destinations', `${spec.slug}.svg`), 'utf8').replace(/\r\n/g, '\n');
  return postcard({ slug: spec.slug, name: spec.name, scene: spec.scene });
}

const esc = v => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";

// Greedy line packing on '•' separated phrases first (a bullet never starts a line), then on spaces.
export function wrapTagline(text, maxWidth, measure, size) {
  const parts = text.split(' • ');
  const lines = [];
  let cur = '';
  for (const p of parts) {
    const next = cur ? `${cur} • ${p}` : p;
    if (!cur || measure(next, size, 600) <= maxWidth) cur = next; else { lines.push(cur); cur = p; }
  }
  lines.push(cur);
  return lines;
}

// Name: one line as large as fits (max 112px); if that is under 80px and the name has spaces, balance it over two lines.
export function fitName(name, maxWidth, measure) {
  const fit = (s, from, to) => { for (let sz = from; sz >= to; sz -= 2) if (measure(s, sz, 800) <= maxWidth) return sz; return 0; };
  const single = fit(name, 112, 56);
  if (single >= 80 || !name.includes(' ')) return { lines: [name], size: single || 56 };
  const words = name.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(measure(a, 100, 800), measure(b, 100, 800));
    if (!best || w < best.w) best = { lines: [a, b], w };
  }
  const sz = fit(best.lines.reduce((x, y) => (measure(x, 100, 800) >= measure(y, 100, 800) ? x : y)), 96, 56);
  return { lines: best.lines, size: Math.max(sz, 56) };
}

// The card as SVG. `measure(text, size, weight)` returns the rendered width in px (render.mjs measures with resvg).
export function cardSvg(spec, measure) {
  const t = T[spec.lang];
  const LEFT = 64, TEXT_W = 520;
  const name = fitName(spec.name, TEXT_W, measure);
  const lh = Math.round(name.size * 1.0);
  const firstBase = name.lines.length === 1 ? 292 : 262;
  const nameSvg = name.lines.map((l, i) => `<text x="${LEFT}" y="${firstBase + i * lh}" font-family="${FONT}" font-size="${name.size}" font-weight="800" letter-spacing="-1.5" fill="#20312f">${esc(l)}</text>`).join('');
  const tagBase = firstBase + (name.lines.length - 1) * lh + 58;
  const tagLines = wrapTagline(spec.tagline, TEXT_W, measure, 28).slice(0, 3);
  const tagSvg = tagLines.map((l, i) => `<text x="${LEFT}" y="${tagBase + i * 40}" font-family="${FONT}" font-size="28" font-weight="600" fill="#526762">${esc(l)}</text>`).join('');

  // Postcard frame: clip the destination art into a rounded window, scale to cover it, centre-crop.
  const FW = 468, FH = 392, scale = Math.max(FW / 1200, FH / 675);
  const art = artFor(spec).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title[^>]*>.*?<\/title>/, '')
    .replace(/<rect x="14" y="14"[^>]*stroke-dasharray[^>]*\/>/, '');
  const ax = -((1200 * scale - FW) / 2), ay = -((675 * scale - FH) / 2);
  const frame = `<g transform="translate(884 318) rotate(4)" filter="url(#shadow)">
    <rect x="-262" y="-224" width="524" height="448" rx="26" fill="#fff" stroke="#eadfd2" transform="rotate(-9 0 0)"/>
    <rect x="-248" y="-212" width="496" height="424" rx="26" fill="#fffaf3" stroke="#d9cbbc" stroke-width="2"/>
    <g transform="translate(${-FW / 2} ${-FH / 2 - 4})"><clipPath id="win"><rect width="${FW}" height="${FH}" rx="16"/></clipPath>
      <g clip-path="url(#win)"><g transform="translate(${ax.toFixed(2)} ${ay.toFixed(2)}) scale(${scale.toFixed(5)})">${art}</g></g></g>
    <g transform="translate(-206 168) rotate(-8)"><circle r="50" fill="#df6c42" stroke="#fffaf3" stroke-width="6"/>
      <text y="-13" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="800" letter-spacing="2" fill="#fff">${t.ages}</text>
      <text y="22" text-anchor="middle" font-family="${FONT}" font-size="31" font-weight="800" fill="#fff">4–12</text></g>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8ef"/><stop offset="1" stop-color="#eaf6f2"/></linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#20312f" flood-opacity=".2"/></filter>
  </defs>
  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#bg)"/>
  <circle cx="1090" cy="70" r="170" fill="#f7c66d" opacity=".5"/>
  <path d="M0 560 C240 500 380 620 640 560 S1000 500 1200 556 V630 H0Z" fill="#d9efe7"/>
  <path d="M0 596 C260 546 420 650 700 590 S1020 560 1200 600 V630 H0Z" fill="#b9ded3"/>
  <g transform="translate(${LEFT} 52)"><rect width="52" height="52" rx="16" fill="#df6c42"/>
    <text x="26" y="37" text-anchor="middle" font-family="${FONT}" font-size="31" font-weight="800" fill="#fff">K</text>
    <text x="68" y="38" font-family="${FONT}" font-size="30" font-weight="800" fill="#20312f">Kidventuro</text></g>
  <text x="${LEFT}" y="${firstBase - name.size - 14}" font-family="${FONT}" font-size="17" font-weight="800" letter-spacing="3.5" fill="#df6c42">${esc(t.kicker)}</text>
  ${nameSvg}
  ${tagSvg}
  <text x="${LEFT}" y="588" font-family="${FONT}" font-size="22" font-weight="800" fill="#20312f">${esc(t.foot)}</text>
  ${frame}
</svg>
`;
}

// ---- manifest + input hashing (pure: the test recomputes these without any renderer installed)
const sha256 = b => createHash('sha256').update(b).digest('hex');
export const fileSha256 = rel => sha256(readFileSync(path.join(ROOT, rel)));
// Source files are hashed with LF endings: a Windows checkout (CRLF) and CI (LF) must agree on "is this card current".
const sourceSha256 = rel => (rel.endsWith('.ttf') ? fileSha256(rel) : sha256(readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')));
// Everything that influences a card's pixels except the data: this file, the art engine, the renderer and the fonts.
export function rendererFingerprint() {
  const files = ['scripts/social-cards/cards-lib.mjs', 'scripts/social-cards/render.mjs', 'scripts/postcard-art.mjs',
    'scripts/social-cards/fonts/Inter_800ExtraBold.ttf', 'scripts/social-cards/fonts/Inter_600SemiBold.ttf'];
  return sha256(files.map(f => sourceSha256(f)).join('\n'));
}
export const specInputHash = (spec, fingerprint = rendererFingerprint()) =>
  sha256(JSON.stringify([fingerprint, spec.slug, spec.lang, spec.name, spec.tagline, spec.scene, sha256(artFor(spec))]));
export const readManifest = () => { try { return readJson(MANIFEST); } catch { return null; } };
