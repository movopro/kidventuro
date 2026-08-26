import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('./checkout.js',import.meta.url),'utf8');

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

console.log('Checkout freshness and payment privacy regression tests passed');
