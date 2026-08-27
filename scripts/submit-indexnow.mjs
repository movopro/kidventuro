import {readFile} from 'node:fs/promises';

const key='7796f6542f9867816f62cbddd7990cc0';
const host='kidventuro.com';
const sitemap=await readFile(new URL('../sitemap.xml',import.meta.url),'utf8');
const urls=[...new Set([
  'https://kidventuro.com/',
  ...[...sitemap.matchAll(/<loc>(https:\/\/kidventuro\.com\/[^<]+)<\/loc>/g)].map(match=>match[1])
])];

const payload=JSON.stringify({
  host,
  key,
  keyLocation:`https://${host}/${key}.txt`,
  urlList:urls
});

let response;
for(let attempt=1;attempt<=4;attempt++){
  response=await fetch('https://api.indexnow.org/indexnow',{
    method:'POST',
    headers:{'Content-Type':'application/json; charset=utf-8'},
    body:payload
  });
  if([200,202].includes(response.status))break;
  if(response.status===403&&attempt<4){
    console.log(`IndexNow key is not visible yet; retrying after Pages deployment (attempt ${attempt}/4).`);
    await new Promise(resolve=>setTimeout(resolve,15000));
    continue;
  }
  throw new Error(`IndexNow submission failed with HTTP ${response.status}: ${await response.text()}`);
}

console.log(`IndexNow accepted ${urls.length} Kidventuro URLs with HTTP ${response.status}.`);
