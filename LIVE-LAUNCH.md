# Kidventuro Live Launch Runbook

Use this only after Lemon Squeezy store activation.

## Current live status — 27 August 2026

- Lemon Squeezy store: Live
- Website checkout mode: Live
- Worker release: `2026-08-26.6`
- Worker `ready_live`: true
- Storage: true
- Analytics Engine: true
- AI configured: true
- Support email `hello@kidventuro.com`: receiving mail verified
- Live Adventure checkout: verified with a real paid order
- Live Adventure fulfillment: verified end-to-end
- Live Adventure variant lock: true
- Live Mini variant lock: pending first successful Live Mini order
- Live Family variant lock: pending first successful Live Family order
- Controlled Adventure full refund: submitted
- Live `order_refunded` webhook delivery: HTTP 200 verified
- Refund entitlement revocation: final old-link verification pending

## 1. Lemon Squeezy Live products

- In Test mode, copy Mini, Adventure and Family to Live mode.
- Switch to Live mode and verify each product is published.
- Prices must remain:
  - Mini: EUR 5.90 one-time
  - Adventure: EUR 9.90 one-time
  - Family: EUR 14.90 one-time
- Keep tax-inclusive pricing enabled in Store > General Settings.
- Do not create coupons/discounts before the live payment guard has been tested.

For all three products:

Confirmation modal:
- Button text: `Open my adventure`
- Button link: `https://kidventuro.com/success.html?order=[order_identifier]`

Receipt:
- Button text: `Open my adventure`
- Button link: `https://kidventuro.com/success.html?order=[order_identifier]`

## 2. Live webhook

Create this webhook while Lemon Squeezy is in Live mode:

- Callback URL: `https://kidventuro-api.m-oreshkov.workers.dev/webhooks/lemonsqueezy`
- Events: `order_created`, `order_refunded`
- Use a new random signing secret unique to Live mode.

Add the same value to the Cloudflare Worker as a Secret named:

`LEMONSQUEEZY_WEBHOOK_SECRET_LIVE`

Never commit or paste the signing secret into GitHub or chat.

## 3. Worker health before switching the website

Open:

`https://kidventuro-api.m-oreshkov.workers.dev/health`

Expected for the current Live deployment:

- `release`: `2026-08-26.6`
- `storage`: `true`
- `analytics`: `true`
- `webhook_secret_live`: `true`
- `ready_live`: `true`
- `ai_configured`: `true`
- `ai_model`: `gpt-5.6-luna`
- `booklet_language`: `en`

Test webhook readiness may be false in the Live-only production Worker. That is acceptable.

Live variant locks become true after the first successful Live order for each product.

## 4. Live checkout URLs

Current Live hosted checkout URLs:

- Mini: `https://kidventuro.lemonsqueezy.com/checkout/buy/74e8d656-faf0-4f7c-b1f2-cd7ca744452e`
- Adventure: `https://kidventuro.lemonsqueezy.com/checkout/buy/07073f00-e652-456f-a6d0-cce68312711d`
- Family: `https://kidventuro.lemonsqueezy.com/checkout/buy/88e6cea2-aa8c-4c29-b04e-4a0c23730f12`

The public website must remain the normal customer entry point so the Kidventuro checkout session and opaque reference are created before Lemon Squeezy checkout.

## 5. Website switch

Completed:

- Test checkout URLs replaced with the three Live checkout URLs.
- `checkoutMode` changed from `test` to `live`.
- Complete validation suite passed.
- GitHub Pages deployment passed.

## 6. First real Live order

Completed for Adventure.

Verified:
- Real Lemon Squeezy Live payment completed.
- Payment webhook created the entitlement.
- Success/recovery flow delivered the personalized Adventure.
- Live Adventure variant lock is now true.
- Worker remains `ready_live: true`.

## 7. Remaining product smoke tests

Mini and Family can be allowed to lock automatically on their first real customer orders to avoid extra launch-test cost. All other product, currency, subtotal, checkout-session and signed-webhook guards remain active.

For the first real Mini and Family order, verify:
- Correct product and final price on checkout.
- Paid Live order.
- `order_created` webhook HTTP 200.
- Correct Kidventuro product opens.
- Print / Save PDF works.
- `/health` changes the matching `variant_locks.live` value to true.

## 8. Refund test

Controlled full refund of the Adventure launch-test order has been submitted.

Verified so far:
- `order_refunded` webhook delivery returned HTTP 200.

Final verification still required:
- The same success/booklet link no longer grants access.
- Analytics records `payment_refunded` for `adventure` in `live` mode.
- The Adventure variant lock remains true.

## 9. Analytics checks

Cloudflare Web Analytics:
- Use for visits, page views, referrers, geography and Web Vitals.

Analytics Engine dataset: `kidventuro_funnel`
- Use for `page_view`, `preview_generated`, `pricing_viewed`, `checkout_clicked`, `checkout_registered`, `payment_confirmed`, `booklet_opened`, `print_clicked` and `payment_refunded`.

Refund verification query:

```sql
SELECT
  blob1 AS event,
  blob2 AS product,
  blob10 AS mode,
  SUM(_sample_interval) AS events,
  SUM(double2 * _sample_interval) AS amount_eur
FROM kidventuro_funnel
WHERE timestamp > NOW() - INTERVAL '1' DAY
  AND blob1 IN ('payment_confirmed','payment_refunded')
GROUP BY event, product, mode
ORDER BY event, product;
```

## 10. Before public promotion

- Support email receiving test completed.
- Publish the correct legal operator/trader identity once determined.
- Keep the printable-product language disclosure (English-only v1).
- Keep analytics and webhook monitoring enabled.

## Deployment troubleshooting

If Cloudflare shows a failed deployment that still references the old required secret `LEMONSQUEEZY_WEBHOOK_SECRET`, do not retry that historical deployment. Start a fresh build from the latest `main` commit instead. The current Worker configuration intentionally has no `secrets.required` entry; Test and Live webhook secrets are managed in the Cloudflare Dashboard and preserved by `keep_vars: true`.
