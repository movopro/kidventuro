// Age-smart packing list. Runs entirely in the browser: nothing is sent or stored; the choices live in the URL so a list can be shared.
(()=>{
  const form=document.getElementById('packForm'),out=document.getElementById('packOut');
  if(!form||!out)return;
  const es=document.documentElement.lang==='es';
  const T=es?{
    docs:'Documentos y dinero',clothes:'Ropa',climate:'Según el clima',health:'Salud y seguridad',journey:'Para el viaje',sleep:'Para dormir',small:'Para los más pequeños',fun:'Entretenimiento sin pantalla',tech:'Tecnología',kid:n=>`Mochila de ${n}`,
    title:(d,n)=>`Lista de equipaje${d?' para '+d:''} · ${n} noches`,child:a=>`niño de ${a} años`,none:'Añade la edad de al menos un niño.'
  }:{
    docs:'Documents and money',clothes:'Clothes',climate:'For the weather',health:'Health and safety',journey:'For the journey',sleep:'Sleep',small:'For the little ones',fun:'Screen-free fun',tech:'Tech',kid:n=>`${n}'s backpack`,
    title:(d,n)=>`Packing list${d?' for '+d:''} · ${n} nights`,child:a=>`${a}-year-old`,none:'Add the age of at least one child.'
  };
  const L=(en,s)=>es?s:en;
  const qty=(per,nights,cap=7)=>Math.max(1,Math.ceil(Math.min(nights,cap)*per));

  function build(v){
    const ages=v.ages.filter(a=>a>=1&&a<=17).sort((a,b)=>a-b),n=v.nights,kids=ages.length;
    const youngest=ages[0],oldest=ages[ages.length-1];
    const S=[];
    const sec=(h,items)=>{const list=items.filter(Boolean);if(list.length)S.push([h,list]);};
    sec(T.docs,[
      v.transport==='plane'&&L('Passports or ID cards for every child (check they are valid for 6 months)','Pasaporte o DNI de cada niño (válido al menos 6 meses)'),
      L('Travel insurance details and the European Health Insurance Card if you have one','Datos del seguro de viaje y Tarjeta Sanitaria Europea si la tenéis'),
      L('A note with your phone number in each child’s pocket','Una nota con vuestro teléfono en el bolsillo de cada niño'),
      kids&&L('Recent photo of each child on your phone (in case you get separated)','Foto reciente de cada niño en el móvil (por si os separáis)'),
      v.transport==='car'&&L('Car seats or booster seats that meet local rules','Sillas o elevadores de coche según la normativa local'),
      L('Two payment cards kept in different bags, plus a little local cash','Dos tarjetas en bolsas distintas y algo de efectivo local')
    ]);
    const tops=qty(1,n),bottoms=qty(.6,n),under=qty(1,n)+(youngest<=5?2:1);
    sec(T.clothes,[
      `${tops} ${L('T-shirts or tops per child','camisetas por niño')}`,
      `${bottoms} ${L('trousers, shorts or skirts per child','pantalones, shorts o faldas por niño')}`,
      `${under} ${L('sets of underwear and socks per child','mudas de ropa interior y calcetines por niño')}`,
      L('One warm layer per child (fleece or hoodie), even in summer for planes and air-conditioning','Una capa de abrigo por niño (forro polar o sudadera), también en verano para aviones y aire acondicionado'),
      L('Comfortable shoes that are already worn in, plus sandals or slippers','Zapatos cómodos ya usados y sandalias o zapatillas'),
      youngest<=5&&L('A full spare outfit in the day bag','Una muda completa en la mochila de día'),
      n>7&&L('Travel laundry soap or a laundrette plan (pack for 7 nights, wash once)','Jabón de viaje o plan de lavandería (equipaje para 7 noches y lavar una vez)')
    ]);
    const C={
      cold:[L('Insulated waterproof jacket per child','Chaqueta impermeable y acolchada por niño'),L('Thermal base layers (top and leggings)','Ropa térmica (camiseta y mallas)'),L('Hat, neck warmer and waterproof gloves, plus a spare pair of gloves','Gorro, braga de cuello y guantes impermeables, con un par de repuesto'),L('Warm waterproof boots with good grip','Botas impermeables y abrigadas con buen agarre'),L('Lip balm and rich hand cream','Bálsamo labial y crema de manos'),youngest<=6&&L('Stroller footmuff or sledge for the smallest','Saco de carrito o trineo para el más pequeño')],
      mild:[L('Light waterproof jacket per child','Chubasquero ligero por niño'),L('Compact umbrella','Paraguas plegable'),L('One pair of long trousers and one pair of shorts per child','Un pantalón largo y uno corto por niño'),L('Sun cream (SPF 30+) and sunglasses','Protector solar (SPF 30+) y gafas de sol')],
      warm:[L('Sun hats with a brim','Gorros con visera o ala'),L('Sun cream SPF 50 and after-sun','Protector solar SPF 50 y aftersun'),L('Swimwear and a quick-dry towel per child','Bañador y toalla de secado rápido por niño'),L('Refillable water bottle per child','Botella reutilizable por niño'),L('A light long-sleeve top for the evening and for sun protection','Camiseta fina de manga larga para la noche y el sol')],
      tropical:[L('Insect repellent suitable for children (DEET or icaridin as advised for their age)','Repelente de insectos apto para niños (DEET o icaridina según la edad)'),L('Light long sleeves and long trousers for dusk','Manga larga y pantalón largo ligeros para el atardecer'),L('Rash vests (UV swim tops) and SPF 50','Camisetas UV para el agua y SPF 50'),L('Oral rehydration sachets','Sobres de suero oral'),L('Water shoes for beaches and rocks','Escarpines para playa y rocas'),L('Poncho for short heavy showers','Poncho para chaparrones')]
    };
    sec(T.climate,C[v.climate]||C.mild);
    sec(T.health,[
      L('Children’s paracetamol or ibuprofen in the right dose for their weight','Paracetamol o ibuprofeno infantil en la dosis adecuada a su peso'),
      L('Plasters, antiseptic wipes, tweezers and a thermometer','Tiritas, toallitas antisépticas, pinzas y termómetro'),
      L('Any regular medicines, with a copy of the prescription','Medicación habitual y copia de la receta'),
      v.transport!=='train'&&L('Travel-sickness remedy suitable for their age (ask your pharmacist)','Remedio para el mareo apto para su edad (consulta en la farmacia)'),
      L('Hand gel and a pack of wet wipes','Gel de manos y toallitas húmedas'),
      v.water&&L('Swim nappies or float suit for non-swimmers','Pañales de agua o bañador con flotador para quien no nada')
    ]);
    sec(T.journey,[
      v.transport==='plane'&&L('Chewy snack or drink for take-off and landing (ear pressure)','Algo para masticar o beber al despegar y aterrizar (presión en los oídos)'),
      v.transport==='plane'&&L('Liquids under 100 ml in a clear bag','Líquidos de menos de 100 ml en bolsa transparente'),
      v.transport==='car'&&L('Sick bags, kitchen roll and a rubbish bag within reach','Bolsas para el mareo, papel de cocina y bolsa de basura a mano'),
      v.transport==='car'&&L('Sunshades for the rear windows','Parasoles para las ventanillas traseras'),
      v.transport==='train'&&L('Seat reservations printed or saved offline','Reservas de asiento impresas o guardadas sin conexión'),
      L('Snacks that do not crumble or melt','Tentempiés que no se deshagan ni se derritan'),
      L('Empty water bottle per child (fill after security)','Botella vacía por niño (llenar después del control)'),
      youngest<=6&&L('Small blanket and a favourite cuddly toy','Mantita y su peluche favorito')
    ]);
    sec(T.sleep,[
      L('Pyjamas per child (one set for every 3–4 nights)','Pijama por niño (uno cada 3–4 noches)'),
      youngest<=6&&L('Night light and the usual bedtime book','Luz quitamiedos y el cuento de siempre'),
      L('Portable blackout blind or clips for curtains','Estor opaco portátil o pinzas para cortinas'),
      youngest<=3&&L('Travel cot sheet and sleeping bag (check if a cot is provided)','Sábana y saco para la cuna de viaje (pregunta si la hay)')
    ]);
    if(youngest<=5)sec(T.small,[
      v.stroller&&L('Light travel stroller with rain cover and sunshade','Carrito ligero con burbuja para lluvia y parasol'),
      !v.stroller&&youngest<=4&&L('Child carrier for stairs, crowds and cobbles','Mochila portabebés para escaleras, multitudes y adoquines'),
      youngest<=3&&`${qty(6,n,14)} ${L('nappies, plus wipes and changing mat (buy more locally)','pañales, toallitas y cambiador (compra más allí)')}`,
      youngest>=3&&youngest<=5&&L('Travel potty or foldable toilet seat','Orinal de viaje o reductor plegable'),
      L('Wrist link or brightly coloured hats for crowded places','Muñequera de seguridad o gorros de colores vivos para sitios concurridos'),
      L('Plastic plate, bowl and spoon','Plato, cuenco y cuchara de plástico')
    ]);
    sec(T.fun,[
      L('Printed Kidventuro activity book for the destination, a clipboard and pencils','Cuaderno Kidventuro impreso del destino, carpeta rígida y lápices'),
      youngest<=6&&L('Stickers, a magnetic drawing board and two small toys','Pegatinas, pizarra magnética y dos juguetes pequeños'),
      oldest>=7&&L('Pocket card game (Uno, Dobble or a travel chess set)','Juego de cartas de bolsillo (Uno, Dobble o ajedrez de viaje)'),
      oldest>=8&&L('Travel journal or notebook and a glue stick for tickets','Diario de viaje y pegamento para guardar entradas'),
      oldest>=9&&L('A book or audiobook downloaded for offline use','Un libro o audiolibro descargado para usar sin conexión'),
      L('A small ball or frisbee for parks','Una pelota pequeña o frisbee para los parques')
    ]);
    sec(T.tech,[
      L('Chargers and a power bank (power banks go in hand luggage)','Cargadores y batería externa (la batería va en cabina)'),
      L('Plug adapter for the destination','Adaptador de enchufe para el destino'),
      oldest>=4&&L('Child headphones with a volume limit','Auriculares infantiles con límite de volumen'),
      L('Offline maps and the booking confirmations saved on the phone','Mapas sin conexión y reservas guardadas en el móvil')
    ]);
    ages.forEach((a,i)=>{
      const name=v.names?.[i]||T.child(a);
      sec(T.kid(name),[
        a>=4&&L('Own small backpack they can carry','Su propia mochila pequeña'),
        L('Water bottle and one snack','Botella de agua y un tentempié'),
        a<=6&&L('One comfort toy (not the irreplaceable one)','Un peluche (que no sea el insustituible)'),
        a>=7&&L('Pencil case and the activity book','Estuche y el cuaderno de actividades'),
        a>=10&&L('A small amount of pocket money in a zipped pocket','Algo de dinero de bolsillo en un bolsillo con cremallera'),
        a>=8&&L('Their own copy of the hotel address','Su propia copia de la dirección del alojamiento')
      ]);
    });
    return S;
  }

  function read(){
    const fd=new FormData(form);
    return{
      dest:String(fd.get('dest')||''),nights:Math.max(1,Math.min(30,parseInt(fd.get('nights'),10)||5)),
      ages:[fd.get('age1'),fd.get('age2'),fd.get('age3')].map(x=>parseInt(x,10)).filter(Number.isFinite),
      climate:String(fd.get('climate')||'mild'),transport:String(fd.get('transport')||'plane'),
      stroller:fd.get('stroller')==='1',water:fd.get('water')==='1'
    };
  }
  function render(v){
    out.textContent='';
    if(!v.ages.length){const p=document.createElement('p');p.textContent=T.none;out.appendChild(p);return;}
    const h=document.createElement('h2');h.id='packTitle';h.textContent=T.title(v.dest,v.nights);out.appendChild(h);
    const wrap=document.createElement('div');wrap.className='pack-out';
    for(const [title,items] of build(v)){
      const s=document.createElement('section'),h3=document.createElement('h3'),ul=document.createElement('ul');
      h3.textContent=title;s.appendChild(h3);
      items.forEach(t=>{const li=document.createElement('li');li.textContent=t;ul.appendChild(li);});
      s.appendChild(ul);wrap.appendChild(s);
    }
    out.appendChild(wrap);
    document.getElementById('packActions')?.removeAttribute('hidden');
  }
  function sync(v){
    const q=new URLSearchParams();
    if(v.dest)q.set('dest',v.dest);q.set('nights',v.nights);v.ages.forEach((a,i)=>q.set('age'+(i+1),a));
    q.set('climate',v.climate);q.set('transport',v.transport);if(v.stroller)q.set('stroller','1');if(v.water)q.set('water','1');
    history.replaceState(null,'','?'+q.toString()+'#list');
  }
  // Pre-fill from the URL (shared lists, links from guide pages).
  const q=new URLSearchParams(location.search);
  for(const [k,val] of q){const el=form.elements.namedItem(k);if(!el)continue;if(el.type==='checkbox')el.checked=val==='1';else el.value=val;}
  form.addEventListener('submit',e=>{e.preventDefault();const v=read();render(v);sync(v);out.focus();});
  document.getElementById('packPrint')?.addEventListener('click',()=>window.print());
  document.getElementById('packCopy')?.addEventListener('click',async e=>{
    const text=[...out.querySelectorAll('h2,h3,li')].map(x=>(x.tagName==='LI'?'[ ] ':'\n')+x.textContent).join('\n').trim();
    try{await navigator.clipboard.writeText(text);e.target.textContent=es?'Copiada':'Copied';}catch{e.target.textContent=es?'No se pudo copiar':'Copy failed';}
  });
  if(q.has('age1'))render(read());
})();
