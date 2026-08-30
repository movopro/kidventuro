import { dayNumber, truncate } from './utils.mjs';

const facts = [
  { country: 'Italy', flag: '🇮🇹', destination: 'Venice', fact: 'Venice is built across 118 small islands linked by bridges and canals.', challenge: 'How many bridges can your family spot in 10 minutes?' },
  { country: 'France', flag: '🇫🇷', destination: 'Paris', fact: 'Mainland France is often nicknamed “L’Hexagone” because its outline has six broad sides.', challenge: 'Can the kids find six different shapes during your walk?' },
  { country: 'United Kingdom', flag: '🇬🇧', destination: 'London', fact: 'Big Ben is actually the nickname of the Great Bell inside the Elizabeth Tower.', challenge: 'Spot three different clocks or towers nearby.' },
  { country: 'Spain', flag: '🇪🇸', destination: 'Barcelona', fact: 'Barcelona’s famous Sagrada Família has been under construction since the 19th century.', challenge: 'Look for three unusual shapes on a building facade.' },
  { country: 'Portugal', flag: '🇵🇹', destination: 'Lisbon', fact: 'Decorative ceramic tiles called azulejos are a famous part of Portuguese architecture.', challenge: 'Find a tile pattern and describe its colours.' },
  { country: 'Netherlands', flag: '🇳🇱', destination: 'Amsterdam', fact: 'Amsterdam is famous for a dense network of canals that shape the historic city centre.', challenge: 'Count bicycles while crossing one canal bridge.' },
  { country: 'Austria', flag: '🇦🇹', destination: 'Vienna', fact: 'Vienna has a long musical history connected with composers such as Mozart, Beethoven and Schubert.', challenge: 'Listen for three different city sounds and make a rhythm from them.' },
  { country: 'Czechia', flag: '🇨🇿', destination: 'Prague', fact: 'Prague’s astronomical clock dates back to 1410 and is one of the oldest still operating.', challenge: 'Find a clock and guess how old it might be.' },
  { country: 'Germany', flag: '🇩🇪', destination: 'Berlin', fact: 'Berlin’s pedestrian traffic lights are famous for the little Ampelmännchen figure.', challenge: 'How many different street symbols can the kids spot?' },
  { country: 'Greece', flag: '🇬🇷', destination: 'Athens', fact: 'The Parthenon on the Acropolis was built in the 5th century BCE.', challenge: 'Look for columns and count how many you can see.' },
  { country: 'Türkiye', flag: '🇹🇷', destination: 'Istanbul', fact: 'Istanbul stretches across both Europe and Asia, divided by the Bosphorus strait.', challenge: 'On a ferry ride, ask the kids which continent they think is on each side.' },
  { country: 'Japan', flag: '🇯🇵', destination: 'Tokyo', fact: 'Japan’s first Shinkansen bullet train service opened in 1964 between Tokyo and Osaka.', challenge: 'Spot three different train signs or symbols.' },
  { country: 'United Arab Emirates', flag: '🇦🇪', destination: 'Dubai', fact: 'Dubai grew around a natural saltwater creek that was historically important for trade.', challenge: 'Look for three ways people move across or beside the water.' },
  { country: 'Singapore', flag: '🇸🇬', destination: 'Singapore', fact: 'Singapore is both a city and a sovereign country.', challenge: 'Find three clues that show how nature and city life mix together.' },
  { country: 'Australia', flag: '🇦🇺', destination: 'Sydney', fact: 'Sydney Harbour Bridge is nicknamed “the Coathanger” because of its arch shape.', challenge: 'Can the kids find another object or building with the same shape?' },
  { country: 'Denmark', flag: '🇩🇰', destination: 'Copenhagen', fact: 'Copenhagen’s colourful Nyhavn waterfront began as a commercial harbour in the 17th century.', challenge: 'Pick a favourite house colour and count how often it appears.' },
  { country: 'Hungary', flag: '🇭🇺', destination: 'Budapest', fact: 'Budapest was officially formed in 1873 by uniting Buda, Pest and Óbuda.', challenge: 'Cross a bridge and ask the kids to spot one difference between the two riverbanks.' },
  { country: 'Croatia', flag: '🇭🇷', destination: 'Dubrovnik', fact: 'Dubrovnik’s historic old town is surrounded by massive stone defensive walls.', challenge: 'Find three different shapes in the stonework.' },
  { country: 'Poland', flag: '🇵🇱', destination: 'Krakow', fact: 'Krakow’s Wawel Dragon legend is one of the city’s best-known stories.', challenge: 'Invent a 30-second dragon story inspired by something you see.' },
  { country: 'Bulgaria', flag: '🇧🇬', destination: 'Sofia', fact: 'The Cyrillic alphabet was developed in the medieval Bulgarian cultural world by followers of Cyril and Methodius.', challenge: 'Find five Cyrillic letters on signs and copy your favourite one.' },
  { country: 'South Korea', flag: '🇰🇷', destination: 'Seoul', fact: 'Hangul, the Korean writing system, was created in the 15th century during the reign of King Sejong.', challenge: 'Look for repeating Hangul shapes on shop signs.' },
  { country: 'Switzerland', flag: '🇨🇭', destination: 'Zurich', fact: 'Switzerland has four national languages: German, French, Italian and Romansh.', challenge: 'How many different languages can your family notice today?' },
  { country: 'Belgium', flag: '🇧🇪', destination: 'Brussels', fact: 'Brussels’ Atomium was built for the 1958 World’s Fair.', challenge: 'Count the spheres and look for another repeating geometric shape nearby.' },
  { country: 'Ireland', flag: '🇮🇪', destination: 'Dublin', fact: 'Dublin’s name comes from an old Irish term often translated as “black pool”.', challenge: 'Find three place names and wonder together what they might mean.' },
  { country: 'Sweden', flag: '🇸🇪', destination: 'Stockholm', fact: 'Central Stockholm spreads across 14 islands connected by bridges.', challenge: 'Count bridges, boats or islands during your walk.' },
  { country: 'Norway', flag: '🇳🇴', destination: 'Oslo', fact: 'The Nobel Peace Prize is awarded in Oslo, while the other Nobel Prizes are presented in Stockholm.', challenge: 'Ask the kids: what would you give a peace prize for?' },
  { country: 'Finland', flag: '🇫🇮', destination: 'Helsinki', fact: 'Suomenlinna is a sea fortress built across several islands just off Helsinki.', challenge: 'Draw a tiny fortress map with walls, water and one secret route.' },
  { country: 'Egypt', flag: '🇪🇬', destination: 'Cairo', fact: 'The Great Pyramid of Giza is the only surviving monument of the Seven Wonders of the Ancient World.', challenge: 'Find three triangle or pyramid shapes around you.' },
  { country: 'Mexico', flag: '🇲🇽', destination: 'Mexico City', fact: 'Mexico City was built on and around the site of the Aztec capital Tenochtitlan.', challenge: 'Look for one old-looking detail and one modern detail on the same street.' },
  { country: 'Canada', flag: '🇨🇦', destination: 'Toronto', fact: 'Canada has the longest coastline of any country in the world.', challenge: 'Name as many things as you can that you might find on a coastline.' }
];

export function selectDidYouKnowFact(date = new Date()) {
  return facts[dayNumber(date) % facts.length];
}

export function generateDidYouKnowContent({ date = new Date() } = {}) {
  const item = selectDidYouKnowFact(date);
  const shortFact = truncate(item.fact, 118);
  return {
    generator: 'curated-did-you-know',
    theme: `Did you know? ${item.country}`,
    seed: { country: item.country, destination: item.destination },
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
      caption: `Did you know? ${item.flag}\n\n${item.fact}\n\nFamily mini-mission: ${item.challenge}\n\nKidventuro turns destinations into screen-free printable adventures for children ages 4–12.\n\n#DidYouKnow #FamilyTravel #TravelWithKids #KidsActivities #Kidventuro #${item.country.replaceAll(' ', '')}`,
      altText: `Kidventuro Did You Know card about ${item.country}: ${item.fact}`
    },
    pinterest: {
      title: `Did You Know? A Fun ${item.country} Fact for Kids`,
      description: `${item.fact} Try this family travel challenge: ${item.challenge} Kidventuro creates printable destination activities for children ages 4–12.`
    },
    tiktok: {
      caption: `Did you know this about ${item.country}? ${item.fact} Try it as a family challenge: ${item.challenge} #DidYouKnow #TravelWithKids #FamilyTravel #Kidventuro`
    }
  };
}

export { facts as didYouKnowFacts };
