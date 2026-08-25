# Kidventuro Cloudflare Worker

This Worker powers Kidventuro paid checkout fulfillment, Lemon Squeezy webhook verification, temporary personalization storage, order recovery, refund revocation and optional AI-assisted booklet enrichment.

## Deployment

Cloudflare **Workers Builds** is connected to `movopro/kidventuro`.

Use:

- Repository: `movopro/kidventuro`
- Production branch: `main`
- Root directory: repository root / empty
- Build command: blank
- Deploy command: `npm run deploy`

The root `package.json` forwards deployment into `worker/`.

Worker name: `kidventuro-api`

Production endpoint:

`https://kidventuro-api.m-oreshkov.workers.dev`

## Runtime bindings and secrets

`worker/wrangler.jsonc` declares:

- KV binding `ENTITLEMENTS`
- required encrypted secret `LEMONSQUEEZY_WEBHOOK_SECRET`
- runtime variable `OPENAI_MODEL=gpt-5.6-luna`
- `keep_vars: true` so dashboard runtime values are preserved by deployments

Optional encrypted runtime secret for AI personalization:

- `OPENAI_API_KEY`

Add secrets under the Worker's **Runtime variables and secrets**, not Workers Builds build variables. Never commit their values to GitHub. Local `.env` and `.dev.vars` files are ignored by Git.

AI is intentionally optional. Without `OPENAI_API_KEY`, Mini, Adventure and Family still generate using Kidventuro's deterministic destination catalog.

## Endpoints

- `GET /health`
- `POST /checkout/session`
- `POST /webhooks/lemonsqueezy`
- `GET /entitlement/status?ref=...`
- `GET /fulfillment?ref=...`
- `GET /fulfillment?order=...`
- `POST /ai/enrich`

### Checkout session

`POST /checkout/session` accepts only requests from `https://kidventuro.com`. It validates the selected product and stores the minimum personalization under a high-entropy `kv_ref` for up to 7 days.

For Family, the session can contain 1–3 validated children with first name/nickname, age and interest plus the shared destination and trip length.

### Lemon Squeezy webhook

Callback:

`https://kidventuro-api.m-oreshkov.workers.dev/webhooks/lemonsqueezy`

Events:

- `order_created`
- `order_refunded`

The Worker verifies the Lemon Squeezy `X-Signature` using HMAC-SHA256 before trusting a payload. Only a `paid` order whose `kv_ref` and product match the stored checkout session creates an entitlement. Refund webhooks revoke it.

Lemon Squeezy receives only the opaque `kv_ref` and Kidventuro product marker as custom checkout data; child personalization is not intentionally sent to Lemon Squeezy.

### Fulfillment and receipt recovery

`GET /fulfillment` returns personalization only after a verified paid entitlement exists. It can resolve by `ref` or by Lemon Squeezy `order_identifier`, enabling recovery from a new tab or receipt link.

Recommended confirmation and receipt URL:

`https://kidventuro.com/success.html?order=[order_identifier]`

Temporary checkout personalization expires after up to 7 days. Entitlements and order-to-reference mappings expire after up to 30 days.

### AI enrichment

`POST /ai/enrich` is available only from the Kidventuro production origin and only after a paid, non-refunded entitlement is verified.

Before an OpenAI request is made, the Worker creates a privacy-reduced profile:

- no child first name or nickname
- no exact birth date or other sensitive fields
- exact age converted to one of `4-6`, `7-9` or `10-12`
- destination
- product type
- trip length
- language
- interest(s)

The model is instructed to produce only short, child-safe creative microcopy: a destination hook, interest mission, cooperative family mission and reflection prompt. It is explicitly told not to provide current opening hours, prices, live conditions, route-safety claims, medical/legal advice, or risky activities.

AI output is cached in KV under the random checkout reference for up to 7 days, so repeated booklet openings do not repeatedly call the model. If OpenAI is unavailable, times out, returns invalid content, or `OPENAI_API_KEY` is absent, the request fails open to the deterministic Kidventuro generator; purchase fulfillment is never blocked by AI.

## Health

A current `/health` response includes:

- `storage`
- `webhook_secret`
- `ai_configured`
- `ai_model`
- `products`
- privacy-safe `last_webhook` diagnostics

For full production configuration, the important values are:

- `storage: true`
- `webhook_secret: true`
- `ai_configured: true` if AI enhancement is intentionally enabled

The endpoint never exposes secret values or child personalization.

## Product hardening

The Worker supports per-product numeric Lemon Squeezy variant allowlists through optional runtime variables:

- `EXPECTED_VARIANT_MINI`
- `EXPECTED_VARIANT_ADVENTURE`
- `EXPECTED_VARIANT_FAMILY`

Set these after confirming the numeric Live-mode variant IDs. The older `EXPECTED_VARIANT_ID` remains an Adventure fallback for compatibility.

## Security model

- secrets stay server-side
- Lemon Squeezy webhooks require a valid signature
- product/session mismatches do not unlock content
- only paid orders create entitlements
- refunds revoke access
- AI requires an existing paid entitlement
- child names are deliberately removed before AI calls
- client booklet generation starts only after entitlement verification

The generator assets themselves remain public JavaScript because the storefront is hosted on GitHub Pages. This is a verified MVP purchase gate, not DRM. Stronger future protection would move final PDF generation or protected assets server-side.
