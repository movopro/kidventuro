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

const interactiveFormats = [
  'this-or-that',
  'guess-the-city',
  'myth-or-fact',
  'three-second-challenge',
  'emoji-destination'
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

function interactiveMode(sequence) {
  if (sequence % 4 !== 0) return null;
  const index = Math.floor(sequence / 4) - 1;
  const normalizedIndex = ((index % interactiveFormats.length) + interactiveFormats.length) % interactiveFormats.length;
  return interactiveFormats[normalizedIndex];
}

function selectSeed(destinations, slot, date) {
  const slotOffset = slot === 'evening' ? 1 : 0;
  const sequence = dayNumber(date) * 2 + slotOffset;
  const destination = destinations[(sequence * 37) % destinations.length];
  const pillar = pillars[(sequence * 5) % pillars.length];
  const mission = destination.missions[sequence % destination.missions.length];
  return { sequence, destination, pillar, mission };
}

function destinationCues(destination) {
  const cues = String(destination.en || '')
    .split('•')
    .map((cue) => cue.trim())
    .filter(Boolean)
    .slice(0, 3);
  return [...cues, 'local landmarks', 'street details', 'family discoveries'].slice(0, 3);
}

function cueEmoji(cue) {
  const text = String(cue || '').toLowerCase();
  const rules = [
    [/pizza|food|cuisine|market|snack|restaurant/, '🍽️'],
    [/fountain/, '⛲'],
    [/tower/, '🗼'],
    [/art|museum|gallery/, '🎨'],
    [/café|cafe|coffee/, '☕'],
    [/ancient|ruin|temple|wonder|history|historic/, '🏛️'],
    [/castle|palace|royal/, '🏰'],
    [/beach|sea|coast|island|ocean/, '🏖️'],
    [/mountain|alp|hill|peak/, '🏔️'],
    [/canal|boat|harbour|harbor|port/, '🚤'],
    [/bike|cycling|bicycle/, '🚲'],
    [/animal|wildlife|safari/, '🐾'],
    [/desert|dune/, '🏜️'],
    [/snow|winter|ice/, '❄️'],
    [/forest|nature|park|garden|green/, '🌿'],
    [/music|dance/, '🎵'],
    [/train|rail/, '🚆'],
    [/bridge/, '🌉'],
    [/skyline|skyscraper|city lights/, '🏙️'],
    [/volcano/, '🌋'],
    [/river|lake/, '🌊'],
    [/chocolate/, '🍫'],
    [/sun|warm|sunset/, '☀️']
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] || '🧭';
}

function emojiClues(destination) {
  const emojis = destinationCues(destination).map(cueEmoji);
  const unique = [...new Set(emojis)];
  return [...unique, '✈️', '🔎', '🗺️'].slice(0, 3);
}

function interactiveFallbackContent(seed, mode) {
  const { destination, mission, pillar } = seed;

  if (mode === 'guess-the-city') {
    const [clueOne, clueTwo, clueThree] = destinationCues(destination);
    return {
      generator: 'local-fallback',
      theme: `Interactive guess: ${destination.name}`,
      visual: {
        instagramHeadline: 'Can you guess the city?',
        instagramSubhead: 'Three clues. One reveal. Keep your answer until the last slide.',
        pinterestHeadline: 'Guess the city travel game',
        pinterestSubhead: 'A quick screen-free family challenge for the next trip',
        slides: [
          { kicker: 'GUESS THE CITY', headline: 'Three clues. Ready?', body: 'Make your guess before the final slide. No cheating.' },
          { kicker: 'CLUE 1 OF 3', headline: clueOne, body: 'Lock in your first guess. Two clues left.' },
          { kicker: 'FINAL CLUES', headline: `${clueTwo} + ${clueThree}`, body: 'Got it? Keep your answer until the reveal.' },
          { kicker: 'REVEAL', headline: `It was ${destination.name}`, body: `Would your family guess it before slide four? Try ${mission.toLowerCase()} on the trip.` }
        ]
      },
      instagram: {
        caption: `Family travel game: can you guess the destination before the reveal? Three clues, one city, no Googling.\n\nThen turn the real trip into a game with Kidventuro printable travel adventures for ages 4–12.\n\n#FamilyTravel #TravelWithKids #TravelGame #ScreenFreeKids #Kidventuro`,
        altText: 'Kidventuro guess-the-city family travel challenge with three destination clues and a final reveal.'
      },
      pinterest: {
        title: 'Guess the City: A Screen-Free Family Travel Game',
        description: `A quick family travel guessing game inspired by ${destination.name}. Use three destination clues, make a guess before the reveal, then try a simple observation mission on the real trip. Kidventuro creates personalized printable travel activities for ages 4–12.`
      },
      tiktok: {
        caption: 'Can you guess the city before slide 4? Keep your answer until the reveal. #FamilyTravel #TravelWithKids #TravelGame #ScreenFreeKids #Kidventuro'
      },
      seed: { pillar, destination: destination.name, mission }
    };
  }

  if (mode === 'myth-or-fact') {
    return {
      generator: 'local-fallback',
      theme: `Myth or fact: screen-free travel in ${destination.name}`,
      visual: {
        instagramHeadline: 'Myth or fact: travel edition',
        instagramSubhead: 'Do kids need a screen to stay busy during the slow parts of a trip?',
        pinterestHeadline: 'Myth or fact family travel game',
        pinterestSubhead: 'A quick screen-free travel prompt parents can try anywhere',
        slides: [
          { kicker: 'MYTH OR FACT', headline: 'Kids need a screen to stay busy?', body: 'Pick MYTH or FACT before the answer appears.' },
          { kicker: 'LOCK IT IN', headline: 'What is your answer?', body: 'Think about airports, restaurants, queues and long travel days.' },
          { kicker: 'ONE MORE SECOND', headline: 'Myth or fact?', body: 'No changing your answer now.' },
          { kicker: 'REVEAL', headline: 'MYTH', body: `A tiny mission like ${mission.toLowerCase()} can turn waiting into something to notice and do.` }
        ]
      },
      instagram: {
        caption: `MYTH OR FACT: kids need a screen to stay busy while travelling?\n\nOur answer: MYTH. A simple observation game, scavenger hunt or printable mission can give them something real to do. Kidventuro builds those activities around destinations like ${destination.name}.\n\n#FamilyTravel #TravelWithKids #MythOrFact #ScreenFreeKids #Kidventuro`,
        altText: 'Kidventuro myth-or-fact family travel challenge about screen-free activities during travel.'
      },
      pinterest: {
        title: 'Myth or Fact: Do Kids Need Screens While Travelling?',
        description: `A quick parent-friendly myth-or-fact prompt about screen-free family travel, with a simple mission inspired by ${destination.name}. Kidventuro creates personalized printable travel activities for ages 4–12.`
      },
      tiktok: {
        caption: 'MYTH OR FACT: kids need a screen to stay busy while travelling? Lock in your answer before the reveal. #FamilyTravel #TravelWithKids #MythOrFact #ScreenFreeKids #Kidventuro'
      },
      seed: { pillar, destination: destination.name, mission }
    };
  }

  if (mode === 'three-second-challenge') {
    const [cueOne, cueTwo] = destinationCues(destination);
    return {
      generator: 'local-fallback',
      theme: `Three-second challenge: ${destination.name}`,
      visual: {
        instagramHeadline: '3-second travel challenge',
        instagramSubhead: `Quick: name three things you would look for in ${destination.name}.`,
        pinterestHeadline: '3-second family travel challenge',
        pinterestSubhead: `A fast observation game inspired by ${destination.name}`,
        slides: [
          { kicker: '3-SECOND CHALLENGE', headline: `Going to ${destination.name}?`, body: 'Name three things you would look for there. Ready?' },
          { kicker: 'GO', headline: '3... 2... 1...', body: 'Say your three answers before the next slide.' },
          { kicker: 'TIME', headline: `Did you say ${cueOne}?`, body: `Bonus point if ${cueTwo.toLowerCase()} was on your list too.` },
          { kicker: 'NEXT LEVEL', headline: mission, body: 'Turn your answer into a real-world mini mission on the trip.' }
        ]
      },
      instagram: {
        caption: `3-SECOND CHALLENGE: name three things you would look for on a family trip to ${destination.name}. Go.\n\nNow make one of them a real scavenger-hunt mission. Kidventuro turns destinations into printable activities for ages 4–12.\n\n#FamilyTravel #TravelWithKids #TravelChallenge #ScreenFreeKids #Kidventuro`,
        altText: `Kidventuro three-second family travel challenge inspired by ${destination.name}.`
      },
      pinterest: {
        title: `${destination.name} 3-Second Family Travel Challenge`,
        description: `Try this fast observation game before or during a family trip to ${destination.name}: name three things you would look for, then turn one answer into a real-world mission. Kidventuro creates printable travel activities for ages 4–12.`
      },
      tiktok: {
        caption: `3 seconds: name three things you would look for in ${destination.name}. Ready? #FamilyTravel #TravelWithKids #TravelChallenge #ScreenFreeKids #Kidventuro`
      },
      seed: { pillar, destination: destination.name, mission }
    };
  }

  if (mode === 'emoji-destination') {
    const [emojiOne, emojiTwo, emojiThree] = emojiClues(destination);
    return {
      generator: 'local-fallback',
      theme: `Emoji destination: ${destination.name}`,
      visual: {
        instagramHeadline: 'Guess the destination by emoji',
        instagramSubhead: 'Three emoji clues. One destination. Reveal on the final slide.',
        pinterestHeadline: 'Emoji destination guessing game',
        pinterestSubhead: 'A quick family travel guessing challenge',
        slides: [
          { kicker: 'EMOJI DESTINATION', headline: `${emojiOne}  ${emojiTwo}  ${emojiThree}`, body: 'Which destination do these clues make you think of?' },
          { kicker: 'NO GOOGLING', headline: `${emojiOne} + ${emojiTwo}`, body: 'Make your first guess now.' },
          { kicker: 'FINAL CLUE', headline: emojiThree, body: 'Last chance. Lock in your answer.' },
          { kicker: 'REVEAL', headline: destination.name, body: `Got it? Try ${mission.toLowerCase()} when your family gets there.` }
        ]
      },
      instagram: {
        caption: `EMOJI DESTINATION: ${emojiOne} ${emojiTwo} ${emojiThree}\n\nCan you guess the place before the reveal? Kidventuro turns destinations like ${destination.name} into printable games and mini missions for ages 4–12.\n\n#FamilyTravel #TravelWithKids #GuessTheDestination #TravelGame #Kidventuro`,
        altText: `Kidventuro emoji destination guessing game with three clues leading to ${destination.name}.`
      },
      pinterest: {
        title: 'Emoji Destination: A Family Travel Guessing Game',
        description: `Use three emoji clues to guess ${destination.name} before the reveal, then turn the destination into a real-world observation mission. Kidventuro creates personalized printable travel activities for ages 4–12.`
      },
      tiktok: {
        caption: `${emojiOne} ${emojiTwo} ${emojiThree} — can you guess the destination before slide 4? #FamilyTravel #TravelWithKids #GuessTheDestination #TravelGame #Kidventuro`
      },
      seed: { pillar, destination: destination.name, mission }
    };
  }

  return {
    generator: 'local-fallback',
    theme: `Interactive choice: ${destination.name}`,
    visual: {
      instagramHeadline: 'This or that: travel challenge',
      instagramSubhead: `For ${destination.name}: landmark hunt or food hunt? Pick one before the reveal.`,
      pinterestHeadline: 'This or that family travel game',
      pinterestSubhead: `A quick choose-your-challenge idea for ${destination.name}`,
      slides: [
        { kicker: 'THIS OR THAT', headline: 'Pick your travel challenge', body: 'No overthinking. Choose A or B.' },
        { kicker: 'OPTION A', headline: 'Landmark hunt', body: `Spot three tiny details around ${destination.name} that most people walk past.` },
        { kicker: 'OPTION B', headline: 'Food hunt', body: 'Find one local snack, one unusual menu word and one new flavour.' },
        { kicker: 'YOUR TURN', headline: 'A or B?', body: `Comment your pick, then try ${mission.toLowerCase()} on your next family trip.` }
      ]
    },
    instagram: {
      caption: `THIS OR THAT for your next family trip: A) landmark hunt or B) food hunt?\n\nPick one before reading the comments. Kidventuro turns destinations like ${destination.name} into printable games and mini missions for ages 4–12.\n\n#FamilyTravel #TravelWithKids #ThisOrThat #ScreenFreeKids #Kidventuro`,
      altText: 'Kidventuro this-or-that family travel challenge asking viewers to choose a landmark hunt or food hunt.'
    },
    pinterest: {
      title: `${destination.name} Family Travel Game: This or That`,
      description: `Try a simple this-or-that challenge on a family trip to ${destination.name}: landmark hunt or food hunt. A fast screen-free idea that turns waiting and sightseeing into a game. Kidventuro makes personalized printable travel activities for ages 4–12.`
    },
    tiktok: {
      caption: 'A or B? Landmark hunt or food hunt for your next family trip? Pick before you read the comments. #FamilyTravel #TravelWithKids #ThisOrThat #ScreenFreeKids #Kidventuro'
    },
    seed: { pillar, destination: destination.name, mission }
  };
}

function fallbackContent(seed) {
  const mode = interactiveMode(seed.sequence);
  if (mode) return interactiveFallbackContent(seed, mode);

  const { destination, mission, pillar } = seed;
  const theme = `${destination.name}: ${mission}`;
  return {
    generator: 'local-fallback',
    theme,
    visual: {
      instagramHeadline: `Turn ${destination.name} into a game`,
      instagramSubhead: `${mission}. One small mission can change how children see a city.`,
      pinterestHeadline: `${destination.name} with kids`,
      pinterestSubhead: 'A screen-free travel mission children can actually do',
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
    seed: {
      sequence: seed.sequence,
      format: interactiveMode(seed.sequence) || 'standard',
      pillar: seed.pillar,
      destination: seed.destination.name,
      mission: seed.mission
    }
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

function formatInstruction(mode) {
  switch (mode) {
    case 'this-or-that':
      return 'Interactive format: THIS OR THAT. Slides must be hook, option A, option B, and a clear A-or-B comment prompt.';
    case 'guess-the-city':
      return 'Interactive format: GUESS THE CITY. Slides must be hook, clue 1, final clues, and destination reveal. Do not reveal the city before slide 4.';
    case 'myth-or-fact':
      return 'Interactive format: MYTH OR FACT. Use a safe, broadly true family-travel statement that does not depend on unverifiable destination facts. Slides must ask, hold the answer, and reveal it on slide 4.';
    case 'three-second-challenge':
      return 'Interactive format: 3-SECOND CHALLENGE. Slides must be hook, countdown, quick comparison or hint, and a destination mini-mission. Make the viewer answer before slide 3.';
    case 'emoji-destination':
      return 'Interactive format: EMOJI DESTINATION. Use 3 relevant emoji clues, hold the destination name until slide 4, then reveal it. Emojis are required for this format.';
    default:
      return 'Standard format: practical hook, activity, benefit, and Kidventuro CTA.';
  }
}

export async function generateContent({ destinations, slot, date, config, apiKey, useAi = true }) {
  const seed = selectSeed(destinations, slot, date);
  const mode = interactiveMode(seed.sequence);
  if (!apiKey || !useAi) return normalizeContent(fallbackContent(seed), seed, 'local-fallback');

  const prompt = `Create one English social content package for Kidventuro.\n\nBrand truth:\n- Personalized printable travel activity books for children ages 4–12.\n- Keeps children engaged during journeys and curious at the destination.\n- Printable at home; no app; no subscription; one-time purchase.\n- Includes puzzles, travel bingo, scavenger hunts, observation missions, drawing and memory pages.\n- Site: kidventuro.com.\n\nToday's source data from the Kidventuro catalog:\n- Destination: ${seed.destination.name}\n- Safe destination cues: ${seed.destination.en}\n- Catalog mission: ${seed.mission}\n- Content angle: ${seed.pillar}\n- Slot: ${slot}\n- ${formatInstruction(mode)}\n\nRules:\n- Write distinct platform-native copy for Instagram, Pinterest and TikTok.\n- Do not invent prices, discounts, reviews, statistics, opening hours or safety claims.\n- Do not show or request child personal data.\n- Address parents. Keep the child activity practical and adult-supervised.\n- Use 4–7 specific hashtags in Instagram and TikTok captions, never #fyp.\n- Pinterest title must be search-friendly; description must be useful, not keyword stuffing.\n- Visual headlines must be short. Four video slides must follow the selected format above.\n- For interactive formats, make the viewer choose, guess or answer before the final slide.\n- Avoid emojis in visual text except EMOJI DESTINATION, where emoji clues are required.\n- Avoid generic hype and repeated wording across platforms.`;

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

export { fallbackContent, interactiveMode, normalizeContent, selectSeed };
