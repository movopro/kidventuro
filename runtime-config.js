window.KIDVENTURO_CONFIG={
  apiBase:'https://kidventuro-api.m-oreshkov.workers.dev',
  checkoutMode:'live',
  google:{gtmId:'',tagId:''},
  checkoutUrls:{
    mini:'https://kidventuro.lemonsqueezy.com/checkout/buy/74e8d656-faf0-4f7c-b1f2-cd7ca744452e',
    adventure:'https://kidventuro.lemonsqueezy.com/checkout/buy/07073f00-e652-456f-a6d0-cce68312711d',
    family:'https://kidventuro.lemonsqueezy.com/checkout/buy/88e6cea2-aa8c-4c29-b04e-4a0c23730f12'
  }
};

(()=>{
  const storefront=location.pathname==='/'||location.pathname==='/index.html';
  if(storefront){
    // The canonical storefront always opens in English. Other languages are opt-in.
    try{localStorage.removeItem('kidventuro:lang');}catch{}
    const alternates=[
      ['en','https://kidventuro.com/'],
      ['es','https://kidventuro.com/es/'],
      ['x-default','https://kidventuro.com/']
    ];
    alternates.forEach(([lang,href])=>{
      if(document.head.querySelector(`link[rel="alternate"][hreflang="${lang}"]`))return;
      const link=document.createElement('link');
      link.rel='alternate';link.hreflang=lang;link.href=href;document.head.appendChild(link);
    });
  }

  const loaded=new Map();
  const load=src=>{
    if(loaded.has(src))return loaded.get(src);
    const existing=document.querySelector(`script[data-kv-module="${src}"]`);
    if(existing)return Promise.resolve();
    const promise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;
      s.async=true;
      s.dataset.kvModule=src;
      s.onload=resolve;
      s.onerror=reject;
      document.body.appendChild(s);
    });
    loaded.set(src,promise);
    return promise;
  };

  const wantsSpanish=()=>new URLSearchParams(location.search).get('lang')==='es';
  const loadSpanish=()=>load('spanish.js').catch(error=>console.error('Kidventuro Spanish module failed',error));

  document.addEventListener('DOMContentLoaded',()=>{
    if(!document.getElementById('previewForm'))return;

    // Expand the core 25-card catalog first. Link enhancement follows only after those cards exist.
    // Spanish is not part of the critical path and is fetched only when requested or when the
    // language control is used, avoiding an unnecessary ~14 KB script on most first visits.
    load('site-expansion.js')
      .then(()=>{
        const jobs=[load('destination-links.js?v=20260827-1')];
        if(wantsSpanish())jobs.push(loadSpanish());
        return Promise.all(jobs);
      })
      .catch(error=>console.error('Kidventuro enhancement module failed',error));

    if(!wantsSpanish()){
      document.getElementById('languageToggle')?.addEventListener('click',()=>{
        loadSpanish();
      },{once:true});
    }
  },{once:true});
})();
