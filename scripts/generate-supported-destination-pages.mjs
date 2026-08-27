import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataPath=path.join(root,'destinations','destination-data.js');
const source=await readFile(dataPath,'utf8');
const match=source.match(/^window\.KIDVENTURO_DESTINATION_SEO=(\{.*\});\s*$/s);
if(!match)throw new Error('Could not parse destinations/destination-data.js');
const all=JSON.parse(match[1]);
const supported=['rome','paris','london','barcelona','dubai','amsterdam','vienna','prague','berlin','lisbon','athens','istanbul','new-york','orlando','tokyo','kyoto','singapore','sydney','copenhagen','budapest','venice','florence','madrid','bangkok','reykjavik','munich','salzburg','zurich','brussels','bruges','dublin','edinburgh','stockholm','oslo','helsinki','milan','naples','seville','valencia','porto','nice','dubrovnik','krakow','warsaw','bucharest','sofia','abu-dhabi','seoul','hong-kong','kuala-lumpur'];
const missing=supported.filter(slug=>!all[slug]);
if(missing.length)throw new Error(`Missing supported SEO destination data: ${missing.join(', ')}`);
const filtered=Object.fromEntries(supported.map(slug=>[slug,all[slug]]));
const temporary=`window.KIDVENTURO_DESTINATION_SEO=${JSON.stringify(filtered)};\n`;

await writeFile(dataPath,temporary,'utf8');
try{
  const generator=pathToFileURL(path.join(root,'scripts','generate-destination-pages.mjs')).href;
  await import(`${generator}?supported=${Date.now()}`);
}finally{
  await writeFile(dataPath,source,'utf8');
}

console.log(`SEO generation safely scoped to ${supported.length} paid-product destinations.`);
