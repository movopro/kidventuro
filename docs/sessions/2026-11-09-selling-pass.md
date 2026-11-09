# 2026-11-09 selling pass (site)

Owner: "people don't buy; review it as a marketing specialist; change what is needed". Facts given: 5 GA sessions in 7 days,
Cloudflare 30 visits / 7 days, 0 paid orders ever (6 were 100%-code tests). Checkout verified end to end the same day.

## Findings (ranked by impact)
1. **Traffic, not the page, is the bottleneck.** 30 visits a week cannot produce a sale at normal 1-3% conversion. The social
   pipeline posts 3x a day but sent 0 attributable visits (see the social repo log of the same day).
2. **The thing being sold was invisible.** The hero's cover was a small tilted image; the child's name on it was unreadable.
3. **CLS 0.17 on mobile** (the order form is injected after first paint and pushed the page pictures), plus 3 contrast failures.
4. Trust gaps that only the owner can close: no money-back promise (the refund page only restates the law), nobody visible
   behind the brand, hello@ delivery unproven, Instagram bio link unknown.
5. Fine already: price ladder, real sample pages, free sample PDFs, structured data, OG card, sitemap, destination pages
   (Lighthouse 100/100/96/100), analytics events on the buy click (`checkout_clicked`, `quickbuy_started`).

## Changed (main 03cd82c, merge of b22e9aa)
* Home hero: a **live cover** (same layout as the generated cover) shows the typed name, age, destination and interest; real
  bingo and hunt pages behind it. The buy button names the child ("Get Leo's 25-page pack EUR 9.90").
* Order form: "Secure checkout by Lemon Squeezy / Opens in seconds after payment" (true: LS is merchant of record).
* Reserved form slot (CLS 0 measured at 1440x1000 and 390x844), contrast fixes, season line (Christmas markets, New Year, ski week).
* `test-quickbuy.mjs` runs the real `liveCover()` (fails on the old file) and checks the reserved slot.

## Verified
* `cd worker && npm test` green (15 suites), `node scripts/audit-seo-images.mjs` 0 errors.
* Local serve and live: cover updates (Leo / 9 / Paris / Loves Space), button text, CLS 0, no horizontal scroll; only console
  error is the analytics host blocked by the home DNS (known).
* Lighthouse mobile live: `/` 100 / 100 / 93 / 100 (was 92 / 96 / 93 / 100, CLS 0.172 -> 0), `/destinations/paris.html` 100/100/96/100.

## NEEDS MARIO
See the social repo log `docs/sessions/2026-11-09-selling-pass.md` (one list for both).
