import {getAiEnrichment} from './ai.js';

const RELEASE = '2026-08-26.4';
const ALLOWED_ORIGIN = 'https://kidventuro.com';
const BOOKLET_LANGUAGE = 'en';
const ALLOWED_PRODUCTS = new Set(['mini', 'adventure', 'family']);
const PRODUCT_PRICES_EUR_CENTS = Object.freeze({ mini: 590, adventure: 990, family: 1490 });
const ALLOWED_DESTINATIONS = new Set([
  'Rome','Paris','London','Barcelona','Dubai','Amsterdam','Vienna','Prague','Berlin','Lisbon',
  'Athens','Istanbul','New York','Orlando','Tokyo','Kyoto','Singapore','Sydney','Copenhagen','Budapest',
  'Venice','Florence','Madrid','Bangkok','Reykjavik','Munich','Salzburg','Zurich','Brussels','Bruges',
  'Dublin','Edinburgh','Stockholm','Oslo','Helsinki','Milan','Naples','Seville','Valencia','Porto',
  'Nice','Dubrovnik','Krakow','Warsaw','Bucharest','Sofia','Abu Dhabi','Seoul','Hong Kong','Kuala Lumpur'
]);
const ALLOWED_INTERESTS = new Set([
  'dinosaurs','space','animals','football','art','mysteries','castles','science',
  'vehicles','nature','food','music','superheroes','history','ocean','trains'
]);

const TTL = Object.freeze({
  checkout: 60 * 60 * 24 * 7,
  entitlement: 60 * 60 * 24 * 30,
  diagnostic: 60 * 60 * 24 * 7
});
const BODY_LIMITS = Object.freeze({
  checkout: 8 * 1024,
  ai: 1024,
  webhook: 512 * 1024
});

const responseHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Vary': 'Origin'
};

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...responseHeaders, ...extra }
});

const hex = buffer => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
const byteLength = value => new TextEncoder().encode(String(value || '')).byteLength;

async function readBody(request, maxBytes) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(declared) && declared > maxBytes) return { error: 'payload_too_large' };
  const raw = await request.text();
  if (byteLength(raw) > maxBytes) return { error: 'payload_too_large' };
  return { raw };
}

async function readJson(request, maxBytes) {
  const body = await readBody(request, maxBytes);
  if (body.error) return body;
  try { return { raw: body.raw, value: JSON.parse(body.raw) }; }
  catch { return { error: 'invalid_json' }; }
}

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
const checkoutSessionKey = ref => `checkout_session:${ref}`;
const orderKey = identifier => `order_ref:${identifier}`;
const variantLockKey = (testMode, product) => `variant_lock:${testMode ? 'test' : 'live'}:${product}`;
const diagnosticKey = 'diagnostic:last_webhook';
const validRef = ref => /^[a-f0-9-]{24,64}$/i.test(ref);
const validOrderIdentifier = value => /^[a-z0-9-]{8,80}$/i.test(value);
const validVariantId = value => /^\d+$/.test(String(value || ''));
const validProduct = value => ALLOWED_PRODUCTS.has(String(value || '').trim().toLowerCase());
const refHint = ref => validRef(ref) ? ref.slice(-8) : '';
const testWebhookSecret = env => String(env.LEMONSQUEEZY_WEBHOOK_SECRET_TEST || env.LEMONSQUEEZY_WEBHOOK_SECRET || '');
const liveWebhookSecret = env => String(env.LEMONSQUEEZY_WEBHOOK_SECRET_LIVE || '');

function expectedVariantFor(product, env) {
  if (product === 'mini') return env.EXPECTED_VARIANT_MINI || '';
  if (product === 'family') return env.EXPECTED_VARIANT_FAMILY || '';
  return env.EXPECTED_VARIANT_ADVENTURE || env.EXPECTED_VARIANT_ID || '';
}

async function variantLockSummary(env) {
  const summary = { test: {}, live: {} };
  for (const testMode of [true, false]) {
    const bucket = testMode ? summary.test : summary.live;
    for (const product of ALLOWED_PRODUCTS) {
      const configured = String(expectedVariantFor(product, env) || '');
      const learned = configured || !env.ENTITLEMENTS ? '' : String(await env.ENTITLEMENTS.get(variantLockKey(testMode, product)) || '');
      bucket[product] = Boolean(configured || learned);
    }
  }
  return summary;
}

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
    currency: String(data.currency || ''),
    item_price: Number.isFinite(Number(data.item_price)) ? Number(data.item_price) : null,
    test_mode: Boolean(data.test_mode),
    signature_present: Boolean(data.signature_present),
    result: String(data.result || '')
  };
  await env.ENTITLEMENTS.put(diagnosticKey, JSON.stringify(record), { expirationTtl: TTL.diagnostic });
}

async function readDiagnostic(env) {
  if (!env.ENTITLEMENTS) return null;
  const raw = await env.ENTITLEMENTS.get(diagnosticKey);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function readEntitlement(ref, env) {
  if (!env.ENTITLEMENTS) return null;
  const raw = await env.ENTITLEMENTS.get(entitlementKey(ref));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function readCheckoutSession(ref, env) {
  if (!env.ENTITLEMENTS) return null;
  const raw = await env.ENTITLEMENTS.get(checkoutSessionKey(ref));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function cleanName(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
}

function cleanChild(input) {
  const name = cleanName(input?.name);
  const age = Number(input?.age);
  const interest = String(input?.interest || '').trim().slice(0, 40);
  if (!name || !Number.isInteger(age) || age < 4 || age > 12 || !ALLOWED_INTERESTS.has(interest)) return null;
  return { name, age: String(age), interest };
}

function cleanPersonalization(input) {
  const product = String(input?.product || 'adventure').trim().toLowerCase();
  const days = Number(input?.days);
  const destination = String(input?.destination || '').trim().slice(0, 40);

  if (!validProduct(product)) return null;
  if (![2, 3, 4, 5, 7].includes(days)) return null;
  if (!ALLOWED_DESTINATIONS.has(destination)) return null;

  if (product === 'family') {
    if (!Array.isArray(input?.children) || input.children.length < 1 || input.children.length > 3) return null;
    const children = input.children.map(cleanChild);
    if (children.some(child => !child)) return null;
    const first = children[0];
    return {
      product,
      destination,
      days: String(days),
      lang: BOOKLET_LANGUAGE,
      children,
      name: first.name,
      age: first.age,
      interest: first.interest,
      created_at: new Date().toISOString()
    };
  }

  const child = cleanChild(input);
  if (!child) return null;
  return {
    ...child,
    destination,
    days: String(days),
    lang: BOOKLET_LANGUAGE,
    product,
    created_at: new Date().toISOString()
  };
}

function comparablePersonalization(value) {
  if (!value || typeof value !== 'object') return '';
  const copy = { ...value };
  delete copy.created_at;
  return JSON.stringify(copy);
}

async function handleCheckoutSession(request, env) {
  if (!env.ENTITLEMENTS) return json({ ok: false, error: 'storage_not_configured' }, 503);
  if (request.headers.get('Origin') !== ALLOWED_ORIGIN) return json({ ok: false, error: 'origin_not_allowed' }, 403);

  const parsed = await readJson(request, BODY_LIMITS.checkout);
  if (parsed.error === 'payload_too_large') return json({ ok: false, error: parsed.error }, 413);
  if (parsed.error) return json({ ok: false, error: parsed.error }, 400);

  const payload = parsed.value;
  const ref = String(payload?.ref || '').trim();
  const personalization = cleanPersonalization(payload);
  if (!validRef(ref) || !personalization) return json({ ok: false, error: 'invalid_checkout_session' }, 400);

  const entitlement = await readEntitlement(ref, env);
  if (entitlement) return json({ ok: false, error: 'checkout_ref_already_used' }, 409);

  const existing = await readCheckoutSession(ref, env);
  if (existing) {
    if (comparablePersonalization(existing) === comparablePersonalization(personalization)) {
      return json({ ok: true, product: existing.product, idempotent: true });
    }
    return json({ ok: false, error: 'checkout_ref_conflict' }, 409);
  }

  await env.ENTITLEMENTS.put(
    checkoutSessionKey(ref),
    JSON.stringify(personalization),
    { expirationTtl: TTL.checkout }
  );

  return json({ ok: true, product: personalization.product });
}

async function handleRefund({ env, payload, ref, product, variantId, orderStatus, orderIdentifier, orderCurrency, itemPrice, testMode, diag }) {
  const existing = await readEntitlement(ref, env);
  if (!existing) {
    await diag('ignored_refund_unknown_entitlement');
    return json({ ok: true, ignored: 'refund_unknown_entitlement' });
  }
  if (existing.product !== product) {
    await diag('ignored_checkout_session_product_mismatch');
    return json({ ok: true, ignored: 'product_mismatch' });
  }
  if (typeof existing.test_mode === 'boolean' && existing.test_mode !== testMode) {
    await diag('ignored_refund_mode_mismatch');
    return json({ ok: true, ignored: 'refund_mode_mismatch' });
  }
  if (variantId && existing.variant_id && variantId !== String(existing.variant_id)) {
    await diag('ignored_unexpected_variant');
    return json({ ok: true, ignored: 'unexpected_variant' });
  }
  if (orderCurrency && existing.currency && orderCurrency !== String(existing.currency)) {
    await diag('ignored_unexpected_price');
    return json({ ok: true, ignored: 'unexpected_price' });
  }
  if (Number.isInteger(itemPrice) && Number.isInteger(Number(existing.item_price)) && itemPrice !== Number(existing.item_price)) {
    await diag('ignored_unexpected_price');
    return json({ ok: true, ignored: 'unexpected_price' });
  }

  const record = {
    ...existing,
    paid: false,
    refunded: true,
    refund_status: orderStatus,
    updated_at: new Date().toISOString()
  };
  await env.ENTITLEMENTS.put(entitlementKey(ref), JSON.stringify(record), { expirationTtl: TTL.entitlement });
  if (validOrderIdentifier(orderIdentifier)) {
    await env.ENTITLEMENTS.put(orderKey(orderIdentifier), ref, { expirationTtl: TTL.entitlement });
  }
  await diag('entitlement_refunded');
  return json({ ok: true });
}

async function handleWebhook(request, env) {
  const testSecret = testWebhookSecret(env);
  const liveSecret = liveWebhookSecret(env);
  if (!testSecret && !liveSecret) return json({ ok: false, error: 'server_not_configured' }, 503);
  if (!env.ENTITLEMENTS) return json({ ok: false, error: 'storage_not_configured' }, 503);

  const body = await readBody(request, BODY_LIMITS.webhook);
  if (body.error === 'payload_too_large') return json({ ok: false, error: body.error }, 413);
  const rawBody = body.raw;
  const signature = request.headers.get('X-Signature') || '';
  const matchedTest = testSecret ? await verifySignature(rawBody, signature, testSecret) : false;
  const matchedLive = liveSecret ? await verifySignature(rawBody, signature, liveSecret) : false;
  if (!matchedTest && !matchedLive) {
    await saveDiagnostic(env, {
      signature_present: Boolean(signature),
      result: signature ? 'rejected_invalid_signature' : 'rejected_missing_signature'
    });
    return json({ ok: false, error: 'invalid_signature' }, 401);
  }

  let payload;
  try { payload = JSON.parse(rawBody); }
  catch {
    await saveDiagnostic(env, { signature_present: true, result: 'rejected_invalid_json' });
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  const event = String(payload?.meta?.event_name || '');
  const custom = payload?.meta?.custom_data || {};
  const ref = String(custom.kv_ref || '').trim();
  const product = String(custom.product || '').trim().toLowerCase();
  const attrs = payload?.data?.attributes || {};
  const orderItem = attrs.first_order_item || {};
  const variantId = String(orderItem.variant_id || '');
  const orderStatus = String(attrs.status || '').toLowerCase();
  const orderIdentifier = String(attrs.identifier || '').trim();
  const orderCurrency = String(attrs.currency || '').trim().toUpperCase();
  const itemPrice = Number(orderItem.price);
  const testMode = Boolean(attrs.test_mode ?? orderItem.test_mode ?? payload?.meta?.test_mode);

  const diag = result => saveDiagnostic(env, {
    event,
    order_status: orderStatus,
    has_ref: validRef(ref),
    ref_hint: refHint(ref),
    product,
    variant_id: variantId,
    currency: orderCurrency,
    item_price: itemPrice,
    test_mode: testMode,
    signature_present: true,
    result
  });

  if (testMode && !matchedTest) {
    await diag('rejected_wrong_mode_signature');
    return json({ ok: false, error: 'invalid_signature' }, 401);
  }
  if (!testMode) {
    if (!liveSecret) {
      await diag('rejected_live_secret_missing');
      return json({ ok: false, error: 'live_server_not_configured' }, 503);
    }
    if (!matchedLive) {
      await diag('rejected_wrong_mode_signature');
      return json({ ok: false, error: 'invalid_signature' }, 401);
    }
  }

  if (!validRef(ref)) {
    await diag('ignored_missing_or_invalid_ref');
    return json({ ok: true, ignored: 'missing_or_invalid_ref' });
  }
  if (!validProduct(product)) {
    await diag('ignored_unexpected_product');
    return json({ ok: true, ignored: 'unexpected_product' });
  }

  if (event === 'order_refunded') {
    return handleRefund({ env, payload, ref, product, variantId, orderStatus, orderIdentifier, orderCurrency, itemPrice, testMode, diag });
  }
  if (event !== 'order_created') {
    await diag(`ignored_${event || 'unknown_event'}`);
    return json({ ok: true, ignored: event || 'unknown_event' });
  }

  const checkoutSession = await readCheckoutSession(ref, env);
  if (!checkoutSession || checkoutSession.product !== product) {
    await diag('ignored_checkout_session_product_mismatch');
    return json({ ok: true, ignored: 'checkout_session_product_mismatch' });
  }

  const expectedPrice = PRODUCT_PRICES_EUR_CENTS[product];
  if (orderCurrency !== 'EUR' || !Number.isInteger(itemPrice) || itemPrice !== expectedPrice) {
    await diag('ignored_unexpected_price');
    return json({ ok: true, ignored: 'unexpected_price' });
  }

  if (!validVariantId(variantId)) {
    await diag('ignored_unexpected_variant');
    return json({ ok: true, ignored: 'unexpected_variant' });
  }

  const configuredVariant = String(expectedVariantFor(product, env) || '');
  const learnedVariant = configuredVariant ? '' : String(await env.ENTITLEMENTS.get(variantLockKey(testMode, product)) || '');
  const expectedVariant = configuredVariant || learnedVariant;
  if (expectedVariant && variantId !== expectedVariant) {
    await diag('ignored_unexpected_variant');
    return json({ ok: true, ignored: 'unexpected_variant' });
  }

  if (orderStatus !== 'paid') {
    await diag('ignored_order_not_paid');
    return json({ ok: true, ignored: 'order_not_paid' });
  }

  const existing = await readEntitlement(ref, env);
  if (existing?.refunded === true) {
    await diag('ignored_ref_refunded');
    return json({ ok: true, ignored: 'ref_refunded' });
  }
  if (existing?.paid === true) {
    const sameOrder = String(existing.order_id || '') === String(payload?.data?.id || '');
    if (sameOrder && existing.product === product) {
      await diag('entitlement_already_exists');
      return json({ ok: true, duplicate: true });
    }
    await diag('ignored_ref_already_used');
    return json({ ok: true, ignored: 'ref_already_used' });
  }

  if (!configuredVariant && !learnedVariant) {
    await env.ENTITLEMENTS.put(variantLockKey(testMode, product), variantId);
  }

  const record = {
    paid: true,
    refunded: false,
    product,
    order_id: String(payload?.data?.id || ''),
    order_identifier: orderIdentifier,
    variant_id: variantId,
    currency: orderCurrency,
    item_price: itemPrice,
    test_mode: testMode,
    created_at: new Date().toISOString()
  };

  await env.ENTITLEMENTS.put(entitlementKey(ref), JSON.stringify(record), { expirationTtl: TTL.entitlement });
  if (validOrderIdentifier(orderIdentifier)) {
    await env.ENTITLEMENTS.put(orderKey(orderIdentifier), ref, { expirationTtl: TTL.entitlement });
  }
  await diag('entitlement_created');
  return json({ ok: true });
}

async function handleStatus(url, env) {
  if (!env.ENTITLEMENTS) return json({ paid: false, error: 'storage_not_configured' }, 503);
  const ref = String(url.searchParams.get('ref') || '').trim();
  if (!validRef(ref)) return json({ paid: false, reason: 'invalid_ref' }, 400);

  const record = await readEntitlement(ref, env);
  if (!record) return json({ paid: false, reason: 'not_found' });

  return json({
    paid: record.paid === true,
    refunded: record.refunded === true,
    test_mode: record.test_mode === true,
    product: record.product || ''
  });
}

async function handleFulfillment(url, env) {
  if (!env.ENTITLEMENTS) return json({ paid: false, error: 'storage_not_configured' }, 503);

  let ref = String(url.searchParams.get('ref') || '').trim();
  const order = String(url.searchParams.get('order') || '').trim();

  if (!validRef(ref) && validOrderIdentifier(order)) {
    ref = String(await env.ENTITLEMENTS.get(orderKey(order)) || '').trim();
  }
  if (!validRef(ref)) return json({ paid: false, reason: 'not_found' }, 404);

  const entitlement = await readEntitlement(ref, env);
  if (!entitlement) return json({ paid: false, reason: 'not_found' }, 404);
  if (entitlement.refunded === true) return json({ paid: false, refunded: true, product: entitlement.product || '' }, 403);
  if (entitlement.paid !== true) return json({ paid: false, reason: 'not_paid', product: entitlement.product || '' }, 403);

  const rawSession = await env.ENTITLEMENTS.get(checkoutSessionKey(ref));
  if (!rawSession) {
    return json({ paid: true, ref, product: entitlement.product || '', test_mode: entitlement.test_mode === true, personalization: null, reason: 'personalization_expired' }, 410);
  }

  let personalization;
  try { personalization = JSON.parse(rawSession); }
  catch { return json({ paid: true, ref, product: entitlement.product || '', personalization: null, reason: 'invalid_personalization' }, 500); }

  if (personalization.product !== entitlement.product) {
    return json({ paid: false, reason: 'product_mismatch' }, 409);
  }

  return json({
    paid: true,
    ref,
    product: entitlement.product,
    test_mode: entitlement.test_mode === true,
    personalization
  });
}

async function handleAiEnrichment(request, env) {
  if (!env.ENTITLEMENTS) return json({ ok: false, ai: false, error: 'storage_not_configured' }, 503);
  if (request.headers.get('Origin') !== ALLOWED_ORIGIN) return json({ ok: false, ai: false, error: 'origin_not_allowed' }, 403);

  const parsed = await readJson(request, BODY_LIMITS.ai);
  if (parsed.error === 'payload_too_large') return json({ ok: false, ai: false, error: parsed.error }, 413);
  if (parsed.error) return json({ ok: false, ai: false, error: parsed.error }, 400);
  const ref = String(parsed.value?.ref || '').trim();
  if (!validRef(ref)) return json({ ok: false, ai: false, error: 'invalid_ref' }, 400);

  const entitlement = await readEntitlement(ref, env);
  if (!entitlement || entitlement.paid !== true || entitlement.refunded === true) {
    return json({ ok: false, ai: false, error: 'paid_entitlement_required' }, 403);
  }
  const session = await readCheckoutSession(ref, env);
  if (!session || session.product !== entitlement.product) {
    return json({ ok: false, ai: false, error: 'checkout_session_unavailable' }, 409);
  }

  const result = await getAiEnrichment(ref, session, env);
  return json({ ok: true, ...result });
}

async function handleDiagnostics(url, env) {
  if (!env.ENTITLEMENTS) return json({ ok: false, error: 'storage_not_configured' }, 503);
  const ref = String(url.searchParams.get('ref') || '').trim();
  if (!validRef(ref)) return json({ ok: false, error: 'invalid_ref' }, 400);
  const last = await readDiagnostic(env);
  if (!last || last.ref_hint !== refHint(ref)) return json({ ok: true, last: null });
  return json({
    ok: true,
    last: {
      received_at: last.received_at || '',
      event: last.event || '',
      order_status: last.order_status || '',
      product: last.product || '',
      test_mode: last.test_mode === true,
      result: last.result || ''
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders });
    const url = new URL(request.url);

    if (url.pathname === '/health' && request.method === 'GET') {
      const testSecret = testWebhookSecret(env);
      const liveSecret = liveWebhookSecret(env);
      return json({
        ok: true,
        service: 'kidventuro-api',
        release: RELEASE,
        storage: Boolean(env.ENTITLEMENTS),
        webhook_secret: Boolean(testSecret),
        webhook_secret_test: Boolean(testSecret),
        webhook_secret_live: Boolean(liveSecret),
        ready_test: Boolean(env.ENTITLEMENTS && testSecret),
        ready_live: Boolean(env.ENTITLEMENTS && liveSecret),
        ai_configured: Boolean(env.OPENAI_API_KEY),
        ai_model: String(env.OPENAI_MODEL || 'gpt-5.6-luna'),
        booklet_language: BOOKLET_LANGUAGE,
        products: [...ALLOWED_PRODUCTS],
        variant_locks: await variantLockSummary(env)
      });
    }
    if (url.pathname === '/checkout/session' && request.method === 'POST') return handleCheckoutSession(request, env);
    if (url.pathname === '/webhooks/lemonsqueezy' && request.method === 'POST') return handleWebhook(request, env);
    if (url.pathname === '/entitlement/status' && request.method === 'GET') return handleStatus(url, env);
    if (url.pathname === '/fulfillment' && request.method === 'GET') return handleFulfillment(url, env);
    if (url.pathname === '/ai/enrich' && request.method === 'POST') return handleAiEnrichment(request, env);
    if (url.pathname === '/diagnostics' && request.method === 'GET') return handleDiagnostics(url, env);

    return json({ error: 'not_found' }, 404);
  }
};