(()=>{
  const CHECKOUT_URL='https://kidventuro.lemonsqueezy.com/checkout/buy/002731fe-1735-4287-8223-450d8ef41202';
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
    const data={
      name:(document.getElementById('childName')?.value||'Alex').trim().slice(0,20),
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
    return ref;
  };

  const buildCheckoutUrl=ref=>{
    const url=new URL(CHECKOUT_URL);
    // Only an opaque reference is sent to Lemon Squeezy. Child personalization stays in the browser session.
    url.searchParams.set('checkout[custom][kv_ref]',ref);
    url.searchParams.set('checkout[custom][product]','adventure');
    return url.toString();
  };

  const startCheckout=e=>{
    if(e) e.preventDefault();
    const ref=saveCheckoutSession();
    window.location.assign(buildCheckoutUrl(ref));
  };

  // Replace the demo button node to remove the old full-book click handler from app.js.
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

  // Keep EN/BG labels synchronized with the existing language system.
  try{
    translations.en.openBooklet='Unlock full adventure — €9.90 →';
    translations.bg.openBooklet='Отключи пълното приключение — €9.90 →';
    translations.en.createPreview='Get Adventure — €9.90';
    translations.bg.createPreview='Вземи Adventure — €9.90';
    translations.en.pricingNote='Secure checkout connected. Paid delivery is being tested before public launch.';
    translations.bg.pricingNote='Сигурният checkout е свързан. Платената доставка се тества преди публичния старт.';
    applyLanguage();
  }catch(e){console.warn('Kidventuro checkout labels unavailable',e);}
})();
