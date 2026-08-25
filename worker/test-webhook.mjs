import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from './src/index.js';

class MemoryKV {
  constructor(){ this.map = new Map(); }
  async put(key, value){ this.map.set(key, value); }
  async get(key){ return this.map.has(key) ? this.map.get(key) : null; }
}

const secret = 'test-secret-1234567890';
const ref = '11111111-2222-4333-8444-555555555555';
const orderIdentifier = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const env = {
  LEMONSQUEEZY_WEBHOOK_SECRET: secret,
  ENTITLEMENTS: new MemoryKV()
};

const sign = raw => crypto.createHmac('sha256', secret).update(raw).digest('hex');

async function checkoutSession(product='adventure') {
  const request = new Request('https://example.workers.dev/checkout/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://kidventuro.com' },
    body: JSON.stringify({
      ref,
      product,
      name: 'Alex',
      age: '7',
      destination: 'Rome',
      interest: 'dinosaurs',
      days: '4',
      lang: 'en'
    })
  });
  return worker.fetch(request, env);
}

async function webhook(eventName, status='paid', product='adventure') {
  const payload = {
    meta: {
      event_name: eventName,
      custom_data: { kv_ref: ref, product }
    },
    data: {
      id: '12345',
      attributes: {
        identifier: orderIdentifier,
        status,
        test_mode: true,
        first_order_item: { variant_id: 987654 }
      }
    }
  };
  const raw = JSON.stringify(payload);
  const request = new Request('https://example.workers.dev/webhooks/lemonsqueezy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': sign(raw)
    },
    body: raw
  });
  return worker.fetch(request, env);
}

async function status() {
  const request = new Request(`https://example.workers.dev/entitlement/status?ref=${encodeURIComponent(ref)}`);
  const response = await worker.fetch(request, env);
  return { response, body: await response.json() };
}

async function fulfillment(query) {
  const request = new Request(`https://example.workers.dev/fulfillment?${query}`);
  const response = await worker.fetch(request, env);
  return { response, body: await response.json() };
}

{
  const response = await checkoutSession();
  assert.equal(response.status, 200, 'checkout personalization should be stored before redirect');
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.product, 'adventure');
}

{
  const bad = new Request('https://example.workers.dev/webhooks/lemonsqueezy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Signature': 'bad' },
    body: '{}'
  });
  const response = await worker.fetch(bad, env);
  assert.equal(response.status, 401, 'invalid signatures must be rejected');
}

{
  const mismatch = await webhook('order_created', 'paid', 'mini');
  assert.equal(mismatch.status, 200);
  const body = await mismatch.json();
  assert.equal(body.ignored, 'checkout_session_product_mismatch', 'a different product must not unlock this session');
}

{
  const response = await webhook('order_created', 'pending');
  assert.equal(response.status, 200);
  const result = await status();
  assert.equal(result.body.paid, false, 'non-paid orders must not unlock');
}

{
  const response = await webhook('order_created', 'paid');
  assert.equal(response.status, 200);
  const result = await status();
  assert.equal(result.response.status, 200);
  assert.equal(result.body.paid, true, 'paid order should unlock');
  assert.equal(result.body.test_mode, true);
  assert.equal(result.body.product, 'adventure');

  const byRef = await fulfillment(`ref=${encodeURIComponent(ref)}`);
  assert.equal(byRef.response.status, 200);
  assert.equal(byRef.body.product, 'adventure');
  assert.equal(byRef.body.personalization.product, 'adventure');
  assert.equal(byRef.body.personalization.name, 'Alex');
  assert.equal(byRef.body.personalization.destination, 'Rome');

  const byOrder = await fulfillment(`order=${encodeURIComponent(orderIdentifier)}`);
  assert.equal(byOrder.response.status, 200, 'order identifier should recover fulfillment in a new tab');
  assert.equal(byOrder.body.ref, ref);
  assert.equal(byOrder.body.personalization.interest, 'dinosaurs');
}

{
  const response = await webhook('order_refunded', 'refunded');
  assert.equal(response.status, 200);
  const result = await status();
  assert.equal(result.body.paid, false, 'refund should revoke entitlement');
  assert.equal(result.body.refunded, true);

  const fulfilled = await fulfillment(`order=${encodeURIComponent(orderIdentifier)}`);
  assert.equal(fulfilled.response.status, 403, 'refunded orders must not fulfill');
  assert.equal(fulfilled.body.refunded, true);
}

console.log('Product-aware webhook and fulfillment integration tests passed');
