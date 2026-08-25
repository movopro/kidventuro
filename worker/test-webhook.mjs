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
const env = {
  LEMONSQUEEZY_WEBHOOK_SECRET: secret,
  ENTITLEMENTS: new MemoryKV()
};

const sign = raw => crypto.createHmac('sha256', secret).update(raw).digest('hex');

async function webhook(eventName, status='paid') {
  const payload = {
    meta: {
      event_name: eventName,
      custom_data: { kv_ref: ref, product: 'adventure' }
    },
    data: {
      id: '12345',
      attributes: {
        identifier: 'order-identifier-test',
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
}

{
  const response = await webhook('order_refunded', 'refunded');
  assert.equal(response.status, 200);
  const result = await status();
  assert.equal(result.body.paid, false, 'refund should revoke entitlement');
  assert.equal(result.body.refunded, true);
}

console.log('Webhook integration tests passed');
