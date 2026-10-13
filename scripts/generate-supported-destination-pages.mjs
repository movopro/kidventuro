import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {LEGACY_SLUGS} from './social-cards/cards-lib.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataPath=path.join(root,'destinations','destination-data.js');
const source=await readFile(dataPath,'utf8');
const match=source.match(/^window\.KIDVENTURO_DESTINATION_SEO=(\{.*\});\s*$/s);
if(!match)throw new Error('Could not parse destinations/destination-data.js');
const all=JSON.parse(match[1]);
// The 50 paid legacy destinations (and the scene of each social card) live in scripts/social-cards/cards-lib.mjs; the order is the sitemap order.
const supported=LEGACY_SLUGS;
const missing=supported.filter(slug=>!all[slug]);
if(missing.length)throw new Error(`Missing supported SEO destination data: ${missing.join(', ')}`);
const filtered=Object.fromEntries(supported.map(slug=>[slug,all[slug]]));
const temporary=`window.KIDVENTURO_DESTINATION_SEO=${JSON.stringify(filtered)};\n`;

await writeFile(dataPath,temporary,'utf8');
try{
  const generator=pathToFileURL(path.join(root,'scripts','generate-destination-pages.mjs')).href;
  await import(`${generator}?supported=${Date.now()}`);
  const polisher=pathToFileURL(path.join(root,'scripts','polish-supported-destination-pages.mjs')).href;
  await import(`${polisher}?supported=${Date.now()}`);
}finally{
  await writeFile(dataPath,source,'utf8');
}
// The legacy generator rewrites sitemap.xml from scratch; re-apply the family guides (pages, sitemap, robots, hubs).
await import(`${pathToFileURL(path.join(root,'scripts','build-family-guides.mjs')).href}?supported=${Date.now()}`);

console.log(`SEO generation safely scoped to ${supported.length} paid-product destinations.`);
