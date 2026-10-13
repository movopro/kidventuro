import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const robots = await readFile(path.join(root, 'robots.txt'), 'utf8');
// Family-guide pages (destinations/guides/*.json) are built by build-family-guides.mjs and are not polished here.
const guideSlugs = new Set((await readdir(path.join(root, 'destinations', 'guides'))).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)));
const supported = [...robots.matchAll(/^Allow: \/destinations\/([a-z0-9-]+)\.html$/gm)]
  .map(match => match[1])
  .filter(slug => slug !== 'index')
  .filter(slug => !guideSlugs.has(slug));

if (supported.length !== 50) {
  throw new Error(`Expected 50 supported destinations from robots.txt, found ${supported.length}`);
}

function polish(html, lang) {
  if (!html.includes('rel="canonical"') || !html.includes('application/ld+json')) {
    throw new Error('Refusing to polish a non-static destination page');
  }

  if (!html.includes('rel="icon"')) {
    html = html.replace(
      '  <link rel="stylesheet" href="/destinations/seo.css">',
      '  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">\n  <link rel="stylesheet" href="/destinations/seo.css">'
    );
  }

  // og:image / twitter:image (the page's own social card) are written by generate-destination-pages.mjs.
  if (!html.includes('property="og:image"') || !html.includes('name="twitter:image"')) throw new Error('Generated page lacks its social card tags');

  return html;
}

let updated = 0;
for (const slug of supported) {
  for (const [relative, lang] of [[`destinations/${slug}.html`, 'en'], [`es/destinos/${slug}.html`, 'es']]) {
    const filename = path.join(root, relative);
    const before = await readFile(filename, 'utf8');
    const after = polish(before, lang);
    if (after !== before) {
      await writeFile(filename, after, 'utf8');
      updated += 1;
    }
  }
}

console.log(`Polished ${updated} supported localized destination pages.`);
