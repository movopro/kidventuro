(()=>{
  const qs=new URLSearchParams(location.search);
  const wantsEs=qs.get('lang')==='es'||localStorage.getItem('kidventuro:lang')==='es';

  const es={
    navHow:'Cómo funciona',navDestinations:'Destinos',navPricing:'Precios',navCreate:'Crear un libro',
    eyebrow:'PERSONALIZADO • IMPRIMIBLE • LISTO EN MINUTOS',heroTitle:'Convierte cada viaje en una <em>aventura.</em>',
    heroSub:'Actividades de viaje personalizadas para entretener a los niños durante el trayecto y despertar su curiosidad al llegar.',
    heroCta:'Crear vista previa gratis',heroSample:'Ver qué incluye',
    trust1:'50 destinos',trust2:'Imprime en casa',trust3:'Para edades de 4 a 12',trust4:'Pago único',
    heroProof:'Sin app. Sin suscripción. Guarda como PDF, imprime y llévalo en el viaje.',
    createEyebrow:'PRUÉBALO AHORA',createTitle:'Haz que su aventura sea personal.',
    createSub:'Elige el niño, el destino y el viaje. Mira la idea antes de comprar.',
    labelName:'Nombre del niño',labelAge:'Edad',labelDays:'Duración del viaje',labelDestination:'Destino',labelInterest:'¿Qué le encanta?',
    generateBtn:'Generar mi vista previa',
    formNote:'No se crea una cuenta infantil. Usa solo un nombre o apodo. La personalización se guarda temporalmente únicamente para crear y entregar la aventura.',
    previewTag:'VISTA PREVIA',previewAdventure:'UNA AVENTURA KIDVENTURO PARA',
    openSample:'Abrir muestra imprimible →',openBooklet:'Desbloquear aventura completa — €9.90 →',
    howEyebrow:'CÓMO FUNCIONA',howTitle:'De “¿ya llegamos?” a “¿qué sigue?”',
    step1Title:'Cuéntanos sobre tu pequeño explorador',step1Text:'Nombre, edad, duración, destino y sus intereses.',
    step2Title:'Creamos la aventura',step2Text:'Las actividades se adaptan a la edad, intereses, destino y duración del viaje.',
    step3Title:'Imprime, guarda y explora',step3Text:'Guarda el libro como PDF, imprímelo y llévalo en avión, tren o coche.',
    useEyebrow:'HECHO PARA VIAJES REALES',useTitle:'Útil mucho antes de llegar a la tienda de recuerdos.',
    useSub:'Kidventuro da a los niños algo que hacer durante las esperas y algo que descubrir cuando empieza la aventura.',
    use1Title:'Durante el trayecto',use1Text:'Bingo, puzles y páginas tranquilas para vuelos, trenes y viajes largos.',
    use2Title:'En las esperas',use2Text:'Algo útil para la puerta de embarque, el hotel o la mesa del restaurante.',
    use3Title:'Explorando la ciudad',use3Text:'Búsquedas y misiones de observación que hacen que los niños miren el lugar que les rodea.',
    use4Title:'Recordando el viaje',use4Text:'Dibujo, diario y certificado convierten el cuaderno en un recuerdo sencillo.',
    destEyebrow:'50 DESTINOS',destTitle:'50 destinos. Miles de aventuras posibles.',
    sampleEyebrow:'QUÉ INCLUYE',sampleTitle:'Menos pantalla. Más “¡lo encontré!”',
    sampleText:'Cada libro combina actividades tranquilas de viaje con misiones para observar el destino real.',
    sample1:'Bingo de viaje y búsquedas',sample2:'Puzles y retos adaptados a la edad',sample3:'Palabras locales, comida y curiosidades',
    sample4:'Dibujo, diario y recuerdos',sample5:'Certificado de explorador personalizado',printSample:'Imprimir página de muestra',
    pricingEyebrow:'PRECIOS SENCILLOS',pricingTitle:'Elige la versión que encaje con el viaje.',
    pricingSub:'Pago único. Entrega digital. Sin suscripción ni envío físico.',
    buyTrust1Top:'DIGITAL',buyTrust1:'Listo tras el pago',buyTrust2Top:'PAGO ÚNICO',buyTrust2:'Sin suscripción',
    buyTrust3Top:'IMPRIMIBLE',buyTrust3:'A4 • Guardar como PDF',buyTrust4Top:'PERSONAL',buyTrust4:'Hecho para tu viaje',
    miniDesc:'Un pack compacto para el trayecto o una escapada corta.',miniBest:'Ideal para: actividades rápidas sin pantalla',
    mini1:'10 páginas imprimibles',mini2:'Portada personalizada',mini3:'Juegos y puzles de viaje',
    advDesc:'El compañero completo para el viaje de un niño.',advBest:'Ideal para: la mayoría de escapadas familiares',
    adv1:'25–28 páginas imprimibles',adv2:'Misiones del destino',adv3:'Adaptado a edad, intereses y duración',adv4:'Certificado de explorador',
    familyDesc:'Una aventura compartida para hasta tres niños.',familyBest:'Ideal para: hermanos o niños que viajan juntos',
    family1:'Hasta 3 niños',family2:'Actividades adaptadas a la edad',family3:'Misiones familiares compartidas',
    tryPreview:'Obtener Mini — €5.90',tryPreview2:'Obtener Family — €14.90',createPreview:'Obtener Adventure — €9.90',mostPopular:'MÁS POPULAR',
    pricingNote:'Pago único seguro. Entrega digital personalizada tras el pago. Sin suscripción.',
    faqTitle:'Preguntas frecuentes de familias.',
    faq1q:'¿Es un libro físico?',faq1a:'No. Kidventuro es una aventura digital imprimible. Ábrela tras el pago y usa Imprimir / Guardar como PDF.',
    faq2q:'¿Necesito crear una cuenta?',faq2a:'No. No hace falta una cuenta infantil. Un adulto completa el pago seguro.',
    faq3q:'¿Qué información personal necesitáis?',faq3a:'Solo usamos nombre o apodo, edad, destino, interés y duración. Los nombres y edades exactas no se envían al proveedor de IA.',
    faq4q:'¿Quién es responsable de la seguridad?',faq4a:'Un adulto debe supervisar al niño y decidir si cada misión es apropiada.',
    faq5q:'¿Cuándo recibo el libro?',faq5a:'Después de un pago correcto, Kidventuro abre el libro personalizado para guardarlo como PDF o imprimirlo.',
    footerPrivacy:'Privacidad',footerTerms:'Términos',footerRefunds:'Reembolsos y entrega',footerContact:'Contacto',modalPrint:'Imprimir / Guardar como PDF'
  };

  const interestES={
    dinosaurs:'Dinosaurios 🦖',space:'Espacio 🚀',animals:'Animales 🐾',football:'Fútbol ⚽',art:'Arte 🎨',
    mysteries:'Misterios 🔎',castles:'Castillos y caballeros 🏰',science:'Ciencia 🧪',vehicles:'Vehículos 🚗',nature:'Naturaleza 🌿',
    food:'Comida y cocina 🍳',music:'Música 🎵',superheroes:'Superhéroes 🦸',history:'Historia 📜',ocean:'Océano y vida marina 🐠',trains:'Trenes 🚆'
  };
  const destinationES={
    Rome:'Maravillas antiguas • fuentes • pizza',Paris:'Torres • arte • cafés',London:'Pistas reales • autobuses • puentes',
    Barcelona:'Mosaicos • fútbol • mar',Dubai:'Rascacielos • desierto • futuro',Amsterdam:'Canales • bicicletas • tulipanes',
    Vienna:'Palacios • música • tarta',Prague:'Castillos • puentes • relojes',Berlin:'Arte urbano • historia • trenes',
    Lisbon:'Tranvías • azulejos • miradores',Athens:'Mitos • templos • sol',Istanbul:'Ferries • cúpulas • bazares',
    'New York':'Taxis • parques • rascacielos',Orlando:'Diversión familiar • lagos • sol',Tokyo:'Trenes • templos • neón',
    Kyoto:'Torii • bambú • té',Singapore:'Superárboles • comida • skyline',Sydney:'Puerto • fauna • playas',
    Copenhagen:'Bicicletas • castillos • canales',Budapest:'Danubio • castillos • baños',Venice:'Canales • puentes • máscaras',
    Florence:'Renacimiento • arte • helado',Madrid:'Palacios • fútbol • arte',Bangkok:'Templos • tuk-tuks • mercados',
    Reykjavik:'Volcanes • arcoíris • puerto',Munich:'Palacios • ciencia • parques',Salzburg:'Fortaleza • música • montañas',
    Zurich:'Lago • tranvías • chocolate',Brussels:'Gofres • cómics • Atomium',Bruges:'Canales • campanas • chocolate',
    Dublin:'Libros • puentes • parques verdes',Edinburgh:'Castillo • colinas • leyendas',Stockholm:'Islas • barcos • casco antiguo',
    Oslo:'Fiordo • esculturas • exploradores',Helsinki:'Fortaleza marina • tranvías • diseño',Milan:'Catedral • diseño • tranvías',
    Naples:'Pizza • volcán • mar',Seville:'Azulejos • palacios • naranjos',Valencia:'Paella • jardines • futuro',
    Porto:'Río • puentes • azulejos',Nice:'Mar • colores • sol',Dubrovnik:'Murallas • mar • calles de piedra',
    Krakow:'Dragón • castillo • plaza',Warsaw:'Sirena • parques • skyline',Bucharest:'Grandes edificios • parques • cultura',
    Sofia:'Montaña • historia • parques','Abu Dhabi':'Cúpulas • museos • mar',Seoul:'Palacios • comida • luces urbanas',
    'Hong Kong':'Ferries • skyline • comida','Kuala Lumpur':'Torres gemelas • comida • ciudad tropical'
  };

  function localizeLaunch(){
    const note=document.querySelector('.kv-language-note');
    if(note) note.innerHTML='<strong>Idioma del producto:</strong> los libros imprimibles de la versión actual se generan en inglés. La interfaz en español facilita la compra.';
    const badge=document.querySelector('.kv-launch-badge');
    if(badge) badge.textContent='✓ Pago único • sin suscripción';
    const faq=document.getElementById('bookLanguageFaq');
    if(faq){
      faq.querySelector('summary').textContent='¿En qué idioma está el libro imprimible?';
      faq.querySelector('p').textContent='Mini, Adventure y Family se generan actualmente en inglés. La web también está disponible en español.';
    }
    const interest=document.getElementById('interest');
    if(interest) [...interest.options].forEach(o=>{if(interestES[o.value])o.textContent=interestES[o.value];});
    const days=document.getElementById('tripDays');
    if(days) [...days.options].forEach(o=>o.textContent=`${o.value} días`);
    document.querySelectorAll('.destination-card').forEach(card=>{
      const name=card.querySelector('h3')?.textContent.trim();
      const p=card.querySelector('p');
      if(name&&p&&destinationES[name])p.textContent=destinationES[name];
    });
    const dialog=document.getElementById('familyCheckoutDialog');
    if(dialog){
      dialog.querySelector('h2').textContent='Crea la aventura familiar';
      const sub=dialog.querySelector('.kv-family-sub');
      if(sub) sub.textContent='Añade hasta tres niños. El destino y la duración vienen del formulario principal. El libro imprimible se genera en inglés.';
      dialog.querySelector('.kv-family-close')?.setAttribute('aria-label','Cerrar');
      const cancel=dialog.querySelector('.kv-family-cancel'); if(cancel) cancel.textContent='Cancelar';
      const submit=dialog.querySelector('button[type="submit"]'); if(submit) submit.textContent='Continuar al pago Family — €14.90';
      [...dialog.querySelectorAll('.kv-family-child')].forEach((card,i)=>{
        const legend=card.querySelector('legend'); if(legend) legend.textContent=`Niño ${i+1}${i===0?' *':' (opcional)'}`;
        const labels=card.querySelectorAll('label');
        const set=(label,text)=>{const n=[...label.childNodes].find(x=>x.nodeType===Node.TEXT_NODE);if(n)n.nodeValue=text;};
        if(labels[0])set(labels[0],'Nombre / apodo');
        if(labels[1])set(labels[1],'Edad');
        if(labels[2])set(labels[2],'Interés');
        const sel=card.querySelector('.kv-child-interest');
        if(sel)[...sel.options].forEach(o=>{if(interestES[o.value])o.textContent=interestES[o.value];});
      });
    }
  }

  function applySpanish(){
    if(typeof translations==='undefined'||typeof currentLang==='undefined')return;
    translations.es=es;
    currentLang='es';
    localStorage.setItem('kidventuro:lang','es');
    applyLanguage();
    document.documentElement.lang='es';
    const toggle=document.getElementById('languageToggle');
    if(toggle){toggle.textContent='EN';toggle.setAttribute('aria-label','Switch to English');}
    const name=(document.getElementById('childName')?.value||'Alex').trim()||'Alex';
    const age=document.getElementById('childAge')?.value||'7';
    const days=document.getElementById('tripDays')?.value||'4';
    const destination=document.getElementById('destination')?.value||'Rome';
    const interest=document.getElementById('interest')?.value||'dinosaurs';
    const interestLabel=(interestES[interest]||interest).replace(/\s+[^\wÁÉÍÓÚÜÑáéíóúüñ&].*$/u,'');
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
    set('previewAge',`EDAD ${age} • ${days} DÍAS`);
    set('previewSentence',`Explora ${destination} con pistas locales, pequeñas misiones y descubrimientos inspirados en ${interestLabel.toLowerCase()}.`);
    set('missionOne',`Detective de ${destination}`);
    set('missionTwo',`Búsqueda de pistas en ${destination}`);
    set('missionThree',`Reto de explorador: ${interestLabel}`);
    set('modalTitle',`Mini misión de ${name} en ${destination}`);
    set('printIntro',`¡Bienvenido a ${destination}, ${name}! Mira con atención, permanece con tu adulto y reúne pistas.`);
    const guide=document.querySelector('[data-destination-guides]');
    if(guide)guide.textContent='Explorar las 50 guías de destinos →';
    localizeLaunch();
  }

  if(typeof translations!=='undefined')translations.es=es;

  const toggle=document.getElementById('languageToggle');
  toggle?.addEventListener('click',event=>{
    if(typeof currentLang==='undefined')return;
    if(currentLang==='bg'){
      event.preventDefault();event.stopImmediatePropagation();
      applySpanish();
      history.replaceState(null,'',location.pathname+'?lang=es'+location.hash);
    }else if(currentLang==='es'){
      event.preventDefault();event.stopImmediatePropagation();
      localStorage.setItem('kidventuro:lang','en');
      location.href='/';
    }
  },true);
  toggle?.addEventListener('click',()=>queueMicrotask(()=>{
    if(typeof currentLang!=='undefined'&&currentLang==='bg'){
      toggle.textContent='ES';toggle.setAttribute('aria-label','Cambiar a español');
    }
  }));

  document.addEventListener('click',event=>{
    if(typeof currentLang==='undefined'||currentLang!=='es')return;
    if(event.target.closest('a[href="#checkout-family"]'))setTimeout(localizeLaunch,0);
  });

  if(wantsEs)queueMicrotask(applySpanish);
})();