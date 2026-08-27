import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('./checkout.js',import.meta.url),'utf8');
const runtime=await readFile(new URL('./runtime-config.js',import.meta.url),'utf8');

assert.ok(source.includes('const ref=makeRef();'),'Every new checkout must create a fresh opaque reference');
assert.equal(source.includes('existing.product===product'),false,'Checkout must never reuse a previous product reference');
assert.equal(source.includes('readExisting'),false,'Legacy checkout reference reuse helper must stay removed');
assert.ok(source.includes("sessionStorage.removeItem('kidventuro:paid_ref')"),'A new checkout must clear previous paid browser state');
assert.ok(source.includes("sessionStorage.removeItem('kidventuro:ai')"),'A new checkout must clear cached AI browser state');

for(const forbidden of [
  'checkout[custom][name]',
  'checkout[custom][age]',
  'checkout[custom][destination]',
  'checkout[custom][interest]',
  'checkout[custom][children]'
]){
  assert.equal(source.includes(forbidden),false,`Personalization must not be sent to Lemon Squeezy custom data: ${forbidden}`);
}
assert.ok(source.includes('checkout[custom][kv_ref]'));
assert.ok(source.includes('checkout[custom][product]'));
assert.ok(source.includes('runtime.checkoutUrls'),'Checkout code must read product URLs from runtime configuration');
assert.ok(source.includes('runtime.checkoutMode'),'Checkout code must read Test/Live mode from runtime configuration');
assert.equal(source.includes('lemonsqueezy.com/checkout/buy/'),false,'Checkout URLs must stay centralized in runtime-config.js');

const isTest=runtime.includes("checkoutMode:'test'");
const isLive=runtime.includes("checkoutMode:'live'");
assert.notEqual(isTest,isLive,'Runtime must explicitly identify exactly one checkout mode');

const knownTestIds=[
  'b68dbe91-5c2d-4ede-b9b6-a1e9625627be',
  '002731fe-1735-4287-8223-450d8ef41202',
  'e49470c6-bd0e-4533-a206-c254fa84908f'
];
const checkoutMatches=[...runtime.matchAll(/https:\/\/kidventuro\.lemonsqueezy\.com\/checkout\/buy\/([a-f0-9-]{36})/gi)];
assert.equal(checkoutMatches.length,3,'Runtime config must contain exactly three Lemon Squeezy checkout URLs');
assert.equal(new Set(checkoutMatches.map(match=>match[1])).size,3,'Mini, Adventure and Family checkout URLs must be unique');
for(const product of ['mini','adventure','family']){
  assert.match(runtime,new RegExp(`${product}:'https:\\\/\\\/kidventuro\\.lemonsqueezy\\.com\\/checkout\\/buy\\/[a-f0-9-]{36}'`,'i'),`${product} checkout URL is missing or malformed`);
}
if(isTest){
  for(const id of knownTestIds) assert.ok(runtime.includes(id),`Configured Test checkout is missing: ${id}`);
}
if(isLive){
  for(const id of knownTestIds) assert.equal(runtime.includes(id),false,`Live config must not contain Test checkout ID: ${id}`);
}

console.log('Checkout freshness, payment privacy and Test/Live runtime configuration regression tests passed');
