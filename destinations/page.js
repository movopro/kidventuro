(()=>{
  const slug=location.pathname.split('/').pop().replace(/\.html$/,'');
  const data=window.KIDVENTURO_DESTINATION_SEO?.[slug];
  if(!data){location.replace('/destinations/');return;}
  const city=data.name;
  const plain=data.en.replaceAll(' • ',', ');
  document.title=`${city} travel activity book for kids | Kidventuro`;
  let meta=document.querySelector('meta[name="description"]');
  if(meta)meta.content=`Create a personalized printable ${city} activity book for kids ages 4–12 with ${plain}, missions, scavenger hunts and travel games.`;
  const canonical=document.createElement('link');canonical.rel='canonical';canonical.href=`https://kidventuro.com/destinations/${slug}.html`;document.head.appendChild(canonical);
  const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
  set('cityKicker',`${city} with kids`);
  set('cityTitle',`Printable ${city} travel activities for kids`);
  set('cityLead',`Turn ${plain} into a personalized adventure that gives children a reason to look up, notice details and take part in the trip.`);
  const cta=document.getElementById('cityCta');if(cta){cta.href=`../?destination=${encodeURIComponent(city)}#create`;cta.textContent=`Create a ${city} preview`;}
  const mount=document.getElementById('destinationDetails');
  if(mount)mount.innerHTML=`
    <section class="seo-grid">
      <article class="seo-card"><h2>Made for the journey</h2><p>Quiet travel games and printable pages help during flights, trains, drives and restaurant waits.</p></article>
      <article class="seo-card"><h2>Made for ${city}</h2><p>Destination prompts turn local sights and details into clues, observation games and small missions.</p></article>
      <article class="seo-card"><h2>Made for the child</h2><p>Choose age, interests and trip length so the adventure feels relevant instead of generic.</p></article>
    </section>
    <section class="seo-copy"><h2>Family activity ideas for ${city}</h2><p>Kidventuro combines travel-time activities with destination discovery. Instead of asking children to simply follow the adults, the printable gives them things to find, compare, draw and remember.</p><ul class="seo-list"><li>${data.missions[0]}</li><li>${data.missions[1]}</li><li>Travel bingo and visual scavenger hunts</li><li>Drawing, journal and memory pages</li><li>Local words, food and fun facts</li></ul><h2>Printable options</h2><p>Mini is €5.90 for 10 pages, Adventure is €9.90 for 25–28 pages, and Family is €14.90 for up to three children. The current printable product is generated in English and can be saved as a PDF or printed at home.</p></section>
    <section id="es" lang="es" class="seo-copy"><h2>Actividades imprimibles para niños en ${city}</h2><p>Convierte ${data.es.replaceAll(' • ',', ')} en una aventura personalizada para niños de 4 a 12 años. Kidventuro combina juegos para el trayecto con misiones de observación, búsquedas y páginas de recuerdos. El producto imprimible actual se genera en inglés.</p><a class="seo-cta" href="../?lang=es&destination=${encodeURIComponent(city)}#create">Crear una vista previa de ${city}</a></section>`;
  const structured=document.createElement('script');structured.type='application/ld+json';structured.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:`${city} travel activity book for kids`,url:`https://kidventuro.com/destinations/${slug}.html`,isPartOf:{'@type':'WebSite',name:'Kidventuro',url:'https://kidventuro.com/'}});document.head.appendChild(structured);
})();