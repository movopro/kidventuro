import { dayNumber, truncate } from './utils.mjs';

// Existing "Did You Know?" fact cards — unchanged.
const facts = [
  { country: 'Italy', flag: '🇮🇹', destination: 'Venice', destinationSlug: 'venice', fact: 'Venice is built across 118 small islands linked by bridges and canals.', challenge: 'How many bridges can your family spot in 10 minutes?' },
  { country: 'France', flag: '🇫🇷', destination: 'Paris', destinationSlug: 'paris', fact: 'Mainland France is often nicknamed “L’Hexagone” because its outline has six broad sides.', challenge: 'Can the kids find six different shapes during your walk?' },
  { country: 'United Kingdom', flag: '🇬🇧', destination: 'London', destinationSlug: 'london', fact: 'Big Ben is actually the nickname of the Great Bell inside the Elizabeth Tower.', challenge: 'Spot three different clocks or towers nearby.' },
  { country: 'Spain', flag: '🇪🇸', destination: 'Barcelona', destinationSlug: 'barcelona', fact: 'Barcelona’s famous Sagrada Família has been under construction since the 19th century.', challenge: 'Look for three unusual shapes on a building facade.' },
  { country: 'Portugal', flag: '🇵🇹', destination: 'Lisbon', destinationSlug: 'lisbon', fact: 'Decorative ceramic tiles called azulejos are a famous part of Portuguese architecture.', challenge: 'Find a tile pattern and describe its colours.' },
  { country: 'Netherlands', flag: '🇳🇱', destination: 'Amsterdam', destinationSlug: 'amsterdam', fact: 'Amsterdam is famous for a dense network of canals that shape the historic city centre.', challenge: 'Count bicycles while crossing one canal bridge.' },
  { country: 'Austria', flag: '🇦🇹', destination: 'Vienna', destinationSlug: 'vienna', fact: 'Vienna has a long musical history connected with composers such as Mozart, Beethoven and Schubert.', challenge: 'Listen for three different city sounds and make a rhythm from them.' },
  { country: 'Czechia', flag: '🇨🇿', destination: 'Prague', destinationSlug: 'prague', fact: 'Prague’s astronomical clock dates back to 1410 and is one of the oldest still operating.', challenge: 'Find a clock and guess how old it might be.' },
  { country: 'Germany', flag: '🇩🇪', destination: 'Berlin', destinationSlug: 'berlin', fact: 'Berlin’s pedestrian traffic lights are famous for the little Ampelmännchen figure.', challenge: 'How many different street symbols can the kids spot?' },
  { country: 'Greece', flag: '🇬🇷', destination: 'Athens', destinationSlug: 'athens', fact: 'The Parthenon on the Acropolis was built in the 5th century BCE.', challenge: 'Look for columns and count how many you can see.' },
  { country: 'Türkiye', flag: '🇹🇷', destination: 'Istanbul', destinationSlug: 'istanbul', fact: 'Istanbul stretches across both Europe and Asia, divided by the Bosphorus strait.', challenge: 'On a ferry ride, ask the kids which continent they think is on each side.' },
  { country: 'Japan', flag: '🇯🇵', destination: 'Tokyo', destinationSlug: 'tokyo', fact: 'Japan’s first Shinkansen bullet train service opened in 1964 between Tokyo and Osaka.', challenge: 'Spot three different train signs or symbols.' },
  { country: 'United Arab Emirates', flag: '🇦🇪', destination: 'Dubai', destinationSlug: 'dubai', fact: 'Dubai grew around a natural saltwater creek that was historically important for trade.', challenge: 'Look for three ways people move across or beside the water.' },
  { country: 'Singapore', flag: '🇸🇬', destination: 'Singapore', destinationSlug: 'singapore', fact: 'Singapore is both a city and a sovereign country.', challenge: 'Find three clues that show how nature and city life mix together.' },
  { country: 'Australia', flag: '🇦🇺', destination: 'Sydney', destinationSlug: 'sydney', fact: 'Sydney Harbour Bridge is nicknamed “the Coathanger” because of its arch shape.', challenge: 'Can the kids find another object or building with the same shape?' },
  { country: 'Denmark', flag: '🇩🇰', destination: 'Copenhagen', destinationSlug: 'copenhagen', fact: 'Copenhagen’s colourful Nyhavn waterfront began as a commercial harbour in the 17th century.', challenge: 'Pick a favourite house colour and count how often it appears.' },
  { country: 'Hungary', flag: '🇭🇺', destination: 'Budapest', destinationSlug: 'budapest', fact: 'Budapest was officially formed in 1873 by uniting Buda, Pest and Óbuda.', challenge: 'Cross a bridge and ask the kids to spot one difference between the two riverbanks.' },
  { country: 'Croatia', flag: '🇭🇷', destination: 'Dubrovnik', destinationSlug: 'dubrovnik', fact: 'Dubrovnik’s historic old town is surrounded by massive stone defensive walls.', challenge: 'Find three different shapes in the stonework.' },
  { country: 'Poland', flag: '🇵🇱', destination: 'Krakow', destinationSlug: 'krakow', fact: 'Krakow’s Wawel Dragon legend is one of the city’s best-known stories.', challenge: 'Invent a 30-second dragon story inspired by something you see.' },
  { country: 'Bulgaria', flag: '🇧🇬', destination: 'Sofia', destinationSlug: 'sofia', fact: 'The Cyrillic alphabet was developed in the medieval Bulgarian cultural world by followers of Cyril and Methodius.', challenge: 'Find five Cyrillic letters on signs and copy your favourite one.' },
  { country: 'South Korea', flag: '🇰🇷', destination: 'Seoul', destinationSlug: 'seoul', fact: 'Hangul, the Korean writing system, was created in the 15th century during the reign of King Sejong.', challenge: 'Look for repeating Hangul shapes on shop signs.' },
  { country: 'Switzerland', flag: '🇨🇭', destination: 'Zurich', destinationSlug: 'zurich', fact: 'Switzerland has four national languages: German, French, Italian and Romansh.', challenge: 'How many different languages can your family notice today?' },
  { country: 'Belgium', flag: '🇧🇪', destination: 'Brussels', destinationSlug: 'brussels', fact: 'Brussels’ Atomium was built for the 1958 World’s Fair.', challenge: 'Count the spheres and look for another repeating geometric shape nearby.' },
  { country: 'Ireland', flag: '🇮🇪', destination: 'Dublin', destinationSlug: 'dublin', fact: 'Dublin’s name comes from an old Irish term often translated as “black pool”.', challenge: 'Find three place names and wonder together what they might mean.' },
  { country: 'Sweden', flag: '🇸🇪', destination: 'Stockholm', destinationSlug: 'stockholm', fact: 'Central Stockholm spreads across 14 islands connected by bridges.', challenge: 'Count bridges, boats or islands during your walk.' },
  { country: 'Norway', flag: '🇳🇴', destination: 'Oslo', destinationSlug: 'oslo', fact: 'The Nobel Peace Prize is awarded in Oslo, while the other Nobel Prizes are presented in Stockholm.', challenge: 'Ask the kids: what would you give a peace prize for?' },
  { country: 'Finland', flag: '🇫🇮', destination: 'Helsinki', destinationSlug: 'helsinki', fact: 'Suomenlinna is a sea fortress built across several islands just off Helsinki.', challenge: 'Draw a tiny fortress map with walls, water and one secret route.' },
  { country: 'Egypt', flag: '🇪🇬', destination: 'Cairo', destinationSlug: 'cairo', fact: 'The Great Pyramid of Giza is the only surviving monument of the Seven Wonders of the Ancient World.', challenge: 'Find three triangle or pyramid shapes around you.' },
  { country: 'Mexico', flag: '🇲🇽', destination: 'Mexico City', destinationSlug: 'mexico-city', fact: 'Mexico City was built on and around the site of the Aztec capital Tenochtitlan.', challenge: 'Look for one old-looking detail and one modern detail on the same street.' },
  { country: 'Canada', flag: '🇨🇦', destination: 'Toronto', destinationSlug: 'toronto', fact: 'Canada has the longest coastline of any country in the world.', challenge: 'Name as many things as you can that you might find on a coastline.' }
];

// New format: "Guess the Country" — three clues, then the reveal.
const guessTheCountry = [
  { country: 'Italy', flag: '🇮🇹', destination: 'Rome', destinationSlug: 'rome', clues: ['This country is shaped like a tall boot.', 'It contains the world’s smallest country entirely inside its capital city.', 'Pizza and pasta both trace their roots here.'], revealFact: 'Rome, its capital, was founded — according to legend — in 753 BCE.' },
  { country: 'Japan', flag: '🇯🇵', destination: 'Tokyo', destinationSlug: 'tokyo', clues: ['This country is made up of thousands of islands.', 'It is famous for cherry blossom season every spring.', 'Its bullet trains are known for being remarkably punctual.'], revealFact: 'Tokyo is its bustling capital and one of the world’s largest cities.' },
  { country: 'Egypt', flag: '🇪🇬', destination: 'Cairo', destinationSlug: 'cairo', clues: ['It is home to one of the Seven Wonders of the Ancient World.', 'A famous river flows north through it into the Mediterranean Sea.', 'Its ancient writing system used pictures called hieroglyphs.'], revealFact: 'The Great Pyramid of Giza still stands near Cairo today.' },
  { country: 'Australia', flag: '🇦🇺', destination: 'Sydney', destinationSlug: 'sydney', clues: ['This country is also its own continent.', 'It is home to more kangaroos than people.', 'Its most famous building looks like giant sails by the harbour.'], revealFact: 'That building is the Sydney Opera House.' },
  { country: 'France', flag: '🇫🇷', destination: 'Paris', destinationSlug: 'paris', clues: ['Its outline is nicknamed “the Hexagon.”', 'A famous iron tower here was built for a World’s Fair in 1889.', 'It shares an undersea tunnel with the United Kingdom.'], revealFact: 'That tower is the Eiffel Tower, in Paris.' },
  { country: 'Greece', flag: '🇬🇷', destination: 'Athens', destinationSlug: 'athens', clues: ['The first Olympic Games were held here in ancient times.', 'Its alphabet gave us letters like alpha and beta.', 'It has thousands of islands scattered across the Aegean Sea.'], revealFact: 'Its capital, Athens, is named after the goddess Athena.' },
  { country: 'Iceland', flag: '🇮🇸', destination: 'Reykjavik', destinationSlug: 'reykjavik', clues: ['This country has almost no mosquitoes.', 'It sits on the boundary of two tectonic plates.', 'Its capital is one of the northernmost in the world.'], revealFact: 'That capital is Reykjavik.' },
  { country: 'Brazil', flag: '🇧🇷', destination: 'Rio de Janeiro', destinationSlug: 'rio-de-janeiro', clues: ['This country is home to the largest rainforest on Earth.', 'Portuguese, not Spanish, is its main language.', 'A giant statue overlooks one of its most famous cities.'], revealFact: 'That statue is Christ the Redeemer, above Rio de Janeiro.' },
  { country: 'Morocco', flag: '🇲🇦', destination: 'Marrakech', destinationSlug: 'marrakech', clues: ['This country has coastlines on both the Atlantic and the Mediterranean.', 'Its markets, called souks, are famous for spices and rugs.', 'It is separated from Europe by a narrow strait.'], revealFact: 'That strait is the Strait of Gibraltar.' },
  { country: 'Thailand', flag: '🇹🇭', destination: 'Bangkok', destinationSlug: 'bangkok', clues: ['This country’s flag has five horizontal stripes.', 'It was never colonized by a European power.', 'Its former name was Siam.'], revealFact: 'Its capital, Bangkok, has one of the longest official city names in the world.' },
  { country: 'Peru', flag: '🇵🇪', destination: 'Lima', destinationSlug: 'lima', clues: ['This country is home to a famous “lost city” high in the mountains.', 'Llamas and alpacas are commonly raised here.', 'It was once the center of a great empire.'], revealFact: 'That lost city is Machu Picchu, built by the Inca.' },
  { country: 'New Zealand', flag: '🇳🇿', destination: 'Queenstown', destinationSlug: 'queenstown', clues: ['This country was one of the last large landmasses settled by humans.', 'It has far more sheep than people.', 'Its indigenous Māori name means “land of the long white cloud.”'], revealFact: 'That Māori name is Aotearoa.' }
];

// New format: "3 Fun Facts About [Country]".
const threeFunFacts = [
  { country: 'Spain', flag: '🇪🇸', destination: 'Barcelona', destinationSlug: 'barcelona', facts: ['Spain has two cities located in Africa: Ceuta and Melilla.', 'The midday siesta tradition began partly because of hot afternoon temperatures.', 'Flamenco music and dance originated in the Andalusia region.'] },
  { country: 'Netherlands', flag: '🇳🇱', destination: 'Amsterdam', destinationSlug: 'amsterdam', facts: ['The Netherlands is famous for having more bicycles than people.', 'About a quarter of the country’s land sits below sea level.', 'Painters like Rembrandt and Vermeer shaped Western art history here.'] },
  { country: 'Germany', flag: '🇩🇪', destination: 'Berlin', destinationSlug: 'berlin', facts: ['Germany has well over a thousand different types of sausage.', 'The Brothers Grimm collected many famous fairy tales from German folklore.', 'Berlin’s zoo is one of the most visited in the world.'] },
  { country: 'Türkiye', flag: '🇹🇷', destination: 'Istanbul', destinationSlug: 'istanbul', facts: ['Istanbul is the only major city in the world located on two continents.', 'Türkiye is home to Cappadocia, famous for its cone-shaped rock formations.', 'Tulips originally came from Central Asia before becoming a Turkish icon.'] },
  { country: 'India', flag: '🇮🇳', destination: 'Jaipur', destinationSlug: 'jaipur', facts: ['Jaipur is called the “Pink City” because many buildings are painted terracotta pink.', 'India recognizes 22 official languages.', 'Chess is believed to have originated in India.'] },
  { country: 'South Korea', flag: '🇰🇷', destination: 'Seoul', destinationSlug: 'seoul', facts: ['Seoul’s subway is one of the longest metro systems in the world.', 'Korean has its own alphabet, called Hangul, created in the 1440s.', 'Kimchi comes in hundreds of regional varieties across Korea.'] },
  { country: 'Vietnam', flag: '🇻🇳', destination: 'Hanoi', destinationSlug: 'hanoi', facts: ['Vietnam is one of the world’s largest exporters of coffee.', 'Hanoi has over a thousand years of continuous history as a city.', 'Vietnamese cuisine uses fresh herbs in almost every dish.'] },
  { country: 'Canada', flag: '🇨🇦', destination: 'Vancouver', destinationSlug: 'vancouver', facts: ['Canada has more lakes than the rest of the world’s countries combined.', 'It shares the longest international border in the world with the USA.', 'Canada has two official languages: English and French.'] },
  { country: 'South Africa', flag: '🇿🇦', destination: 'Cape Town', destinationSlug: 'cape-town', facts: ['South Africa has three capital cities.', 'Table Mountain in Cape Town is one of the oldest mountains on Earth.', 'The country has 11 official languages.'] },
  { country: 'Kenya', flag: '🇰🇪', destination: 'Nairobi', destinationSlug: 'nairobi', facts: ['Nairobi is one of the few capital cities with a national park inside it.', 'The Great Rift Valley runs through Kenya.', 'Kenya is famous for producing many top long-distance runners.'] },
  { country: 'Croatia', flag: '🇭🇷', destination: 'Dubrovnik', destinationSlug: 'dubrovnik', facts: ['Dubrovnik’s Old Town walls remain almost entirely intact after centuries.', 'Croatia has over a thousand islands along its coast.', 'The necktie is believed to have originated with Croatian soldiers.'] },
  { country: 'Poland', flag: '🇵🇱', destination: 'Krakow', destinationSlug: 'krakow', facts: ['Krakow’s main square is one of the largest medieval town squares in Europe.', 'Poland is home to one of the world’s oldest salt mines, near Krakow.', 'A trumpet call from a Krakow church tower has played on the hour for centuries.'] }
];

// New format: "Spot It on Your Trip" — a family scavenger-hunt challenge.
const spotIt = [
  { country: 'Italy', flag: '🇮🇹', destination: 'Rome', destinationSlug: 'rome', spots: ['a fountain', 'a cat napping in a quiet corner', 'a street musician or performer'] },
  { country: 'Japan', flag: '🇯🇵', destination: 'Tokyo', destinationSlug: 'tokyo', spots: ['a vending machine', 'a shrine gate (torii)', 'a mascot character on a sign'] },
  { country: 'United States', flag: '🇺🇸', destination: 'New York', destinationSlug: 'new-york', spots: ['a yellow taxi', 'a street food cart', 'a mural or piece of street art'] },
  { country: 'Morocco', flag: '🇲🇦', destination: 'Marrakech', destinationSlug: 'marrakech', spots: ['a colorful spice stall', 'a mosaic tile pattern', 'a horse-drawn carriage'] },
  { country: 'Australia', flag: '🇦🇺', destination: 'Sydney', destinationSlug: 'sydney', spots: ['a ferry', 'a surfer', 'a native bird like a kookaburra'] },
  { country: 'Iceland', flag: '🇮🇸', destination: 'Reykjavik', destinationSlug: 'reykjavik', spots: ['a colorful rooftop', 'steam rising from the ground', 'a statue of an explorer'] },
  { country: 'Singapore', flag: '🇸🇬', destination: 'Singapore', destinationSlug: 'singapore', spots: ['a rooftop garden', 'a hawker food stall', 'a bright mural in a heritage district'] },
  { country: 'United Arab Emirates', flag: '🇦🇪', destination: 'Dubai', destinationSlug: 'dubai', spots: ['a very tall building', 'a traditional wooden dhow boat', 'a fountain show'] },
  { country: 'Czechia', flag: '🇨🇿', destination: 'Prague', destinationSlug: 'prague', spots: ['a puppet in a shop window', 'an old clock tower', 'a cobblestone street'] },
  { country: 'Thailand', flag: '🇹🇭', destination: 'Bangkok', destinationSlug: 'bangkok', spots: ['a tuk-tuk', 'a golden temple roof', 'a boat at a floating market'] }
];

// New format: "Which Would You Visit?" — an A-vs-B family poll.
const whichWouldYouVisit = [
  { a: { country: 'France', flag: '🇫🇷', destination: 'Paris', destinationSlug: 'paris', teaser: 'City of lights and art' }, b: { country: 'Japan', flag: '🇯🇵', destination: 'Tokyo', destinationSlug: 'tokyo', teaser: 'City of neon and tradition' } },
  { a: { country: 'Italy', flag: '🇮🇹', destination: 'Rome', destinationSlug: 'rome', teaser: 'Ancient Roman ruins' }, b: { country: 'Greece', flag: '🇬🇷', destination: 'Athens', destinationSlug: 'athens', teaser: 'Birthplace of the Olympics' } },
  { a: { country: 'United States', flag: '🇺🇸', destination: 'New York', destinationSlug: 'new-york', teaser: 'Skyscrapers and Broadway' }, b: { country: 'United Kingdom', flag: '🇬🇧', destination: 'London', destinationSlug: 'london', teaser: 'Castles and double-decker buses' } },
  { a: { country: 'Australia', flag: '🇦🇺', destination: 'Sydney', destinationSlug: 'sydney', teaser: 'Harbour and Opera House' }, b: { country: 'South Africa', flag: '🇿🇦', destination: 'Cape Town', destinationSlug: 'cape-town', teaser: 'Table Mountain and penguins' } },
  { a: { country: 'Indonesia', flag: '🇮🇩', destination: 'Bali', destinationSlug: 'bali', teaser: 'Jungle temples and rice terraces' }, b: { country: 'Greece', flag: '🇬🇷', destination: 'Santorini', destinationSlug: 'santorini', teaser: 'White villages and blue domes' } },
  { a: { country: 'Iceland', flag: '🇮🇸', destination: 'Reykjavik', destinationSlug: 'reykjavik', teaser: 'Northern lights and geysers' }, b: { country: 'New Zealand', flag: '🇳🇿', destination: 'Queenstown', destinationSlug: 'queenstown', teaser: 'Fjords and adventure sports' } },
  { a: { country: 'Morocco', flag: '🇲🇦', destination: 'Marrakech', destinationSlug: 'marrakech', teaser: 'Colorful souks' }, b: { country: 'Egypt', flag: '🇪🇬', destination: 'Cairo', destinationSlug: 'cairo', teaser: 'Ancient pyramids' } },
  { a: { country: 'Japan', flag: '🇯🇵', destination: 'Kyoto', destinationSlug: 'kyoto', teaser: 'Ancient temples and gardens' }, b: { country: 'South Korea', flag: '🇰🇷', destination: 'Seoul', destinationSlug: 'seoul', teaser: 'Palaces and modern culture' } },
  { a: { country: 'Brazil', flag: '🇧🇷', destination: 'Rio de Janeiro', destinationSlug: 'rio-de-janeiro', teaser: 'Beaches and Christ the Redeemer' }, b: { country: 'Argentina', flag: '🇦🇷', destination: 'Buenos Aires', destinationSlug: 'buenos-aires', teaser: 'Tango and grand avenues' } },
  { a: { country: 'Canada', flag: '🇨🇦', destination: 'Vancouver', destinationSlug: 'vancouver', teaser: 'Mountains meet the ocean' }, b: { country: 'Canada', flag: '🇨🇦', destination: 'Toronto', destinationSlug: 'toronto', teaser: 'Skyline and Niagara day trips' } }
];

const FORMATS = ['did-you-know', 'guess-the-country', 'three-fun-facts', 'spot-it', 'which-would-you-visit'];

function ctaLine(destinationSlug, destinationLabel) {
  return destinationSlug
    ? `See the free ${destinationLabel} guide: kidventuro.com/destinations/${destinationSlug}.html`
    : 'Kidventuro creates personalized printable adventures for children ages 4–12.';
}

export function selectDidYouKnowFormat(date = new Date()) {
  return FORMATS[dayNumber(date) % FORMATS.length];
}

function buildDidYouKnow(date) {
  const item = facts[dayNumber(date) % facts.length];
  const shortFact = truncate(item.fact, 118);
  return {
    theme: `Did you know? ${item.country}`,
    seed: { format: 'standard', country: item.country, destination: item.destination },
    visual: {
      instagramHeadline: `Did you know this about ${item.country}?`,
      instagramSubhead: shortFact,
      pinterestHeadline: `Did you know? ${item.country}`,
      pinterestSubhead: shortFact,
      slides: [
        { kicker: 'DID YOU KNOW?', headline: `${item.flag} ${item.country}`, body: 'A tiny travel fact for curious family explorers.' },
        { kicker: 'TRAVEL FACT', headline: item.fact, body: `A fun detail connected with ${item.destination}.` },
        { kicker: 'FAMILY CHALLENGE', headline: item.challenge, body: 'Turn the fact into a screen-free mini mission.' },
        { kicker: 'KIDVENTURO', headline: 'Learn. Notice. Explore.', body: 'Personalized printable travel adventures for children ages 4–12.' }
      ]
    },
    instagram: {
      caption: `Did you know? ${item.flag}\n\n${item.fact}\n\nFamily mini-mission: ${item.challenge}\n\n${ctaLine(item.destinationSlug, item.destination)}\n\n#DidYouKnow #FamilyTravel #TravelWithKids #KidsActivities #Kidventuro #${item.country.replaceAll(' ', '')}`,
      altText: `Kidventuro Did You Know card about ${item.country}: ${item.fact}`
    },
    pinterest: {
      title: `Did You Know? A Fun ${item.country} Fact for Kids`,
      description: `${item.fact} Try this family travel challenge: ${item.challenge} ${ctaLine(item.destinationSlug, item.destination)}`
    },
    tiktok: {
      caption: `Did you know this about ${item.country}? ${item.fact} Try it as a family challenge: ${item.challenge} #DidYouKnow #TravelWithKids #FamilyTravel #Kidventuro`
    }
  };
}

function buildGuessTheCountry(date) {
  const item = guessTheCountry[dayNumber(date) % guessTheCountry.length];
  const cta = ctaLine(item.destinationSlug, item.destination);
  return {
    theme: `Guess the Country: ${item.country}`,
    seed: { format: 'guess-the-country', country: item.country, destination: item.destination },
    visual: {
      instagramHeadline: 'Guess the Country',
      instagramSubhead: item.clues[0],
      pinterestHeadline: `Guess the Country: ${item.country}`,
      pinterestSubhead: item.clues[0],
      slides: [
        { kicker: 'CLUE 1', headline: item.clues[0], body: 'Comment your guess before the last slide!' },
        { kicker: 'CLUE 2', headline: item.clues[1], body: 'Still guessing? Keep watching.' },
        { kicker: 'CLUE 3', headline: item.clues[2], body: 'Last clue — lock in your answer!' },
        { kicker: 'THE ANSWER IS', headline: `${item.flag} ${item.country}`, body: item.revealFact }
      ]
    },
    instagram: {
      caption: `Guess the Country 🌍\n\n${item.clues.join('\n')}\n\nComment your guess before you scroll to the end!\n\nAnswer: ${item.flag} ${item.country}. ${item.revealFact}\n\n${cta}\n\n#GuessTheCountry #FamilyTravel #TravelWithKids #Kidventuro #${item.country.replaceAll(' ', '')}`,
      altText: `Guess the country game revealing ${item.country}: ${item.revealFact}`
    },
    pinterest: {
      title: `Guess the Country: Is It ${item.country}?`,
      description: `Three clues, one reveal. ${item.revealFact} ${cta}`
    },
    tiktok: {
      caption: `Guess the country from 3 clues! ${item.clues.join(' ')} Comment your guess before the reveal! Answer: ${item.country}. #GuessTheCountry #TravelWithKids #Kidventuro`
    }
  };
}

function buildThreeFunFacts(date) {
  const item = threeFunFacts[dayNumber(date) % threeFunFacts.length];
  const cta = ctaLine(item.destinationSlug, item.destination);
  return {
    theme: `3 Fun Facts About ${item.country}`,
    seed: { format: 'standard', country: item.country, destination: item.destination },
    visual: {
      instagramHeadline: `3 Fun Facts About ${item.country}`,
      instagramSubhead: item.facts[0],
      pinterestHeadline: `3 Fun Facts About ${item.country}`,
      pinterestSubhead: item.facts[0],
      slides: [
        { kicker: '3 FUN FACTS', headline: `${item.flag} ${item.country}`, body: 'Curious facts for young explorers.' },
        { kicker: 'FACT 1', headline: item.facts[0], body: 'Fun to share at the dinner table.' },
        { kicker: 'FACT 2', headline: item.facts[1], body: 'Did you already know this one?' },
        { kicker: 'FACT 3', headline: item.facts[2], body: cta }
      ]
    },
    instagram: {
      caption: `3 Fun Facts About ${item.flag} ${item.country}\n\n1. ${item.facts[0]}\n2. ${item.facts[1]}\n3. ${item.facts[2]}\n\n${cta}\n\n#FunFacts #FamilyTravel #TravelWithKids #Kidventuro #${item.country.replaceAll(' ', '')}`,
      altText: `Three fun facts about ${item.country} for kids`
    },
    pinterest: {
      title: `3 Fun Facts About ${item.country} for Kids`,
      description: `${item.facts.join(' ')} ${cta}`
    },
    tiktok: {
      caption: `3 fun facts about ${item.country}! ${item.facts.join(' ')} #FunFacts #TravelWithKids #Kidventuro`
    }
  };
}

function buildSpotIt(date) {
  const item = spotIt[dayNumber(date) % spotIt.length];
  const cta = ctaLine(item.destinationSlug, item.destination);
  return {
    theme: `Spot It on Your Trip: ${item.destination}`,
    seed: { format: 'standard', country: item.country, destination: item.destination },
    visual: {
      instagramHeadline: `Spot It in ${item.destination}`,
      instagramSubhead: `Can you find ${item.spots[0]}?`,
      pinterestHeadline: `Spot It on Your Trip: ${item.destination}`,
      pinterestSubhead: `A family scavenger hunt for ${item.destination}`,
      slides: [
        { kicker: 'SPOT IT CHALLENGE', headline: `${item.flag} ${item.destination}`, body: 'A screen-free scavenger hunt for the whole family.' },
        { kicker: 'FIND IT', headline: `Spot ${item.spots[0]}`, body: 'First one to see it wins a point!' },
        { kicker: 'FIND IT', headline: `Spot ${item.spots[1]}`, body: 'Keep your eyes open.' },
        { kicker: 'FIND IT', headline: `Spot ${item.spots[2]}`, body: cta }
      ]
    },
    instagram: {
      caption: `Spot It on Your Trip: ${item.flag} ${item.destination}\n\nCan your family find:\n• ${item.spots[0]}\n• ${item.spots[1]}\n• ${item.spots[2]}\n\n${cta}\n\n#ScavengerHunt #FamilyTravel #TravelWithKids #Kidventuro #${item.destination.replaceAll(' ', '')}`,
      altText: `Spot it scavenger hunt for ${item.destination}: ${item.spots.join(', ')}`
    },
    pinterest: {
      title: `Spot It on Your Trip: ${item.destination} Scavenger Hunt`,
      description: `Screen-free family scavenger hunt: can you spot ${item.spots.join(', ')}? ${cta}`
    },
    tiktok: {
      caption: `Family scavenger hunt in ${item.destination}! Can you spot ${item.spots.join(', ')}? #ScavengerHunt #TravelWithKids #Kidventuro`
    }
  };
}

function buildWhichWouldYouVisit(date) {
  const pair = whichWouldYouVisit[dayNumber(date) % whichWouldYouVisit.length];
  const { a, b } = pair;
  const ctaA = ctaLine(a.destinationSlug, a.destination);
  const ctaB = ctaLine(b.destinationSlug, b.destination);
  return {
    theme: `Which Would You Visit? ${a.destination} vs ${b.destination}`,
    seed: { format: 'which-would-you-visit', country: a.country, destination: a.destination },
    visual: {
      instagramHeadline: 'Which Would You Visit?',
      instagramSubhead: `${a.destination} or ${b.destination}?`,
      pinterestHeadline: `Which Would You Visit? ${a.destination} vs ${b.destination}`,
      pinterestSubhead: `${a.teaser} vs ${b.teaser}`,
      slides: [
        { kicker: 'WHICH WOULD YOU VISIT?', headline: `${a.flag} ${a.destination} or ${b.flag} ${b.destination}?`, body: 'Comment A or B!' },
        { kicker: 'OPTION A', headline: `${a.flag} ${a.destination}`, body: a.teaser },
        { kicker: 'OPTION B', headline: `${b.flag} ${b.destination}`, body: b.teaser },
        { kicker: 'YOUR PICK?', headline: 'Comment A or B below!', body: 'Kidventuro has printable adventures for both.' }
      ]
    },
    instagram: {
      caption: `Which Would You Visit? 🌍\n\nA) ${a.flag} ${a.destination} — ${a.teaser}\nB) ${b.flag} ${b.destination} — ${b.teaser}\n\nComment A or B!\n\n${ctaA}\n${ctaB}\n\n#WhichWouldYouVisit #FamilyTravel #TravelWithKids #Kidventuro`,
      altText: `Which would you visit: ${a.destination} or ${b.destination}?`
    },
    pinterest: {
      title: `Which Would You Visit? ${a.destination} vs ${b.destination}`,
      description: `A) ${a.destination} — ${a.teaser}. B) ${b.destination} — ${b.teaser}. ${ctaA} ${ctaB}`
    },
    tiktok: {
      caption: `Which would you visit — ${a.destination} or ${b.destination}? A) ${a.teaser} B) ${b.teaser} Comment A or B! #WhichWouldYouVisit #TravelWithKids #Kidventuro`
    }
  };
}

const BUILDERS = {
  'did-you-know': buildDidYouKnow,
  'guess-the-country': buildGuessTheCountry,
  'three-fun-facts': buildThreeFunFacts,
  'spot-it': buildSpotIt,
  'which-would-you-visit': buildWhichWouldYouVisit
};

export function generateDidYouKnowContent({ date = new Date() } = {}) {
  const format = selectDidYouKnowFormat(date);
  const content = BUILDERS[format](date);
  return { generator: 'curated-did-you-know', ...content };
}

export { facts as didYouKnowFacts, guessTheCountry, threeFunFacts, spotIt, whichWouldYouVisit };
