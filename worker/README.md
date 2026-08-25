# Kidventuro payment backend (Cloudflare Worker)

This Worker verifies Lemon Squeezy webhooks and stores short-lived purchase entitlements in Cloudflare KV.

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

- `GET https://kidventuro-api.m-oreshkov.workers.dev/health`
- `POST https://kidventuro-api.m-oreshkov.workers.dev/webhooks/lemonsqueezy`
- `GET https://kidventuro-api.m-oreshkov.workers.dev/entitlement/status?ref=...`

A correctly configured `/health` response shows:

- `storage: true`
- `webhook_secret: true`

## Lemon Squeezy webhook

In Lemon Squeezy Settings → Webhooks create the webhook in the same mode you are testing (Test mode first):

- Callback URL: `https://kidventuro-api.m-oreshkov.workers.dev/webhooks/lemonsqueezy`
- Signing secret: exactly the same value stored in Cloudflare as `LEMONSQUEEZY_WEBHOOK_SECRET`
- Events: `order_created`, `order_refunded`

Lemon Squeezy test-mode and live-mode webhooks are separate. Configure Test mode first and repeat for Live mode before launch.

## Product confirmation button

Set the Kidventuro Adventure confirmation button URL to:

`https://kidventuro.com/success.html`

Button text:

`Create my adventure`

The browser retains only the opaque `kv_ref` needed to match checkout with the entitlement. Child personalization does not need to be sent to Lemon Squeezy.

## Frontend API URL

The repository root `runtime-config.js` is configured to use:

`https://kidventuro-api.m-oreshkov.workers.dev`

Both the success page and the booklet payment gate use this value.

## Optional production hardening

The Worker supports an optional `EXPECTED_VARIANT_ID` runtime variable. Once the numeric Lemon Squeezy variant ID is confirmed, set it in Cloudflare so a different future product cannot unlock the Adventure product.

## Security model

- Lemon Squeezy receives only an opaque `kv_ref` custom checkout value.
- The Worker verifies `X-Signature` with HMAC-SHA256 before trusting the webhook.
- Only `paid` orders create an entitlement.
- Entitlements expire from KV after 30 days.
- `booklet.html` verifies the entitlement against the Worker before loading generator scripts.
- The current generator remains public client-side JavaScript. This is an MVP purchase gate, not DRM. Stronger protection would move final generation or protected assets server-side.
