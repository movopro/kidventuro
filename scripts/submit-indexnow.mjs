// IndexNow (Bing, Yandex, Naver, Seznam and partners; not Google): tell the engines which pages are new or changed.
//
//   node scripts/submit-indexnow.mjs                       dry run (default): print the plan, send nothing
//   node scripts/submit-indexnow.mjs --apply               send the plan
//   node scripts/submit-indexnow.mjs --before <git sha>    plan = the pages changed since <sha> (the workflow passes the push's "before")
//   node scripts/submit-indexnow.mjs --all                 plan = every sitemap page (first submission, or after a big change)
//   node scripts/submit-indexnow.mjs --days N              also the pages whose sitemap lastmod is within N days
//
// The key is public by design (the engines read it from https://kidventuro.com/<key>.txt), so no secret is needed anywhere.
// What is sent: only URLs that exist in sitemap.xml, only https://kidventuro.com, only pages that changed (an html file, a sitemap
// lastmod, or an image listed for that page in sitemap-images.xml). test-indexing.mjs pins these rules.
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const HOST = 'kidventuro.com';
export const KEY = '7796f6542f9867816f62cbddd7990cc0';
export const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
export const ENDPOINT = 'https://api.indexnow.org/indexnow';
export const MAX_URLS = 10000;
const SITE = `https://${HOST}`;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const fileToUrl = file => {
  if (file === 'index.html') return `${SITE}/`;
  if (file.endsWith('/index.html')) return `${SITE}/${file.slice(0, -'index.html'.length)}`;
  return `${SITE}/${file}`;
};
export const urlsOf = xml => [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:<lastmod>([^<]*)<\/lastmod>)?/g)].map(m => ({ loc: m[1].trim(), lastmod: m[2] || '' }));
const imagesByPage = xml => {
  const map = new Map();
  for (const u of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) map.set(u[1].match(/<loc>([^<]+)<\/loc>/)[1].trim(), [...u[1].matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(i => i[1].trim()));
  return map;
};

// Which sitemap pages to announce. Pure function (no network, no git): every input is a parameter.
export function planUrls({ sitemapXml, imageXml = '', changedFiles = [], previousSitemapXml = null, days = 0, today = new Date().toISOString().slice(0, 10), all = false }) {
  const pages = urlsOf(sitemapXml);
  const known = new Set(pages.map(p => p.loc));
  const picked = new Map(); // url -> why
  const add = (loc, why) => { if (known.has(loc) && !picked.has(loc)) picked.set(loc, why); };
  if (all) pages.forEach(p => add(p.loc, 'all'));
  for (const file of changedFiles) if (/\.html$/.test(file)) add(fileToUrl(file), 'page changed');
  if (changedFiles.some(f => /^assets\/.+\.(png|jpe?g|gif|webp|avif|svg)$/i.test(f))) {
    const changedImages = new Set(changedFiles.filter(f => f.startsWith('assets/')).map(f => `${SITE}/${f}`));
    for (const [loc, images] of imagesByPage(imageXml)) if (images.some(i => changedImages.has(i))) add(loc, 'image changed');
  }
  if (previousSitemapXml !== null) {
    const before = new Map(urlsOf(previousSitemapXml).map(p => [p.loc, p.lastmod]));
    for (const p of pages) if (!before.has(p.loc)) add(p.loc, 'new in sitemap'); else if (before.get(p.loc) !== p.lastmod) add(p.loc, 'lastmod changed');
  }
  if (days > 0) {
    const since = new Date(Date.parse(`${today}T00:00:00Z`) - days * 86400000).toISOString().slice(0, 10);
    for (const p of pages) if (p.lastmod && p.lastmod >= since) add(p.loc, `lastmod within ${days} day(s)`);
  }
  return [...picked.entries()].map(([url, why]) => ({ url, why }));
}

export const payloadFor = urls => ({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls });

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const argv = process.argv.slice(2);
  const opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const apply = argv.includes('--apply');
  const days = Number(opt('--days') || 0);
  const before = opt('--before');
  const sitemapXml = await readFile(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const imageXml = await readFile(path.join(ROOT, 'sitemap-images.xml'), 'utf8').catch(() => '');
  let changedFiles = [], previousSitemapXml = null;
  const all = argv.includes('--all');
  if (before && !/^0+$/.test(before)) {
    try { changedFiles = git('diff', '--name-only', before, 'HEAD').split('\n').filter(Boolean); previousSitemapXml = git('show', `${before}:sitemap.xml`); }
    catch { console.log(`Cannot diff against ${before}; falling back to pages with a lastmod in the last 2 days.`); }
  }
  const plan = planUrls({ sitemapXml, imageXml, changedFiles, previousSitemapXml, days: days || (before && previousSitemapXml === null ? 2 : 0), all });
  if (plan.length > MAX_URLS) throw new Error(`More than ${MAX_URLS} URLs in one IndexNow batch`);
  console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${plan.length} URL(s) to announce`);
  for (const p of plan.slice(0, 50)) console.log(`  ${p.url}  (${p.why})`);
  if (plan.length > 50) console.log(`  ... and ${plan.length - 50} more`);
  if (!plan.length) { console.log('Nothing changed; nothing to submit.'); return; }
  if (!apply) { console.log('Dry run: nothing was sent. Pass --apply to submit.'); return; }

  // The engines fetch the key file before they accept a batch: make sure it is served (Pages may still be deploying).
  let keyOk = false;
  for (let attempt = 1; attempt <= 6 && !keyOk; attempt++) {
    const r = await fetch(KEY_LOCATION, { redirect: 'manual' }).catch(() => null);
    keyOk = !!r && r.status === 200 && (await r.text()).trim() === KEY;
    if (!keyOk) { console.log(`Key file not served yet (attempt ${attempt}/6); waiting for the Pages deployment.`); await sleep(20000); }
  }
  if (!keyOk) throw new Error(`${KEY_LOCATION} does not serve the key`);

  let response;
  for (let attempt = 1; attempt <= 4; attempt++) {
    response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payloadFor(plan.map(p => p.url))) });
    if ([200, 202].includes(response.status)) break;
    if (response.status === 403 && attempt < 4) { console.log(`IndexNow answered 403 (key not verified yet); retrying (attempt ${attempt}/4).`); await sleep(15000); continue; }
    throw new Error(`IndexNow submission failed with HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  console.log(`IndexNow accepted ${plan.length} Kidventuro URL(s) with HTTP ${response.status}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
