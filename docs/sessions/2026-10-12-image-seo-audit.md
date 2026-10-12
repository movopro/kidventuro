# 2026-10-12: Google Images + indexing hygiene (Session 5 worker)

Scope: how images, sitemaps, robots, schema and social cards are produced and whether Search can find and index them.
Note: the website repository is `movopro/kidventuro` (this clone, `C:\AI-Server\repos\kidventuro-site`); the folder
`C:\AI-Server\repos\kidventuro` is the private social pipeline and has no pages.

## How things are generated

| Output | Generator |
|---|---|
| 80 guide pages (40 x EN/ES), postcard SVGs `assets/destinations/<slug>.svg`, feature pages (packing list, journal, month), hub guide blocks, sitemap guide block, robots allow list | `scripts/build-family-guides.mjs` (`npm run generate-seo`) |
| 100 legacy destination pages (50 x EN/ES) + the sitemap skeleton | `scripts/generate-destination-pages.mjs`, then `scripts/polish-supported-destination-pages.mjs` (adds the social tags) |
| Home pages, hubs' heads, legal pages, 404, booklet, success | hand-written HTML (sources) |
| Shared social card | `assets/og-kidventuro.png` (1200x630) |

Images on the site: 80 `<img>` (guide postcards, SVG, 1200x675, same origin) and the shared PNG card. No raster photos, no
external image hosts, no JS-injected images, so no WebP/AVIF/srcset is needed (SVG scales; Google Images indexes SVG).

## Audit (new): `scripts/audit-seo-images.mjs`, test `test-seo-images.mjs` (in `npm --prefix worker test`)

Checks: alt (present, non-empty, not a file name), numeric width/height, descriptive file names, lazy LCP, srcset for raster,
broken image URLs, og:image / twitter:image (absolute, same domain, exists, 1200x630, alt, not blocked), `max-image-preview:large`,
JSON-LD parses and its image URLs exist, guide ImageObject + BreadcrumbList + TouristDestination, canonical, hreflang
reciprocity, sitemap (every URL has a page, indexable, not blocked, no duplicates; `<image:image>` same-domain, existing,
complete; every indexable page listed), 404 page. `npm run audit-seo -- --live https://kidventuro.com` also fetches every
sitemap URL and image (200, no redirect, image content type) and an unknown path (must be 404).
The test also runs 26 defect fixtures so a green run cannot be an empty one.

Baseline on the unfixed tree: **187 errors**. Fixed: 80 guide `primaryImageOfPage` were bare `{url}`; 80 guides had no
`<image:image>` sitemap entry; hubs (EN/ES) and legal pages had no og:image / twitter:image / twitter:card; 6 feature pages
lacked og:image:alt; home, hubs and legal pages lacked `max-image-preview:large`.
Also fixed: ES pages carried the English og:image:alt; og:image width/height added everywhere.

Not a problem (checked live): 193 sitemap URLs all 200 without redirects, unknown path returns 404, http and www reach
https://kidventuro.com in one hop, hreflang sets reciprocal, no noindex page in the sitemap.

## Analytics installed (unchanged by this session)

* Cloudflare Web Analytics beacon (cookie-free): `analytics.js` injects `static.cloudflareinsights.com/beacon.min.js` with the
  site token (public, in `analytics.js`) on pages that load `analytics.js` (all public pages and the booklet/success pages).
* Google Analytics 4, consent-first: tag `G-77YBK1S40E` in `runtime-config.js`; `analytics.js` requests nothing from Google and
  sets no cookie until the visitor accepts the banner (`kidventuro_analytics_consent_v1`); declining removes GA cookies. GTM id is empty.
* Worker funnel events (Cloudflare Analytics Engine dataset `kidventuro_funnel`), no PII.

## Remaining / needs the owner

* Per-destination 1200x630 social cards (today every page shares the brand card) would improve link previews; needs a raster
  render step (not done: no new dependency added).
* `robots.txt` blocks `/destinations/` and `/es/destinos/` and re-allows each supported page; the 100 noindex stub pages are
  therefore blocked (Search cannot see their noindex, but they are unlinked and not in the sitemap).
* Home meta description still says "50 destinations" (catalog is 90): copy decision, left alone.
* Search Console: submit the sitemap again (image entries) and request indexing of the home page (owner login).
