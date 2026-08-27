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
  if(location.pathname==='/'||location.pathname==='/index.html'){
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
  const load=src=>new Promise((resolve,reject)=>{
    if(document.querySelector(`script[data-kv-module="${src}"]`))return resolve();
    const s=document.createElement('script');
    s.src=src;s.defer=true;s.dataset.kvModule=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s);
  });
  document.addEventListener('DOMContentLoaded',()=>{
    if(!document.getElementById('previewForm'))return;
    load('site-expansion.js')
      .then(()=>load('destination-links.js'))
      .then(()=>load('spanish.js'))
      .catch(error=>console.error('Kidventuro enhancement module failed',error));
  },{once:true});
})();