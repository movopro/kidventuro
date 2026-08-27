(()=>{
  const qs=selector=>document.querySelector(selector);
  const isBg=()=>document.documentElement.lang==='bg';
  const destination=()=>qs('#destination')?.value||'Rome';
  const words={
    en:{
      shareKicker:'TRAVELLING WITH FRIENDS?',
      shareTitle:'Share this trip idea',
      shareText:'Send a destination-ready preview to another parent. The link includes only the destination — never the child’s name.',
      shareButton:'Share the idea',
      pinButton:'Save on Pinterest',
      copied:'Link copied',
      shareMessage:name=>`Planning a family trip to ${name}? Kidventuro turns it into a personalized printable adventure for kids ages 4–12.`,
      assuranceTitle:'Your adventure is protected',
      assuranceText:'After payment, your personalized book opens for printing or saving as PDF. If access or generation fails, we will help restore it.',
      assuranceMeta:'Secure checkout by Lemon Squeezy • No subscription • No child account',
      assuranceLink:'Delivery & refund policy',
      sticky:'Create a free preview',
      stickyPrice:'from €5.90'
    },
    bg:{
      shareKicker:'ПЪТУВАТЕ С ПРИЯТЕЛИ?',
      shareTitle:'Сподели идеята за пътуването',
      shareText:'Изпрати преглед за избраната дестинация на друг родител. Линкът съдържа само дестинацията — никога името на детето.',
      shareButton:'Сподели идеята',
      pinButton:'Запази в Pinterest',
      copied:'Линкът е копиран',
      shareMessage:name=>`Планирате семейно пътуване до ${name}? Kidventuro го превръща в персонализирано приключение за печат за деца 4–12 г.`,
      assuranceTitle:'Приключението ти е защитено',
      assuranceText:'След плащане персонализираната книжка се отваря за печат или запазване като PDF. Ако достъпът или генерирането не работят, ще помогнем да ги възстановим.',
      assuranceMeta:'Сигурно плащане с Lemon Squeezy • Без абонамент • Без детски профил',
      assuranceLink:'Политика за доставка и възстановяване',
      sticky:'Направи безплатен преглед',
      stickyPrice:'от €5.90'
    }
  };

  const shareUrl=()=>{
    const url=new URL('/',location.origin);
    url.searchParams.set('destination',destination());
    url.searchParams.set('utm_source','customer_share');
    url.searchParams.set('utm_medium','referral');
    url.searchParams.set('utm_campaign','preview_share');
    url.hash='create';
    return url.toString();
  };

  const copyLink=async button=>{
    const value=shareUrl();
    try{
      await navigator.clipboard.writeText(value);
    }catch{
      const field=document.createElement('textarea');
      field.value=value;
      field.setAttribute('readonly','');
      field.style.position='fixed';
      field.style.opacity='0';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
    }
    const old=button.textContent;
    button.textContent=words[isBg()?'bg':'en'].copied;
    setTimeout(()=>{button.textContent=old;},1800);
  };

  const shareCard=document.createElement('aside');
  shareCard.className='kv-share-card';
  shareCard.innerHTML=`
    <div class="kv-share-icon" aria-hidden="true">↗</div>
    <div class="kv-share-copy">
      <span class="kv-share-kicker"></span>
      <h3></h3>
      <p></p>
    </div>
    <div class="kv-share-actions">
      <button class="btn btn-secondary kv-share-button" type="button"></button>
      <a class="btn btn-ghost kv-pin-button" target="_blank" rel="noopener noreferrer"></a>
    </div>`;
  qs('.creator-grid')?.insertAdjacentElement('afterend',shareCard);

  const assurance=document.createElement('aside');
  assurance.className='kv-assurance';
  assurance.innerHTML=`
    <span class="kv-assurance-icon" aria-hidden="true">✓</span>
    <div><h3></h3><p></p><small></small> <a href="refunds.html"></a></div>`;
  qs('.pricing-note')?.insertAdjacentElement('afterend',assurance);

  const sticky=document.createElement('a');
  sticky.className='kv-sticky-cta';
  sticky.href='#create';
  sticky.innerHTML='<strong></strong><span></span>';
  document.body.appendChild(sticky);

  const refresh=()=>{
    const t=words[isBg()?'bg':'en'];
    shareCard.querySelector('.kv-share-kicker').textContent=t.shareKicker;
    shareCard.querySelector('h3').textContent=t.shareTitle;
    shareCard.querySelector('p').textContent=t.shareText;
    shareCard.querySelector('.kv-share-button').textContent=t.shareButton;
    const pin=shareCard.querySelector('.kv-pin-button');
    pin.textContent=t.pinButton;
    pin.href='https://www.pinterest.com/pin/create/button/?'+new URLSearchParams({
      url:shareUrl(),
      media:'https://kidventuro.com/assets/og-kidventuro.png',
      description:t.shareMessage(destination())
    });
    assurance.querySelector('h3').textContent=t.assuranceTitle;
    assurance.querySelector('p').textContent=t.assuranceText;
    assurance.querySelector('small').textContent=t.assuranceMeta;
    assurance.querySelector('a').textContent=t.assuranceLink;
    sticky.querySelector('strong').textContent=t.sticky;
    sticky.querySelector('span').textContent=t.stickyPrice;
  };

  shareCard.querySelector('.kv-share-button').addEventListener('click',async event=>{
    const t=words[isBg()?'bg':'en'];
    const payload={title:'Kidventuro',text:t.shareMessage(destination()),url:shareUrl()};
    if(navigator.share){
      try{await navigator.share(payload);return;}catch(error){if(error?.name==='AbortError')return;}
    }
    await copyLink(event.currentTarget);
  });

  let createVisible=false;
  let pricingVisible=false;
  const toggleSticky=()=>sticky.classList.toggle('is-visible',scrollY>760&&!createVisible&&!pricingVisible);
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.target.id==='create')createVisible=entry.isIntersecting;
        if(entry.target.id==='pricing')pricingVisible=entry.isIntersecting;
      });
      toggleSticky();
    },{threshold:.08});
    const create=qs('#create'),pricing=qs('#pricing');
    if(create)observer.observe(create);
    if(pricing)observer.observe(pricing);
  }
  addEventListener('scroll',toggleSticky,{passive:true});
  qs('#destination')?.addEventListener('change',refresh);
  qs('#previewForm')?.addEventListener('submit',()=>setTimeout(()=>{
    refresh();
    shareCard.classList.add('is-ready');
  },0));
  qs('#languageToggle')?.addEventListener('click',()=>queueMicrotask(refresh));
  refresh();
})();
