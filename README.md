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
- Privacy, Terms and Refund/Digital Delivery pages
- Custom 404 page, sitemap, robots.txt and CNAME

## Privacy design of the demo

The landing page asks adults to use only a child's first name or nickname.

When the user opens the full demo, personalization is placed in `sessionStorage`. `booklet-session.js` temporarily exposes the values to the existing client-side generator after the page is already loaded, then removes the parameters from the visible URL. This avoids intentionally sending the child's personalization as normal query parameters in the customer flow.

Do not add analytics, third-party scripts or backend logging that captures personalization without reviewing the privacy impact first.

## Architecture

Current:

`GitHub Pages frontend`
→ client-side preview/booklet generator
→ browser Print / Save as PDF

Planned paid flow:

`GitHub Pages frontend`
→ checkout (Merchant of Record)
→ server-side verified payment event
→ secure generation endpoint
→ temporary personalized PDF / access token
→ delivery

Never place payment secrets, webhook secrets, API keys or privileged generation logic in public GitHub Pages JavaScript.

## Launch product

Initial paid product planned:

**Kidventuro Adventure — €9.90**

The Mini and Family prices shown on the MVP are product hypotheses and should not be wired to checkout until those offers are ready.

## Before public paid launch

- Configure Lemon Squeezy store/product and test mode
- Add the verified checkout URL to the Adventure CTA
- Create a serverless endpoint for webhook verification
- Verify Lemon Squeezy webhook signatures server-side
- Do not use `?paid=true` or any client-only unlock flag
- Replace the public full-demo customer flow with a limited free preview
- Unlock/generate the full adventure only after verified payment
- Test successful payment, failed payment, cancelled checkout and duplicate webhook events
- Review Privacy / Terms / Refund wording against the final checkout flow
- Configure and test `hello@kidventuro.com`
- Add an Open Graph share image
- Add analytics only after deciding consent/privacy behavior
- End-to-end test on iPhone Safari, Android Chrome and desktop Chrome/Safari

## Source files

- `index.html`, `styles.css`, `app.js` — public landing page
- `catalog-core.js`, `catalog-1.js`, `catalog-2.js`, `catalog-3.js` — interests/language phrases/destination data
- `booklet-v2.js` — base 25-page generator
- `age-core.js`, `age-pages.js`, `age-final.js`, `age-adapt.css` — age adaptation
- `trip-days.js` — trip-length adaptation and page renumbering
- `booklet-session.js` — privacy-oriented browser-session handoff
- `booklet.html`, `booklet.css` — printable book shell
- `privacy.html`, `terms.html`, `refunds.html`, `legal.css` — policy pages

## Important

The current full booklet is still a **public development/demo generator**. It is not a secure paid-delivery mechanism. Payment gating and full-product protection must be implemented server-side before marketing the paid product.
