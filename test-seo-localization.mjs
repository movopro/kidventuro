import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const [runtime,links,spanish,sitemap,hub,esHome,esHub]=await Promise.all([
  read('./runtime-config.js'),read('./destination-links.js'),read('./spanish.js'),read('./sitemap.xml'),
  read('./destinations/index.html'),read('./es/index.html'),read('./es/destinos/index.html')
]);

for(const marker of ['site-expansion.js','destination-links.js','spanish.js']) assert.ok(runtime.includes(marker),`runtime enhancement loader missing: ${marker}`);
assert.ok(runtime.indexOf('site-expansion.js')<runtime.indexOf('destination-links.js'));
assert.ok(runtime.indexOf('destination-links.js')<runtime.indexOf('spanish.js'));
assert.ok(links.includes("document.createElement('a')"),'destination cards must become crawlable anchor links');
assert.ok(spanish.includes("translations.es=es"),'Spanish translation dictionary must be registered');
assert.ok(spanish.includes('se generan en inglés'),'Spanish storefront must disclose that printable books are currently English');

const files=(await readdir(new URL('./destinations/',import.meta.url))).filter(x=>x.endsWith('.html')&&x!=='index.html');
assert.equal(files.length,50,'exactly 50 destination SEO pages must exist');

const expected=["rome", "paris", "london", "barcelona", "dubai", "amsterdam", "vienna", "prague", "berlin", "lisbon", "athens", "istanbul", "new-york", "orlando", "tokyo", "kyoto", "singapore", "sydney", "copenhagen", "budapest", "venice", "florence", "madrid", "bangkok", "reykjavik", "munich", "salzburg", "zurich", "brussels", "bruges", "dublin", "edinburgh", "stockholm", "oslo", "helsinki", "milan", "naples", "seville", "valencia", "porto", "nice", "dubrovnik", "krakow", "warsaw", "bucharest", "sofia", "abu-dhabi", "seoul", "hong-kong", "kuala-lumpur"];
for(const slug of expected){
  assert.ok(files.includes(`${slug}.html`),`destination page missing: ${slug}`);
  assert.ok(hub.includes(`href="${slug}.html"`),`English hub missing link: ${slug}`);
  assert.ok(esHub.includes(`../../destinations/${slug}.html#es`),`Spanish hub missing link: ${slug}`);
  assert.ok(sitemap.includes(`https://kidventuro.com/destinations/${slug}.html`),`sitemap missing: ${slug}`);
}
assert.ok(sitemap.includes('https://kidventuro.com/es/'),'Spanish landing page missing from sitemap');
assert.ok(sitemap.includes('https://kidventuro.com/es/destinos/'),'Spanish destination hub missing from sitemap');
assert.ok(esHome.includes('los libros imprimibles de la versión actual se generan en inglés'),'Spanish landing must disclose current printable language');
console.log('SEO destination coverage and Spanish storefront regression checks passed');
