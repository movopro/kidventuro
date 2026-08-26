(()=>{
  const runtime=window.KIDVENTURO_CONFIG||{};
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
