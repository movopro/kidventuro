// Builds the family destination guides from destinations/guides/*.json.
//
// One JSON file per destination is the single source of truth. This script writes, idempotently:
//   destinations/<slug>.html and es/destinos/<slug>.html   rich bilingual guide pages
//   assets/destinations/<slug>.svg                         the postcard illustration used on the page
//   catalog-7.js                                           booklet catalog entries (KV_CITY) and new phrase sets (KV_LANG)
//   site-expansion-3.js                                    adds the destinations to the order form and landing grid
//   worker/src/guide-destinations.js                       the Worker's allow-list extension (paid checkout)
//   destinations/guide-index.json                          slugs, names, regions and months for other pages
//   sitemap.xml, robots.txt, both hub pages                marked blocks between <!-- guides:start/end -->
//   destinations/destination-data.js                       SEO data entries for the social pipeline
// It runs after the legacy generator (npm run generate-seo) so its sitemap additions survive regeneration.
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://kidventuro.com';
// Content date for lastmod/dateModified. Bump it when guide content changes, so regeneration stays byte-identical.
const TODAY = '2026-10-10';
const guideDir = path.join(root, 'destinations', 'guides');

const esc = v => String(v ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const jsonLd = v => JSON.stringify(v).replaceAll('<', '\\u003c');
const read = p => readFile(path.join(root, p), 'utf8');
const write = async (p, s) => { await mkdir(path.dirname(path.join(root, p)), { recursive: true }); await writeFile(path.join(root, p), s, 'utf8'); };

const files = (await readdir(guideDir)).filter(f => f.endsWith('.json')).sort();
const guides = [];
for (const f of files) guides.push(JSON.parse(await readFile(path.join(guideDir, f), 'utf8')));
const regionOrder = { europe: 0, americas: 1, asia: 2 };
guides.sort((a, b) => regionOrder[a.region] - regionOrder[b.region] || a.name.localeCompare(b.name));
if (new Set(guides.map(g => g.slug)).size !== guides.length) throw new Error('Duplicate guide slug');

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
};
const monthRange = (months, lang) => {
  const sorted = [...months];
  return sorted.map(m => MONTHS[lang][m - 1]).map((m, i) => (i === 0 && lang === 'es') ? m[0].toUpperCase() + m.slice(1) : m).join(', ');
};
// First clause of the daily budget sentence, for the compact fact card (the full sentence is in the costs section).
const shortBudget = s => String(s).split(/;\s|\.\s|,\s(?=excl|sin |not |without)/)[0].replace(/\.$/, '');
const hash = s =>[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// ---------- Postcard illustration (consistent flat style, deterministic per slug) ----------
const PALETTES = {
  snow: ['#dfeaf3', '#b9cfe2', '#7f9cb8', '#f7fbff', '#2f5d50'],
  mountains: ['#fde9cf', '#bcd7c4', '#6f9a83', '#f4f1ea', '#35594a'],
  coast: ['#ffe6c9', '#9fd3d6', '#3f8f9b', '#f3d9a8', '#c8553d'],
  island: ['#ffe2bf', '#8fd0c8', '#2f8f8a', '#f2d29b', '#3d7a4a'],
  city: ['#fde3cc', '#f2b78f', '#c06b4a', '#fff4e6', '#5b4a63'],
  canals: ['#fbe4d1', '#a9cfd8', '#4f8ea0', '#f5ecdf', '#b5523b'],
  temple: ['#fde0c4', '#f0a986', '#b84a3a', '#fff1df', '#6b3f3a'],
  desert: ['#fde4bf', '#f2c48a', '#d18a4a', '#fff3dc', '#8a4b2a'],
  jungle: ['#e9f0d6', '#a9cf9a', '#4f8a5b', '#f7f3e3', '#2f5d3f'],
  lake: ['#e8eef6', '#b8d3e3', '#5f8fb0', '#f6f3ec', '#3e6a58']
};
function postcard(g) {
  const [sky, mid, deep, light, accent] = PALETTES[g.scene] || PALETTES.city;
  const r = rng(hash(g.slug));
  const W = 1200, H = 675, horizon = 470;
  const parts = [];
  const sunX = 180 + Math.round(r() * 840), sunY = 120 + Math.round(r() * 80);
  parts.push(`<circle cx="${sunX}" cy="${sunY}" r="${g.scene === 'snow' ? 46 : 58}" fill="${g.scene === 'snow' ? '#fff' : '#ffd27a'}" opacity=".95"/>`);
  const ridge = (base, amp, color, n) => {
    let d = `M0 ${H} L0 ${base}`;
    for (let i = 0; i <= n; i++) d += ` L${Math.round(i * W / n)} ${Math.round(base - amp * (0.35 + r() * 0.65))}`;
    return `<path d="${d} L${W} ${H} Z" fill="${color}"/>`;
  };
  const water = c => `<rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" fill="${c}"/>` +
    [0, 1, 2, 3].map(i => `<path d="M${80 + i * 270} ${horizon + 40 + i * 32} q30 -14 60 0 t60 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`).join('');
  const skyline = (base, color, count, maxH) => {
    let x = 60, out = '';
    for (let i = 0; i < count && x < W - 60; i++) {
      const w = 50 + Math.round(r() * 70), h = 80 + Math.round(r() * maxH);
      out += `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" rx="4" fill="${color}"/>`;
      for (let wy = base - h + 18; wy < base - 24; wy += 30) for (let wx = x + 12; wx < x + w - 14; wx += 22) if (r() > 0.35) out += `<rect x="${wx}" y="${wy}" width="9" height="13" fill="${light}" opacity=".85"/>`;
      if (r() > 0.7) out += `<path d="M${x} ${base - h} L${x + w / 2} ${base - h - 34} L${x + w} ${base - h} Z" fill="${color}"/>`;
      x += w + 10 + Math.round(r() * 26);
    }
    return out;
  };
  const tree = (x, y, s, c) => `<path d="M${x} ${y - 90 * s} L${x - 34 * s} ${y} L${x + 34 * s} ${y} Z" fill="${c}"/><rect x="${x - 5 * s}" y="${y}" width="${10 * s}" height="${16 * s}" fill="#6b4f3a"/>`;
  const palm = (x, y) => `<path d="M${x} ${y} q8 -70 -6 -130" stroke="#7a5a3a" stroke-width="10" fill="none"/>` +
    [-1, 1].flatMap(d => [0, 1]).map((_, i) => `<path d="M${x - 6} ${y - 130} q${[-70, 70, -50, 60][i]} ${[-10, -6, 30, 34][i]} ${[-110, 110, -90, 96][i]} ${[30, 36, 60, 70][i]}" stroke="${accent}" stroke-width="12" fill="none" stroke-linecap="round"/>`).join('');
  switch (g.scene) {
    case 'snow':
      parts.push(ridge(330, 170, mid, 6), ridge(400, 120, deep, 9));
      parts.push(`<rect x="0" y="${horizon - 20}" width="${W}" height="${H - horizon + 20}" fill="${light}"/>`);
      for (let i = 0; i < 9; i++) parts.push(tree(70 + i * 130 + r() * 40, horizon + 10 + r() * 30, 0.8 + r() * 0.5, accent));
      for (let i = 0; i < 40; i++) parts.push(`<circle cx="${Math.round(r() * W)}" cy="${Math.round(r() * horizon)}" r="${2 + Math.round(r() * 4)}" fill="#fff" opacity=".9"/>`);
      break;
    case 'mountains':
      parts.push(ridge(300, 200, mid, 5), ridge(380, 140, deep, 7));
      parts.push(`<path d="M0 ${horizon} q300 -40 600 0 t600 0 V${H} H0 Z" fill="${light}"/>`);
      for (let i = 0; i < 6; i++) parts.push(tree(100 + i * 190 + r() * 50, horizon + 40, 0.9, accent));
      break;
    case 'coast':
      parts.push(ridge(410, 120, mid, 8), water(deep));
      parts.push(`<path d="M${W - 360} ${horizon} q120 -150 360 -180 V${horizon} Z" fill="${light}"/>`);
      parts.push(`<path d="M300 ${horizon + 70} h120 l-20 26 h-80 Z" fill="${accent}"/><path d="M360 ${horizon + 68} V${horizon - 30} l50 80 Z" fill="#fff"/>`);
      break;
    case 'island':
      parts.push(water(deep));
      parts.push(`<ellipse cx="${W / 2}" cy="${horizon + 20}" rx="330" ry="70" fill="${light}"/>`);
      parts.push(`<path d="M${W / 2 - 220} ${horizon + 6} q220 -190 440 0 Z" fill="${mid}"/>`);
      parts.push(palm(W / 2 + 200, horizon + 10), palm(W / 2 - 240, horizon + 16));
      break;
    case 'canals':
      parts.push(water(mid));
      { let x = 40; while (x < W - 40) { const w = 70 + Math.round(r() * 40), h = 170 + Math.round(r() * 110); const c = [accent, deep, '#d9a441', '#7f6a93'][Math.floor(r() * 4)];
        parts.push(`<path d="M${x} ${horizon} V${horizon - h} l${w / 2} -46 l${w / 2} 46 V${horizon} Z" fill="${c}"/>`);
        for (let wy = horizon - h + 20; wy < horizon - 30; wy += 46) parts.push(`<rect x="${x + 14}" y="${wy}" width="${w - 28}" height="22" fill="${light}" opacity=".9"/>`);
        x += w + 6; } }
      parts.push(`<path d="M380 ${horizon + 80} q220 -110 440 0" stroke="${light}" stroke-width="26" fill="none"/>`);
      break;
    case 'temple':
      parts.push(ridge(390, 130, mid, 6));
      parts.push(`<rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" fill="${light}"/>`);
      { const cx = W / 2 + Math.round((r() - 0.5) * 300); for (let t = 0; t < 4; t++) { const w = 260 - t * 50, y = horizon - t * 70;
        parts.push(`<rect x="${cx - w / 2 + 20}" y="${y - 52}" width="${w - 40}" height="52" fill="${accent}"/><path d="M${cx - w / 2 - 20} ${y - 52} q${w / 2 + 20} -36 ${w + 40} 0 Z" fill="${deep}"/>`); }
        parts.push(`<rect x="${cx - 4}" y="${horizon - 330}" width="8" height="60" fill="${deep}"/>`); }
      break;
    case 'desert':
      parts.push(`<path d="M0 ${horizon - 30} q300 -90 600 -10 t600 -20 V${H} H0 Z" fill="${mid}"/><path d="M0 ${horizon + 40} q400 -70 800 0 t400 -10 V${H} H0 Z" fill="${deep}"/>`);
      break;
    case 'jungle':
      parts.push(`<path d="M${W / 2 - 300} ${horizon} L${W / 2 - 40} ${180} h80 L${W / 2 + 300} ${horizon} Z" fill="${deep}"/><path d="M${W / 2 - 40} 180 q40 -60 80 0" fill="#9aa39a" opacity=".6"/>`);
      for (let i = 0; i < 14; i++) parts.push(`<ellipse cx="${Math.round(r() * W)}" cy="${horizon + 20 + Math.round(r() * 120)}" rx="${90 + Math.round(r() * 80)}" ry="${50 + Math.round(r() * 30)}" fill="${[mid, accent, '#6fae6a'][i % 3]}"/>`);
      break;
    case 'lake':
      parts.push(ridge(360, 150, mid, 6), water(deep));
      parts.push(`<path d="M520 ${horizon + 90} h140 l-24 26 h-92 Z" fill="${accent}"/>`);
      break;
    default: // city
      parts.push(skyline(horizon, mid, 16, 160), skyline(horizon + 10, deep, 14, 120));
      parts.push(`<rect x="0" y="${horizon + 10}" width="${W}" height="${H - horizon}" fill="${light}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t"><title id="t">${esc(g.name)} illustration</title>` +
    `<rect width="${W}" height="${H}" fill="${sky}"/>${parts.join('')}` +
    `<rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="26" fill="none" stroke="#fff" stroke-width="10" stroke-dasharray="2 18" stroke-linecap="round"/></svg>\n`;
}

// ---------- Guide pages ----------
const UI = {
  en: {
    lang: 'en', home: 'Home', hub: 'Destinations', all: 'All destinations', switchLabel: 'Español', hubHref: '/destinations/', homeHref: '/',
    title: g => `${g.name} with kids: family guide and printable activities | Kidventuro`,
    desc: g => `${g.name} with kids aged 4–12: best ages, stroller tips, must-dos, rainy-day ideas, safety and real costs, plus a personalized printable ${g.name} activity book.`,
    kicker: g => `${g.name} with kids`, h1: g => `${g.name} family guide`,
    cta: g => `Create a ${g.name} activity book`, ctaHref: g => `/?destination=${encodeURIComponent(g.name)}#create`,
    quick: 'At a glance', bestAges: 'Best ages', stroller: 'Stroller', bestMonths: 'Best months', daily: 'Daily budget',
    ratings: { easy: 'Easy', mixed: 'Mixed', hard: 'Hard' },
    mustDos: g => `Top things to do in ${g.name} with kids`, rainy: 'Rainy-day and cold-day options', firstDay: 'A simple first day',
    morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', around: 'Getting around', food: 'Food kids like',
    costs: g => `What ${g.name} costs for a family`, costNote: 'Prices are typical ranges checked for 2025–2026; confirm current prices before you book.',
    item: 'Item', price: 'Typical price', safety: 'Safety notes', agesLabel: 'Ages',
    book: g => `What's inside the ${g.name} activity book`,
    bookText: g => `A personalized printable book for one child (or up to three with Family), built around ${g.name}: landmark spotting, a 12-item scavenger hunt, a local food tasting page, ${g.phrasesLangName || 'local'} phrases and a quiz. Print it at home before you leave and bring a pencil.`,
    landmarks: 'Landmarks to find', foods: 'Foods to spot or taste', phrases: 'Words to try', missions: 'Missions',
    pricing: 'Mini €5.90 (10 pages), Adventure €9.90 (25–28 pages) or Family €14.90 (up to three children). One-time purchase, no subscription; the book is printed at home in English.',
    faq: 'Questions parents ask',
    q1: g => `Is ${g.name} good for young children?`, q2: g => `Can you use a stroller in ${g.name}?`, q3: g => `How much does a family day in ${g.name} cost?`, q4: g => `When is the best time to visit ${g.name} with kids?`,
    related: 'More family destinations', packing: 'Packing for this trip? Use the age-smart packing list', packingHref: '/packing-list.html',
    month: 'Best destinations for kids this month', monthHref: '/best-family-destinations-this-month.html',
    journal: 'Print a travel journal for the trip', journalHref: '/travel-journal.html',
    privacy: 'Privacy', terms: 'Terms', refunds: 'Refunds & delivery', crumbs: 'Breadcrumb', figAlt: g => `Illustrated postcard of ${g.name}`
  },
  es: {
    lang: 'es', home: 'Inicio', hub: 'Destinos', all: 'Todos los destinos', switchLabel: 'English', hubHref: '/es/destinos/', homeHref: '/es/',
    title: g => `${g.nameEs} con niños: guía familiar y actividades imprimibles | Kidventuro`,
    desc: g => `${g.nameEs} con niños de 4 a 12 años: mejores edades, carrito, imprescindibles, planes para días de lluvia, seguridad y costes reales, más un cuaderno imprimible personalizado.`,
    kicker: g => `${g.nameEs} con niños`, h1: g => `Guía familiar de ${g.nameEs}`,
    cta: g => `Crear un cuaderno de ${g.nameEs}`, ctaHref: g => `/?lang=es&destination=${encodeURIComponent(g.name)}#create`,
    quick: 'De un vistazo', bestAges: 'Mejores edades', stroller: 'Carrito', bestMonths: 'Mejores meses', daily: 'Presupuesto diario',
    ratings: { easy: 'Fácil', mixed: 'Variable', hard: 'Difícil' },
    mustDos: g => `Qué hacer en ${g.nameEs} con niños`, rainy: 'Planes para días de lluvia o frío', firstDay: 'Un primer día sencillo',
    morning: 'Mañana', afternoon: 'Tarde', evening: 'Noche', around: 'Cómo moverse', food: 'Comida que gusta a los niños',
    costs: g => `Cuánto cuesta ${g.nameEs} en familia`, costNote: 'Precios orientativos revisados para 2025–2026; confírmalos antes de reservar.',
    item: 'Concepto', price: 'Precio habitual', safety: 'Seguridad', agesLabel: 'Edades',
    book: g => `Qué incluye el cuaderno de ${g.nameEs}`,
    bookText: g => `Un cuaderno imprimible personalizado para un niño (o hasta tres con Family), centrado en ${g.nameEs}: monumentos que encontrar, una búsqueda de 12 objetos, una página de comida local, palabras en el idioma local y un cuestionario. Se imprime en casa antes de salir; el cuaderno está en inglés.`,
    landmarks: 'Lugares para encontrar', foods: 'Comidas para descubrir', phrases: 'Palabras para practicar', missions: 'Misiones',
    pricing: 'Mini €5.90 (10 páginas), Adventure €9.90 (25–28 páginas) o Family €14.90 (hasta tres niños). Pago único, sin suscripción; el cuaderno se imprime en casa y está en inglés.',
    faq: 'Preguntas frecuentes de padres',
    q1: g => `¿Es ${g.nameEs} un buen destino para niños pequeños?`, q2: g => `¿Se puede usar carrito en ${g.nameEs}?`, q3: g => `¿Cuánto cuesta un día en familia en ${g.nameEs}?`, q4: g => `¿Cuál es la mejor época para visitar ${g.nameEs} con niños?`,
    related: 'Más destinos para familias', packing: '¿Preparando la maleta? Usa la lista de equipaje por edades', packingHref: '/es/lista-de-equipaje.html',
    month: 'Mejores destinos para niños este mes', monthHref: '/es/mejores-destinos-familiares-este-mes.html',
    journal: 'Imprime un diario para el viaje', journalHref: '/es/diario-de-viaje.html',
    privacy: 'Privacidad', terms: 'Términos', refunds: 'Reembolsos', crumbs: 'Ruta de navegación', figAlt: g => `Postal ilustrada de ${g.nameEs}`
  }
};
const urlFor = (g, lang) => lang === 'es' ? `${SITE}/es/destinos/${g.slug}.html` : `${SITE}/destinations/${g.slug}.html`;

function related(g, lang) {
  const same = guides.filter(o => o.slug !== g.slug && o.region === g.region);
  const shared = guides.filter(o => o.slug !== g.slug && o.region !== g.region && o.seasons.some(s => g.seasons.includes(s)));
  const pick = [...same.sort((a, b) => hash(g.slug + a.slug) - hash(g.slug + b.slug)).slice(0, 3), ...shared.sort((a, b) => hash(g.slug + a.slug) - hash(g.slug + b.slug)).slice(0, 1)];
  return pick.map(o => `<a class="seo-dest" href="${lang === 'es' ? '/es/destinos/' : '/destinations/'}${o.slug}.html"><b>${esc(lang === 'es' ? o.nameEs : o.name)}</b>${esc(o[lang].tagline)}</a>`).join('');
}

function guidePage(g, lang) {
  const t = UI[lang], c = g[lang], other = lang === 'es' ? 'en' : 'es';
  const canonical = urlFor(g, lang), alt = urlFor(g, other);
  const title = t.title(g), description = t.desc(g);
  const name = lang === 'es' ? g.nameEs : g.name;
  const faq = [
    [t.q1(g), `${c.ages.text}`],
    [t.q2(g), `${c.stroller.text}`],
    [t.q3(g), `${c.costs.daily} ${c.costs.tip}`],
    [t.q4(g), `${t.bestMonths}: ${monthRange(g.bestMonths, lang)}.`]
  ];
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical, name: title, description, inLanguage: lang, dateModified: TODAY,
        isPartOf: { '@type': 'WebSite', name: 'Kidventuro', url: `${SITE}/` }, breadcrumb: { '@id': `${canonical}#breadcrumb` },
        primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE}/assets/destinations/${g.slug}.svg` }, about: { '@id': `${canonical}#destination` } },
      { '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`, itemListElement: [
        { '@type': 'ListItem', position: 1, name: t.home, item: `${SITE}${t.homeHref}` },
        { '@type': 'ListItem', position: 2, name: t.hub, item: `${SITE}${t.hubHref}` },
        { '@type': 'ListItem', position: 3, name, item: canonical }] },
      { '@type': 'TouristDestination', '@id': `${canonical}#destination`, name, description: c.intro, touristType: lang === 'es' ? 'Familias con niños' : 'Families with children',
        containedInPlace: { '@type': 'Country', name: lang === 'es' ? g.countryEs : g.country },
        includesAttraction: c.mustDos.map(m => ({ '@type': 'TouristAttraction', name: m.title })) },
      { '@type': 'FAQPage', '@id': `${canonical}#faq`, mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
    ]
  };
  const phrases = g.phrases.map(([w, m]) => `<li><b>${esc(w)}</b> <span>${esc(m)}</span></li>`).join('');
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="referrer" content="no-referrer">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en" href="${urlFor(g, 'en')}">
  <link rel="alternate" hreflang="es" href="${urlFor(g, 'es')}">
  <link rel="alternate" hreflang="x-default" href="${urlFor(g, 'en')}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Kidventuro">
  <meta property="og:locale" content="${lang === 'es' ? 'es_ES' : 'en_GB'}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${SITE}/assets/og-kidventuro.png">
  <meta property="og:image:alt" content="Kidventuro printable travel adventures for kids">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${SITE}/assets/og-kidventuro.png">
  <script type="application/ld+json">${jsonLd(ld)}</script>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/destinations/seo.css">
  <link rel="stylesheet" href="/destinations/guide.css?v=${TODAY}">
</head>
<body class="guide">
  <div class="seo-shell">
    <header class="seo-head">
      <a class="seo-brand" href="${t.homeHref}">Kidventuro</a>
      <a href="${t.hubHref}">${t.all}</a>
      <a href="${alt}" hreflang="${other}" lang="${other}">${t.switchLabel}</a>
    </header>
    <main>
      <nav class="crumbs" aria-label="${t.crumbs}"><a href="${t.homeHref}">${t.home}</a> · <a href="${t.hubHref}">${t.hub}</a> · <span>${esc(name)}</span></nav>
      <section class="guide-hero">
        <div>
          <div class="seo-kicker">${g.flag} ${esc(t.kicker(g))} · ${esc(lang === 'es' ? g.countryEs : g.country)}</div>
          <h1>${esc(t.h1(g))}</h1>
          <p class="seo-lead">${esc(c.intro)}</p>
          <a class="seo-cta" href="${t.ctaHref(g)}">${esc(t.cta(g))}</a>
        </div>
        <figure class="guide-art"><img src="/assets/destinations/${g.slug}.svg" width="1200" height="675" alt="${esc(t.figAlt(g))}" fetchpriority="high"></figure>
      </section>
      <section class="guide-facts" aria-label="${t.quick}">
        <div><span>${t.bestAges}</span><b>${esc(c.ages.best)}</b></div>
        <div><span>${t.stroller}</span><b class="rate-${c.stroller.rating}">${t.ratings[c.stroller.rating]}</b></div>
        <div><span>${t.bestMonths}</span><b>${esc(monthRange(g.bestMonths, lang))}</b></div>
        <div><span>${t.daily}</span><b>${esc(shortBudget(c.costs.daily))}</b></div>
      </section>
      <section class="guide-two">
        <div><h2>${t.bestAges}</h2><p>${esc(c.ages.text)}</p></div>
        <div><h2>${t.stroller}</h2><p>${esc(c.stroller.text)}</p></div>
      </section>
      <section class="seo-copy guide-wide">
        <h2>${esc(t.mustDos(g))}</h2>
        <ol class="guide-list">${c.mustDos.map(m => `<li><h3>${esc(m.title)} <small>${t.agesLabel} ${esc(m.ages)}</small></h3><p>${esc(m.text)}</p></li>`).join('')}</ol>
        <h2>${t.rainy}</h2>
        <ul class="guide-cards">${c.rainyDay.map(m => `<li><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p></li>`).join('')}</ul>
        <h2>${t.firstDay}</h2>
        <dl class="guide-day"><div><dt>${t.morning}</dt><dd>${esc(c.firstDay.morning)}</dd></div><div><dt>${t.afternoon}</dt><dd>${esc(c.firstDay.afternoon)}</dd></div><div><dt>${t.evening}</dt><dd>${esc(c.firstDay.evening)}</dd></div></dl>
        <h2>${t.around}</h2><p>${esc(c.gettingAround)}</p>
        <h2>${t.food}</h2><p>${esc(c.food)}</p>
        <h2>${esc(t.costs(g))}</h2>
        <p>${esc(c.costs.daily)}</p>
        <table class="guide-table"><thead><tr><th scope="col">${t.item}</th><th scope="col">${t.price}</th></tr></thead><tbody>${c.costs.items.map(i => `<tr><td>${esc(i.label)}</td><td>${esc(i.price)}</td></tr>`).join('')}</tbody></table>
        <p class="guide-note">${esc(c.costs.tip)} ${t.costNote}</p>
        <h2>${t.safety}</h2>
        <ul class="seo-list">${c.safety.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      </section>
      <section class="guide-book">
        <h2>${esc(t.book(g))}</h2>
        <p>${esc(t.bookText(g))}</p>
        <div class="guide-book-grid">
          <div><h3>${t.missions}</h3><ul>${(lang === 'es' ? g.missionsEs : g.booklet.missions).map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>
          <div><h3>${t.landmarks}</h3><ul>${g.booklet.marks.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>
          <div><h3>${t.foods}</h3><ul>${g.booklet.food.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>
          <div><h3>${t.phrases}</h3><ul class="guide-phrases">${phrases}</ul></div>
        </div>
        <p class="guide-price">${t.pricing}</p>
        <a class="seo-cta" href="${t.ctaHref(g)}">${esc(t.cta(g))}</a>
      </section>
      <section class="seo-faq">
        <h2>${t.faq}</h2>
        ${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n        ')}
      </section>
      <section>
        <h2>${t.related}</h2>
        <div class="seo-dests">${related(g, lang)}</div>
        <p class="guide-links"><a href="${t.packingHref}">${t.packing}</a> · <a href="${t.monthHref}">${t.month}</a> · <a href="${t.journalHref}">${t.journal}</a></p>
      </section>
    </main>
    <footer class="seo-foot">© Kidventuro · <a href="/privacy.html">${t.privacy}</a> · <a href="/terms.html">${t.terms}</a> · <a href="/refunds.html">${t.refunds}</a></footer>
  </div>
  <script src="/runtime-config.js"></script>
  <script src="/analytics.js"></script>
</body>
</html>
`;
}

// ---------- Marked-block helper ----------
function replaceBlock(text, start, end, body, anchorBefore) {
  const re = new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const block = `${start}${body}${end}`;
  if (re.test(text)) return text.replace(re, block);
  const i = text.lastIndexOf(anchorBefore);
  if (i < 0) throw new Error(`Anchor not found: ${anchorBefore.slice(0, 60)}`);
  return text.slice(0, i) + block + text.slice(i);
}

// ---------- Write everything ----------
for (const g of guides) {
  await write(`assets/destinations/${g.slug}.svg`, postcard(g));
  await write(`destinations/${g.slug}.html`, guidePage(g, 'en'));
  await write(`es/destinos/${g.slug}.html`, guidePage(g, 'es'));
}

// Booklet catalog. Keys are the English display names used by the order form and the Worker.
const existingLang = await read('catalog-core.js');
const newLangs = {};
for (const g of guides) if (!existingLang.includes(`"${g.lang}":[[`) && !newLangs[g.lang]) newLangs[g.lang] = g.phrases;
const city = Object.fromEntries(guides.map(g => [g.name, {
  flag: g.flag, country: g.country, icons: g.icons, lang: g.lang, marks: g.booklet.marks, food: g.booklet.food,
  facts: g.booklet.facts, hunt: g.booklet.hunt, quiz: g.booklet.quiz
}]));
await write('catalog-7.js', `// Generated by scripts/build-family-guides.mjs from destinations/guides/*.json. Do not edit by hand.\n` +
  `Object.assign(window.KV_LANG,${JSON.stringify(newLangs)});\nObject.assign(window.KV_CITY,${JSON.stringify(city)});\n`);

// Order form, landing grid and mission preview.
const rows = guides.map(g => [g.name, g.flag, g.en.tagline, g.es.tagline, g.booklet.missions, g.missionsEs, g.slug]);
await write('site-expansion-3.js', `// Generated by scripts/build-family-guides.mjs. Adds the family-guide destinations to the order form.
(()=>{
  const rows=${JSON.stringify(rows)};
  const base=50,total=base+rows.length;
  window.KIDVENTURO_GUIDE_DESTINATIONS=rows.map(r=>r[0]);
  window.KIDVENTURO_DESTINATION_COUNT=total;
  const map=Object.fromEntries(rows.map(r=>[r[0],r]));
  const isEs=()=>document.documentElement.lang==='es';
  const isBg=()=>document.documentElement.lang==='bg';
  // app.js renders the preview from its own destinationData map and falls back to Rome for unknown names.
  try{if(typeof destinationData==='object')rows.forEach(r=>{destinationData[r[0]]={...(destinationData[r[0]]||{}),missions:r[4]};});}catch{}
  function add(){
    const select=document.getElementById('destination');
    if(select){
      const have=new Set([...select.options].map(o=>o.value));
      rows.forEach(([name,flag])=>{if(have.has(name))return;const o=document.createElement('option');o.value=name;o.textContent=name+' '+flag;select.appendChild(o);});
      const wanted=new URLSearchParams(location.search).get('destination');
      if(wanted&&map[wanted]&&select.value!==wanted){select.value=wanted;select.dispatchEvent(new Event('change',{bubbles:true}));}
    }
    const grid=document.querySelector('.destination-grid');
    if(grid){
      const have=new Set([...grid.querySelectorAll('h3')].map(h=>h.textContent.trim()));
      rows.forEach(([name,flag,en,es,,,slug])=>{if(have.has(name))return;const a=document.createElement('article');a.className='destination-card';
        a.innerHTML='<div><span></span><h3></h3><p></p></div>';a.querySelector('span').textContent=flag;a.querySelector('h3').textContent=name;a.querySelector('p').textContent=isEs()?es:en;
        const link=document.createElement('a');link.href=(isEs()?'/es/destinos/':'/destinations/')+slug+'.html';link.className='destination-guide-link';link.textContent=isEs()?'Guía familiar':'Family guide';a.querySelector('div').appendChild(link);grid.appendChild(a);});
    }
    const eyebrow=document.querySelector('[data-i18n="destEyebrow"]'),title=document.querySelector('[data-i18n="destTitle"]');
    if(eyebrow)eyebrow.textContent=isBg()?total+' ДЕСТИНАЦИИ':isEs()?total+' DESTINOS':total+' DESTINATIONS';
    if(title)title.textContent=isBg()?total+' дестинации. Хиляди възможни приключения.':isEs()?total+' destinos. Miles de aventuras posibles.':total+' destinations. Thousands of possible adventures.';
  }
  function missions(){
    const d=document.getElementById('destination')?.value,r=map[d];if(!r)return;
    const m=isEs()?r[5]:r[4],one=document.getElementById('missionOne'),two=document.getElementById('missionTwo');
    if(one)one.textContent=m[0];if(two)two.textContent=m[1];
  }
  add();missions();
  const s=document.getElementById('destination');
  s?.addEventListener('change',()=>queueMicrotask(missions));
  document.getElementById('previewForm')?.addEventListener('submit',()=>queueMicrotask(missions));
  document.getElementById('languageToggle')?.addEventListener('click',()=>setTimeout(()=>{add();missions();},0));
  new MutationObserver(()=>setTimeout(add,0)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
`);

// Worker allow-list extension.
await write('worker/src/guide-destinations.js', `// Generated by scripts/build-family-guides.mjs. Destinations added with family guides (paid checkout allowed).\n` +
  `export const GUIDE_DESTINATIONS = Object.freeze(${JSON.stringify(guides.map(g => g.name))});\n`);

// Index for other pages (seasonal page, packing list) and tests.
await write('destinations/guide-index.json', JSON.stringify(guides.map(g => ({
  slug: g.slug, name: g.name, nameEs: g.nameEs, flag: g.flag, region: g.region, scene: g.scene, bestMonths: g.bestMonths, seasons: g.seasons,
  en: g.en.tagline, es: g.es.tagline, stroller: g.en.stroller.rating, ages: g.en.ages.best, dailyEn: g.en.costs.daily, dailyEs: g.es.costs.daily
})), null, 1) + '\n');

// SEO data used by the social pipeline (destination-data.js). Legacy generators scope themselves to their own list.
{
  const src = await read('destinations/destination-data.js');
  const m = src.match(/^window\.KIDVENTURO_DESTINATION_SEO=(\{.*\});\s*$/s);
  if (!m) throw new Error('Could not parse destinations/destination-data.js');
  const data = JSON.parse(m[1]);
  for (const g of guides) data[g.slug] = { name: g.name, flag: g.flag, en: g.en.tagline, es: g.es.tagline, missions: g.booklet.missions, guide: true };
  await write('destinations/destination-data.js', `window.KIDVENTURO_DESTINATION_SEO=${JSON.stringify(data)};\n`);
}

// Sitemap: guide pages plus the two feature pages in both languages.
{
  const extra = [
    ...guides.flatMap(g => [urlFor(g, 'en'), urlFor(g, 'es')]),
    `${SITE}/packing-list.html`, `${SITE}/es/lista-de-equipaje.html`,
    `${SITE}/best-family-destinations-this-month.html`, `${SITE}/es/mejores-destinos-familiares-este-mes.html`,
    `${SITE}/travel-journal.html`, `${SITE}/es/diario-de-viaje.html`
  ];
  let sm = await read('sitemap.xml');
  sm = replaceBlock(sm, '  <!-- guides:start -->\n', '  <!-- guides:end -->\n',
    extra.map(u => `  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod></url>\n`).join(''), '</urlset>');
  await write('sitemap.xml', sm);
}

// robots.txt: the destination folders are blocked by default; allow each guide page explicitly.
{
  let rb = await read('robots.txt');
  const lines = guides.flatMap(g => [`Allow: /destinations/${g.slug}.html`, `Allow: /es/destinos/${g.slug}.html`]);
  rb = replaceBlock(rb, '# guides:start\n', '# guides:end\n', lines.join('\n') + '\n', 'Sitemap:');
  await write('robots.txt', rb);
}

// Hubs: add the guide cards, grouped by region, and correct the visible counts.
for (const [file, lang] of [['destinations/index.html', 'en'], ['es/destinos/index.html', 'es']]) {
  let html = await read(file);
  const label = lang === 'es'
    ? { europe: 'Europa', americas: 'América', asia: 'Asia', head: 'Guías familiares completas', text: 'Guías con edades, carrito, imprescindibles, planes para lluvia, seguridad y costes reales.' }
    : { europe: 'Europe', americas: 'The Americas', asia: 'Asia', head: 'Full family guides', text: 'Guides with best ages, stroller notes, must-dos, rainy-day plans, safety and real costs.' };
  const cards = ['europe', 'americas', 'asia'].map(region => `<h3 class="guide-region">${label[region]}</h3><div class="seo-dests">` +
    guides.filter(g => g.region === region).map(g => `<a class="seo-dest" href="${g.slug}.html"><b>${g.flag} ${esc(lang === 'es' ? g.nameEs : g.name)}</b>${esc(g[lang].tagline)}</a>`).join('') + '</div>').join('');
  const body = `<section class="seo-copy guide-hub"><h2>${label.head}</h2><p>${label.text}</p>${cards}</section>`;
  html = replaceBlock(html, '<!-- guides:start -->', '<!-- guides:end -->', body, '<section class="seo-copy"><h2>');
  const total = 50 + guides.length;
  html = html.replace(/\b(50|\d{2,3})( travel activity guides for kids| supported family destinations| Kidventuro destinations| Kidventuro travel activity guides| supported destinations| destinos: actividades| destinos compatibles| destinos Kidventuro)/g, (_, n, rest) => `${total}${rest}`);
  if (!html.includes('guide.css')) html = html.replace('<link rel="stylesheet" href="seo.css">', `<link rel="stylesheet" href="seo.css"><link rel="stylesheet" href="/destinations/guide.css?v=${TODAY}">`);
  await write(file, html);
}

// ---------- Feature pages: age-smart packing list and "best for kids this month" ----------
function shell({ lang, path: pagePath, altPath, title, description, body, scripts = [], ld }) {
  const t = UI[lang], other = lang === 'es' ? 'en' : 'es';
  const enUrl = `${SITE}${lang === 'en' ? pagePath : altPath}`, esUrl = `${SITE}${lang === 'es' ? pagePath : altPath}`;
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="referrer" content="no-referrer">
  <link rel="canonical" href="${SITE}${pagePath}">
  <link rel="alternate" hreflang="en" href="${enUrl}">
  <link rel="alternate" hreflang="es" href="${esUrl}">
  <link rel="alternate" hreflang="x-default" href="${enUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Kidventuro">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${SITE}/assets/og-kidventuro.png">
  <meta property="og:url" content="${SITE}${pagePath}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${SITE}/assets/og-kidventuro.png">
  <script type="application/ld+json">${jsonLd(ld)}</script>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/destinations/seo.css">
  <link rel="stylesheet" href="/destinations/guide.css?v=${TODAY}">
</head>
<body class="guide">
  <div class="seo-shell">
    <header class="seo-head">
      <a class="seo-brand" href="${t.homeHref}">Kidventuro</a>
      <a href="${t.hubHref}">${t.all}</a>
      <a href="${lang === 'es' ? enUrl : esUrl}" hreflang="${other}" lang="${other}">${t.switchLabel}</a>
    </header>
    <main>
${body}
    </main>
    <footer class="seo-foot">© Kidventuro · <a href="/privacy.html">${t.privacy}</a> · <a href="/terms.html">${t.terms}</a> · <a href="/refunds.html">${t.refunds}</a></footer>
  </div>
  <script src="/runtime-config.js"></script>
  <script src="/analytics.js"></script>
${scripts.map(s => `  <script src="${s}" defer></script>`).join('\n')}
</body>
</html>
`;
}
const legacyNames = ['Rome', 'Paris', 'London', 'Barcelona', 'Dubai', 'Amsterdam', 'Vienna', 'Prague', 'Berlin', 'Lisbon', 'Athens', 'Istanbul', 'New York', 'Orlando', 'Tokyo', 'Kyoto', 'Singapore', 'Sydney', 'Copenhagen', 'Budapest', 'Venice', 'Florence', 'Madrid', 'Bangkok', 'Reykjavik', 'Munich', 'Salzburg', 'Zurich', 'Brussels', 'Bruges', 'Dublin', 'Edinburgh', 'Stockholm', 'Oslo', 'Helsinki', 'Milan', 'Naples', 'Seville', 'Valencia', 'Porto', 'Nice', 'Dubrovnik', 'Krakow', 'Warsaw', 'Bucharest', 'Sofia', 'Abu Dhabi', 'Seoul', 'Hong Kong', 'Kuala Lumpur'];
const allNames = [...legacyNames, ...guides.map(g => g.name)].sort((a, b) => a.localeCompare(b));
for (const lang of ['en', 'es']) {
  const es = lang === 'es';
  const L = (en, s) => es ? s : en;
  const pagePath = es ? '/es/lista-de-equipaje.html' : '/packing-list.html', altPath = es ? '/packing-list.html' : '/es/lista-de-equipaje.html';
  const title = L('Age-smart packing list for family trips | Kidventuro', 'Lista de equipaje por edades para viajar con niños | Kidventuro');
  const description = L('Free printable packing list for travelling with kids: adapts to each child’s age, the weather, trip length, stroller and transport. Nothing is stored.', 'Lista de equipaje gratuita e imprimible para viajar con niños: se adapta a la edad, el clima, la duración, el carrito y el transporte. No se guarda nada.');
  const ageSel = (n, req) => `<div><label for="age${n}">${L(`Child ${n} age`, `Edad niño ${n}`)}</label><select id="age${n}" name="age${n}"${req ? ' required' : ''}>${req ? '' : `<option value="">${L('none', 'ninguno')}</option>`}${Array.from({ length: 17 }, (_, i) => i + 1).map(a => `<option value="${a}"${req && a === 6 ? ' selected' : ''}>${a}</option>`).join('')}</select></div>`;
  const body = `      <nav class="crumbs" aria-label="${UI[lang].crumbs}"><a href="${UI[lang].homeHref}">${UI[lang].home}</a> · <span>${L('Packing list', 'Lista de equipaje')}</span></nav>
      <section class="seo-hero" style="padding-bottom:0">
        <div class="seo-kicker">${L('Free tool', 'Herramienta gratuita')}</div>
        <h1>${L('Age-smart packing list for family trips', 'Lista de equipaje por edades para viajar con niños')}</h1>
        <p class="seo-lead">${L('Tell us the ages, the weather and how you travel. You get a checklist that adds what toddlers need, drops what older kids can carry themselves and scales clothes to the number of nights. Print it or copy it. Nothing you enter leaves your browser.', 'Indica edades, clima y transporte. Obtendrás una lista que añade lo que necesitan los pequeños, deja que los mayores lleven lo suyo y ajusta la ropa al número de noches. Imprímela o cópiala. Nada de lo que escribes sale de tu navegador.')}</p>
      </section>
      <section class="tool">
        <form id="packForm" novalidate>
          <div class="tool-grid">
            <div><label for="dest">${L('Destination (optional)', 'Destino (opcional)')}</label><select id="dest" name="dest"><option value="">${L('Anywhere', 'Cualquiera')}</option>${allNames.map(n => `<option>${esc(n)}</option>`).join('')}</select></div>
            <div><label for="nights">${L('Nights away', 'Noches')}</label><input id="nights" name="nights" type="number" min="1" max="30" value="5" inputmode="numeric"></div>
            <div><label for="climate">${L('Weather', 'Clima')}</label><select id="climate" name="climate"><option value="cold">${L('Cold or snowy', 'Frío o nieve')}</option><option value="mild" selected>${L('Mild, may rain', 'Templado, puede llover')}</option><option value="warm">${L('Warm and sunny, beach', 'Calor y sol, playa')}</option><option value="tropical">${L('Hot and humid, tropical', 'Calor húmedo, tropical')}</option></select></div>
            ${ageSel(1, true)}${ageSel(2, false)}${ageSel(3, false)}
            <div><label for="transport">${L('Getting there', 'Transporte')}</label><select id="transport" name="transport"><option value="plane">${L('Plane', 'Avión')}</option><option value="train">${L('Train', 'Tren')}</option><option value="car">${L('Car', 'Coche')}</option></select></div>
            <fieldset><legend>${L('Extras', 'Extras')}</legend><div class="chips"><label><input type="checkbox" name="stroller" value="1"> ${L('Stroller', 'Carrito')}</label><label><input type="checkbox" name="water" value="1"> ${L('Pool or beach', 'Piscina o playa')}</label></div></fieldset>
          </div>
          <div class="tool-actions"><button type="submit">${L('Make my list', 'Crear mi lista')}</button></div>
        </form>
        <div id="list" tabindex="-1"><div id="packOut" tabindex="-1" aria-live="polite"></div></div>
        <div id="packActions" class="tool-actions no-print" hidden><button type="button" id="packPrint">${L('Print the list', 'Imprimir la lista')}</button><button type="button" class="secondary" id="packCopy">${L('Copy as text', 'Copiar como texto')}</button></div>
      </section>
      <section class="seo-copy">
        <h2>${L('How the list adapts', 'Cómo se adapta la lista')}</h2>
        <ul class="seo-list">
          <li>${L('Under 6: spare outfit in the day bag, comfort toy, night light, potty or nappies by age.', 'Menores de 6: muda en la mochila, peluche, luz de noche, orinal o pañales según la edad.')}</li>
          <li>${L('7 and up: their own backpack, pencil case and activity book; 10 and up: a little pocket money.', 'Desde 7: su mochila, estuche y cuaderno; desde 10: algo de dinero de bolsillo.')}</li>
          <li>${L('Clothes scale with the nights but stop at a week: for longer trips the list plans one wash.', 'La ropa se ajusta a las noches hasta una semana: en viajes más largos se planea un lavado.')}</li>
          <li>${L('Weather and transport add their own items, from ear-pressure snacks on planes to sunshades in the car.', 'El clima y el transporte añaden lo suyo, desde algo para los oídos en el avión hasta parasoles en el coche.')}</li>
        </ul>
        <p><a href="${UI[lang].monthHref}">${UI[lang].month}</a> · <a href="${UI[lang].hubHref}">${UI[lang].all}</a></p>
      </section>`;
  const ld = { '@context': 'https://schema.org', '@type': 'WebApplication', name: title.replace(' | Kidventuro', ''), url: `${SITE}${pagePath}`, applicationCategory: 'TravelApplication', operatingSystem: 'Any', inLanguage: lang, isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } };
  await write(pagePath.slice(1), shell({ lang, path: pagePath, altPath, title, description, body, scripts: ['/tools/packing.js?v=' + TODAY], ld }));

  // Printable travel journal.
  const jPath = es ? '/es/diario-de-viaje.html' : '/travel-journal.html', jAlt = es ? '/travel-journal.html' : '/es/diario-de-viaje.html';
  const jTitle = L('Printable travel journal for kids | Kidventuro', 'Diario de viaje imprimible para niños | Kidventuro');
  const jDesc = L('Free printable travel journal for kids aged 4–12: a page for every day of the trip with weather, the best moment, new tastes, a drawing box and a trip-in-numbers page. Made in your browser.', 'Diario de viaje imprimible y gratuito para niños de 4 a 12 años: una página por día con el tiempo, el mejor momento, sabores nuevos, un recuadro para dibujar y el viaje en números. Se crea en tu navegador.');
  const jBody = `      <nav class="crumbs" aria-label="${UI[lang].crumbs}"><a href="${UI[lang].homeHref}">${UI[lang].home}</a> · <span>${L('Travel journal', 'Diario de viaje')}</span></nav>
      <section class="seo-hero" style="padding-bottom:0">
        <div class="seo-kicker">${L('Free printable', 'Imprimible gratis')}</div>
        <h1>${L('Printable travel journal for kids', 'Diario de viaje imprimible para niños')}</h1>
        <p class="seo-lead">${L('One A4 page for every day of the trip: circle the weather, write or draw the best moment, glue in a ticket. Younger children get bigger boxes and fewer lines; older ones write more. The name you type appears only on the printed cover and is not saved.', 'Una página A4 por cada día del viaje: rodear el tiempo, escribir o dibujar el mejor momento, pegar una entrada. Los pequeños tienen recuadros más grandes y menos líneas; los mayores escriben más. El nombre solo aparece en la portada impresa y no se guarda.')}</p>
      </section>
      <section class="tool">
        <form id="journalForm" novalidate>
          <div class="tool-grid">
            <div><label for="jdest">${L('Destination', 'Destino')}</label><select id="jdest" name="dest"><option value="">${L('Any trip', 'Cualquier viaje')}</option>${allNames.map(n => `<option>${esc(n)}</option>`).join('')}</select></div>
            <div><label for="jdays">${L('Days', 'Días')}</label><input id="jdays" name="days" type="number" min="1" max="14" value="5" inputmode="numeric"></div>
            <div><label for="jage">${L('Child’s age', 'Edad')}</label><select id="jage" name="age">${Array.from({ length: 9 }, (_, i) => i + 4).map(a => `<option value="${a}"${a === 7 ? ' selected' : ''}>${a}</option>`).join('')}</select></div>
            <div><label for="jname">${L('First name for the cover (optional)', 'Nombre para la portada (opcional)')}</label><input id="jname" name="name" type="text" maxlength="24" autocomplete="off"></div>
          </div>
          <div class="tool-actions"><button type="submit">${L('Make the journal', 'Crear el diario')}</button></div>
        </form>
        <div id="journalActions" class="tool-actions no-print" hidden><button type="button" id="journalPrint">${L('Print / Save as PDF', 'Imprimir / Guardar PDF')}</button></div>
      </section>
      <div id="journal" class="journal" tabindex="-1"><div id="journalOut" tabindex="-1" aria-live="polite"></div></div>
      <section class="seo-copy no-print">
        <p>${L('Want missions, scavenger hunts and a quiz made for one destination? The personalized activity book goes with the journal.', '¿Quieres misiones, búsquedas y un cuestionario para un destino concreto? El cuaderno personalizado combina con el diario.')} <a href="${UI[lang].homeHref}#create">${L('Create an activity book', 'Crear un cuaderno')}</a> · <a href="${UI[lang].packingHref}">${UI[lang].packing}</a></p>
      </section>`;
  const jLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: jTitle.replace(' | Kidventuro', ''), url: `${SITE}${jPath}`, applicationCategory: 'TravelApplication', operatingSystem: 'Any', inLanguage: lang, isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } };
  await write(jPath.slice(1), shell({ lang, path: jPath, altPath: jAlt, title: jTitle, description: jDesc, body: jBody, scripts: ['/tools/journal.js?v=' + TODAY], ld: jLd }));

  // Seasonal page.
  const mPath = es ? '/es/mejores-destinos-familiares-este-mes.html' : '/best-family-destinations-this-month.html';
  const mAlt = es ? '/best-family-destinations-this-month.html' : '/es/mejores-destinos-familiares-este-mes.html';
  const mTitle = L('Best family destinations this month, month by month | Kidventuro', 'Mejores destinos para viajar con niños, mes a mes | Kidventuro');
  const mDesc = L('Where to go with kids in every month of the year: 40 family destinations in Europe, the Americas and Asia, with best ages, stroller notes and daily costs.', 'Dónde viajar con niños cada mes del año: 40 destinos familiares en Europa, América y Asia, con edades, carrito y costes diarios.');
  const hubBase = es ? '/es/destinos/' : '/destinations/';
  const sections = MONTHS[lang].map((month, i) => {
    const list = guides.filter(g => g.bestMonths.includes(i + 1));
    const name = month[0].toUpperCase() + month.slice(1);
    return `      <section class="month" id="m${i + 1}"><h2>${name}</h2><div class="seo-dests">${list.map(g => `<a class="seo-dest" href="${hubBase}${g.slug}.html"><b>${g.flag} ${esc(es ? g.nameEs : g.name)}</b>${esc(g[lang].tagline)}<br><small>${L('Ages', 'Edades')} ${esc(g[lang].ages.best)} · ${L('Stroller', 'Carrito')}: ${UI[lang].ratings[g[lang].stroller.rating]}</small></a>`).join('')}</div></section>`;
  });
  const mBody = `      <nav class="crumbs" aria-label="${UI[lang].crumbs}"><a href="${UI[lang].homeHref}">${UI[lang].home}</a> · <span>${L('Month by month', 'Mes a mes')}</span></nav>
      <section class="seo-hero" style="padding-bottom:0">
        <div class="seo-kicker">${L('Seasonal guide', 'Guía estacional')}</div>
        <h1>${L('Where to go with kids, month by month', 'Dónde viajar con niños, mes a mes')}</h1>
        <p class="seo-lead">${L('Each month lists the family destinations that are at their best: snow and Christmas markets in winter, festivals and gardens in spring, lakes and beaches in summer, warm-weather escapes when Europe turns cold. Open a guide for ages, stroller notes, rainy-day plans and real costs.', 'Cada mes muestra los destinos familiares en su mejor momento: nieve y mercados navideños en invierno, festivales y jardines en primavera, lagos y playas en verano y escapadas cálidas cuando Europa se enfría. Abre una guía para ver edades, carrito, planes para la lluvia y costes reales.')}</p>
      </section>
      <nav class="month-nav" aria-label="${L('Months', 'Meses')}">${MONTHS[lang].map((m, i) => `<a href="#m${i + 1}">${m[0].toUpperCase() + m.slice(1, 3)}</a>`).join('')}</nav>
${sections.join('\n')}
      <p class="guide-links"><a href="${UI[lang].packingHref}">${UI[lang].packing}</a></p>`;
  const mLd = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: mTitle.replace(' | Kidventuro', ''), url: `${SITE}${mPath}`, inLanguage: lang, dateModified: TODAY,
    mainEntity: { '@type': 'ItemList', numberOfItems: guides.length, itemListElement: guides.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: urlFor(g, lang), name: es ? g.nameEs : g.name })) } };
  await write(mPath.slice(1), shell({ lang, path: mPath, altPath: mAlt, title: mTitle, description: mDesc, body: mBody, scripts: ['/tools/month.js?v=' + TODAY], ld: mLd }));
}

console.log(`Built ${guides.length} family guides (${guides.length * 2} pages), catalog-7.js, site-expansion-3.js, Worker list, sitemap, robots and hubs.`);
