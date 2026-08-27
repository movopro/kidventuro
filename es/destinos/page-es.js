(()=>{
  const slug=location.pathname.split('/').pop().replace(/\.html$/,'');
  const data=window.KIDVENTURO_DESTINATION_SEO?.[slug];
  if(!data){location.replace('/es/destinos/');return;}
  const city=data.name;
  const plain=data.es.replaceAll(' • ',', ');
  document.title=`${city}: actividades de viaje para niños | Kidventuro`;
  const meta=document.querySelector('meta[name="description"]');
  if(meta)meta.content=`Crea actividades personalizadas para niños en ${city}: ${plain}, misiones, búsquedas y juegos imprimibles para edades de 4 a 12 años.`;
  const links=[
    ['canonical',null,`https://kidventuro.com/es/destinos/${slug}.html`],
    ['alternate','en',`https://kidventuro.com/destinations/${slug}.html`],
    ['alternate','es',`https://kidventuro.com/es/destinos/${slug}.html`],
    ['alternate','x-default',`https://kidventuro.com/destinations/${slug}.html`]
  ];
  links.forEach(([rel,lang,href])=>{const el=document.createElement('link');el.rel=rel;if(lang)el.hreflang=lang;el.href=href;document.head.appendChild(el);});
  const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
  set('cityKicker',`${city} con niños`);
  set('cityTitle',`Actividades imprimibles para niños en ${city}`);
  set('cityLead',`Convierte ${plain} en una aventura personalizada que anima a los niños a observar, descubrir y participar en el viaje.`);
  const cta=document.getElementById('cityCta');if(cta){cta.href=`/?lang=es&destination=${encodeURIComponent(city)}#create`;cta.textContent=`Crear una vista previa de ${city}`;}
  const header=document.querySelector('.seo-head');
  if(header&&!header.querySelector('[data-en-page]')){const a=document.createElement('a');a.dataset.enPage='';a.href=`/destinations/${slug}.html`;a.textContent='English';header.appendChild(a);}
  const mount=document.getElementById('destinationDetails');
  if(mount)mount.innerHTML=`
    <section class="seo-grid">
      <article class="seo-card"><h2>Para el trayecto</h2><p>Juegos tranquilos y páginas imprimibles para vuelos, trenes, coche y esperas en restaurantes.</p></article>
      <article class="seo-card"><h2>Para ${city}</h2><p>Las actividades convierten lugares y detalles del destino en pistas, observaciones y pequeñas misiones.</p></article>
      <article class="seo-card"><h2>Para cada niño</h2><p>Elige edad, intereses y duración para que la aventura resulte personal y relevante.</p></article>
    </section>
    <section class="seo-copy"><h2>Ideas de actividades familiares en ${city}</h2><p>Kidventuro combina actividades para el trayecto con descubrimientos del destino. El objetivo es que los niños tengan cosas que buscar, comparar, dibujar y recordar durante el viaje.</p><ul class="seo-list"><li>Reto de observación inspirado en ${data.missions[0]}</li><li>Búsqueda inspirada en ${data.missions[1]}</li><li>Bingo de viaje y búsquedas visuales</li><li>Dibujo, diario y páginas de recuerdos</li><li>Palabras locales, comida y curiosidades</li></ul><h2>Opciones imprimibles</h2><p>Mini cuesta €5.90 por 10 páginas, Adventure €9.90 por 25–28 páginas y Family €14.90 para hasta tres niños. <strong>El producto imprimible actual se genera en inglés.</strong> La web y estas guías están disponibles en español.</p></section>`;
  const structured=document.createElement('script');structured.type='application/ld+json';structured.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',inLanguage:'es',name:`${city}: actividades de viaje para niños`,url:`https://kidventuro.com/es/destinos/${slug}.html`,isPartOf:{'@type':'WebSite',name:'Kidventuro',url:'https://kidventuro.com/es/'}});document.head.appendChild(structured);
})();