# 2026-10-18 sales push (site + worker)

Goal: first paying customers in 24-48 h. Rollback point: tag `pre-sales-push` (2fe5ea2). Work branch `sales-push`, merged to `main` after the end-to-end purchase test.

## Checked
* Full purchase path on desktop 1440 and mobile 390, live Lemon Squeezy, 100% one-use codes (EUR 0, no money moved): home -> personalize -> checkout session -> LS -> webhook -> entitlement -> `success.html?order=` -> `booklet.html` (25 personalized pages, PDF 1.7 MB). Delivery 15-25 s after the order.
* Funnel (Analytics Engine, 30 d): 140 views, 15 pricing, 6 previews, 3 samples, 0 social-attributed visits. Lighthouse mobile: `/` 97/96/100 before, destination pages 100/100/100.
* Worker compares the order *subtotal* to the list price, so discount codes do not break fulfilment (tested with FIRSTTRIP at checkout: Subtotal 9.90, Discount -2.97, Total 6.93).

## Changed (main: b52abae merge, 1717519, e9d008c)
* Hero: "Personalized travel activity pack for [destination]" + in-hero order form (name, age, destination, interest -> 2 taps to Lemon Squeezy), real page previews (`assets/samples/*.webp`, rendered by `scripts/render-samples.mjs` from the live booklet generator), seasonal destination chips, trust block, outcome-labelled price ladder with the 25-page Adventure recommended.
* `quickbuy.js` + `conversion.css`: order form on every destination page, offer bar with live countdown, price tags with strike-through, free sample links. Offer config in `runtime-config.js` (`offer`), hides itself at `endsAt`.
* `scripts/apply-conversion.mjs` (called by `npm run generate-seo`, idempotent): adds the layer to 91 destination pages + hub, the image sitemap entries and `free-sample.html` to the sitemap. 50 legacy JS-templated shell pages are not touched.
* `free-sample.html` (`scripts/build-free-sample-page.mjs`) and 10 free sample PDFs (`assets/samples/<slug>-free-sample.pdf`: one real page + a "get the full pack" page).
* Removed the pre-filled child name "Alex" (buyers would get a book for Alex). `success.js` waits ~3 min for the webhook (was 1 min) with a reassuring message.
* New privacy-safe events: `sample_downloaded`, `offer_viewed`, `quickbuy_started` (allow-listed in `analytics.js` and `worker/src/analytics.js`); Worker release 2026-10-18.1.
* `test-quickbuy.mjs` (offer maths and expiry, event allow-lists, conversion layer on every page, sample assets, no pre-filled name) added to `npm test`.
* Lemon Squeezy discount `FIRSTTRIP` 30%, expires 2026-10-21T06:00:00Z (id 1187291). Test codes `E2E*` (100%, limited redemptions) were created for the purchase tests and should be deleted/left to expire (see NEEDS MARIO).

## Verified
* Full suite `cd worker && npm test` green. Live E2E after deploy: desktop (destination page) and mobile (home hero) both reached LS with FIRSTTRIP applied at EUR 6.93, paid EUR 0 with a test code, LS "Open my adventure" -> `success.html?order=` -> booklet.
* Lighthouse mobile after the CLS fix is recorded in the final report.

## Remaining
* LS receipt/confirmation email link, hello@ mailbox, Instagram/TikTok bio link (NEEDS MARIO in `C:\AI-Server\docs\kidventuro\FINAL-REPORT.md`).
