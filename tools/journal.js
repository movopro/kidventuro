// Printable travel journal. Builds A4 pages in the browser; nothing is sent or stored. The child's name, if typed,
// only appears on the printed cover and is not kept in the URL.
(()=>{
  const form=document.getElementById('journalForm'),out=document.getElementById('journalOut');
  if(!form||!out)return;
  const es=document.documentElement.lang==='es';
  const T=es?{
    cover:'Mi diario de viaje',to:d=>`Viaje a ${d}`,by:n=>`Escrito por ${n}`,anywhere:'mi gran viaje',day:n=>`Día ${n}`,
    date:'Fecha',weather:'Rodea el tiempo de hoy',where:'Hoy hemos estado en',best:'Lo mejor de hoy',tasted:'Algo nuevo que he probado',
    learned:'Algo que he aprendido',draw:'Dibuja tu momento favorito',stick:'Pega aquí una entrada, un billete o una hoja',mood:'¿Cómo me siento?',
    numbers:'Mi viaje en números',nums:['Kilómetros (más o menos)','Helados','Fotos','Palabras nuevas','Escaleras subidas','Medios de transporte'],
    end:'Lo que nunca quiero olvidar',postcard:'Escribe una postal a alguien de casa',sign:'Firma',
    youngBest:'Dibuja o escribe una palabra',olderBest:'Escribe tres frases: qué pasó, por qué te gustó y qué te sorprendió'
  }:{
    cover:'My travel journal',to:d=>`Trip to ${d}`,by:n=>`Written by ${n}`,anywhere:'my big trip',day:n=>`Day ${n}`,
    date:'Date',weather:'Circle today’s weather',where:'Today we went to',best:'The best thing today',tasted:'Something new I tasted',
    learned:'Something I learned',draw:'Draw your favourite moment',stick:'Stick a ticket, a receipt or a leaf here',mood:'How do I feel?',
    numbers:'My trip in numbers',nums:['Kilometres (roughly)','Ice creams','Photos','New words','Stairs climbed','Kinds of transport'],
    end:'What I never want to forget',postcard:'Write a postcard to someone at home',sign:'Signed',
    youngBest:'Draw it or write one word',olderBest:'Write three sentences: what happened, why you liked it and what surprised you'
  };
  const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  const lines=n=>{const w=el('div','j-lines');for(let i=0;i<n;i++)w.appendChild(el('span'));return w;};
  const label=t=>el('p','j-label',t);

  function build(v){
    out.textContent='';
    const young=v.age<=6,dest=v.dest||T.anywhere;
    const cover=el('section','j-page j-cover');
    cover.append(el('p','j-kicker','KIDVENTURO'),el('h2',null,T.cover),el('p','j-dest',T.to(dest)));
    if(v.name)cover.appendChild(el('p','j-by',T.by(v.name)));
    cover.appendChild(el('div','j-box j-big',T.draw));
    out.appendChild(cover);
    for(let d=1;d<=v.days;d++){
      const p=el('section','j-page');
      p.append(el('h2',null,T.day(d)),label(`${T.date}: ____________________`));
      p.append(label(T.weather),el('p','j-icons','☀️  ⛅  🌧️  ❄️  🌬️'));
      p.append(label(T.where),lines(young?1:2));
      p.append(label(`${T.best} · ${young?T.youngBest:T.olderBest}`),young?el('div','j-box',''):lines(4));
      if(!young)p.append(label(T.tasted),lines(1),label(T.learned),lines(2));
      p.append(label(T.mood),el('p','j-icons','😄  🙂  😐  😴  🤩'));
      p.append(el('div','j-box'+(young?' j-big':''),d%2?T.draw:T.stick));
      out.appendChild(p);
    }
    const last=el('section','j-page');
    last.append(el('h2',null,T.numbers));
    const grid=el('div','j-nums');T.nums.forEach(n=>{const c=el('div');c.append(el('span',null,n),el('b',null,'_____'));grid.appendChild(c);});
    last.append(grid,label(T.end),lines(young?2:5),label(T.postcard),el('div','j-box j-postcard',''),label(`${T.sign}: ____________________`));
    out.appendChild(last);
    document.getElementById('journalActions')?.removeAttribute('hidden');
  }
  function read(){
    const fd=new FormData(form);
    return{dest:String(fd.get('dest')||''),days:Math.max(1,Math.min(14,parseInt(fd.get('days'),10)||5)),age:parseInt(fd.get('age'),10)||7,name:String(fd.get('name')||'').trim().slice(0,24)};
  }
  const q=new URLSearchParams(location.search);
  for(const k of ['dest','days','age']){const e=form.elements.namedItem(k);if(e&&q.has(k))e.value=q.get(k);}
  form.addEventListener('submit',e=>{
    e.preventDefault();const v=read();build(v);
    const p=new URLSearchParams();if(v.dest)p.set('dest',v.dest);p.set('days',v.days);p.set('age',v.age);
    history.replaceState(null,'','?'+p.toString()+'#journal');
    out.focus();
  });
  document.getElementById('journalPrint')?.addEventListener('click',()=>window.print());
  if(q.has('days'))build(read());
})();
