(()=>{
  const CHECKOUT_URL='https://kidventuro.lemonsqueezy.com/checkout/buy/002731fe-1735-4287-8223-450d8ef41202';
  const API='https://kidventuro-api.m-oreshkov.workers.dev';
  const SESSION_KEY='kidventuro:booklet';

  const makeRef=()=>{
    if(window.crypto&&typeof window.crypto.randomUUID==='function') return window.crypto.randomUUID();
    const bytes=new Uint8Array(16);
    if(window.crypto&&typeof window.crypto.getRandomValues==='function') window.crypto.getRandomValues(bytes);
    else for(let i=0;i<bytes.length;i++) bytes[i]=Math.floor(Math.random()*256);
    return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  };

  const readExisting=()=>{
    try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{}')||{};}catch{return {};}
  };

  const saveCheckoutSession=()=>{
    const existing=readExisting();
    const ref=existing.kv_ref||makeRef();
    const name=(document.getElementById('childName')?.value||'').trim().slice(0,20);
    if(!name) throw new Error('name_required');

    const data={
      name,
      age:document.getElementById('childAge')?.value||'7',
      destination:document.getElementById('destination')?.value||'Rome',
      interest:document.getElementById('interest')?.value||'dinosaurs',
      days:document.getElementById('tripDays')?.value||'4',
      lang:document.documentElement.lang==='bg'?'bg':'en',
      kv_ref:ref,
      saved_at:Date.now()
    };
    try{
      sessionStorage.setItem(SESSION_KEY,JSON.stringify(data));
      sessionStorage.setItem('kidventuro:checkout_ref',ref);
    }catch(e){console.warn('Kidventuro checkout session could not be stored',e);}
    return data;
  };

  const registerCheckoutSession=async data=>{
    const r=await fetch(`${API}/checkout/session`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'omit',
      cache:'no-store',
      body:JSON.stringify({
        ref:data.kv_ref,
        name:data.name,
        age:data.age,
        destination:data.destination,
        interest:data.interest,
        days:data.days,
        lang:data.lang
      })
    });
    const body=await r.json().catch(()=>({}));
    if(!r.ok||body.ok!==true) throw new Error(body.error||'checkout_session_failed');
  };

  const buildCheckoutUrl=ref=>{
    const url=new URL(CHECKOUT_URL);
    // Lemon Squeezy receives only an opaque reference. Personalization stays with Kidventuro.
    url.searchParams.set('checkout[custom][kv_ref]',ref);
    url.searchParams.set('checkout[custom][product]','adventure');
    return url.toString();
  };

  const startCheckout=async e=>{
    if(e) e.preventDefault();
    const trigger=e?.currentTarget;
    const originalText=trigger?.textContent||'';
    try{
      if(trigger){
        trigger.setAttribute('aria-busy','true');
        trigger.textContent=document.documentElement.lang==='bg'?'Подготвяме плащането…':'Preparing secure checkout…';
      }
      const data=saveCheckoutSession();
      await registerCheckoutSession(data);
      window.location.assign(buildCheckoutUrl(data.kv_ref));
    }catch(err){
      console.error('Kidventuro checkout preparation failed',err);
      alert(document.documentElement.lang==='bg'
        ? 'Не успяхме да подготвим сигурното плащане. Опитай отново след малко.'
        : 'We could not prepare the secure checkout. Please try again in a moment.');
      if(trigger){
        trigger.removeAttribute('aria-busy');
        trigger.textContent=originalText;
      }
    }
  };

  // Replace the old full-book node so no demo-generation click handler remains attached.
  const oldBooklet=document.getElementById('openBooklet');
  if(oldBooklet){
    const checkoutButton=oldBooklet.cloneNode(true);
    oldBooklet.replaceWith(checkoutButton);
    checkoutButton.addEventListener('click',startCheckout);
  }

  const pricingButton=document.querySelector('.price-card.featured a[data-i18n="createPreview"]');
  if(pricingButton){
    pricingButton.setAttribute('href','#checkout');
    pricingButton.addEventListener('click',startCheckout);
  }

  try{
    translations.en.openBooklet='Unlock full adventure — €9.90 →';
    translations.bg.openBooklet='Отключи пълното приключение — €9.90 →';
    translations.en.createPreview='Get Adventure — €9.90';
    translations.bg.createPreview='Вземи Adventure — €9.90';
    translations.en.pricingNote='Secure one-time checkout. Personalized digital delivery after payment.';
    translations.bg.pricingNote='Сигурно еднократно плащане. Персонализирана дигитална доставка след плащане.';
    applyLanguage();
  }catch(e){console.warn('Kidventuro checkout labels unavailable',e);}
})();
