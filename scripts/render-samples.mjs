// Renders REAL sample pages from the live booklet generator (booklet-v2.js) for the launch destinations:
//   assets/samples/<slug>-{cover,hunt,bingo,cert}.webp  (page previews used on the site and in pins)
//   assets/samples/<slug>-free-sample.pdf               (1 free page + a "get the full pack" page)
// Usage (Node 1): node scripts/render-samples.mjs [--site C:/AI-Server/repos/kidventuro-site] [Rome Paris ...]
// Uses puppeteer-core from the zodia project and the seeded headless Chrome (never a fresh profile: see C:\AI-Server\CLAUDE.md).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { launch } from 'file:///C:/AI-Server/repos/ai-infrastructure/scripts/qa/headless_chrome.mjs';

const require = createRequire('C:/AI-Server/projects/zodia/node_modules/');
const puppeteer = require('puppeteer-core');
const args = process.argv.slice(2);
const siteIdx = args.indexOf('--site');
const SITE = siteIdx >= 0 ? args.splice(siteIdx, 2)[1] : path.resolve(import.meta.dirname, '..');
export const LAUNCH_DESTINATIONS = [
  ['Orlando', 'space'], ['Paris', 'art'], ['London', 'castles'], ['Rome', 'dinosaurs'], ['Barcelona', 'football'],
  ['Vienna', 'music'], ['Prague', 'castles'], ['Dubai', 'vehicles'], ['Rovaniemi', 'animals'], ['Reykjavik', 'nature'],
  ['Amsterdam', 'art'], ['Berlin', 'history'], ['Madrid', 'football'], ['Lisbon', 'art'], ['Athens', 'history'], ['Istanbul', 'food'], ['New York', 'superheroes'], ['Tokyo', 'trains'], ['Venice', 'ocean'], ['Florence', 'art']
];
const wanted = args.length ? LAUNCH_DESTINATIONS.filter(([d]) => args.includes(d)) : LAUNCH_DESTINATIONS;
const slugOf = d => d.toLowerCase().replace(/\s+/g, '-');
const out = path.join(SITE, 'assets', 'samples');
fs.mkdirSync(out, { recursive: true });

const json = body => ({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body });

const h = await launch({ args: ['--window-size=1000,1300'] });
const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${h.port}` });
try {
  for (const [dest, interest] of wanted) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 1.5 });
    await page.setRequestInterception(true);
    page.on('request', r => {
      const u = r.url();
      if (u.includes('/entitlement/status')) return r.respond(json('{"paid":true,"product":"adventure"}'));
      if (u.includes('/ai/enrich')) return r.respond(json('{"ai":false}'));
      if (/google-analytics|googletagmanager|analytics\/event/.test(u)) return r.abort();
      r.continue();
    });
    await page.evaluateOnNewDocument((d, i) => {
      sessionStorage.setItem('kidventuro:booklet', JSON.stringify({ product: 'adventure', name: 'Mia', age: '7', destination: d, interest: i, days: '4', lang: 'en', kv_ref: 'sample-render', saved_at: Date.now() }));
    }, dest, interest);
    await page.goto('https://kidventuro.com/booklet.html', { waitUntil: 'networkidle2' });
    await page.waitForSelector('section.page', { timeout: 30000 });
    await page.addStyleTag({ content: '.toolbar,.notice,#cookieBanner,[class*=cookie],[id*=consent]{display:none!important}' });
    const n = await page.$$eval('section.page', els => els.length);
    const heads = await page.$$eval('section.page', els => els.map(e => (e.querySelector('h1,h2')?.textContent || '').trim().slice(0, 30)));
    const find = re => heads.findIndex(t => re.test(t));
    const pick = { cover: 0, bingo: find(/bingo/i), hunt: find(/scavenger|hunt/i), puzzle: find(/word search/i), cert: n - 1 };
    for (const [key, idx] of Object.entries(pick)) {
      if (idx < 0) { console.warn(dest, 'no page for', key); continue; }
      const el = (await page.$$('section.page'))[idx];
      const b = await el.boundingBox(); await page.screenshot({ path: path.join(out, `${slugOf(dest)}-${key}.webp`), type: 'webp', quality: 82, clip: { x: b.x + 10, y: b.y, width: b.width - 12, height: b.height - 2 } });
    }
    // free sample PDF: the scavenger-hunt page + a call-to-action page
    const huntIdx = pick.hunt >= 0 ? pick.hunt : 7;
    await page.evaluate((keep, destName, slug) => {
      [...document.querySelectorAll('section.page')].forEach((p, i) => { if (i !== keep) p.remove(); });
      const cta = document.createElement('section');
      cta.className = 'page';
      cta.style.cssText = 'display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:22mm;background:#fffaf3';
      cta.innerHTML = '<div style="font-weight:900;letter-spacing:.14em;color:#e8602c;font-size:13px">KIDVENTURO</div>'
        + '<h1 style="font-size:44px;line-height:1.05;margin:14px 0 10px;color:#20312f">Like this page?<br>Get the full ' + destName + ' adventure.</h1>'
        + '<p style="font-size:18px;line-height:1.6;color:#44514e;max-width:150mm">25 printable pages made for your child: their name, age and favourite thing, plus travel bingo, city missions, local words, a journal, a postcard and an explorer certificate.</p>'
        + '<ul style="font-size:17px;line-height:1.9;color:#20312f;padding-left:20px"><li>Ready in minutes, print at home</li><li>One-time purchase, no app, no subscription</li><li>The 25-page Adventure is &euro;9.90 (Mini 10 pages &euro;5.90)</li></ul>'
        + '<p style="margin-top:14px;background:#20312f;color:#fff;padding:14px 22px;border-radius:999px;font-weight:800;font-size:19px">kidventuro.com/destinations/' + slug + '.html</p>'
        + '<p style="font-size:13px;color:#687773;margin-top:18px">Free sample from Kidventuro. Always supervise children on every mission.</p>';
      document.getElementById('book').appendChild(cta);
    }, huntIdx, dest, slugOf(dest));
    await page.pdf({ path: path.join(out, `${slugOf(dest)}-free-sample.pdf`), format: 'A4', printBackground: true });
    console.log('ok', dest, n, 'pages; picks', JSON.stringify(pick));
    await page.close();
  }
} finally {
  await browser.disconnect();
  await h.close();
}
