# Kidventuro payment backend (Cloudflare Worker)

This Worker verifies Lemon Squeezy webhooks and stores short-lived purchase entitlements in Cloudflare KV.

## Public endpoints

- `POST https://api.kidventuro.com/webhooks/lemonsqueezy`
- `GET https://api.kidventuro.com/entitlement/status?ref=...`
- `GET https://api.kidventuro.com/health`

## Required Cloudflare resources

1. Create a Workers KV namespace named `kidventuro-entitlements`.
2. Copy its namespace ID into `wrangler.toml` in place of `REPLACE_WITH_KV_NAMESPACE_ID`.
3. Add Worker secret `LEMONSQUEEZY_WEBHOOK_SECRET`.
4. Deploy the Worker. The configured custom domain is `api.kidventuro.com`.

Do not commit the webhook secret to GitHub.

## Lemon Squeezy webhook

In Lemon Squeezy Settings → Webhooks create a webhook with:

- Callback URL: `https://api.kidventuro.com/webhooks/lemonsqueezy`
- Signing secret: the exact same value stored as Cloudflare secret `LEMONSQUEEZY_WEBHOOK_SECRET`
- Events: `order_created`, `order_refunded`

For Test mode testing, create/configure the webhook in Test mode as applicable.

## Product confirmation button

Set the Kidventuro Adventure product confirmation button URL to:

`https://kidventuro.com/success.html`

The browser already retains the opaque `kv_ref` in session storage, so child personalization does not need to be placed in the confirmation URL.

## Security model

- Lemon Squeezy receives only an opaque `kv_ref` custom checkout value.
- The Worker verifies `X-Signature` with HMAC-SHA256 before trusting the webhook.
- Entitlements expire from KV after 30 days.
- The current GitHub Pages generator remains client-side. This blocks the normal customer flow but is not strong DRM; production-grade protection requires moving final document generation or protected assets server-side.
