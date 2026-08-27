(()=>{
  const runtime=window.KIDVENTURO_CONFIG||{};
  const CLOUDFLARE_WEB_ANALYTICS_TOKEN='823a0ee660884dec9ecfad5650f38e4e';
  const publicHost=location.hostname==='kidventuro.com'||location.hostname==='www.kidventuro.com';

  // Google measurement layer. No child identity, exact age, checkout reference or order identifier is pushed.
  window.dataLayer=window.dataLayer||[];
  const google=runtime.google||{};
  const gtmId=String(google.gtmId||'').trim();
  const tagId=String(google.tagId||'').trim();

  if(publicHost&&/^GTM-[A-Z0-9]+$/i.test(gtmId)&&!document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`)){
    window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
    const script=document.createElement('script');
    script.async=true;
    script.src=`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
    document.head.appendChild(script);
  }else if(publicHost&&!gtmId&&/^(G|AW)-[A-Z0-9-]+$/i.test(tagId)&&!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${tagId}"]`)){
    const script=document.createElement('script');
    script.async=true;
    script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
    document.head.appendChild(script);
    const gtag=(...args)=>window.dataLayer.push(args);
    window.gtag=window.gtag||gtag;
    window.gtag('js',new Date());
    window.gtag('config',tagId,{send_page_view:false});
  }

  // Cloudflare Web Analytics: aggregate page/performance analytics without a Kidventuro visitor ID.
  if(publicHost&&!document.querySelector('script[src*="static.cloudflareinsights.com/beacon.min.js"]')){
    const beacon=document.createElement('script');
    beacon.type='module';
    beacon.src='https://static.cloudflareinsights.com/beacon.min.js';
    beacon.dataset.cfBeacon=JSON.stringify({token:CLOUDFLARE_WEB_ANALYTICS_TOKEN});
    document.head.appendChild(beacon);
  }

  const API=String(runtime.apiBase||'').replace(/\/$/,'');
  if(!API) return;

  const params=new URLSearchParams(location.search);
  const attribution={
    source:(params.get('utm_source')||'').slice(0,64),
    medium:(params.get('utm_medium')||'').slice(0,64),
    campaign:(params.get('utm_campaign')||'').slice(0,80)
  };
  let referrer='';
  try{
    if(document.referrer){
      const host=new URL(document.referrer).hostname;
      if(host&&host!==location.hostname) referrer=host.slice(0,100);
    }
  }catch{}

  const allowed=new Set([
    'page_view','preview_generated','sample_opened','pricing_viewed','checkout_clicked',
    'booklet_opened','print_clicked','language_changed'
  ]);

  const track=(event,extra={})=>{
    if(!allowed.has(event)) return;
    const payload={
      event,
      product:['mini','adventure','family'].includes(extra.product)?extra.product:'',
      path:location.pathname||'/',
      lang:document.documentElement.lang==='bg'?'bg':'en',
      source:attribution.source,
      medium:attribution.medium,
      campaign:attribution.campaign,
      referrer,
      mode:runtime.checkoutMode==='live'?'live':'test'
    };

    window.dataLayer.push({
      event:`kidventuro_${event}`,
      kidventuro_event:event,
      product:payload.product,
      page_path:payload.path,
      language:payload.lang,
      traffic_source:payload.source,
      traffic_medium:payload.medium,
      traffic_campaign:payload.campaign,
      external_referrer:payload.referrer,
      checkout_mode:payload.mode
    });

    if(!gtmId&&/^(G|AW)-[A-Z0-9-]+$/i.test(tagId)&&typeof window.gtag==='function'){
      window.gtag('event',event,{
        product:payload.product,
        page_path:payload.path,
        language:payload.lang,
        traffic_source:payload.source,
        traffic_medium:payload.medium,
        traffic_campaign:payload.campaign,
        checkout_mode:payload.mode
      });
    }

    fetch(`${API}/analytics/event`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      credentials:'omit',
      cache:'no-store',
      keepalive:true
    }).catch(()=>{});
  };

  window.KidventuroAnalytics={track};
  track('page_view');

  const preview=document.getElementById('previewForm');
  preview?.addEventListener('submit',()=>track('preview_generated'));

  document.getElementById('openSample')?.addEventListener('click',()=>track('sample_opened'));
  document.getElementById('printSample')?.addEventListener('click',()=>track('sample_opened'));

  const pricing=document.getElementById('pricing');
  if(pricing&&'IntersectionObserver' in window){
    let sent=false;
    const observer=new IntersectionObserver(entries=>{
      if(sent||!entries.some(entry=>entry.isIntersecting)) return;
      sent=true;
      track('pricing_viewed');
      observer.disconnect();
    },{threshold:.25});
    observer.observe(pricing);
  }

  document.getElementById('languageToggle')?.addEventListener('click',()=>setTimeout(()=>track('language_changed'),0));

  const trackPrint=()=>track('print_clicked',{product:document.body.dataset.product||''});
  document.getElementById('modalPrint')?.addEventListener('click',trackPrint);
  document.getElementById('printBtn')?.addEventListener('click',trackPrint);
})();