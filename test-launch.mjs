import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const [index,runtime,analytics,checkout,polish,successHtml,success,bookletHtml,booklet,privacy,terms,refunds,notFound,worker,workerAnalytics]=await Promise.all([
  read('./index.html'),read('./runtime-config.js'),read('./analytics.js'),read('./checkout.js'),read('./launch-polish.js'),
  read('./success.html'),read('./success.js'),read('./booklet.html'),read('./booklet-session.js'),read('./privacy.html'),read('./terms.html'),read('./refunds.html'),read('./404.html'),
  read('./worker/src/index.js'),read('./worker/src/analytics.js')
]);

const scriptPosition=file=>index.search(new RegExp(`<script src="${file.replaceAll('.','\\\\.')}(?:\\\\?[^"]*)?"></script>`));
for(const file of ['runtime-config.js','analytics.js','app.js','checkout.js','launch-polish.js']){
  assert.ok(scriptPosition(file)>=0,`${file} must be loaded by index.html`);
}
const scriptOrder=['runtime-config.js','analytics.js','app.js','checkout.js','launch-polish.js'].map(scriptPosition);
assert.deepEqual([...scriptOrder].sort((a,b)=>a-b),scriptOrder,'landing scripts must load runtime config and analytics before checkout logic');
assert.ok(index.includes('launch.css'),'conversion-focused launch stylesheet must be loaded');

assert.ok(index.includes('50 DESTINATIONS'),'base landing HTML must advertise all 50 destinations');
assert.equal(index.includes('25 DESTINATIONS'),false,'stale 25-destination launch copy must stay removed');
assert.equal(index.includes('MVP'),false,'customer-facing landing HTML must not contain MVP copy');
assert.equal(refunds.includes('being tested before'),false,'refund policy must not contain pre-launch status copy');

const isTest=runtime.includes("checkoutMode:'test'");
const isLive=runtime.includes("checkoutMode:'live'");
assert.notEqual(isTest,isLive,'checkout mode must be exactly one of test or live');
const knownTestIds=[
  'b68dbe91-5c2d-4ede-b9b6-a1e9625627be',
  '002731fe-1735-4287-8223-450d8ef41202',
  'e49470c6-bd0e-4533-a206-c254fa84908f'
];
for(const product of ['mini','adventure','family']){
  assert.match(runtime,new RegExp(`${product}:'https:\\/\\/kidventuro\\.lemonsqueezy\\.com\\/checkout\\/buy\\/[a-z0-9-]+'`,'i'),`${product} checkout URL must be configured centrally`);
}
if(isTest){for(const id of knownTestIds) assert.ok(runtime.includes(id),'Test mode must use the known Test checkout URLs');}
if(isLive){for(const id of knownTestIds) assert.equal(runtime.includes(id),false,'Live mode must never contain a known Test checkout URL');}

assert.equal(checkout.includes('lemonsqueezy.com/checkout/buy/'),false,'checkout URLs must not be duplicated inside checkout.js');
assert.ok(checkout.includes('runtime.checkoutUrls'));
assert.ok(checkout.includes('runtime.checkoutMode'));
assert.ok(checkout.includes("KidventuroAnalytics?.track('checkout_clicked'"),'checkout intent must be tracked without child data');

for(const marker of ['page_view','preview_generated','sample_opened','pricing_viewed','checkout_clicked','print_clicked']){
  assert.ok(analytics.includes(marker),`frontend analytics event missing: ${marker}`);
}
for(const forbidden of ['childName','childAge','kv_ref','order_identifier','email']){
  assert.equal(analytics.includes(forbidden),false,`frontend analytics must not read personal/purchase identifiers: ${forbidden}`);
}
assert.ok(booklet.includes("KidventuroAnalytics?.track('booklet_opened'"),'verified booklet opens must be tracked');

const cfToken='823a0ee660884dec9ecfad5650f38e4e';
assert.ok(analytics.includes(cfToken),'Cloudflare Web Analytics token must stay configured');
assert.ok(analytics.includes('https://static.cloudflareinsights.com/beacon.min.js'),'Cloudflare Web Analytics beacon loader is missing');
for(const [name,html] of [['index',index],['success',successHtml],['booklet',bookletHtml],['privacy',privacy],['terms',terms],['refunds',refunds],['404',notFound]]){
  assert.ok(html.includes('analytics.js'),`${name} must load analytics.js`);
  assert.ok(html.includes('runtime-config.js'),`${name} must load runtime-config.js before analytics`);
  assert.ok(html.indexOf('runtime-config.js')<html.indexOf('analytics.js'),`${name} must load runtime config before analytics`);
}

assert.ok(polish.includes('TEST MODE • No real payment is taken'),'Test mode must be visible to visitors');
assert.ok(polish.includes('printable books are currently generated in English'),'current product language must be disclosed');
assert.ok(polish.includes('application/ld+json'),'product structured metadata must be emitted in Live mode');
assert.ok(polish.includes("mode==='live'&&allCheckoutUrls"),'purchasable product schema must only be emitted in Live mode');

assert.ok(success.includes('const query=order?'),'receipt/confirmation order identifier must take precedence over browser ref');
assert.ok(success.includes('/diagnostics?ref='),'success diagnostics must use the ref-scoped endpoint');
assert.equal(success.includes('health.last_webhook'),false,'public health diagnostics must not be consumed by the success page');

for(const [name,doc] of [['privacy',privacy],['terms',terms],['refunds',refunds]]){
  assert.ok(doc.includes('generated in English'),`${name} policy must disclose current printable language`);
  assert.ok(doc.includes('26 August 2026'),`${name} English policy update date must be current`);
}
assert.ok(privacy.includes('Aggregate analytics'),'privacy notice must disclose aggregate analytics');
assert.ok(privacy.includes('Cloudflare Web Analytics'),'privacy notice must disclose Cloudflare Web Analytics');
assert.ok(privacy.includes('does not create an analytics cookie'),'privacy notice must explain cookie-free funnel tracking');
assert.ok(refunds.includes('Kidventuro Mini, Adventure and Family'),'delivery policy must cover all three products');

for(const marker of [
  "const RELEASE = '2026-08-26.6'",
  "const BOOKLET_LANGUAGE = 'en'",
  'BODY_LIMITS','checkout_ref_already_used','checkout_ref_conflict','ignored_ref_refunded','ignored_refund_order_mismatch',
  'const orderSubtotal = Number(attrs.subtotal)','orderSubtotal !== expectedPrice',"url.pathname === '/diagnostics'",
  "url.pathname === '/analytics/event'",'trackAnalytics','payment_confirmed','payment_refunded','LEMONSQUEEZY_WEBHOOK_SECRET_LIVE'
]) assert.ok(worker.includes(marker),`Worker launch safeguard missing: ${marker}`);
assert.ok(worker.indexOf("event === 'order_refunded'")<worker.indexOf('const checkoutSession = await readCheckoutSession'), 'refund handling must not depend on temporary checkout personalization');
assert.equal(worker.includes('itemPrice !== expectedPrice'),false,'tax-adjusted Lemon item price must not be used as the base package-price guard');

for(const marker of ['CLIENT_EVENTS','SERVER_EVENTS','writeDataPoint','indexes:[name]','doubles:[1','Origin']){
  assert.ok(workerAnalytics.includes(marker),`Analytics collector safeguard missing: ${marker}`);
}
for(const forbidden of ['name:body','age:body','kv_ref','order_id','email']){
  assert.equal(workerAnalytics.includes(forbidden),false,`analytics collector must not map PII field: ${forbidden}`);
}

console.log('Launch-readiness, Cloudflare Web Analytics, analytics privacy, recovery, VAT-safe payment lifecycle and policy regression checks passed');