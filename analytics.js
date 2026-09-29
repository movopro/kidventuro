(()=>{
  const runtime=window.KIDVENTURO_CONFIG||{};
  const CLOUDFLARE_WEB_ANALYTICS_TOKEN='823a0ee660884dec9ecfad5650f38e4e';
  const publicHost=location.hostname==='kidventuro.com'||location.hostname==='www.kidventuro.com';
  const afterLoadIdle=fn=>{
    const schedule=()=>{
      if('requestIdleCallback' in window)requestIdleCallback(fn,{timeout:1800});
      else setTimeout(fn,0);
    };
    if(document.readyState==='complete')schedule();
    else addEventListener('load',schedule,{once:true});
  };

  // Keep rendered destination hubs aligned with the 50 destinations the paid generator actually supports.
  const hubPath=location.pathname.replace(/index\.html$/,'');
  if(hubPath==='/destinations/'||hubPath==='/es/destinos/'){
    document.querySelectorAll('.seo-grid>.seo-card').forEach((card,index)=>{if(index>=50)card.remove();});
    const spanish=hubPath==='/es/destinos/';
    document.title=spanish?'50 destinos: actividades de viaje para niños | Kidventuro':'50 travel activity guides for kids | Kidventuro';
    const desc=document.querySelector('meta[name="description"]');
    if(desc)desc.content=spanish
      ?'Explora 50 destinos compatibles con actividades de viaje personalizadas e imprimibles para niños de 4 a 12 años.'
      :'Explore 50 supported family destinations with personalized printable travel activities and scavenger hunts for kids ages 4–12.';
    const ogTitle=document.querySelector('meta[property="og:title"]');
    if(ogTitle)ogTitle.content=document.title;
    const ogDesc=document.querySelector('meta[property="og:description"]');
    if(ogDesc)ogDesc.content=spanish
      ?'Explora 50 destinos Kidventuro con actividades familiares imprimibles y misiones.'
      :'Explore 50 Kidventuro destinations with printable family travel activities and missions.';
    const kicker=document.querySelector('.seo-kicker');
    if(kicker)kicker.textContent=spanish?'50 destinos compatibles':'50 supported destinations';
    if(!document.getElementById('kidventuroDestinationHubSchema')){
      const schema=document.createElement('script');
      schema.id='kidventuroDestinationHubSchema';
      schema.type='application/ld+json';
      schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:document.title,url:location.origin+hubPath,isPartOf:{'@type':'WebSite',name:'Kidventuro',url:'https://kidventuro.com/'}});
      document.head.appendChild(schema);
    }
  }

  // Google measurement layer: optional and consent-first. Nothing is requested from Google until the
  // visitor accepts in the banner below; a refusal is remembered, and "Cookie settings" in the footer
  // reopens the choice. No child identity, exact age, checkout reference or order identifier is pushed.
  window.dataLayer=window.dataLayer||[];
  const google=runtime.google||{};
  const gtmId=String(google.gtmId||'').trim();
  const tagId=String(google.tagId||'').trim();
  const hasGtm=/^GTM-[A-Z0-9]+$/i.test(gtmId);
  const hasTag=!hasGtm&&/^(G|AW)-[A-Z0-9-]+$/i.test(tagId);
  const googleConfigured=publicHost&&(hasGtm||hasTag);
  const pageLanguage=()=>{
    const lang=String(document.documentElement.lang||'en').toLowerCase().split('-')[0];
    return ['en','es','bg'].includes(lang)?lang:'en';
  };

  const CONSENT_KEY='kidventuro_analytics_consent_v1';
  const readConsent=()=>{try{return localStorage.getItem(CONSENT_KEY);}catch{return null;}};
  const saveConsent=value=>{try{localStorage.setItem(CONSENT_KEY,value);}catch{}};
  let googleOn=false;
  let pageViewCounted=false;

  const addScript=src=>{
    if(document.querySelector(`script[src="${src}"]`)) return;
    const script=document.createElement('script');
    script.async=true;
    script.src=src;
    document.head.appendChild(script);
  };
  const startGoogle=()=>{
    if(googleOn||!googleConfigured) return;
    googleOn=true;
    if(hasGtm){
      window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
      addScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`);
      return;
    }
    window[`ga-disable-${tagId}`]=false;
    // gtag.js only acts on the `arguments` object. An arrow function that pushes a plain array is
    // silently ignored, which is why Kidventuro sent Google nothing from launch until 2026-09-29.
    window.gtag=window.gtag||function gtag(){window.dataLayer.push(arguments);};
    window.gtag('js',new Date());
    window.gtag('config',tagId,{
      send_page_view:false,
      allow_google_signals:false,
      allow_ad_personalization_signals:false,
      cookie_expires:60*60*24*395
    });
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`);
  };
  const stopGoogle=()=>{
    googleOn=false;
    if(hasTag) window[`ga-disable-${tagId}`]=true;
    // Remove the Google Analytics cookies this site set, on the host and the parent domain.
    String(document.cookie||'').split(';').map(part=>part.split('=')[0].trim())
      .filter(name=>/^_ga(_|$)|^_gid$/.test(name))
      .forEach(name=>{
        for(const scope of ['',`;domain=${location.hostname}`,';domain=.kidventuro.com']){
          document.cookie=`${name}=;Max-Age=0;path=/${scope}`;
        }
      });
  };
  const sendGoogle=(event,params)=>{
    if(!googleOn) return;
    if(hasGtm) window.dataLayer.push({event:`kidventuro_${event}`,kidventuro_event:event,...params});
    else if(typeof window.gtag==='function') window.gtag('event',event,params);
  };
  const pageParams=()=>({page_path:location.pathname||'/',language:pageLanguage()});

  const TEXT={
    en:{label:'Cookie choice',message:'May we use Google Analytics to see which pages help families most? It only sets cookies if you accept.',privacy:'Privacy',decline:'Decline',accept:'Accept',settings:'Cookie settings'},
    es:{label:'Elección de cookies',message:'¿Podemos usar Google Analytics para ver qué páginas ayudan más a las familias? Solo instala cookies si aceptas.',privacy:'Privacidad',decline:'Rechazar',accept:'Aceptar',settings:'Configurar cookies'},
    bg:{label:'Избор за бисквитки',message:'Може ли да използваме Google Analytics, за да виждаме кои страници помагат най-много на семействата? Бисквитки се поставят само ако приемете.',privacy:'Поверителност',decline:'Отказвам',accept:'Приемам',settings:'Бисквитки'}
  };
  const text=()=>TEXT[pageLanguage()]||TEXT.en;
  const ui={};
  const make=(tag,className)=>{const node=document.createElement(tag);if(className)node.className=className;return node;};
  const addStyles=()=>{
    if(document.getElementById('kvConsentStyles')) return;
    const style=make('style');
    style.id='kvConsentStyles';
    style.textContent=[
      // border-box here, not inherited: the /es/ and destination pages do not set it globally.
      '.kv-cc,.kv-cc *{box-sizing:border-box}',
      '.kv-cc{position:fixed;z-index:95;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(640px,calc(100% - 24px));display:flex;flex-wrap:wrap;align-items:center;gap:12px 18px;padding:16px 18px;background:#fffdf9;color:#20312f;border:1px solid #e8e2d8;border-radius:22px;box-shadow:0 20px 60px rgba(42,54,51,.2);font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.kv-cc__text{flex:1 1 280px;margin:0}',
      '.kv-cc__text a{margin-left:4px;color:#2b7a78;font-weight:800;text-decoration:underline}',
      '.kv-cc__actions{display:flex;gap:10px;flex:0 0 auto}',
      '.kv-cc__btn{min-height:44px;min-width:112px;padding:10px 18px;border:2px solid #20312f;border-radius:999px;background:#fff;color:#20312f;font:inherit;font-weight:900;cursor:pointer}',
      '.kv-cc__btn--accept{background:#20312f;color:#fff}',
      '.kv-cc__btn:focus-visible,.kv-cc-link:focus-visible{outline:3px solid #ff7d4d;outline-offset:2px}',
      '@media (max-width:520px){.kv-cc__actions{width:100%}.kv-cc__btn{flex:1}}'
    ].join('');
    document.head.appendChild(style);
  };
  const renderText=()=>{
    const t=text();
    if(ui.banner){
      ui.banner.setAttribute('aria-label',t.label);
      ui.message.textContent=t.message;
      ui.privacy.textContent=t.privacy;
      ui.decline.textContent=t.decline;
      ui.accept.textContent=t.accept;
    }
    if(ui.settings) ui.settings.textContent=t.settings;
  };
  const hideBanner=()=>{
    if(ui.banner) ui.banner.remove();
    ui.banner=null;
  };
  const choose=value=>{
    saveConsent(value);
    hideBanner();
    if(value==='granted'){
      const wasOn=googleOn;
      startGoogle();
      // The page view of the page being read was counted before the choice; give Google that one too.
      if(!wasOn&&pageViewCounted) sendGoogle('page_view',pageParams());
    }else{
      stopGoogle();
    }
  };
  const showBanner=()=>{
    if(!googleConfigured||ui.banner||!document.body) return;
    addStyles();
    const banner=make('div','kv-cc');
    banner.id='kvConsent';
    banner.setAttribute('role','region');
    const paragraph=make('p','kv-cc__text');
    ui.message=make('span');
    ui.privacy=make('a');
    ui.privacy.href='/privacy.html#analytics';
    paragraph.appendChild(ui.message);
    paragraph.appendChild(ui.privacy);
    const actions=make('div','kv-cc__actions');
    ui.decline=make('button','kv-cc__btn');
    ui.decline.type='button';
    ui.decline.setAttribute('data-kv-consent','decline');
    ui.decline.addEventListener('click',()=>choose('denied'));
    ui.accept=make('button','kv-cc__btn kv-cc__btn--accept');
    ui.accept.type='button';
    ui.accept.setAttribute('data-kv-consent','accept');
    ui.accept.addEventListener('click',()=>choose('granted'));
    actions.appendChild(ui.decline);
    actions.appendChild(ui.accept);
    banner.appendChild(paragraph);
    banner.appendChild(actions);
    ui.banner=banner;
    renderText();
    document.body.appendChild(banner);
  };
  const addSettingsLink=()=>{
    const footer=document.querySelector('footer');
    if(!footer||document.getElementById('kvCookieSettings')) return;
    addStyles();
    const target=footer.querySelector('.footer-links')||footer;
    if(target===footer&&String(footer.className||'').includes('seo-foot')) footer.appendChild(document.createTextNode(' · '));
    // A link, not a button, so each of the site's three footer styles dresses it like its neighbours.
    ui.settings=make('a','kv-cc-link');
    ui.settings.href='#';
    ui.settings.id='kvCookieSettings';
    ui.settings.setAttribute('role','button');
    ui.settings.addEventListener('click',event=>{event.preventDefault();showBanner();});
    target.appendChild(ui.settings);
    renderText();
  };

  if(googleConfigured){
    const consent=readConsent();
    if(consent==='granted') startGoogle();
    const setupConsent=()=>{
      addSettingsLink();
      if(consent!=='granted'&&consent!=='denied') showBanner();
      if('MutationObserver' in window){
        new MutationObserver(renderText).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
      }
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setupConsent,{once:true});
    else setupConsent();
    afterLoadIdle(()=>{
      pageViewCounted=true;
      sendGoogle('page_view',pageParams());
    });
  }

  // Cloudflare Web Analytics is useful, but it is not part of the critical rendering path.
  // Start it after the page load/idle window so it does not compete with storefront resources.
  if(publicHost){
    afterLoadIdle(()=>{
      if(document.querySelector('script[src*="static.cloudflareinsights.com/beacon.min.js"]'))return;
      const beacon=document.createElement('script');
      beacon.type='module';
      beacon.src='https://static.cloudflareinsights.com/beacon.min.js';
      beacon.dataset.cfBeacon=JSON.stringify({token:CLOUDFLARE_WEB_ANALYTICS_TOKEN});
      document.head.appendChild(beacon);
    });
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
      lang:pageLanguage(),
      source:attribution.source,
      medium:attribution.medium,
      campaign:attribution.campaign,
      referrer,
      mode:runtime.checkoutMode==='live'?'live':'test'
    };

    // Google gets the same events only after consent (sendGoogle does nothing before it). Page views
    // reach Google through the consent layer above, so they are not sent twice from here.
    if(event!=='page_view'){
      sendGoogle(event,{
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
  afterLoadIdle(()=>track('page_view'));

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
