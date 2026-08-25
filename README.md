# Kidventuro

Kidventuro is a personalized printable travel-adventure product for children aged 4–12.

Production domain: **https://kidventuro.com/**  
Repository: `movopro/kidventuro`

## Current MVP

- Static GitHub Pages frontend on the Kidventuro custom domain
- EN / BG landing-page language toggle
- 25 destination choices
- 16 child-interest choices
- Personalization by first name/nickname, age, destination, interest and trip length
- Three age modes:
  - 4–6: Little Explorer
  - 7–9: City Detective
  - 10–12: Master Explorer
- Trip lengths: 2, 3, 4, 5 or 7 days
- 25–28 printable A4 pages depending on trip length
- Destination-specific landmarks, foods, facts, scavenger targets and quizzes
- Browser Print / Save as PDF workflow
- Lemon Squeezy Adventure checkout (€9.90)
- Cloudflare Worker payment backend
- Lemon Squeezy HMAC webhook verification
- Cloudflare KV payment entitlements and temporary checkout personalization
- Refund revocation
- Privacy, Terms and Refund/Digital Delivery pages
- Custom 404 page, sitemap, robots.txt and CNAME

## Privacy design

Adults are asked to use only a child's first name or nickname and not to provide sensitive information.

Before checkout, the minimum personalization fields are stored temporarily in Cloudflare KV under a high-entropy random `kv_ref`. This enables reliable fulfillment even when the payment confirmation opens in another tab. The temporary personalization expires automatically after up to 7 days.

Lemon Squeezy receives only the opaque `kv_ref` plus a product marker as custom checkout data. Child personalization is not intentionally sent to Lemon Squeezy.

Paid entitlements and limited order-reference mappings expire after up to 30 days. The generated book itself is still rendered client-side and customers should save it as a PDF.

## Paid architecture

`GitHub Pages frontend`
→ store temporary checkout personalization in Cloudflare KV
→ Lemon Squeezy checkout
→ signed `order_created` webhook
→ Cloudflare Worker verifies HMAC signature and paid status
→ Worker writes entitlement + order mapping
→ success page requests verified fulfillment
→ browser restores personalization
→ booklet re-verifies entitlement
→ client-side generator loads
→ browser Print / Save as PDF

Refund webhooks revoke the entitlement.

Never place payment secrets, webhook secrets or Lemon Squeezy API keys in public GitHub Pages JavaScript.

## Launch product

**Kidventuro Adventure — €9.90**

The Mini and Family prices shown on the MVP are product hypotheses and should not be wired to checkout until those offers are ready.

## Before public live launch

- Complete Lemon Squeezy store activation / identity review
- Create the Live-mode product/variant if Lemon Squeezy requires a separate live copy
- Replace the Test checkout URL with the Live `/checkout/buy/...` URL
- Create the Live-mode Lemon Squeezy webhook with the production Worker callback
- Set `EXPECTED_VARIANT_ID` in Cloudflare once the live numeric variant ID is known
- Run one complete Live-mode payment/refund test
- Set the Lemon Squeezy confirmation/receipt link to `https://kidventuro.com/success.html?order=[order_identifier]`
- Configure and test `hello@kidventuro.com`
- Add an Open Graph share image
- Add analytics only after deciding consent/privacy behavior
- End-to-end test on iPhone Safari, Android Chrome and desktop Chrome/Safari

## Source files

- `index.html`, `styles.css`, `app.js` — public landing page
- `checkout.js` — checkout session registration and Lemon Squeezy redirect
- `runtime-config.js` — public payment-backend URL
- `success.html`, `success.js` — verified fulfillment/recovery page
- `catalog-core.js`, `catalog-1.js`, `catalog-2.js`, `catalog-3.js` — interests/language phrases/destination data
- `booklet-v2.js` — base 25-page generator
- `age-core.js`, `age-pages.js`, `age-final.js`, `age-adapt.css` — age adaptation
- `trip-days.js` — trip-length adaptation and page renumbering
- `booklet-session.js` — entitlement verification before generator scripts load
- `booklet.html`, `booklet.css` — printable book shell
- `privacy.html`, `terms.html`, `refunds.html`, `legal.css` — policy pages
- `worker/` — Cloudflare Worker payment/fulfillment backend

## Security model

The current system provides a verified purchase gate and robust fulfillment, not DRM. The generator code is still public client-side JavaScript because the site is hosted on GitHub Pages. A future stronger architecture can move final PDF generation or protected assets server-side.
