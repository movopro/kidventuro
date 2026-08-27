import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const [runtime,links,spanish,sitemap,hub,esHome,esHub,enRome,esRome,robots,enPageRuntime,esPageRuntime,rootPackage,safeGenerator]=await Promise.all([
  read('./runtime-config.js'),read('./destination-links.js'),read('./spanish.js'),read('./sitemap.xml'),
  read('./destinations/index.html'),read('./es/index.html'),read('./es/destinos/index.html'),
  read('./destinations/rome.html'),read('./es/destinos/rome.html'),read('./robots.txt'),
  read('./destinations/page.js'),read('./es/destinos/page-es.js'),read('./package.json'),read('./scripts/generate-supported-destination-pages.mjs')
]);

for(const marker of ['site-expansion.js','destination-links.js','spanish.js']) assert.ok(runtime.includes(marker),`runtime enhancement loader missing: ${marker}`);
assert.equal(runtime.includes("load('site-expansion-2.js')"),false,'unsupported 100-destination expansion must never load in production');
assert.ok(runtime.indexOf('site-expansion.js')<runtime.indexOf('destination-links.js'));
assert.ok(runtime.indexOf('destination-links.js')<runtime.indexOf('spanish.js'));
assert.ok(links.includes("document.createElement('a')"),'destination cards must become crawlable anchor links');
assert.ok(spanish.includes("translations.es=es"),'Spanish translation dictionary must be registered');
assert.ok(spanish.includes('se generan en inglés'),'Spanish storefront must disclose that printable books are currently English');
assert.ok(enRome.includes('rel="alternate" hreflang="es"'),'English destination pages must reference Spanish alternates');
assert.ok(esRome.includes('rel="alternate" hreflang="en"'),'Spanish destination pages must reference English alternates');
assert.ok(enRome.includes('rel="canonical" href="https://kidventuro.com/destinations/rome.html"'),'English destination pages need a static self-canonical');
assert.ok(esRome.includes('rel="canonical" href="https://kidventuro.com/es/destinos/rome.html"'),'Spanish destination pages need a static self-canonical');
assert.ok(enRome.includes('<script type="application/ld+json">'),'Destination pages need static structured data');
assert.ok(enRome.includes('<h1>Printable Rome travel activities for kids</h1>'),'Destination content must be present without JavaScript');

const expected=['rome','paris','london','barcelona','dubai','amsterdam','vienna','prague','berlin','lisbon','athens','istanbul','new-york','orlando','tokyo','kyoto','singapore','sydney','copenhagen','budapest','venice','florence','madrid','bangkok','reykjavik','munich','salzburg','zurich','brussels','bruges','dublin','edinburgh','stockholm','oslo','helsinki','milan','naples','seville','valencia','porto','nice','dubrovnik','krakow','warsaw','bucharest','sofia','abu-dhabi','seoul','hong-kong','kuala-lumpur'];

const enFiles=(await readdir(new URL('./destinations/',import.meta.url))).filter(x=>x.endsWith('.html')&&x!=='index.html');
const esFiles=(await readdir(new URL('./es/destinos/',import.meta.url))).filter(x=>x.endsWith('.html')&&x!=='index.html');
for(const slug of expected){
  assert.ok(enFiles.includes(`${slug}.html`),`English destination page missing: ${slug}`);
  assert.ok(esFiles.includes(`${slug}.html`),`Spanish destination page missing: ${slug}`);
  assert.ok(hub.includes(`href="${slug}.html"`),`English hub missing link: ${slug}`);
  assert.ok(esHub.includes(`href="${slug}.html"`),`Spanish hub missing link: ${slug}`);
  assert.ok(sitemap.includes(`https://kidventuro.com/destinations/${slug}.html`),`English sitemap URL missing: ${slug}`);
  assert.ok(sitemap.includes(`https://kidventuro.com/es/destinos/${slug}.html`),`Spanish sitemap URL missing: ${slug}`);
  assert.ok(robots.includes(`Allow: /destinations/${slug}.html`),`robots allow missing for English destination: ${slug}`);
  assert.ok(robots.includes(`Allow: /es/destinos/${slug}.html`),`robots allow missing for Spanish destination: ${slug}`);
  assert.ok(safeGenerator.includes(`'${slug}'`),`safe SEO generator missing supported slug: ${slug}`);
}

const extractHubSlugs=doc=>[...doc.matchAll(/href="([a-z0-9-]+)\.html"/g)].map(match=>match[1]);
assert.deepEqual(extractHubSlugs(hub),expected,'English hub must expose exactly the 50 paid-product destinations');
assert.deepEqual(extractHubSlugs(esHub),expected,'Spanish hub must expose exactly the 50 paid-product destinations');
assert.ok(hub.includes('50 supported destinations'),'English hub must state the real supported destination count');
assert.ok(esHub.includes('50 destinos compatibles'),'Spanish hub must state the real supported destination count');
assert.equal(hub.includes('auckland.html'),false,'unsupported future destination must not be discoverable from English hub');
assert.equal(esHub.includes('auckland.html'),false,'unsupported future destination must not be discoverable from Spanish hub');
assert.equal(sitemap.includes('/destinations/auckland.html'),false,'unsupported future destination must not enter sitemap');
assert.equal(sitemap.includes('/es/destinos/auckland.html'),false,'unsupported future Spanish destination must not enter sitemap');
assert.ok(robots.includes('Disallow: /destinations/'),'unsupported English destination files must be crawl-blocked by default');
assert.ok(robots.includes('Disallow: /es/destinos/'),'unsupported Spanish destination files must be crawl-blocked by default');
assert.ok(enPageRuntime.includes("robots.content='noindex,nofollow'"),'English unsupported destination runtime must fail closed');
assert.ok(esPageRuntime.includes("robots.content='noindex,nofollow'"),'Spanish unsupported destination runtime must fail closed');

const pkg=JSON.parse(rootPackage);
assert.equal(pkg.scripts?.['generate-seo'],'node scripts/generate-supported-destination-pages.mjs','SEO generation must use the supported-destination wrapper');
assert.equal(safeGenerator.includes("'auckland'"),false,'unsupported future destination must not enter safe SEO generator scope');
assert.ok(safeGenerator.includes('supported.length'),'safe SEO generator must report its scoped catalog');

assert.ok(sitemap.includes('https://kidventuro.com/es/'),'Spanish landing page missing from sitemap');
assert.ok(sitemap.includes('https://kidventuro.com/es/destinos/'),'Spanish destination hub missing from sitemap');
assert.ok(esHome.includes('los libros imprimibles de la versión actual se generan en inglés'),'Spanish landing must disclose current printable language');
console.log('SEO discovery, runtime expansion and regeneration are aligned to the 50 supported destinations');
