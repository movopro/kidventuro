# Kidventuro social autopilot

This automation creates and publishes two distinct daily content packages for Instagram, Pinterest and TikTok.

Flow:

1. GitHub Actions selects 09:17 or 18:17 in `Europe/Sofia`, including daylight-saving changes.
2. One low-cost OpenAI Responses API call creates platform-specific copy and short visual text.
3. If OpenAI is missing or unavailable, a deterministic local generator keeps publishing.
4. Sharp renders branded Instagram and Pinterest JPEGs.
5. FFmpeg renders a four-slide, 9:16 H.264 TikTok video and embeds an alternating original instrumental excerpt.
6. Cloudinary Free stores the public media and small idempotency markers.
7. Buffer Free publishes automatically to the three connected channels.
8. Duplicate checks and per-platform markers prevent normal reruns from reposting the same slot.
9. Media and state older than 45 days are removed from Cloudinary.
10. A second run 30 minutes later completes only missing platforms after a transient failure.

The live destination data is read from `destinations/destination-data.js`, so the content rotation stays aligned with the Kidventuro catalog. The system never sends child names or customer data to OpenAI.

The two original instrumentals in `assets/audio/` alternate strictly between consecutive morning and evening posts. Each slot gets a deterministic excerpt start, so later posts use different parts of the tracks while retries reproduce the same media.

Required GitHub Actions secrets:

- `BUFFER_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Optional secret:

- `OPENAI_API_KEY` — without it, the zero-cost local generator is used.

Recommended GitHub Actions variable:

- `PINTEREST_BOARD_NAME` — defaults to `Family Travel with Kids`.

Optional variables when more than one channel of a given service exists:

- `BUFFER_INSTAGRAM_CHANNEL_ID`
- `BUFFER_PINTEREST_CHANNEL_ID`
- `BUFFER_TIKTOK_CHANNEL_ID`
- `OPENAI_MODEL` — defaults to `gpt-5-nano`.

Use the Actions page and run `Kidventuro social autopilot` manually with `dry_run=true` to render a downloadable preview without publishing or calling OpenAI.

Bulgarian activation instructions are in `SETUP-BG.md`.
