(()=>{
  const slug=location.pathname.split('/').pop().replace(/\.html$/,'');
  const data=window.KIDVENTURO_DESTINATION_SEO?.[slug];
  if(!data){location.replace('/destinations/');return;}
  const city=data.name;
  const plain=data.en.replaceAll(' • ',', ');
  document.title=`${city} travel activity book for kids | Kidventuro`;
  const meta=document.querySelector('meta[name="description"]');
  if(meta)meta.content=`Create a personalized printable ${city} activity book for kids ages 4–12 with ${plain}, missions, scavenger hunts and travel games.`;
  const links=[
    ['canonical',null,`https://kidventuro.com/destinations/${slug}.html`],
    ['alternate','en',`https://kidventuro.com/destinations/${slug}.html`],
    ['alternate','es',`https://kidventuro.com/es/destinos/${slug}.html`],
    ['alternate','x-default',`https://kidventuro.com/destinations/${slug}.html`]
  ];
  links.forEach(([rel,lang,href])=>{const el=document.createElement('link');el.rel=rel;if(lang)el.hreflang=lang;el.href=href;document.head.appendChild(el);});
  const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
  set('cityKicker',`${city} with kids`);
  set('cityTitle',`Printable ${city} travel activities for kids`);
  set('cityLead',`Turn ${plain} into a personalized adventure that gives children a reason to look up, notice details and take part in the trip.`);
  const cta=document.getElementById('cityCta');if(cta){cta.href=`../?destination=${encodeURIComponent(city)}#create`;cta.textContent=`Create a ${city} preview`;}
  const header=document.querySelector('.seo-head');
  if(header&&!header.querySelector('[data-es-page]')){const a=document.createElement('a');a.dataset.esPage='';a.href=`/es/destinos/${slug}.html`;a.textContent='Español';header.appendChild(a);}
  const mount=document.getElementById('destinationDetails');
  if(mount)mount.innerHTML=`
    <section class="seo-grid">
      <article class="seo-card"><h2>Made for the journey</h2><p>Quiet travel games and printable pages help during flights, trains, drives and restaurant waits.</p></article>
      <article class="seo-card"><h2>Made for ${city}</h2><p>Destination prompts turn local sights and details into clues, observation games and small missions.</p></article>
      <article class="seo-card"><h2>Made for the child</h2><p>Choose age, interests and trip length so the adventure feels relevant instead of generic.</p></article>
    </section>
    <section class="seo-copy"><h2>Family activity ideas for ${city}</h2><p>Kidventuro combines travel-time activities with destination discovery. Instead of asking children to simply follow the adults, the printable gives them things to find, compare, draw and remember.</p><ul class="seo-list"><li>${data.missions[0]}</li><li>${data.missions[1]}</li><li>Travel bingo and visual scavenger hunts</li><li>Drawing, journal and memory pages</li><li>Local words, food and fun facts</li></ul><h2>Printable options</h2><p>Mini is €5.90 for 10 pages, Adventure is €9.90 for 25–28 pages, and Family is €14.90 for up to three children. The current printable product is generated in English and can be saved as a PDF or printed at home.</p></section>`;
  const structured=document.createElement('script');structured.type='application/ld+json';structured.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:`${city} travel activity book for kids`,url:`https://kidventuro.com/destinations/${slug}.html`,isPartOf:{'@type':'WebSite',name:'Kidventuro',url:'https://kidventuro.com/'}});document.head.appendChild(structured);
})();