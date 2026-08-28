# Kidventuro

Kidventuro is a personalized printable travel-adventure product for children aged 4–12.

Production domain: **https://kidventuro.com/**  
Repository: `movopro/kidventuro`

## Current product

- Static GitHub Pages frontend on the Kidventuro custom domain
- EN / BG ordering interface
- Current paid printable books are generated in **English**
- 50 destination choices
- 16 child-interest choices
- Personalization by first name/nickname, age, destination, interest and trip length
- Three age modes:
  - 4–6: Little Explorer
  - 7–9: City Detective
  - 10–12: Master Explorer
- Trip lengths: 2, 3, 4, 5 or 7 days
- **Mini €5.90**: 10 printable A4 pages
- **Adventure €9.90**: 25–28 printable A4 pages depending on trip length
- **Family €14.90**: shared booklet for 1–3 children with individual age/interest challenges
- Destination-specific landmarks, foods, facts, scavenger targets and quizzes
- Optional paid AI enhancement for short creative missions and reflection prompts
- Browser Print / Save as PDF workflow
- Cloudflare Worker payment and fulfillment backend
- Lemon Squeezy HMAC webhook verification
- Separate Test and Live webhook signing secrets
- Cloudflare KV payment entitlements and temporary checkout personalization
- Receipt/new-tab order recovery using Lemon Squeezy `order_identifier`
- Refund revocation that does not depend on temporary personalization still existing
- Automatic per-product, per-mode Lemon Squeezy variant locking
- Exact EUR package-price validation
- Privacy, Terms and Refund/Digital Delivery pages
- Custom 404 page, sitemap, robots.txt and CNAME
- Automated launch, catalog, checkout, AI and webhook regression tests

## Privacy design

Adults are asked to use only a child's first name or nickname and not to provide sensitive information.

Before checkout, the minimum personalization fields are stored temporarily in Cloudflare KV under a high-entropy random `kv_ref`. A checkout reference is single-use: it cannot be overwritten with a different personalization or reused after payment. Temporary personalization expires automatically after up to 7 days.

Lemon Squeezy receives only the opaque `kv_ref` plus a product marker as custom checkout data. Child personalization is not intentionally sent to Lemon Squeezy.

For AI enhancement, Kidventuro deliberately removes child names before calling OpenAI. Exact ages are converted to broad age bands (4–6, 7–9, 10–12). Only destination, trip length, product, interests and age band(s) are used to create short English creative mission text. AI output is cached under the random checkout reference for up to 7 days. If AI is unavailable or not configured, the built-in deterministic generator remains fully functional.

Paid entitlements and limited order-reference mappings expire after up to 30 days. The generated book itself is rendered client-side and customers are prompted to save it as a PDF.

## Paid architecture

`GitHub Pages frontend`
→ create a fresh high-entropy checkout reference
→ store temporary checkout personalization in Cloudflare KV
→ Lemon Squeezy checkout receives only `kv_ref` + product marker
→ signed `order_created` webhook
→ Cloudflare Worker verifies Test/Live signing secret, paid status, product, EUR price and numeric variant
→ Worker writes entitlement + order mapping and locks the product variant for that mode
→ success page prioritizes the receipt/confirmation `order_identifier`
→ browser requests verified fulfillment and restores personalization, including all Family children
→ booklet re-verifies entitlement
→ optional server-side OpenAI microcopy enrichment
→ client-side generator loads
→ browser Print / Save as PDF

`order_refunded` is validated against the stored paid entitlement and revokes access even if the 7-day temporary personalization has already expired.

Never place payment secrets, webhook secrets or OpenAI API keys in public GitHub Pages JavaScript.

## Payment safety

- Every new checkout receives a new random `kv_ref`.
- A ref with an existing entitlement cannot be registered again.
- An existing checkout ref is only idempotent when the same personalization is retried.
- Mini, Adventure and Family are isolated by product marker and exact price.
- First valid purchase learns the numeric Lemon Squeezy variant separately for Test and Live mode.
- Once learned, another variant cannot unlock the same product.
- A refunded ref cannot be reactivated by replaying `order_created`.
- Duplicate webhook delivery for the same accepted order is idempotent.
- Test and Live webhooks use separate signing secrets and are fail-closed.
- Public `/health` exposes readiness only; purchase-specific diagnostics require the opaque checkout ref at `/diagnostics?ref=...`.
- Request body sizes and server-side destination/interest values are constrained.

## AI configuration

The Worker uses the OpenAI Responses API only after a paid entitlement is verified. The configured default model is `gpt-5.6-luna`.

`OPENAI_API_KEY` must be an encrypted Cloudflare **Runtime secret**. The key is optional for availability: without it, all products still generate using the deterministic catalog.

For the current launch version, paid booklet language is normalized to English so deterministic and AI-assisted content remain consistent.

## Test → Live switch

Until Lemon Squeezy Live products are ready, `runtime-config.js` stays:

```js
checkoutMode:'test'
```

When Live mode is available:

1. Copy/create Mini, Adventure and Family in Lemon Squeezy Live mode at €5.90 / €9.90 / €14.90.
2. Keep confirmation and receipt links as:
   `https://kidventuro.com/success.html?order=[order_identifier]`
3. Create a **Live** Lemon Squeezy webhook for:
   - `order_created`
   - `order_refunded`
   - callback: `https://kidventuro-api.m-oreshkov.workers.dev/webhooks/lemonsqueezy`
4. Add its signing secret in Cloudflare Runtime secrets as:
   `LEMONSQUEEZY_WEBHOOK_SECRET_LIVE`
5. Replace the three Test checkout URLs in `runtime-config.js` with the three new Live `/checkout/buy/...` URLs.
6. Change only:
   ```js
   checkoutMode:'live'
   ```
7. Run CI. Launch regression tests intentionally fail if Live mode contains any known Test checkout URL.
8. Open `/health` and confirm `ready_live: true`, `ai_configured: true`, and release is current.
9. Run one small real Live purchase from the public site. The first valid Live purchase automatically locks that product's numeric Live variant.
10. Repeat a real payment smoke test for the other products before paid promotion. A controlled refund test can then verify Live refund delivery.

No manual `EXPECTED_VARIANT_*` configuration is required for normal launch because the Worker learns and locks variants automatically. Those variables remain optional emergency overrides.

## Remaining manual launch checks

- Lemon Squeezy store activation / identity review
- Three Live checkout URLs
- Live Lemon Squeezy webhook + `LEMONSQUEEZY_WEBHOOK_SECRET_LIVE`
- Confirm `hello@kidventuro.com` can receive support mail
- Final desktop and mobile browser smoke test
- First real Live transaction before promotion

Not launch blockers:

- Analytics is intentionally not installed yet, avoiding unnecessary tracking/consent complexity before validation.
- A dedicated raster Open Graph share image can be added later without changing checkout or fulfillment.
- Additional printable languages can be added as complete product localizations instead of mixing languages inside one booklet.

## Source files

- `index.html`, `styles.css`, `app.js`, `site-expansion.js`, `launch-polish.js` — public landing page, bilingual ordering UI, destination expansion and launch-mode UX
- `runtime-config.js` — public API URL, checkout mode and the three current Lemon Squeezy checkout URLs
- `checkout.js` — fresh-ref checkout session registration, Family form and Lemon Squeezy redirect
- `success.html`, `success.js` — verified fulfillment, receipt recovery and ref-scoped diagnostics
- `catalog-core.js`, `catalog-1.js` … `catalog-5.js` — interests, local phrases and 50 destination catalogs
- `booklet-v2.js` — base Adventure generator
- `mini-mode.js` — 10-page Mini adaptation
- `family-mode.js` — multi-child Family generator
- `ai-mode.js` — applies safe AI enrichment to the rendered booklet
- `age-core.js`, `age-pages.js`, `age-final.js`, `age-adapt.css` — age adaptation
- `trip-days.js` — trip-length adaptation and page renumbering
- `booklet-session.js` — entitlement verification, AI request and protected generator loading
- `booklet.html`, `booklet.css` — printable book shell
- `privacy.html`, `terms.html`, `refunds.html`, `legal.css` — policy pages
- `test-catalog.mjs`, `test-checkout-safety.mjs`, `test-launch.mjs` — frontend/catalog/launch regression tests
- `worker/` — Cloudflare Worker payment, fulfillment, diagnostics and AI backend
- `social-autopilot/` and `.github/workflows/social-autopilot.yml` — twice-daily Instagram, Pinterest and TikTok content generation and automatic publishing; activation steps are in `social-autopilot/SETUP-BG.md`

## Security model

The current system provides a verified purchase gate and robust fulfillment, not DRM. Generator code remains public client-side JavaScript because the site is hosted on GitHub Pages. A future architecture can move final PDF generation or protected assets server-side if stronger content protection becomes commercially necessary.
