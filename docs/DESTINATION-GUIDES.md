# Family destination guides

Since 2026-10-10 the site has two kinds of destination pages:

* **Legacy pages** (the first 50 paid destinations): short generated pages from `destinations/destination-data.js`,
  built by `scripts/generate-destination-pages.mjs` through `npm run generate-seo`.
* **Family guides** (40 more, `destinations/guides/<slug>.json`): full bilingual guides with best ages, stroller notes, five
  must-dos, rainy-day plans, safety, real costs, a first day, FAQ structured data and a postcard illustration. Each guide
  is also a paid destination: it adds a booklet catalog entry, an order-form option and a Worker allow-list entry.

## Adding or changing a guide

1. Write `destinations/guides/<slug>.json` following the schema in `scripts/validate-family-guides.mjs` (exact counts:
   5 must-dos, 3 rainy-day, 3 safety, 4 cost items, 12 hunt items, 3 quiz questions; `es` mirrors `en`).
   Quality rules: real named places, prices as cautious ranges (local currency + EUR), seasonal closures stated, no hype words.
2. `node scripts/validate-family-guides.mjs destinations/guides` until every file says `ok`.
3. Bump `TODAY` in `scripts/build-family-guides.mjs` if content changed (it feeds `lastmod` / `dateModified`).
4. `npm run generate-seo` (legacy pages first, then the guides; never run the legacy generator alone, it rewrites sitemap.xml).
5. `npm --prefix worker test` (includes `test-family-guides.mjs`, `test-static-seo.mjs`, `test-seo-localization.mjs`).
6. Commit and push to `main`: GitHub Pages publishes the pages; Cloudflare Workers Builds deploys the Worker, which now
   accepts the new destination at checkout. Check `https://kidventuro-api.m-oreshkov.workers.dev/health` for the release.

## What the build writes

| Output | Purpose |
|---|---|
| `destinations/<slug>.html`, `es/destinos/<slug>.html` | the guide pages (hreflang pair, canonical, JSON-LD WebPage + BreadcrumbList + TouristDestination + FAQPage) |
| `assets/destinations/<slug>.svg` | deterministic postcard illustration, style per `scene` |
| `catalog-7.js` | booklet data (`KV_CITY`) and new local-phrase sets (`KV_LANG`) |
| `site-expansion-3.js` | order form options, landing cards with "Family guide" links, preview missions (`destinationData`) |
| `worker/src/guide-destinations.js` | Worker allow-list extension |
| `destinations/guide-index.json` | index used by tests and the feature pages |
| `sitemap.xml`, `robots.txt`, both hubs | marked blocks `guides:start` / `guides:end` |
| `packing-list.html`, `best-family-destinations-this-month.html` (+ `es/`) | the two free tools |

## Free tools

* **Age-smart packing list** (`/packing-list.html`, `/es/lista-de-equipaje.html`, script `tools/packing.js`): ages of up to
  three children, nights, weather, transport, stroller, pool or beach. Runs only in the browser; choices live in the URL
  so a list can be shared; nothing is sent or stored (enforced by `test-family-guides.mjs`).
* **Month by month** (`/best-family-destinations-this-month.html`, `/es/mejores-destinos-familiares-este-mes.html`,
  `tools/month.js`): static list per month from each guide's `bestMonths`; the script only highlights the current month.
