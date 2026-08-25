# Kidventuro payment backend (Cloudflare Worker)

This Worker verifies Lemon Squeezy webhooks and stores short-lived purchase entitlements in Cloudflare KV.

## Recommended MVP deployment

Use Cloudflare **Workers Builds** and connect the existing GitHub repository `movopro/kidventuro`.

Cloudflare project settings:

- Repository: `movopro/kidventuro`
- Root directory: `worker`
- Worker name: `kidventuro-api`
- Build command: leave blank
- Deploy command: `npm run deploy`
- Production branch: `main`

The Wrangler config uses automatic KV provisioning. On the first deploy Cloudflare will create and bind the `ENTITLEMENTS` KV namespace automatically.

The first deploy can succeed without the Lemon Squeezy secret. After deployment add the encrypted Worker secret:

- `LEMONSQUEEZY_WEBHOOK_SECRET`

Do **not** commit its value to GitHub.

## Public endpoints

After deployment Cloudflare will provide a URL similar to:

`https://kidventuro-api.<your-workers-subdomain>.workers.dev`

Endpoints:

- `POST /webhooks/lemonsqueezy`
- `GET /entitlement/status?ref=...`
- `GET /health`

Open `/health` after adding the secret. A correctly configured Worker returns JSON showing `storage: true` and `webhook_secret: true`.

## Lemon Squeezy webhook

In Lemon Squeezy Settings → Webhooks create a webhook in the same mode you are testing (Test mode first):

- Callback URL: `<WORKER_URL>/webhooks/lemonsqueezy`
- Signing secret: exactly the same value stored in Cloudflare as `LEMONSQUEEZY_WEBHOOK_SECRET`
- Events: `order_created`, `order_refunded`

Lemon Squeezy test-mode and live-mode webhooks are separate. Configure and test Test mode first, then repeat for Live mode before launch.

## Product confirmation button

Set the Kidventuro Adventure confirmation button URL to:

`https://kidventuro.com/success.html`

Button text:

`Create my adventure`

The browser retains only the opaque `kv_ref` needed to match the checkout with the entitlement. Child personalization does not need to be sent to Lemon Squeezy.

## Frontend API URL

After Cloudflare gives you the final `workers.dev` URL, update the single `apiBase` value in the repository root file:

`runtime-config.js`

The success page and booklet gate both read that one value.

## Optional production hardening

The Worker supports an optional `EXPECTED_VARIANT_ID` environment variable. Once the numeric Lemon Squeezy variant ID is known, set it in Cloudflare so orders for any future product cannot unlock the Adventure product by mistake.

## Security model

- Lemon Squeezy receives only an opaque `kv_ref` custom checkout value.
- The Worker verifies `X-Signature` with HMAC-SHA256 before trusting the webhook.
- Only orders whose status is `paid` create an entitlement.
- Entitlements expire from KV after 30 days.
- `booklet.html` verifies the entitlement against the Worker before loading the generator scripts.
- The current generator code is still public client-side JavaScript. This is a purchase gate for the MVP, not DRM. Stronger protection would move final generation or protected assets server-side.
