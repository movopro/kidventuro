// Validates Kidventuro family guide JSON files. Usage: node validate.mjs <file.json|dir> ...
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const SCENES = ['snow', 'mountains', 'coast', 'island', 'city', 'canals', 'temple', 'desert', 'jungle', 'lake'];
const BANNED = /\b(magical|hidden gem|unforgettable|AI\b|artificial intelligence|nestled|bustling)\b/i;

function checkLang(block, tag, err) {
  if (!block || typeof block !== 'object') return err(`${tag} missing`);
  if (!/^[^•]+ • [^•]+ • [^•]+$/.test(block.tagline || '')) err(`${tag}.tagline must be "a • b • c"`);
  const iw = words(block.intro);
  if (iw < 40 || iw > 95) err(`${tag}.intro has ${iw} words (40-80)`);
  for (const k of ['ages', 'stroller']) if (words(block[k]?.text) < 12) err(`${tag}.${k}.text too short`);
  if (!['easy', 'mixed', 'hard'].includes(block.stroller?.rating)) err(`${tag}.stroller.rating invalid`);
  const exact = (arr, n, name) => { if (!Array.isArray(arr) || arr.length !== n) err(`${tag}.${name} must have ${n} items`); };
  exact(block.mustDos, 5, 'mustDos');
  exact(block.rainyDay, 3, 'rainyDay');
  exact(block.safety, 3, 'safety');
  exact(block.costs?.items, 4, 'costs.items');
  (block.mustDos || []).forEach((m, i) => { if (!m.title || words(m.text) < 12 || !m.ages) err(`${tag}.mustDos[${i}] thin`); });
  (block.rainyDay || []).forEach((m, i) => { if (!m.title || words(m.text) < 8) err(`${tag}.rainyDay[${i}] thin`); });
  (block.safety || []).forEach((s, i) => { if (words(s) < 8) err(`${tag}.safety[${i}] thin`); });
  (block.costs?.items || []).forEach((c, i) => { if (!c.label || !/\d/.test(c.price || '')) err(`${tag}.costs.items[${i}] needs a price`); });
  for (const k of ['daily', 'tip']) if (words(block.costs?.[k]) < 6) err(`${tag}.costs.${k} too short`);
  for (const k of ['gettingAround', 'food']) if (words(block[k]) < 12) err(`${tag}.${k} too short`);
  for (const k of ['morning', 'afternoon', 'evening']) if (words(block.firstDay?.[k]) < 6) err(`${tag}.firstDay.${k} too short`);
  if (BANNED.test(JSON.stringify(block))) err(`${tag} uses a banned phrase (${JSON.stringify(block).match(BANNED)[0]})`);
}

export function validateGuide(g, file = '') {
  const errors = [];
  const err = m => errors.push(`${path.basename(file)}: ${m}`);
  if (!/^[a-z0-9-]+$/.test(g.slug || '')) err('slug invalid');
  if (file && path.basename(file, '.json') !== g.slug) err('file name must equal slug');
  for (const k of ['name', 'nameEs', 'country', 'countryEs', 'flag', 'icons', 'lang']) if (!g[k]) err(`${k} missing`);
  if (!['europe', 'americas', 'asia'].includes(g.region)) err('region invalid');
  if (!SCENES.includes(g.scene)) err(`scene must be one of ${SCENES.join(', ')}`);
  if (!Array.isArray(g.bestMonths) || !g.bestMonths.length || g.bestMonths.some(m => !(m >= 1 && m <= 12))) err('bestMonths invalid');
  if (!Array.isArray(g.seasons) || !g.seasons.length || g.seasons.some(s => !['winter', 'spring', 'summer', 'autumn'].includes(s))) err('seasons invalid');
  if (!Array.isArray(g.phrases) || g.phrases.length !== 4 || g.phrases.some(p => !Array.isArray(p) || p.length !== 2)) err('phrases must be 4 pairs');
  checkLang(g.en, 'en', err);
  checkLang(g.es, 'es', err);
  if (g.en && g.es) {
    for (const k of ['mustDos', 'rainyDay', 'safety']) if ((g.en[k] || []).length !== (g.es[k] || []).length) err(`es.${k} length differs`);
    const ep = (g.en.costs?.items || []).map(i => i.price).join('|'), sp = (g.es.costs?.items || []).map(i => i.price).join('|');
    if (ep !== sp) err('es cost prices differ from en');
  }
  const b = g.booklet || {};
  const exact = (arr, n, name) => { if (!Array.isArray(arr) || arr.length !== n) err(`booklet.${name} must have ${n} items`); };
  exact(b.marks, 4, 'marks'); exact(b.food, 4, 'food'); exact(b.facts, 3, 'facts'); exact(b.hunt, 12, 'hunt'); exact(b.quiz, 3, 'quiz'); exact(b.missions, 2, 'missions');
  (b.quiz || []).forEach((q, i) => { if (!Array.isArray(q) || q.length !== 5 || new Set(q.slice(1)).size !== 4) err(`booklet.quiz[${i}] needs question + 4 distinct answers`); });
  (b.facts || []).forEach((f, i) => { if (String(f).length > 130) err(`booklet.facts[${i}] too long`); });
  (b.missions || []).forEach((m, i) => { if (String(m).length > 34) err(`booklet.missions[${i}] too long`); });
  if (!Array.isArray(g.missionsEs) || g.missionsEs.length !== 2) err('missionsEs must have 2 items');
  return errors;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isMain) {
  const files = process.argv.slice(2).flatMap(p => statSync(p).isDirectory()
    ? readdirSync(p).filter(f => f.endsWith('.json')).map(f => path.join(p, f)) : [p]);
  let bad = 0;
  for (const f of files) {
    let g;
    try { g = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { console.log(`${f}: invalid JSON: ${e.message}`); bad++; continue; }
    const errors = validateGuide(g, f);
    if (errors.length) { bad++; errors.forEach(e => console.log(e)); } else console.log(`${path.basename(f)}: ok`);
  }
  process.exit(bad ? 1 : 0);
}
