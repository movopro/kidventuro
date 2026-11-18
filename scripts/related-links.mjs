// "More family destinations" for the 50 legacy destination pages (EN + ES): which pages each page links to.
//
// Deterministic and bounded: every legacy page links to RELATED_LEGACY same-region legacy pages (the next ones on a ring that
// follows the sitemap order, so every legacy page receives exactly the same number of links) and RELATED_GUIDES family guide
// of its region (rotating, so every guide receives links too). Used by generate-destination-pages.mjs and test-indexing.mjs.
// Regions use the three labels of the hubs (europe, americas, asia = Asia and Pacific).
import { LEGACY_SLUGS } from './social-cards/cards-lib.mjs';

export const RELATED_LEGACY = 5;
export const RELATED_GUIDES = 1;

export const LEGACY_REGION = {
  rome: 'europe', paris: 'europe', london: 'europe', barcelona: 'europe', dubai: 'asia', amsterdam: 'europe', vienna: 'europe',
  prague: 'europe', berlin: 'europe', lisbon: 'europe', athens: 'europe', istanbul: 'europe', 'new-york': 'americas', orlando: 'americas',
  tokyo: 'asia', kyoto: 'asia', singapore: 'asia', sydney: 'asia', copenhagen: 'europe', budapest: 'europe', venice: 'europe',
  florence: 'europe', madrid: 'europe', bangkok: 'asia', reykjavik: 'europe', munich: 'europe', salzburg: 'europe', zurich: 'europe',
  brussels: 'europe', bruges: 'europe', dublin: 'europe', edinburgh: 'europe', stockholm: 'europe', oslo: 'europe', helsinki: 'europe',
  milan: 'europe', naples: 'europe', seville: 'europe', valencia: 'europe', porto: 'europe', nice: 'europe', dubrovnik: 'europe',
  krakow: 'europe', warsaw: 'europe', bucharest: 'europe', sofia: 'europe', 'abu-dhabi': 'asia', seoul: 'asia',
  'hong-kong': 'asia', 'kuala-lumpur': 'asia'
};

// guides: [{slug, region}] sorted by slug by the caller (or here, to be safe). Returns [{slug, kind: 'legacy' | 'guide'}].
export function legacyRelated(slug, guides) {
  const region = LEGACY_REGION[slug];
  if (!region) throw new Error(`No region for legacy destination ${slug}`);
  const ring = LEGACY_SLUGS.filter(s => LEGACY_REGION[s] === region);
  const at = ring.indexOf(slug);
  const picks = [];
  for (let step = 1; step < ring.length && picks.length < RELATED_LEGACY; step++) picks.push({ slug: ring[(at + step) % ring.length], kind: 'legacy' });
  const pool = [...guides].filter(g => g.region === region).sort((a, b) => a.slug.localeCompare(b.slug));
  if (pool.length) {
    const want = RELATED_GUIDES + (RELATED_LEGACY - picks.length); // a region with too few legacy pages is topped up with guides
    for (let i = 0; i < want && i < pool.length; i++) picks.push({ slug: pool[(at * RELATED_GUIDES + i) % pool.length].slug, kind: 'guide' });
  }
  return picks;
}
