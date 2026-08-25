# Kidventuro

Kidventuro is a personalized printable travel-adventure product for children aged 4–12.

Production domain: **https://kidventuro.com/**  
Repository: `movopro/kidventuro`

## Current MVP

- Static GitHub Pages frontend on the Kidventuro custom domain
- EN / BG landing-page language toggle
- 50 destination choices
- 16 child-interest choices
- Personalization by first name/nickname, age, destination, interest and trip length
- Three age modes:
  - 4–6: Little Explorer
  - 7–9: City Detective
  - 10–12: Master Explorer
- Trip lengths: 2, 3, 4, 5 or 7 days
- Mini: 10 printable A4 pages
- Adventure: 25–28 printable A4 pages depending on trip length
- Family: shared booklet for 1–3 children with individual age/interest challenges
- Destination-specific landmarks, foods, facts, scavenger targets and quizzes
- Optional paid AI enhancement for short creative missions and reflection prompts
- Browser Print / Save as PDF workflow
- Three Lemon Squeezy checkout products: Mini €5.90, Adventure €9.90, Family €14.90
- Cloudflare Worker payment backend
- Lemon Squeezy HMAC webhook verification
- Cloudflare KV payment entitlements and temporary checkout personalization
- Receipt/new-tab order recovery
- Refund revocation
- Privacy, Terms and Refund/Digital Delivery pages
- Custom 404 page, sitemap, robots.txt and CNAME

## Privacy design

Adults are asked to use only a child's first name or nickname and not to provide sensitive information.

Before checkout, the minimum personalization fields are stored temporarily in Cloudflare KV under a high-entropy random `kv_ref`. This enables reliable fulfillment even when the payment confirmation opens in another tab. Temporary personalization expires automatically after up to 7 days.

Lemon Squeezy receives only the opaque `kv_ref` plus a product marker as custom checkout data. Child personalization is not intentionally sent to Lemon Squeezy.

For AI enhancement, Kidventuro deliberately removes child names before calling OpenAI. Exact ages are converted to broad age bands (4–6, 7–9, 10–12). Only destination, trip length, product, language, interests and age band(s) are used to create short creative mission text. AI output is cached under the random checkout reference for up to 7 days. If AI is unavailable or not configured, the built-in deterministic generator remains fully functional.

Paid entitlements and limited order-reference mappings expire after up to 30 days. The generated book itself is rendered client-side and customers should save it as a PDF.

## Paid architecture

`GitHub Pages frontend`
→ store temporary checkout personalization in Cloudflare KV
→ Lemon Squeezy checkout
→ signed `order_created` webhook
→ Cloudflare Worker verifies HMAC signature and paid status
→ Worker writes entitlement + order mapping
→ success page requests verified fulfillment
→ browser restores personalization, including all Family children
→ booklet re-verifies entitlement
→ optional server-side OpenAI microcopy enrichment
→ client-side generator loads
→ browser Print / Save as PDF

Refund webhooks revoke the entitlement.

Never place payment secrets, webhook secrets or OpenAI API keys in public GitHub Pages JavaScript.

## Products

- **Kidventuro Mini — €5.90** — 10-page compact personalized pack
- **Kidventuro Adventure — €9.90** — 25–28-page full experience
- **Kidventuro Family — €14.90** — shared trip for up to three children with individual age/interest missions

## AI configuration

The Worker uses the OpenAI Responses API only after a paid entitlement is verified. The configured default model is `gpt-5.6-luna`.

Add `OPENAI_API_KEY` as an encrypted Cloudflare **Runtime secret**. Do not add it to GitHub or frontend JavaScript. The key is intentionally optional: without it, all products still generate using the deterministic catalog.

## Before public live launch

- Complete Lemon Squeezy store activation / identity review
- Confirm Live-mode checkout URLs for all three products
- Create the Live-mode Lemon Squeezy webhook with the production Worker callback
- Set `EXPECTED_VARIANT_MINI`, `EXPECTED_VARIANT_ADVENTURE` and `EXPECTED_VARIANT_FAMILY` once numeric live variant IDs are known
- Add `OPENAI_API_KEY` to Cloudflare Runtime secrets if AI enhancement should be live
- Run one complete Live-mode payment/refund test for each product
- Keep confirmation/receipt links as `https://kidventuro.com/success.html?order=[order_identifier]`
- Configure and test `hello@kidventuro.com`
- Add an Open Graph share image
- Add analytics only after deciding consent/privacy behavior
- End-to-end test on iPhone Safari, Android Chrome and desktop Chrome/Safari

## Source files

- `index.html`, `styles.css`, `app.js`, `site-expansion.js` — public landing page and 50-destination UI
- `checkout.js` — three-product checkout session registration and Lemon Squeezy redirect
- `runtime-config.js` — public payment-backend URL
- `success.html`, `success.js` — verified fulfillment/recovery page
- `catalog-core.js`, `catalog-1.js` … `catalog-5.js` — interests, language phrases and 50 destination catalogs
- `booklet-v2.js` — base Adventure generator
- `mini-mode.js` — 10-page Mini adaptation
- `family-mode.js` — multi-child Family generator
- `ai-mode.js` — applies safe AI enrichment to the rendered booklet
- `age-core.js`, `age-pages.js`, `age-final.js`, `age-adapt.css` — age adaptation
- `trip-days.js` — trip-length adaptation and page renumbering
- `booklet-session.js` — entitlement verification, AI request and protected generator loading
- `booklet.html`, `booklet.css` — printable book shell
- `privacy.html`, `terms.html`, `refunds.html`, `legal.css` — policy pages
- `test-catalog.mjs` — catalog integrity test
- `worker/` — Cloudflare Worker payment, fulfillment and AI backend

## Security model

The current system provides a verified purchase gate and robust fulfillment, not DRM. The generator code remains public client-side JavaScript because the site is hosted on GitHub Pages. A future stronger architecture can move final PDF generation or protected assets server-side.
