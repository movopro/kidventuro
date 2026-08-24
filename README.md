# Kidventuro MVP

Static GitHub Pages MVP for **Kidventuro** — personalized printable travel adventure books for kids.

## What's included

- Responsive landing page
- EN / BG language toggle
- Interactive child + destination personalization demo
- 5 MVP destinations: Rome, Paris, London, Barcelona, Dubai
- Printable demo page (`Print / Save as PDF`)
- MVP pricing section
- FAQ and basic privacy-oriented messaging
- SEO meta description
- No framework, build step, database or API key

## Deploy on GitHub Pages

1. Create a new **public** GitHub repository named `kidventuro`.
2. Upload all files from this folder to the repository root.
3. In GitHub open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`.
6. Save.

Your temporary URL should be:

`https://movopro.github.io/kidventuro/`

## Local preview

You can simply open `index.html` in a browser.

For a local server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Architecture for the real product

GitHub Pages should remain the **public frontend**.

Do **not** put AI, payment secrets or private API keys in `app.js`.

Production flow:

`GitHub Pages frontend`
→ `serverless API endpoint`
→ generation engine
→ payment verification
→ PDF generation / delivery

Suggested later:
- Lemon Squeezy or another Merchant of Record for checkout
- Cloudflare Worker / Supabase Edge Function / Vercel Function for secret server logic
- Object storage for temporary generated PDFs
- Transactional email provider for delivery

## Before launch

- Connect checkout
- Add Terms, Privacy, Refund/Digital Delivery pages
- Replace `hello@kidventuro.com` after domain/email setup
- Add analytics
- Add real product generation
- Add final social links
- Add Open Graph share image
- Add `CNAME` only after buying `kidventuro.com`

## Notes

This is an MVP preview. The current generator is intentionally client-side and does not store entered data.
