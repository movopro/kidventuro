# Kidventuro payment backend (Cloudflare Worker)

This Worker verifies Lemon Squeezy webhooks, stores short-lived purchase entitlements and temporarily stores checkout personalization in Cloudflare KV.

## Current deployment

Cloudflare **Workers Builds** is connected to `movopro/kidventuro`.

Use these Cloudflare build settings:

- Repository: `movopro/kidventuro`
- Production branch: `main`
- Root directory: leave empty / repository root
- Build command: leave blank
- Deploy command: `npm run deploy`

The root `package.json` forwards deployment into `worker/`, where Wrangler is installed and executed. This avoids Cloudflare root-directory ambiguity.

Worker name: `kidventuro-api`

Production workers.dev endpoint:

`https://kidventuro-api.m-oreshkov.workers.dev`

## Runtime bindings

`worker/wrangler.jsonc` declares:

- `ENTITLEMENTS` KV binding, provisioned/inherited by Wrangler
- required encrypted secret `LEMONSQUEEZY_WEBHOOK_SECRET`
- `keep_vars: true` so dashboard runtime variables are preserved on future Wrangler deploys

The webhook secret must be added under the Worker's **Runtime variables and secrets**, not Workers Builds build variables.

Do **not** commit the secret value to GitHub. Local `.env` and `.dev.vars` files are ignored by Git.

## Public endpoints

- `GET /health`
- `POST /checkout/session`
- `POST /webhooks/lemonsqueezy`
- `GET /entitlement/status?ref=...`
- `GET /fulfillment?ref=...`
- `GET /fulfillment?order=...`

`POST /checkout/session` only accepts browser requests with the Kidventuro production origin and stores the minimum personalization fields under a random `kv_ref` for up to 7 days.

`GET /fulfillment` returns personalization only after a verified paid entitlement exists. The order form allows recovery after checkout opens in a different tab or from an order-confirmation link.

A correctly configured `/health` response shows:

- `storage: true`
- `webhook_secret: true`

The endpoint also exposes privacy-safe diagnostics about the most recent webhook result. It never returns the signing secret or full personalization.

## Lemon Squeezy webhook

In Lemon Squeezy Settings → Webhooks create the webhook in the same mode you are testing:

- Callback URL: `https://kidventuro-api.m-oreshkov.workers.dev/webhooks/lemonsqueezy`
- Signing secret: exactly the same value stored in Cloudflare as `LEMONSQUEEZY_WEBHOOK_SECRET`
- Events: `order_created`, `order_refunded`

Lemon Squeezy Test-mode and Live-mode webhooks are separate. Repeat the configuration for Live mode before public launch.

## Product confirmation / receipt link

Recommended link:

`https://kidventuro.com/success.html?order=[order_identifier]`

Recommended button text:

`Create my adventure`

The `[order_identifier]` link variable lets Kidventuro recover the verified `kv_ref` after payment without putting child personalization in the URL.

## Frontend API URL

The repository root `runtime-config.js` is configured to use:

`https://kidventuro-api.m-oreshkov.workers.dev`

The success page and booklet payment gate use this payment backend.

## Optional production hardening

The Worker supports an optional `EXPECTED_VARIANT_ID` runtime variable. Once the numeric Lemon Squeezy variant ID is confirmed, set it in Cloudflare so a different future product cannot unlock the Adventure product.

## Security model

- Lemon Squeezy receives only an opaque `kv_ref` custom checkout value plus a product marker.
- Child personalization remains with Kidventuro and expires from checkout storage after up to 7 days.
- The Worker verifies `X-Signature` with HMAC-SHA256 before trusting the webhook.
- Only `paid` orders create an entitlement.
- Order-to-reference mappings and entitlements expire after up to 30 days.
- Refund webhooks revoke access.
- `booklet.html` verifies the entitlement against the Worker before loading generator scripts.
- The current generator remains public client-side JavaScript. This is an MVP purchase gate, not DRM. Stronger protection would move final generation or protected assets server-side.
