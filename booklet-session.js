(()=>{
  const API_KEY='kidventuro:api_base';
  const SESSION_KEY='kidventuro:booklet';
  const PAID_KEY='kidventuro:paid_ref';
  const allowed=['name','age','destination','interest','days','lang'];
  const generatorScripts=['catalog-core.js','catalog-1.js','catalog-2.js','catalog-3.js','booklet-v2.js','age-core.js','age-pages.js','age-final.js','trip-days.js'];

  const fail=(message)=>{
    const title=document.getElementById('toolbarTitle');
    const book=document.getElementById('book');
    if(title) title.textContent='Payment verification required';
    if(book) book.innerHTML=`<section style="max-width:720px;margin:70px auto;padding:32px;background:white;border-radius:20px;text-align:center"><h1 style="font-size:32px">Adventure locked</h1><p>${message}</p><p><a href="index.html#pricing">Return to Kidventuro</a></p></section>`;
  };

  const loadScript=src=>new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;
    s.onload=resolve;
    s.onerror=()=>reject(new Error(`Could not load ${src}`));
    document.body.appendChild(s);
  });

  (async()=>{
    let data;
    try{ data=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null'); }catch{}
    if(!data||!data.kv_ref){
      fail('Start from the Kidventuro preview and complete checkout first.');
      return;
    }

    let api='';
    try{ api=sessionStorage.getItem(API_KEY)||''; }catch{}
    if(!api){
      fail('The payment service is not configured yet.');
      return;
    }

    const title=document.getElementById('toolbarTitle');
    if(title) title.textContent='Verifying payment…';

    try{
      const r=await fetch(`${api}/entitlement/status?ref=${encodeURIComponent(data.kv_ref)}`,{cache:'no-store',credentials:'omit'});
      const status=await r.json().catch(()=>({}));
      if(!r.ok||status.paid!==true){
        fail(status.refunded?'This order has been refunded.':'We could not verify a paid order for this adventure.');
        return;
      }
    }catch{
      fail('Payment verification is temporarily unavailable. Please try again from the payment confirmation page.');
      return;
    }

    try{ sessionStorage.setItem(PAID_KEY,data.kv_ref); }catch{}

    const params=new URLSearchParams();
    allowed.forEach(k=>{ if(data[k]!==undefined&&data[k]!==null) params.set(k,String(data[k])); });
    history.replaceState(null,'',`${location.pathname}?${params.toString()}`);

    try{
      for(const src of generatorScripts) await loadScript(src);
      history.replaceState(null,'',location.pathname);
    }catch(e){
      console.error(e);
      fail('The adventure could not be generated. Please reload the page.');
    }
  })();
})();
