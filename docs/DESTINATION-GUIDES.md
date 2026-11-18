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
4b. `npm run social-cards` renders the per-page social cards (see "Social cards" below; `npm --prefix scripts/social-cards ci` once).
5. `npm --prefix worker test` (includes `test-family-guides.mjs`, `test-static-seo.mjs`, `test-seo-localization.mjs`).
6. Commit and push to `main`: GitHub Pages publishes the pages; Cloudflare Workers Builds deploys the Worker, which now
   accepts the new destination at checkout. Check `https://kidventuro-api.m-oreshkov.workers.dev/health` for the release.

## What the build writes

| Output | Purpose |
|---|---|
| `destinations/<slug>.html`, `es/destinos/<slug>.html` | the guide pages (hreflang pair, canonical, JSON-LD WebPage + BreadcrumbList + TouristDestination + FAQPage) |
| `assets/destinations/<slug>.svg` | deterministic postcard illustration, style per `scene` (engine: `scripts/postcard-art.mjs`) |
| `assets/social/**.jpg`, `assets/social/manifest.json` | per-page 1200x630 social cards, written by `scripts/social-cards/render.mjs` (not by the build) |
| `catalog-7.js` | booklet data (`KV_CITY`) and new local-phrase sets (`KV_LANG`) |
| `site-expansion-3.js` | order form options, landing cards with "Family guide" links, preview missions (`destinationData`) |
| `worker/src/guide-destinations.js` | Worker allow-list extension |
| `destinations/guide-index.json` | index used by tests and the feature pages |
| `sitemap.xml`, `robots.txt`, both hubs | marked blocks `guides:start` / `guides:end` |
| `sitemap.xml` `<lastmod>`, `scripts/sitemap-lastmod.json` | `scripts/build-sitemaps.mjs` (last step of `generate-seo`): a page gets today's date only when its HTML changed (content hash in the manifest) |
| `sitemap-images.xml` | the image sitemap, same script: per page every `<img>`, srcset, og:image and JSON-LD image, read from the page itself; announced in `robots.txt` |
| legacy pages, `<section class="seo-related">` | "More family destinations": 5 same-region legacy pages + 1 guide per page (`scripts/related-links.mjs`), plus the free tools |
| `packing-list.html`, `best-family-destinations-this-month.html` (+ `es/`) | the two free tools |

## Indexing (sitemaps, internal links, IndexNow)

* Edit a page by hand (home, hubs, legal pages)? Run `npm run build-sitemaps` afterwards: `test-indexing.mjs` fails when a page changed but its `lastmod` or
  `sitemap-images.xml` was not refreshed. Change the generator, never the generated files.
* `test-indexing.mjs` also pins: every sitemap URL exists, is canonical and indexable; no page has fewer than 3 internal links from other pages or is more than
  3 clicks from the home page (plain HTML links only); the home page links the hub, the free tools, the free samples and `/es/` without JavaScript.
* IndexNow (Bing, Yandex and partners, not Google): `.github/workflows/indexnow.yml` runs on a push that touches pages, sitemaps or assets and sends only the pages
  that changed in that push (`scripts/submit-indexnow.mjs`; `--before <sha>`). The key is public (`/<key>.txt`), no secret is needed. A manual run is a dry run unless
  "apply" is ticked. Locally: `node scripts/submit-indexnow.mjs --all` prints the plan and sends nothing; `--apply` sends it.
* Google ignores IndexNow: submit `https://kidventuro.com/sitemap-images.xml` once in Search Console (Sitemaps) and use "Request indexing" for single pages.

## Free tools

* **Age-smart packing list** (`/packing-list.html`, `/es/lista-de-equipaje.html`, script `tools/packing.js`): ages of up to
  three children, nights, weather, transport, stroller, pool or beach. Runs only in the browser; choices live in the URL
  so a list can be shared; nothing is sent or stored (enforced by `test-family-guides.mjs`).
* **Month by month** (`/best-family-destinations-this-month.html`, `/es/mejores-destinos-familiares-este-mes.html`,
  `tools/month.js`): static list per month from each guide's `bestMonths`; the script only highlights the current month.

## Social cards (og:image / twitter:image per destination page)

Every destination page (50 legacy + 40 guides, EN and ES = 180 pages) has its own 1200x630 JPEG card: brand colours, the
destination name, its tagline, and the destination's own postcard illustration in a tilted frame (guides: the same
`assets/destinations/<slug>.svg` the page shows; the 50 legacy pages: the same art engine with the scene listed in
`LEGACY_SCENES`). Files: `assets/social/<slug>-kids-travel-guide.jpg` and `assets/social/es/<slug>-guia-viaje-ninos.jpg`,
about 55-80 KB each (budget 150 KB). Home, both hubs, legal pages and the feature pages keep the shared brand card
`assets/og-kidventuro.png` (its source is `assets/og-kidventuro.svg`; the "N DESTINATIONS" pill is rewritten from the real count).

* Source of truth for names, files, URLs, alt text and layout: `scripts/social-cards/cards-lib.mjs`. The page generators
  (`generate-destination-pages.mjs`, `build-family-guides.mjs`) import `cardUrl` / `cardAlt` from it and write og:image,
  og:image:width/height/type/alt, twitter:image, `WebPage.primaryImageOfPage` (ImageObject, 1200x630) and the `<image:image>`
  sitemap entry. A new guide needs no extra wiring.
* Renderer: `scripts/social-cards/render.mjs` (`@resvg/resvg-js` + `sharp`, pinned in `scripts/social-cards/package.json`, dev-time only;
  CI never installs them). Fonts are bundled (Inter, OFL, `scripts/social-cards/fonts/`), system fonts are never loaded, so the
  bytes do not depend on the machine. It is idempotent: a card is re-rendered only when the hash of its inputs (data, art,
  layout code, renderer, fonts; recorded in `assets/social/manifest.json`) changed. `--check` reports stale or orphan cards
  without rendering, `--force` re-renders everything (about 90 s for all 181 files).
* After adding or editing a guide or any card code: `npm run generate-seo`, `npm run social-cards`, commit the JPEGs and the manifest.
  `test-social-cards.mjs` (part of `npm --prefix worker test`) fails when a card is missing, stale, not 1200x630 or over 150 KB,
  or when a page does not point at its own card.
* `npm run audit-seo -- --local` serves the working tree on loopback and fetches every sitemap URL and every og:image
  (HTTP 200, image type, 1200x630, byte budget); `--live https://kidventuro.com` does the same against production.
* The home page copy (meta description, og:description, JSON-LD, trust row, destinations heading, both languages) states
  `50 + number of guides`; `build-family-guides.mjs` rewrites it on every build, `test-launch.mjs` asserts it.
