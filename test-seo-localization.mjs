import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const [runtime,links,spanish,sitemap,hub,esHome,esHub,enPage,esPage,data,expansion2]=await Promise.all([
  read('./runtime-config.js'),read('./destination-links.js'),read('./spanish.js'),read('./sitemap.xml'),
  read('./destinations/index.html'),read('./es/index.html'),read('./es/destinos/index.html'),
  read('./destinations/page.js'),read('./es/destinos/page-es.js'),read('./destinations/destination-data.js'),read('./site-expansion-2.js')
]);

for(const marker of ['site-expansion.js','site-expansion-2.js','destination-links.js','spanish.js']) assert.ok(runtime.includes(marker),`runtime enhancement loader missing: ${marker}`);
assert.ok(runtime.indexOf('site-expansion.js')<runtime.indexOf('site-expansion-2.js'));
assert.ok(runtime.indexOf('site-expansion-2.js')<runtime.indexOf('destination-links.js'));
assert.ok(links.includes("document.createElement('a')"),'destination cards must become crawlable anchor links');
assert.ok(spanish.includes("translations.es=es"),'Spanish translation dictionary must be registered');
assert.ok(spanish.includes('se generan en inglés'),'Spanish storefront must disclose that printable books are currently English');
assert.ok(enPage.includes("['alternate','es'"),'English destination pages must reference Spanish alternates');
assert.ok(esPage.includes("['alternate','en'"),'Spanish destination pages must reference English alternates');
assert.ok(expansion2.includes('KIDVENTURO_DESTINATION_COUNT=100'),'100-destination landing marker missing');

const enFiles=(await readdir(new URL('./destinations/',import.meta.url))).filter(x=>x.endsWith('.html')&&x!=='index.html');
const esFiles=(await readdir(new URL('./es/destinos/',import.meta.url))).filter(x=>x.endsWith('.html')&&x!=='index.html');
assert.equal(enFiles.length,100,'exactly 100 English destination SEO pages must exist');
assert.equal(esFiles.length,100,'exactly 100 Spanish destination SEO pages must exist');

const expected=["rome","paris","london","barcelona","dubai","amsterdam","vienna","prague","berlin","lisbon","athens","istanbul","new-york","orlando","tokyo","kyoto","singapore","sydney","copenhagen","budapest","venice","florence","madrid","bangkok","reykjavik","munich","salzburg","zurich","brussels","bruges","dublin","edinburgh","stockholm","oslo","helsinki","milan","naples","seville","valencia","porto","nice","dubrovnik","krakow","warsaw","bucharest","sofia","abu-dhabi","seoul","hong-kong","kuala-lumpur","los-angeles","san-francisco","san-diego","chicago","washington-dc","boston","miami","toronto","vancouver","montreal","mexico-city","cancun","havana","rio-de-janeiro","buenos-aires","lima","cape-town","marrakech","cairo","nairobi","zanzibar","doha","muscat","petra","delhi","jaipur","mumbai","goa","bali","hanoi","ho-chi-minh-city","siem-reap","phuket","chiang-mai","manila","taipei","shanghai","beijing","osaka","auckland","queenstown","melbourne","gold-coast","cairns","honolulu","maui","santorini","crete","split","malta"];
for(const slug of expected){
  assert.ok(enFiles.includes(`${slug}.html`),`English destination page missing: ${slug}`);
  assert.ok(esFiles.includes(`${slug}.html`),`Spanish destination page missing: ${slug}`);
  assert.ok(hub.includes(`href="${slug}.html"`),`English hub missing link: ${slug}`);
  assert.ok(esHub.includes(`href="${slug}.html"`),`Spanish hub missing link: ${slug}`);
  assert.ok(sitemap.includes(`https://kidventuro.com/destinations/${slug}.html`),`English sitemap URL missing: ${slug}`);
  assert.ok(sitemap.includes(`https://kidventuro.com/es/destinos/${slug}.html`),`Spanish sitemap URL missing: ${slug}`);
  assert.ok(data.includes(`"${slug}"`),`SEO destination data missing: ${slug}`);
}
assert.equal((sitemap.match(/<loc>/g)||[]).length,207,'sitemap must expose 207 canonical URLs');
assert.ok(hub.includes('100 destinations'),'English hub count is stale');
assert.ok(esHub.includes('100 destinos'),'Spanish hub count is stale');
assert.ok(esHome.includes('100 destinos'),'Spanish landing count is stale');
assert.ok(esHome.includes('los libros imprimibles de la versión actual se generan en inglés'),'Spanish landing must disclose current printable language');
console.log('SEO coverage passed: 100 EN + 100 ES destination pages and Spanish storefront.');
