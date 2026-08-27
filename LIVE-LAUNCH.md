# Kidventuro Live Launch Runbook

Use this only after Lemon Squeezy store activation.

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

Expected before first Live purchase:

- `release`: `2026-08-26.6`
- `storage`: `true`
- `analytics`: `true`
- `webhook_secret_test`: `true`
- `webhook_secret_live`: `true`
- `ready_test`: `true`
- `ready_live`: `true`
- `ai_configured`: `true`
- `ai_model`: `gpt-5.6-luna`
- `booklet_language`: `en`

Live variant locks may still be `false` before the first successful Live order for each product. That is expected.

## 4. Collect Live checkout URLs

For each Live product use Share and copy its `/checkout/buy/...` URL. Live products have new IDs and new checkout URLs.

Required URLs:
- Mini Live checkout URL
- Adventure Live checkout URL
- Family Live checkout URL

Only these three URLs are safe to send for the website update. Do not send webhook secrets.

## 5. Website switch

After the three Live URLs are available:

- Replace the Test checkout URLs in `runtime-config.js`.
- Change `checkoutMode` from `test` to `live`.
- Run the complete validation suite.
- Confirm GitHub Pages deployment succeeds.

Do not send public traffic before those checks pass.

## 6. First real Live order

Use the public website, not a manually copied Lemon checkout link, so the Kidventuro checkout session and custom reference are created correctly.

Start with Adventure.

Verify:
- Lemon order is paid and in Live mode.
- Live `order_created` webhook returns HTTP 200.
- Confirmation button opens Kidventuro `success.html`.
- Payment verification succeeds.
- Correct Adventure opens.
- AI/fallback content renders.
- Print / Save PDF works.
- Analytics records the checkout and verified payment.

Never use Test card numbers in Live mode.

## 7. Refund test

After the first Live delivery works, a controlled refund can be used to verify `order_refunded` and entitlement revocation. Lemon Squeezy platform fees are not refunded, so do this only once if needed.

## 8. Before public promotion

- Confirm `hello@kidventuro.com` can receive email.
- Publish the correct legal operator/trader identity once determined.
- Keep the printable-product language disclosure (English-only v1).
- Keep analytics and webhook monitoring enabled.
