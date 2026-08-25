const ALLOWED_ORIGIN = 'https://kidventuro.com';

const responseHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...responseHeaders, ...extra }
});

const hex = buffer => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');

async function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const normalized = String(signature).trim().toLowerCase();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = hex(digest);
  if (expected.length !== normalized.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ normalized.charCodeAt(i);
  return diff === 0;
}

const entitlementKey = ref => `entitlement:${ref}`;
const diagnosticKey = 'diagnostic:last_webhook';
const validRef = ref => /^[a-f0-9-]{24,64}$/i.test(ref);
const refHint = ref => validRef(ref) ? ref.slice(-8) : '';

async function saveDiagnostic(env, data) {
  if (!env.ENTITLEMENTS) return;
  const record = {
    received_at: new Date().toISOString(),
    event: String(data.event || ''),
    order_status: String(data.order_status || ''),
    has_ref: Boolean(data.has_ref),
    ref_hint: String(data.ref_hint || ''),
    product: String(data.product || ''),
    variant_id: String(data.variant_id || ''),
    test_mode: Boolean(data.test_mode),
    result: String(data.result || '')
  };
  await env.ENTITLEMENTS.put(diagnosticKey, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 7 });
}

async function readDiagnostic(env) {
  if (!env.ENTITLEMENTS) return null;
  const raw = await env.ENTITLEMENTS.get(diagnosticKey);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function handleWebhook(request, env) {
  if (!env.LEMONSQUEEZY_WEBHOOK_SECRET) return json({ ok: false, error: 'server_not_configured' }, 503);
  if (!env.ENTITLEMENTS) return json({ ok: false, error: 'storage_not_configured' }, 503);

  const rawBody = await request.text();
  const signature = request.headers.get('X-Signature') || '';
  const valid = await verifySignature(rawBody, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET);
  if (!valid) return json({ ok: false, error: 'invalid_signature' }, 401);

  let payload;
  try { payload = JSON.parse(rawBody); }
  catch { return json({ ok: false, error: 'invalid_json' }, 400); }

  const event = String(payload?.meta?.event_name || '');
  const custom = payload?.meta?.custom_data || {};
  const ref = String(custom.kv_ref || '').trim();
  const product = String(custom.product || '').trim();
  const attrs = payload?.data?.attributes || {};
  const orderItem = attrs.first_order_item || {};
  const variantId = String(orderItem.variant_id || '');
  const orderStatus = String(attrs.status || '').toLowerCase();
  const testMode = Boolean(attrs.test_mode ?? payload?.meta?.test_mode);

  const diag = result => saveDiagnostic(env, {
    event,
    order_status: orderStatus,
    has_ref: validRef(ref),
    ref_hint: refHint(ref),
    product,
    variant_id: variantId,
    test_mode: testMode,
    result
  });

  if (!validRef(ref)) {
    await diag('ignored_missing_or_invalid_ref');
    return json({ ok: true, ignored: 'missing_or_invalid_ref' });
  }
  if (product && product !== 'adventure') {
    await diag('ignored_unexpected_product');
    return json({ ok: true, ignored: 'unexpected_product' });
  }
  if (env.EXPECTED_VARIANT_ID && variantId !== String(env.EXPECTED_VARIANT_ID)) {
    await diag('ignored_unexpected_variant');
    return json({ ok: true, ignored: 'unexpected_variant' });
  }

  if (event === 'order_created') {
    if (orderStatus !== 'paid') {
      await diag('ignored_order_not_paid');
      return json({ ok: true, ignored: 'order_not_paid' });
    }

    const record = {
      paid: true,
      product: product || 'adventure',
      order_id: String(payload?.data?.id || ''),
      order_identifier: String(attrs.identifier || ''),
      variant_id: variantId,
      test_mode: testMode,
      created_at: new Date().toISOString()
    };

    await env.ENTITLEMENTS.put(
      entitlementKey(ref),
      JSON.stringify(record),
      { expirationTtl: 60 * 60 * 24 * 30 }
    );
    await diag('entitlement_created');
    return json({ ok: true });
  }

  if (event === 'order_refunded') {
    await env.ENTITLEMENTS.put(
      entitlementKey(ref),
      JSON.stringify({ paid: false, refunded: true, variant_id: variantId, updated_at: new Date().toISOString() }),
      { expirationTtl: 60 * 60 * 24 * 30 }
    );
    await diag('entitlement_refunded');
    return json({ ok: true });
  }

  await diag(`ignored_${event || 'unknown_event'}`);
  return json({ ok: true, ignored: event || 'unknown_event' });
}

async function handleStatus(url, env) {
  if (!env.ENTITLEMENTS) return json({ paid: false, error: 'storage_not_configured' }, 503);
  const ref = String(url.searchParams.get('ref') || '').trim();
  if (!validRef(ref)) return json({ paid: false, reason: 'invalid_ref' }, 400);

  const raw = await env.ENTITLEMENTS.get(entitlementKey(ref));
  if (!raw) return json({ paid: false, reason: 'not_found' });

  let record;
  try { record = JSON.parse(raw); }
  catch { return json({ paid: false, reason: 'invalid_record' }); }

  return json({
    paid: record.paid === true,
    refunded: record.refunded === true,
    test_mode: record.test_mode === true
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders });
    const url = new URL(request.url);

    if (url.pathname === '/health' && request.method === 'GET') {
      const lastWebhook = await readDiagnostic(env);
      return json({
        ok: true,
        service: 'kidventuro-api',
        storage: Boolean(env.ENTITLEMENTS),
        webhook_secret: Boolean(env.LEMONSQUEEZY_WEBHOOK_SECRET),
        last_webhook: lastWebhook
      });
    }
    if (url.pathname === '/webhooks/lemonsqueezy' && request.method === 'POST') return handleWebhook(request, env);
    if (url.pathname === '/entitlement/status' && request.method === 'GET') return handleStatus(url, env);

    return json({ error: 'not_found' }, 404);
  }
};
