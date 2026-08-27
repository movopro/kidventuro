import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(root, 'destinations', 'destination-data.js'), 'utf8');
const match = source.match(/^window\.KIDVENTURO_DESTINATION_SEO=(\{.*\});\s*$/s);

if (!match) throw new Error('Could not parse destinations/destination-data.js');

const destinations = JSON.parse(match[1]);
const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const sentenceList = value => value.replaceAll(' • ', ', ').toLowerCase();
const jsonLd = value => JSON.stringify(value).replaceAll('<', '\\u003c');

function page({ slug, data, language }) {
  const isSpanish = language === 'es';
  const city = data.name;
  const traits = isSpanish ? data.es : data.en;
  const plainTraits = sentenceList(traits);
  const canonical = isSpanish
    ? `https://kidventuro.com/es/destinos/${slug}.html`
    : `https://kidventuro.com/destinations/${slug}.html`;
  const alternate = isSpanish
    ? `https://kidventuro.com/destinations/${slug}.html`
    : `https://kidventuro.com/es/destinos/${slug}.html`;
  const title = isSpanish
    ? `${city}: actividades de viaje para niños | Kidventuro`
    : `${city} travel activity book for kids | Kidventuro`;
  const description = isSpanish
    ? `Crea actividades imprimibles personalizadas para niños en ${city}, con ${plainTraits}, misiones, búsquedas y juegos para edades de 4 a 12 años.`
    : `Create personalized printable ${city} travel activities for kids ages 4–12, with ${plainTraits}, local missions, scavenger hunts and travel games.`;

  const copy = isSpanish ? {
    all: 'Todos los destinos',
    switchLanguage: 'English',
    kicker: `${city} con niños`,
    heading: `Actividades imprimibles para niños en ${city}`,
    lead: `Convierte ${plainTraits} en una aventura personalizada que anima a los niños a observar, descubrir y participar en el viaje.`,
    cta: `Crear una vista previa de ${city}`,
    journeyTitle: 'Para el trayecto',
    journeyText: 'Juegos tranquilos y páginas imprimibles para vuelos, trenes, coche y esperas en restaurantes.',
    placeTitle: `Para descubrir ${city}`,
    placeText: `Las actividades convierten ${plainTraits} en pistas, observaciones y pequeñas misiones para toda la familia.`,
    childTitle: 'Para cada niño',
    childText: 'Elige edad, intereses y duración para que la aventura resulte personal, clara y apropiada.',
    ideasTitle: `Ideas de actividades familiares en ${city}`,
    ideasText: `Kidventuro combina actividades para el trayecto con descubrimientos del destino. En ${city}, los niños reciben cosas concretas que buscar, comparar, dibujar y recordar, en lugar de limitarse a seguir a los adultos. Cada página está pensada para mantener la curiosidad sin depender de una pantalla.`,
    missionOne: `Reto de observación inspirado en ${data.missions[0]}`,
    missionTwo: `Búsqueda inspirada en ${data.missions[1]}`,
    bingo: 'Bingo de viaje y búsquedas visuales',
    journal: 'Dibujo, diario y páginas de recuerdos',
    facts: `Palabras locales, comida y curiosidades sobre ${city}`,
    optionsTitle: 'Opciones imprimibles',
    optionsText: `Mini cuesta €5.90 por 10 páginas, Adventure €9.90 por 25–28 páginas y Family €14.90 para hasta tres niños. El producto imprimible actual se genera en inglés. La web y estas guías están disponibles en español. Después del pago, el archivo se puede guardar como PDF e imprimir en casa.`,
    parentTitle: `Cómo usar la aventura en ${city}`,
    parentText: `Antes del viaje, deja que el niño mire la portada y elija una primera misión. Durante el trayecto, utiliza las páginas de juegos tranquilos. Al llegar a ${city}, abre las búsquedas y los retos de observación. Al final del día, las páginas de dibujo y diario convierten lo vivido en un recuerdo personal.`,
    breadcrumbHome: 'Inicio',
    breadcrumbDestinations: 'Destinos',
    privacy: 'Privacidad',
    terms: 'Términos',
    refunds: 'Reembolsos'
  } : {
    all: 'All destinations',
    switchLanguage: 'Español',
    kicker: `${city} with kids`,
    heading: `Printable ${city} travel activities for kids`,
    lead: `Turn ${plainTraits} into a personalized adventure that gives children a reason to look up, notice details and take part in the trip.`,
    cta: `Create a ${city} preview`,
    journeyTitle: 'Made for the journey',
    journeyText: 'Quiet travel games and printable pages help during flights, trains, drives and restaurant waits.',
    placeTitle: `Made for exploring ${city}`,
    placeText: `Activities turn ${plainTraits} into clues, observation games and small missions for the family.`,
    childTitle: 'Made for the child',
    childText: 'Choose age, interests and trip length so the adventure feels personal, clear and appropriate.',
    ideasTitle: `Family activity ideas for ${city}`,
    ideasText: `Kidventuro combines travel-time activities with destination discovery. In ${city}, children receive specific things to find, compare, draw and remember instead of simply following the adults. Each printable page is designed to keep curiosity active without relying on a screen.`,
    missionOne: data.missions[0],
    missionTwo: data.missions[1],
    bingo: 'Travel bingo and visual scavenger hunts',
    journal: 'Drawing, journal and memory pages',
    facts: `Local words, food and child-friendly facts about ${city}`,
    optionsTitle: 'Printable options',
    optionsText: `Mini is €5.90 for 10 pages, Adventure is €9.90 for 25–28 pages, and Family is €14.90 for up to three children. The current printable product is generated in English. After payment, the digital adventure can be saved as a PDF and printed at home.`,
    parentTitle: `How to use the adventure in ${city}`,
    parentText: `Before the trip, let the child explore the cover and choose a first mission. During the journey, use the quiet travel-game pages. Once you reach ${city}, open the scavenger hunts and observation challenges. At the end of the day, drawing and journal pages turn what happened into a personal travel memory.`,
    breadcrumbHome: 'Home',
    breadcrumbDestinations: 'Destinations',
    privacy: 'Privacy',
    terms: 'Terms',
    refunds: 'Refunds & delivery'
  };

  const homeHref = isSpanish ? '/es/' : '/';
  const hubHref = isSpanish ? '/es/destinos/' : '/destinations/';
  const ctaHref = isSpanish
    ? `/?lang=es&destination=${encodeURIComponent(city)}#create`
    : `/?destination=${encodeURIComponent(city)}#create`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        inLanguage: language,
        isPartOf: { '@type': 'WebSite', name: 'Kidventuro', url: 'https://kidventuro.com/' },
        breadcrumb: { '@id': `${canonical}#breadcrumb` }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: copy.breadcrumbHome, item: `https://kidventuro.com${homeHref}` },
          { '@type': 'ListItem', position: 2, name: copy.breadcrumbDestinations, item: `https://kidventuro.com${hubHref}` },
          { '@type': 'ListItem', position: 3, name: city, item: canonical }
        ]
      }
    ]
  };

  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="referrer" content="no-referrer">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en" href="https://kidventuro.com/destinations/${slug}.html">
  <link rel="alternate" hreflang="es" href="https://kidventuro.com/es/destinos/${slug}.html">
  <link rel="alternate" hreflang="x-default" href="https://kidventuro.com/destinations/${slug}.html">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Kidventuro">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary">
  <script type="application/ld+json">${jsonLd(structuredData)}</script>
  <link rel="stylesheet" href="/destinations/seo.css">
</head>
<body>
  <div class="seo-shell">
    <header class="seo-head">
      <a class="seo-brand" href="${homeHref}">Kidventuro</a>
      <a href="${hubHref}">${escapeHtml(copy.all)}</a>
      <a href="${alternate}">${escapeHtml(copy.switchLanguage)}</a>
    </header>
    <main>
      <nav aria-label="Breadcrumb"><a href="${homeHref}">${escapeHtml(copy.breadcrumbHome)}</a> · <a href="${hubHref}">${escapeHtml(copy.breadcrumbDestinations)}</a> · <span>${escapeHtml(city)}</span></nav>
      <section class="seo-hero">
        <div class="seo-kicker">${escapeHtml(copy.kicker)}</div>
        <h1>${escapeHtml(copy.heading)}</h1>
        <p class="seo-lead">${escapeHtml(copy.lead)}</p>
        <a class="seo-cta" href="${ctaHref}">${escapeHtml(copy.cta)}</a>
      </section>
      <section class="seo-grid">
        <article class="seo-card"><h2>${escapeHtml(copy.journeyTitle)}</h2><p>${escapeHtml(copy.journeyText)}</p></article>
        <article class="seo-card"><h2>${escapeHtml(copy.placeTitle)}</h2><p>${escapeHtml(copy.placeText)}</p></article>
        <article class="seo-card"><h2>${escapeHtml(copy.childTitle)}</h2><p>${escapeHtml(copy.childText)}</p></article>
      </section>
      <section class="seo-copy">
        <h2>${escapeHtml(copy.ideasTitle)}</h2>
        <p>${escapeHtml(copy.ideasText)}</p>
        <ul class="seo-list">
          <li>${escapeHtml(copy.missionOne)}</li>
          <li>${escapeHtml(copy.missionTwo)}</li>
          <li>${escapeHtml(copy.bingo)}</li>
          <li>${escapeHtml(copy.journal)}</li>
          <li>${escapeHtml(copy.facts)}</li>
        </ul>
        <h2>${escapeHtml(copy.optionsTitle)}</h2>
        <p>${escapeHtml(copy.optionsText)}</p>
        <h2>${escapeHtml(copy.parentTitle)}</h2>
        <p>${escapeHtml(copy.parentText)}</p>
      </section>
    </main>
    <footer class="seo-foot">© Kidventuro · <a href="/privacy.html">${escapeHtml(copy.privacy)}</a> · <a href="/terms.html">${escapeHtml(copy.terms)}</a> · <a href="/refunds.html">${escapeHtml(copy.refunds)}</a></footer>
  </div>
  <script src="/runtime-config.js"></script>
  <script src="/analytics.js"></script>
</body>
</html>
`;
}

await mkdir(path.join(root, 'destinations'), { recursive: true });
await mkdir(path.join(root, 'es', 'destinos'), { recursive: true });

for (const [slug, data] of Object.entries(destinations)) {
  await writeFile(path.join(root, 'destinations', `${slug}.html`), page({ slug, data, language: 'en' }));
  await writeFile(path.join(root, 'es', 'destinos', `${slug}.html`), page({ slug, data, language: 'es' }));
}

const lastmod = new Date().toISOString().slice(0, 10);
const urls = [
  'https://kidventuro.com/',
  'https://kidventuro.com/destinations/',
  ...Object.keys(destinations).map(slug => `https://kidventuro.com/destinations/${slug}.html`),
  'https://kidventuro.com/es/',
  'https://kidventuro.com/es/destinos/',
  ...Object.keys(destinations).map(slug => `https://kidventuro.com/es/destinos/${slug}.html`),
  'https://kidventuro.com/privacy.html',
  'https://kidventuro.com/terms.html',
  'https://kidventuro.com/refunds.html'
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${url}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(root, 'sitemap.xml'), sitemap);

console.log(`Generated ${Object.keys(destinations).length * 2} destination pages and ${urls.length} sitemap URLs.`);
