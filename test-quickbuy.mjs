// Launch offer + quick-buy regression test: runs the real quickbuy.js against a minimal fake page (node:vm).
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('./quickbuy.js',import.meta.url),'utf8');
const runtimeSource=await readFile(new URL('./runtime-config.js',import.meta.url),'utf8');
const cfgMatch=runtimeSource.match(/offer:\{([^}]*)\}/);
assert(cfgMatch,'runtime-config.js must declare the launch offer');
const offer=Object.fromEntries([...cfgMatch[1].matchAll(/(\w+):('([^']*)'|(\d+))/g)].map(m=>[m[1],m[3]??Number(m[4])]));
assert.equal(offer.code,'FIRSTTRIP');
assert(offer.percent>0&&offer.percent<=50,'launch discount must be a sane percentage');
assert(Date.parse(offer.endsAt)>Date.parse(offer.startsAt),'offer must end after it starts');

function run(now){
  const RealDate=Date;
  class FakeDate extends RealDate{constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}}
  const el=()=>({dataset:{},style:{},children:[],classList:{toggle(){}},addEventListener(){},querySelector(){return null;},setAttribute(){}});
  const document={documentElement:el(),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},getElementById:()=>null};
  const window={KIDVENTURO_CONFIG:{apiBase:'https://api.test',checkoutUrls:{adventure:'https://store.test/checkout/buy/x'},offer},addEventListener(){},crypto:{randomUUID:()=>'r'}};
  const ctx=vm.createContext({window,document,Date:FakeDate,setInterval:()=>1,clearInterval(){},URL,URLSearchParams,console,sessionStorage:{setItem(){},removeItem(){}},fetch:async()=>({})});
  vm.runInContext(source,ctx);
  return window.KVOffer;
}

const during=run(Date.parse(offer.startsAt)+3600e3);
assert.equal(during.active(),true);
assert.equal(during.discounted(990),693,'30% off 9.90 is 6.93');
assert.equal(during.discounted(590),413);
assert.equal(during.discounted(1490),1043);
const url=new URL(during.decorate('https://store.test/checkout/buy/x'));
assert.equal(url.searchParams.get('checkout[discount_code]'),'FIRSTTRIP','checkout url carries the code while the offer runs');

const after=run(Date.parse(offer.endsAt)+1000);
assert.equal(after.active(),false,'offer is off after endsAt');
assert.equal(after.decorate('https://store.test/checkout/buy/x'),'https://store.test/checkout/buy/x','no code after expiry');
assert.equal(after.code(),'');
const before=run(Date.parse(offer.startsAt)-1000);
assert.equal(before.active(),false);

// no personal data or order ids in the new events; they must be allow-listed on both sides
for(const f of ['analytics.js','worker/src/analytics.js']){
  const t=await readFile(new URL('./'+f,import.meta.url),'utf8');
  for(const e of ['sample_downloaded','offer_viewed','quickbuy_started']) assert(t.includes(`'${e}'`),`${f} allows ${e}`);
}
assert(!/childName|email|order_id/.test(source.replace(/childName/g,'')),'quickbuy.js sends no email/order id');

// every converted destination page loads the script, has the form mount and a working sample
const dir=new URL('./destinations/',import.meta.url);
let pages=0;
for(const f of await readdir(dir)){
  if(!f.endsWith('.html')) continue;
  const html=await readFile(new URL(f,dir),'utf8');
  if(!html.includes('kv-conversion:start')) continue;
  pages++;
  assert(html.includes('/quickbuy.js'),`${f} loads quickbuy.js`);
  assert(html.includes('/conversion.css'),`${f} loads conversion.css`);
  if(f!=='index.html'){
    assert(/data-kv-quickbuy data-destination="[^"]+"/.test(html),`${f} has the order form`);
    const pdf=html.match(/href="(\/assets\/samples\/[a-z-]+-free-sample\.pdf)"/);
    assert(pdf,`${f} links a free sample`);
    await access(new URL('.'+pdf[1],import.meta.url));
  }
}
assert(pages>=90,`conversion layer on ${pages} pages`);
for(const s of ['orlando','paris','london','rome','barcelona','vienna','prague','dubai','rovaniemi','reykjavik','amsterdam','berlin','madrid','lisbon','athens','istanbul','new-york','tokyo','venice','florence']){
  for(const k of ['cover','bingo','hunt','puzzle','cert']) await access(new URL(`./assets/samples/${s}-${k}.webp`,import.meta.url));
}
const home=await readFile(new URL('./index.html',import.meta.url),'utf8');
assert(!/id="childName"[^>]*value="Alex"/.test(home),'child name must not be pre-filled');
assert(home.includes('data-kv-quickbuy')&&home.includes('data-kv-countdown'),'home hero has the order form and countdown');
console.log(`Launch offer, quick buy and sample pages passed (${pages} destination pages)`);
