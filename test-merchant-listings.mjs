// Google Merchant listings: every Product on the home page (static JSON-LD and the run-time ItemList in launch-polish.js)
// needs name, image, a real Brand (an @id reference to the Organization is read as the wrong type), and offers with
// price, currency, availability, shippingDetails and a return policy. Search Console flagged each of these on 2026-10-12.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const polish = await readFile(new URL('./launch-polish.js', import.meta.url), 'utf8');

const blocks = [...index.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
const nodes = blocks.flatMap(block => (block['@graph'] ? block['@graph'] : [block]));
const products = nodes.filter(node => node['@type'] === 'Product');
assert.ok(products.length >= 1, 'index.html must carry a Product');

for (const product of products) {
  assert.ok(product.name && product.description, 'Product needs name and description');
  assert.match(String(product.image), /^https:\/\/kidventuro\.com\/assets\//, 'Product needs an own-domain image');
  assert.equal(product.brand?.['@type'], 'Brand', 'brand must be a Brand object, not an @id reference');
  assert.equal(product.brand?.name, 'Kidventuro');
  const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
  assert.ok(offers.length >= 1);
  for (const offer of offers) {
    assert.ok(offer.price && offer.priceCurrency && offer.availability && offer.url, 'offer needs price, currency, availability, url');
    assert.equal(offer.shippingDetails?.['@type'], 'OfferShippingDetails', 'offer needs shippingDetails');
    assert.equal(offer.hasMerchantReturnPolicy?.['@type'], 'MerchantReturnPolicy', 'offer needs hasMerchantReturnPolicy');
  }
}

// Run-time items: the three Product entries built in launch-polish.js.
const factory = polish.match(/const product=\(position,name,description,price\)=>\(\{[^\n]+\}\}\);/)?.[0];
assert.ok(factory, 'launch-polish.js product factory not found');
assert.ok(/image:SITE\+'\/assets\/[^']+'/.test(factory), 'run-time Product needs an image');
assert.ok(/brand:\{'@type':'Brand',name:'Kidventuro'\}/.test(factory), 'run-time Product needs a Brand');
const offerFactory = polish.match(/const offer=price=>\(\{[\s\S]*?\n    \}\);/)?.[0] || '';
for (const key of ['price', 'priceCurrency', 'availability', 'shippingDetails', 'hasMerchantReturnPolicy']) {
  assert.ok(offerFactory.includes(key), `run-time offer needs ${key}`);
}
console.log(`Merchant listings structure OK (${products.length} static Product, 3 run-time Product)`);
