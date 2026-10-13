// Renders the per-destination social cards (assets/social/**.jpg, 1200x630) and the shared brand card (assets/og-kidventuro.png).
//
//   npm --prefix scripts/social-cards ci        once (resvg + sharp, dev-time only; the JPEGs are committed, CI never renders)
//   node scripts/social-cards/render.mjs        render what is missing or stale, rewrite assets/social/manifest.json
//   node scripts/social-cards/render.mjs --check   write nothing; exit 1 if a card is missing or stale (no renderer needed)
//   node scripts/social-cards/render.mjs --force   re-render everything
//
// Deterministic and idempotent: a card is rendered only when the hash of its inputs (data, art, layout code, renderer, fonts)
// differs from the manifest or the file is missing; the same inputs always give the same bytes. Fonts are bundled (Inter, OFL),
// system fonts are never loaded, so the output does not depend on the machine.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ROOT, CARD_W, CARD_H, MAX_BYTES, SOCIAL_DIR, MANIFEST, SHARED_CARD, SHARED_CARD_SVG,
  guideSpecs, cardSvg, specInputHash, rendererFingerprint, readManifest, destinationCount
} from './cards-lib.mjs';

const abs = rel => path.join(ROOT, rel);
const sha = b => createHash('sha256').update(b).digest('hex');
const FONTS = ['scripts/social-cards/fonts/Inter_800ExtraBold.ttf', 'scripts/social-cards/fonts/Inter_600SemiBold.ttf'].map(abs);

// Shared card: the committed SVG source with the real destination count; Inter replaces the system font it was first drawn with.
export function sharedCardSource(count = destinationCount()) {
  return readFileSync(abs(SHARED_CARD_SVG), 'utf8').replace(/\r\n/g, '\n')
    .replaceAll("font-family=\"DejaVu Sans,Arial,sans-serif\"", "font-family=\"Inter, Arial, sans-serif\"")
    .replace(/\d+ DESTINATIONS/, `${count} DESTINATIONS`);
}

async function main() {
  const check = process.argv.includes('--check');
  const force = process.argv.includes('--force');
  const specs = guideSpecs();
  const fingerprint = rendererFingerprint();
  const manifest = readManifest() || { version: 1, files: {} };
  const files = {};
  const stale = [];
  const sharedSvg = sharedCardSource();
  const sharedHash = sha(`${fingerprint}${sharedSvg}`);

  const wanted = [{ file: SHARED_CARD, hash: sharedHash }, ...specs.map(s => ({ file: s.file, hash: specInputHash(s, fingerprint), spec: s }))];
  for (const w of wanted) {
    const prev = manifest.files[w.file];
    if (force || !prev || prev.inputHash !== w.hash || !existsSync(abs(w.file)) || sha(readFileSync(abs(w.file))) !== prev.sha256) stale.push(w);
    else files[w.file] = prev;
  }
  if (check) {
    stale.forEach(w => console.log(`stale or missing: ${w.file}`));
    const orphans = listCards().filter(f => !wanted.some(w => w.file === f));
    orphans.forEach(f => console.log(`orphan card (no destination): ${f}`));
    console.log(`${wanted.length - stale.length}/${wanted.length} cards current`);
    process.exit(stale.length || orphans.length ? 1 : 0);
  }

  if (stale.length) {
    const { Resvg } = await import('@resvg/resvg-js');
    const sharp = (await import('sharp')).default;
    const opts = { font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Inter' }, fitTo: { mode: 'original' } };
    const cache = new Map();
    const measure = (text, size, weight) => {
      const k = `${weight}|${size}|${text}`;
      if (!cache.has(k)) {
        const probe = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="400"><text x="0" y="250" font-family="Inter" font-size="${size}" font-weight="${weight}">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`;
        cache.set(k, new Resvg(probe, opts).getBBox().width);
      }
      return cache.get(k);
    };
    for (const w of stale) {
      const svg = w.spec ? cardSvg(w.spec, measure) : sharedSvg;
      const png = new Resvg(svg, opts).render().asPng();
      let out;
      if (w.file === SHARED_CARD) out = await sharp(png).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toBuffer();
      else for (let q = 86; q >= 60; q -= 4) { // highest quality that stays well under the 150 KB budget
        out = await sharp(png).jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:4:4', progressive: true }).toBuffer();
        if (out.length <= MAX_BYTES - 12 * 1024) break;
      }
      if (out.length > MAX_BYTES) throw new Error(`${w.file} is ${out.length} bytes, over the ${MAX_BYTES} budget`);
      const meta = await sharp(out).metadata();
      if (meta.width !== CARD_W || meta.height !== CARD_H) throw new Error(`${w.file} rendered ${meta.width}x${meta.height}`);
      mkdirSync(path.dirname(abs(w.file)), { recursive: true });
      writeFileSync(abs(w.file), out);
      files[w.file] = { inputHash: w.hash, sha256: sha(out), bytes: out.length, width: CARD_W, height: CARD_H };
      console.log(`rendered ${w.file} (${(out.length / 1024).toFixed(1)} KB)`);
    }
  }
  // Drop cards of destinations that no longer exist, so the tree never carries orphans.
  for (const f of listCards()) if (!files[f] && f !== SHARED_CARD) { rmSync(abs(f)); console.log(`removed orphan ${f}`); }
  if (existsSync(abs(SHARED_CARD_SVG))) writeFileSync(abs(SHARED_CARD_SVG), sharedSvg);
  const sorted = Object.fromEntries(Object.keys(files).sort().map(k => [k, files[k]]));
  writeFileSync(abs(MANIFEST), `${JSON.stringify({ version: 1, size: `${CARD_W}x${CARD_H}`, files: sorted }, null, 1)}\n`);
  console.log(`${wanted.length - stale.length} cards unchanged, ${stale.length} rendered, ${Object.keys(sorted).length} in the manifest`);
}

function listCards() {
  const out = [];
  const walk = dir => { for (const e of readdirSync(abs(dir), { withFileTypes: true })) { const r = `${dir}/${e.name}`; if (e.isDirectory()) walk(r); else if (/\.jpe?g$/i.test(e.name)) out.push(r); } };
  if (existsSync(abs(SOCIAL_DIR))) walk(SOCIAL_DIR);
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
