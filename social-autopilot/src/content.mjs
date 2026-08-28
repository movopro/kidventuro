import { dayNumber, fetchWithRetry, safeJsonParse, truncate } from './utils.mjs';

const pillars = [
  'a screen-free travel tip for parents',
  'a destination mini-mission for children',
  'a quiet airport or restaurant waiting game',
  'a family road-trip observation game',
  'a travel memory and journaling prompt',
  'a local-detail scavenger hunt',
  'a simple packing or preparation tip',
  'a travel bingo idea',
  'a parent pain point and practical solution',
  'how Kidventuro works without an app or subscription',
  'how children can notice more of a destination',
  'a playful product use case during a real family trip'
];

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    theme: { type: 'string' },
    visual: {
      type: 'object',
      additionalProperties: false,
      properties: {
        instagramHeadline: { type: 'string' },
        instagramSubhead: { type: 'string' },
        pinterestHeadline: { type: 'string' },
        pinterestSubhead: { type: 'string' },
        slides: {
          type: 'array',
          minItems: 4,
          maxItems: 4,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              kicker: { type: 'string' },
              headline: { type: 'string' },
              body: { type: 'string' }
            },
            required: ['kicker', 'headline', 'body']
          }
        }
      },
      required: ['instagramHeadline', 'instagramSubhead', 'pinterestHeadline', 'pinterestSubhead', 'slides']
    },
    instagram: {
      type: 'object',
      additionalProperties: false,
      properties: {
        caption: { type: 'string' },
        altText: { type: 'string' }
      },
      required: ['caption', 'altText']
    },
    pinterest: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        description: { type: 'string' }
      },
      required: ['title', 'description']
    },
    tiktok: {
      type: 'object',
      additionalProperties: false,
      properties: {
        caption: { type: 'string' }
      },
      required: ['caption']
    }
  },
  required: ['theme', 'visual', 'instagram', 'pinterest', 'tiktok']
};

function selectSeed(destinations, slot, date) {
  const slotOffset = slot === 'evening' ? 1 : 0;
  const sequence = dayNumber(date) * 2 + slotOffset;
  const destination = destinations[(sequence * 37) % destinations.length];
  const pillar = pillars[(sequence * 5) % pillars.length];
  const mission = destination.missions[sequence % destination.missions.length];
  return { sequence, destination, pillar, mission };
}

function fallbackContent(seed) {
  const { destination, mission, pillar } = seed;
  const theme = `${destination.name}: ${mission}`;
  return {
    generator: 'local-fallback',
    theme,
    visual: {
      instagramHeadline: `Turn ${destination.name} into a game`,
      instagramSubhead: `${mission}. One small mission can change how children see a city.`,
      pinterestHeadline: `${destination.name} with kids`,
      pinterestSubhead: `A screen-free travel mission children can actually do`,
      slides: [
        { kicker: 'FAMILY TRAVEL', headline: `Going to ${destination.name}?`, body: 'Give children a mission before the sightseeing starts.' },
        { kicker: 'MINI MISSION', headline: mission, body: `Look for clues linked to ${destination.en.toLowerCase()}.` },
        { kicker: 'WHY IT WORKS', headline: 'Looking beats waiting', body: 'Observation turns slow travel moments into part of the adventure.' },
        { kicker: 'KIDVENTURO', headline: 'Print. Pack. Explore.', body: 'Personalized travel activities for children ages 4–12.' }
      ]
    },
    instagram: {
      caption: `A simple ${destination.name} mission for the next family trip: ${mission}. Give children something specific to notice and the city becomes part of the game.\n\nKidventuro creates personalized, printable travel adventures for ages 4–12. No app. No subscription.\n\n#FamilyTravel #TravelWithKids #ScreenFreeKids #Kidventuro #${destination.name.replaceAll(' ', '')}`,
      altText: `Kidventuro travel activity card featuring a family mission for ${destination.name}: ${mission}.`
    },
    pinterest: {
      title: `${destination.name} with Kids: A Screen-Free Travel Mission`,
      description: `Try the “${mission}” challenge on your family trip to ${destination.name}. Kidventuro makes personalized printable travel activities for children ages 4–12, with puzzles, scavenger hunts and destination missions. No app or subscription.`
    },
    tiktok: {
      caption: `Try this on a family trip to ${destination.name}: ${mission}. A tiny mission can turn waiting into exploring. #TravelWithKids #FamilyTravel #ScreenFreeKids #Kidventuro`
    },
    seed: { pillar, destination: destination.name, mission }
  };
}

function normalizeContent(content, seed, generator) {
  const normalized = {
    ...content,
    generator,
    seed: { pillar: seed.pillar, destination: seed.destination.name, mission: seed.mission }
  };
  normalized.theme = truncate(normalized.theme, 100);
  normalized.visual.instagramHeadline = truncate(normalized.visual.instagramHeadline, 58);
  normalized.visual.instagramSubhead = truncate(normalized.visual.instagramSubhead, 120);
  normalized.visual.pinterestHeadline = truncate(normalized.visual.pinterestHeadline, 64);
  normalized.visual.pinterestSubhead = truncate(normalized.visual.pinterestSubhead, 120);
  normalized.visual.slides = normalized.visual.slides.slice(0, 4).map((slide) => ({
    kicker: truncate(slide.kicker, 24),
    headline: truncate(slide.headline, 62),
    body: truncate(slide.body, 120)
  }));
  normalized.instagram.caption = truncate(normalized.instagram.caption, 2100);
  normalized.instagram.altText = truncate(normalized.instagram.altText, 900);
  normalized.pinterest.title = truncate(normalized.pinterest.title, 100);
  normalized.pinterest.description = truncate(normalized.pinterest.description, 490);
  normalized.tiktok.caption = truncate(normalized.tiktok.caption, 2100);
  return normalized;
}

function outputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  return response.output?.flatMap((item) => item.content || [])
    .find((item) => item.type === 'output_text')?.text;
}

export async function generateContent({ destinations, slot, date, config, apiKey, useAi = true }) {
  const seed = selectSeed(destinations, slot, date);
  if (!apiKey || !useAi) return normalizeContent(fallbackContent(seed), seed, 'local-fallback');

  const prompt = `Create one English social content package for Kidventuro.

Brand truth:
- Personalized printable travel activity books for children ages 4–12.
- Keeps children engaged during journeys and curious at the destination.
- Printable at home; no app; no subscription; one-time purchase.
- Includes puzzles, travel bingo, scavenger hunts, observation missions, drawing and memory pages.
- Site: kidventuro.com.

Today's source data from the Kidventuro catalog:
- Destination: ${seed.destination.name}
- Safe destination cues: ${seed.destination.en}
- Catalog mission: ${seed.mission}
- Content angle: ${seed.pillar}
- Slot: ${slot}

Rules:
- Write distinct platform-native copy for Instagram, Pinterest and TikTok.
- Do not invent prices, discounts, reviews, statistics, opening hours or safety claims.
- Do not show or request child personal data.
- Address parents. Keep the child activity practical and adult-supervised.
- Use 4–7 specific hashtags in Instagram and TikTok captions, never #fyp.
- Pinterest title must be search-friendly; description must be useful, not keyword stuffing.
- Visual headlines must be short. Four video slides must form a clear hook, activity, benefit and Kidventuro CTA.
- Avoid emojis in visual text. Avoid generic hype and repeated wording across platforms.`;

  try {
    const response = await fetchWithRetry('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || config.openaiModel,
        input: prompt,
        max_output_tokens: 1600,
        store: false,
        reasoning: { effort: 'minimal' },
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: 'kidventuro_social_package',
            strict: true,
            schema
          }
        }
      })
    }, 3);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || `OpenAI HTTP ${response.status}`);
    const text = outputText(body);
    if (!text) throw new Error('OpenAI returned no structured text');
    return normalizeContent(safeJsonParse(text, 'OpenAI output'), seed, 'openai');
  } catch (error) {
    console.warn(`OpenAI unavailable; using local fallback: ${error.message}`);
    return normalizeContent(fallbackContent(seed), seed, 'local-fallback-after-error');
  }
}

export { fallbackContent, normalizeContent, selectSeed };
