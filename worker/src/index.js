const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://kidventuro.com',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store'
};

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders, ...extra }
});

const hex = buffer => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');

async function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = hex(digest);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

const entitlementKey = ref => `entitlement:${ref}`;

async function handleWebhook(request, env) {
  const rawBody = await request.text();
  const signature = request.headers.get('X-Signature') || '';
  const valid = await verifySignature(rawBody, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET);
  if (!valid) return json({ ok: false, error: 'invalid_signature' }, 401);

  let payload;
  try { payload = JSON.parse(rawBody); }
  catch { return json({ ok: false, error: 'invalid_json' }, 400); }

  const event = payload?.meta?.event_name || request.headers.get('X-Event-Name') || '';
  const custom = payload?.meta?.custom_data || {};
  const ref = String(custom.kv_ref || '').trim();
  const product = String(custom.product || '').trim();

  if (!ref) return json({ ok: true, ignored: 'missing_ref' });
  if (product && product !== 'adventure') return json({ ok: true, ignored: 'unexpected_product' });

  if (event === 'order_created') {
    const attrs = payload?.data?.attributes || {};
    const record = {
      paid: true,
      product: product || 'adventure',
      order_id: String(payload?.data?.id || ''),
      order_identifier: String(attrs.identifier || ''),
      test_mode: Boolean(attrs.test_mode),
      created_at: new Date().toISOString()
    };
    await env.ENTITLEMENTS.put(entitlementKey(ref), JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 30 });
    return json({ ok: true });
  }

  if (event === 'order_refunded') {
    await env.ENTITLEMENTS.put(entitlementKey(ref), JSON.stringify({ paid: false, refunded: true, updated_at: new Date().toISOString() }), { expirationTtl: 60 * 60 * 24 * 30 });
    return json({ ok: true });
  }

  return json({ ok: true, ignored: event || 'unknown_event' });
}

async function handleStatus(url, env) {
  const ref = String(url.searchParams.get('ref') || '').trim();
  if (!/^[a-f0-9-]{24,64}$/i.test(ref)) return json({ paid: false }, 400);
  const raw = await env.ENTITLEMENTS.get(entitlementKey(ref));
  if (!raw) return json({ paid: false });
  let record;
  try { record = JSON.parse(raw); } catch { return json({ paid: false }); }
  return json({ paid: record.paid === true, refunded: record.refunded === true, test_mode: record.test_mode === true });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    const url = new URL(request.url);

    if (url.pathname === '/health' && request.method === 'GET') return json({ ok: true, service: 'kidventuro-api' });
    if (url.pathname === '/webhooks/lemonsqueezy' && request.method === 'POST') return handleWebhook(request, env);
    if (url.pathname === '/entitlement/status' && request.method === 'GET') return handleStatus(url, env);

    return json({ error: 'not_found' }, 404);
  }
};
