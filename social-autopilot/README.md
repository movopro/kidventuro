# Kidventuro social autopilot

Posts narrated, animated vertical videos to TikTok, Instagram (Reels) and
Pinterest three times a day - **09:00, 14:00 and 18:00 Europe/Sofia**.

## How a post is made

1. **Written** in weekly batches: `content/queue/<ISO week>.json`, one post per
   date and slot, in US English. Formats: top-3 lists, parent tips, "did you
   know" facts, guess the city, would you rather, myth or fact, POV chats, and
   destination activity books. Validated (`src/studio/schema.mjs`: formats,
   real destinations from `destinations/destination-data.js`, no emoji on
   screen, caption limits) and spell-checked with hunspell
   (`content/spell-allow.txt` holds reviewed exceptions).
2. **Rendered** by `.github/workflows/social-studio.yml` when a batch is
   pushed: 1080x1920 H.264 at 30 fps with the site's look (cream, sun, mint
   waves, orange/teal stickers), synthesised sound effects, a music bed, and a
   narrator (Kokoro-82M, Apache-2.0, run locally on the runner). Each scene is
   stretched to fit its spoken line. The finished video and a 1000x1500 pin go
   to Cloudinary and are recorded in the post's `media` field.
3. **Published** by `.github/workflows/social-autopilot.yml`: it takes the
   queued post for the slot and posts its finished media through Buffer. If
   the media is missing or stale it renders the post itself (without voice);
   if no valid post is queued, `content/evergreen.json` supplies one.

## Commands

    npm test
    node src/studio/studio.mjs validate content/queue/2026-W41.json
    node src/studio/studio.mjs preview  content/queue/2026-W41.json [--id kw41-...]
    npm run preview                         # full dry run of the morning slot

Narration in a local preview needs `STUDIO_TTS_PYTHON` (a Python with
`kokoro-onnx`), `KOKORO_MODEL` and `KOKORO_VOICES`; Node 2 has them in
`/opt/social/tts`. Previews land in `out/studio/<post id>/` with a contact
sheet (`sheet.jpg`) and the narration script (`narration.txt`).

## AI disclosure

Voiced videos set each platform's "AI-generated" label, because the narrator
is a synthetic voice. Template graphics and reviewed AI-assisted copy are not
labelled, and there is no watermark. See `aiDisclosure()` in `schema.mjs`.

Bulgarian setup notes: `SETUP-BG.md`.
