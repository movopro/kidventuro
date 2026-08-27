import {readFile} from 'node:fs/promises';

const key='2c90b7f61ea325c3cc3976cc93fd7008';
const host='kidventuro.com';
const sitemap=await readFile(new URL('../sitemap.xml',import.meta.url),'utf8');
const urls=[...new Set([
  'https://kidventuro.com/',
  ...[...sitemap.matchAll(/<loc>(https:\/\/kidventuro\.com\/[^<]+)<\/loc>/g)].map(match=>match[1])
])];

const response=await fetch('https://api.indexnow.org/indexnow',{
  method:'POST',
  headers:{'Content-Type':'application/json; charset=utf-8'},
  body:JSON.stringify({
    host,
    key,
    keyLocation:`https://${host}/${key}.txt`,
    urlList:urls
  })
});

if(![200,202].includes(response.status)){
  throw new Error(`IndexNow submission failed with HTTP ${response.status}: ${await response.text()}`);
}

console.log(`IndexNow accepted ${urls.length} Kidventuro URLs with HTTP ${response.status}.`);
