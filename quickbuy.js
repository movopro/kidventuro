/* Kidventuro quick buy + launch offer.
 *
 * - window.KVOffer: one source of truth for the time-limited launch code (config: runtime-config.js -> offer).
 * - [data-kv-quickbuy]: a compact order form (name, age, destination, interest) that goes straight to the secure
 *   Lemon Squeezy checkout: type a name, tap the button. Same payload, storage keys and Worker call as checkout.js,
 *   so success.html and booklet.html work unchanged.
 * - [data-kv-offer], [data-kv-countdown], [data-kv-price="mini|adventure|family"]: offer banner, live countdown and
 *   price tags. Everything offer-related disappears when the offer expires; list prices stay.
 * - a[data-kv-sample]: free sample PDF links (privacy-safe 'sample_downloaded' event).
 * No cookies, no IDs: only the existing privacy-safe analytics events.
 */
(()=>{
  const cfg=window.KIDVENTURO_CONFIG||{};
  const API=String(cfg.apiBase||'').replace(/\/$/,'');
  const URLS=cfg.checkoutUrls||{};
  const offer=cfg.offer||null;
  const LIST={mini:590,adventure:990,family:1490};
  const SESSION_KEY='kidventuro:booklet';
  const eur=c=>'€'+(c/100).toFixed(2);
  const startsAt=offer?Date.parse(offer.startsAt||'1970-01-01T00:00:00Z'):0;
  const endsAt=offer?Date.parse(offer.endsAt||''):0;
  const active=()=>Boolean(offer&&offer.code&&offer.percent>0&&Number.isFinite(endsAt)&&Date.now()>=startsAt&&Date.now()<endsAt);
  const discounted=cents=>Math.round(cents*(100-offer.percent)/100);
  const track=(event,extra)=>{try{window.KidventuroAnalytics?.track(event,extra);}catch{}};

  const decorate=url=>{
    if(!active()) return url;
    const u=new URL(url);
    u.searchParams.set('checkout[discount_code]',offer.code);
    return u.toString();
  };
  window.KVOffer={active,eur,list:LIST,discounted,decorate,code:()=>active()?offer.code:'',percent:()=>offer?offer.percent:0,endsAt:()=>endsAt};

  const POPULAR=['Orlando','Paris','London','Rome','Barcelona','Vienna','Prague','Dubai','Rovaniemi','Reykjavik'];
  const INTERESTS=[
    ['dinosaurs','Dinosaurs 🦖'],['space','Space 🚀'],['animals','Animals 🐾'],['football','Football ⚽'],['art','Art 🎨'],['mysteries','Mysteries 🔎'],
    ['castles','Castles 🏰'],['science','Science 🔬'],['vehicles','Vehicles 🚗'],['nature','Nature 🌿'],['food','Food 🍕'],['music','Music 🎵'],
    ['superheroes','Superheroes 🦸'],['history','History 📜'],['ocean','Ocean 🐠'],['trains','Trains 🚂']
  ];
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  /* ---------- price tags + offer banner + countdown ---------- */
  const priceHtml=product=>{
    const c=LIST[product];
    return active()?`<s class="kv-was">${eur(c)}</s> <b class="kv-now">${eur(discounted(c))}</b>`:`<b class="kv-now">${eur(c)}</b>`;
  };
  const renderPrices=()=>document.querySelectorAll('[data-kv-price]').forEach(el=>{el.innerHTML=priceHtml(el.dataset.kvPrice);});
  const pad=n=>String(n).padStart(2,'0');
  const left=()=>{
    const ms=Math.max(0,endsAt-Date.now());
    const s=Math.floor(ms/1000);
    const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),sec=s%60;
    return `${d}d ${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
  };
  let timer=0;
  const renderOffer=()=>{
    const on=active();
    document.documentElement.classList.toggle('kv-offer-on',on);
    document.querySelectorAll('[data-kv-offer]').forEach(el=>{el.hidden=!on;});
    document.querySelectorAll('[data-kv-code]').forEach(el=>{el.textContent=on?offer.code:'';});
    document.querySelectorAll('[data-kv-percent]').forEach(el=>{el.textContent=on?String(offer.percent):'';});
    document.querySelectorAll('[data-kv-countdown]').forEach(el=>{el.textContent=on?left():'';});
    renderPrices();
    if(!on&&timer){clearInterval(timer);timer=0;}
  };
  renderOffer();
  if(active()){
    timer=setInterval(renderOffer,1000);
    if(document.querySelector('[data-kv-offer]')) track('offer_viewed');
  }

  /* ---------- free sample links ---------- */
  document.addEventListener('click',e=>{
    const a=e.target.closest?.('a[data-kv-sample]');
    if(a) track('sample_downloaded');
  });

  /* ---------- quick buy form ---------- */
  const makeRef=()=>{
    if(window.crypto&&typeof window.crypto.randomUUID==='function') return window.crypto.randomUUID();
    const b=new Uint8Array(16);
    window.crypto.getRandomValues(b);
    return [...b].map(x=>x.toString(16).padStart(2,'0')).join('');
  };
  const failMessage='We could not prepare the secure checkout. Check the details and try again.';

  const go=async(form,product)=>{
    const status=form.querySelector('.kv-qb-status');
    const btn=form.querySelector('.kv-qb-go');
    const name=form.elements.name.value.trim().slice(0,20);
    if(!name){
      status.textContent="Add your child's first name (or a nickname) so the pack can be personal.";
      form.elements.name.focus();
      return;
    }
    const url=URLS[product];
    if(!url||!API){status.textContent=failMessage;return;}
    const data={
      product,name,
      age:form.elements.age.value,
      destination:form.elements.destination.value,
      interest:form.elements.interest.value,
      days:form.elements.days.value||'4',
      lang:'en',
      kv_ref:makeRef(),
      saved_at:Date.now()
    };
    const original=btn.innerHTML;
    btn.disabled=true;btn.setAttribute('aria-busy','true');btn.textContent='Preparing secure checkout…';
    status.textContent='';
    try{
      try{
        sessionStorage.removeItem('kidventuro:paid_ref');
        sessionStorage.removeItem('kidventuro:ai');
        sessionStorage.setItem(SESSION_KEY,JSON.stringify(data));
        sessionStorage.setItem('kidventuro:checkout_ref',data.kv_ref);
      }catch{}
      track('checkout_clicked',{product});
      const r=await fetch(`${API}/checkout/session`,{
        method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',
        body:JSON.stringify({ref:data.kv_ref,product,name:data.name,age:data.age,destination:data.destination,interest:data.interest,days:data.days,lang:'en'})
      });
      const body=await r.json().catch(()=>({}));
      if(!r.ok||body.ok!==true) throw new Error(body.error||'checkout_session_failed');
      const u=new URL(decorate(url));
      u.searchParams.set('checkout[custom][kv_ref]',data.kv_ref);
      u.searchParams.set('checkout[custom][product]',product);
      window.location.assign(u.toString());
    }catch(err){
      console.error('Kidventuro quick checkout failed',err);
      status.textContent=failMessage;
      btn.disabled=false;btn.removeAttribute('aria-busy');btn.innerHTML=original;
    }
  };

  const swapGallery=dest=>{
    const slug=String(dest).toLowerCase().replace(/\s+/g,'-');
    document.querySelectorAll('img[data-kv-sample-img]').forEach(img=>{
      const kind=img.dataset.kvSampleImg;
      const next=`/assets/samples/${slug}-${kind}.webp`;
      if(!POPULAR.includes(dest)) return;
      if(img.getAttribute('src')!==next){img.src=next;img.alt=`${dest} ${kind} page, personalized sample`;}
    });
    document.querySelectorAll('a[data-kv-sample-pdf]').forEach(a=>{
      if(POPULAR.includes(dest)){a.href=`/assets/samples/${slug}-free-sample.pdf`;a.textContent=`Free ${dest} sample page (PDF)`;}
    });
    document.querySelectorAll('[data-kv-dest]').forEach(el=>{el.textContent=dest;});
    document.querySelectorAll('[data-kv-cap]').forEach(el=>{el.textContent=POPULAR.includes(dest)?`Real pages from a ${dest} pack made for “Mia”, age 7.`:`Sample pages shown for Rome. Yours is built for ${dest}, with your child's name.`;});
  };

  const mount=root=>{
    const fixed=root.dataset.destination||'';
    const dests=fixed?[fixed]:POPULAR;
    const destField=fixed
      ?`<input type="hidden" name="destination" value="${esc(fixed)}">`
      :`<label>Destination<select name="destination">${dests.map(d=>`<option${d==='Rome'?' selected':''}>${esc(d)}</option>`).join('')}</select></label>`;
    root.innerHTML=`<form class="kv-qb${fixed?" kv-qb-fixed":""}" novalidate>
      <div class="kv-qb-row">
        <label class="kv-qb-name">Child's first name<input name="name" maxlength="20" autocomplete="off" enterkeyhint="go" placeholder="e.g. Mia" required></label>
        <label>Age<select name="age">${[4,5,6,7,8,9,10,11,12].map(a=>`<option${a===7?' selected':''}>${a}</option>`).join('')}</select></label>
      </div>
      <div class="kv-qb-row">
        ${destField}
        <label>Loves<select name="interest">${INTERESTS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>
      </div>
      <input type="hidden" name="days" value="4">
      <button class="kv-qb-go" type="submit"><span>Get the 25-page pack</span> <span class="kv-qb-price" data-kv-price="adventure"></span></button>
      <p class="kv-qb-status" role="status" aria-live="polite"></p>
      <p class="kv-qb-fine" data-kv-offer hidden>Launch code <b data-kv-code></b> is applied automatically at checkout.</p>
    </form>`;
    const form=root.querySelector('form');
    let started=false;
    form.addEventListener('input',()=>{if(!started){started=true;track('quickbuy_started',{product:'adventure'});}},{once:false});
    form.addEventListener('submit',e=>{e.preventDefault();go(form,'adventure');});
    const sel=form.elements.destination;
    if(sel&&sel.tagName==='SELECT'){
      sel.addEventListener('change',()=>swapGallery(sel.value));
      // Add the remaining destinations once the page's own catalog has filled #destination.
      const more=()=>{
        const src=document.getElementById('destination');
        if(!src||src.options.length<=1) return;
        const known=new Set(POPULAR);
        const rest=[...src.options].map(o=>o.value).filter(v=>v&&!known.has(v));
        if(!rest.length) return;
        const g=document.createElement('optgroup');g.label='More destinations';
        rest.sort().forEach(v=>{const o=document.createElement('option');o.textContent=v;g.appendChild(o);});
        sel.appendChild(g);
      };
      window.addEventListener('load',()=>setTimeout(more,1200));
    }
    renderPrices();
  };
  document.querySelectorAll('[data-kv-quickbuy]').forEach(mount);

  window.KVQuickBuy={mount,swapGallery,popular:POPULAR};
})();
