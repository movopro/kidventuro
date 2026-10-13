# 2026-10-13: per-page social cards, real destination count

Closes the "Remaining" item of 2026-10-12-image-seo-audit.md (shared card on every page, home copy said 50).

## Changed
* `scripts/social-cards/` (cards-lib.mjs, render.mjs, bundled Inter fonts, own package.json with resvg + sharp): renders 180
  per-page 1200x630 JPEG cards (assets/social, 55-80 KB) and re-renders the shared brand card with the real count.
* `scripts/postcard-art.mjs`: the postcard engine moved out of build-family-guides.mjs (generated output byte-identical).
* Generators write og:image / twitter:image / og:image:width,height,type,alt, WebPage.primaryImageOfPage (ImageObject) and
  the sitemap `<image:image>` for every destination page; the legacy generator now emits its social tags itself (polish no longer patches them).
* `scripts/audit-seo-images.mjs`: JPEG/WebP sizes, own-card rule for guide pages, 150 KB card budget, og:image checks over
  HTTP, new `--local` mode (loopback static server). `test-seo-images.mjs`: 6 new defect fixtures.
* Home pages (EN and ES): "50 destinations" is now derived (50 legacy + guide count = 90) in meta description, og:description,
  JSON-LD, trust row and heading. `test-launch.mjs` asserts the derived number.
* New `test-social-cards.mjs` in `npm --prefix worker test`.

## Verified
See the commit message and the report of the session: full `npm --prefix worker test`, `audit-seo-images --local`, idempotent
generators and a byte-identical forced re-render, gitleaks, live checks after the Pages deploy.

## Remaining / NEEDS MARIO
* Search Console: re-submit sitemap.xml (image entries changed) and request indexing of the home page (owner login).
* The run-time scripts launch-polish.js and site-expansion.js still contain the literal "50" in their i18n defaults (the later
  site-expansion-3.js overwrites it with the real total after load); not touched, no visible effect.
* Social platforms cache link previews: use each platform's debugger (Facebook Sharing Debugger, LinkedIn Post Inspector) to refresh a page.
