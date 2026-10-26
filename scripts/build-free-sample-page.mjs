// Regenerates free-sample.html (one card per launch destination). Run: node scripts/build-free-sample-page.mjs
import fs from 'node:fs';
const D = [['Orlando','orlando'],['Paris','paris'],['London','london'],['Rome','rome'],['Barcelona','barcelona'],['Vienna','vienna'],['Prague','prague'],['Dubai','dubai'],['Rovaniemi','rovaniemi'],['Reykjavik','reykjavik'],['Amsterdam','amsterdam'],['Berlin','berlin'],['Madrid','madrid'],['Lisbon','lisbon'],['Athens','athens'],['Istanbul','istanbul'],['New York','new-york'],['Tokyo','tokyo'],['Venice','venice'],['Florence','florence']];
const cards = D.map(([n, s], i) => `        <div class="kv-sample-card"><img src="/assets/samples/${s}-bingo.webp" width="1172" height="1658" alt="${n} sample page: travel bingo"${i ? ' loading="lazy"' : ''}><div><b>${n}</b><a href="/assets/samples/${s}-free-sample.pdf" data-kv-sample download>Download the free ${n} page (PDF)</a><br><a href="/destinations/${s}.html?utm_source=site&amp;utm_medium=free-sample&amp;utm_campaign=season#get-pack">Get the full ${n} pack</a></div></div>`).join('\n');
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Free printable travel activity page for kids | Kidventuro</title>
  <meta name="description" content="Download a free printable travel activity page for kids for Orlando, Paris, London, Rome, Barcelona, Vienna, Prague, Dubai, Rovaniemi or Reykjavik. No sign-up.">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="https://kidventuro.com/free-sample.html">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Kidventuro">
  <meta property="og:title" content="Free printable travel activity page for kids | Kidventuro">
  <meta property="og:description" content="Download a free printable travel activity page for your destination. No sign-up.">
  <meta property="og:url" content="https://kidventuro.com/free-sample.html">
  <meta property="og:image" content="https://kidventuro.com/assets/og-kidventuro.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Kidventuro personalized printable travel adventures for kids">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://kidventuro.com/assets/og-kidventuro.png">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","@id":"https://kidventuro.com/free-sample.html#webpage","url":"https://kidventuro.com/free-sample.html","name":"Free printable travel activity page for kids | Kidventuro","description":"Download a free printable travel activity page for your destination. No sign-up.","isPartOf":{"@type":"WebSite","name":"Kidventuro","url":"https://kidventuro.com/"}}</script>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/destinations/seo.css">
  <link rel="stylesheet" href="/conversion.css?v=20261018">
</head>
<body>
  <div class="kv-offer-bar kv-scope" data-kv-offer hidden><span><b><span data-kv-percent>30</span>% off</b> your first trip pack · code <span class="kv-code" data-kv-code>FIRSTTRIP</span></span><span>ends in <span class="kv-countdown" data-kv-countdown>3d 00h 00m 00s</span></span></div>
  <div class="seo-shell">
    <header class="seo-head"><a class="seo-brand" href="/">Kidventuro</a><a href="/destinations/">All destinations</a><a href="/#pricing">Prices</a></header>
    <main>
      <section class="seo-hero">
        <div class="seo-kicker">Free sample</div>
        <h1>A free printable travel page for your trip</h1>
        <p class="seo-lead">Pick your destination, download the page, print it. No sign-up, no email needed. Like it? The full 25-page pack has your child's name on the cover.</p>
      </section>
      <section class="kv-scope kv-samples">
${cards}
      </section>
      <section class="kv-block kv-scope" id="get-pack">
        <div class="kv-buy">
          <div>
            <h2>Want the whole adventure?</h2>
            <p>25 printable pages: bingo, scavenger hunt, landmark missions, word search, journal, postcard and an explorer certificate.</p>
            <ul class="kv-trust"><li>One-time purchase</li><li>No app, no subscription</li><li>Print at home</li><li>Ages 4–12</li></ul>
          </div>
          <div data-kv-quickbuy></div>
        </div>
      </section>
    </main>
    <footer class="seo-foot">© Kidventuro · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a> · <a href="/refunds.html">Refunds &amp; delivery</a> · <a href="mailto:hello@kidventuro.com">hello@kidventuro.com</a></footer>
  </div>
  <script src="/runtime-config.js"></script>
  <script src="/analytics.js"></script>
  <script src="/quickbuy.js?v=20261018" defer></script>
</body>
</html>
`;
fs.writeFileSync(new URL('../free-sample.html', import.meta.url), html);
