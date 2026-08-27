(()=>{
  const slug=name=>name.toLowerCase().trim().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  function linkCards(){
    document.querySelectorAll('.destination-grid .destination-card').forEach(card=>{
      if(card.dataset.seoLinked==='true')return;
      const name=card.querySelector('h3')?.textContent.trim();
      if(!name)return;
      const a=document.createElement('a');
      a.href=`/destinations/${slug(name)}.html`;
      a.setAttribute('aria-label',`${name} travel activities for kids`);
      a.style.cssText='display:block;height:100%;color:inherit;text-decoration:none';
      while(card.firstChild)a.appendChild(card.firstChild);
      card.appendChild(a);
      card.dataset.seoLinked='true';
    });
  }

  function addHubLink(){
    const head=document.querySelector('#destinations .section-head');
    if(!head||head.querySelector('[data-destination-guides]'))return;
    const p=document.createElement('p');
    const a=document.createElement('a');
    a.href='/destinations/';
    a.dataset.destinationGuides='';
    a.textContent='Browse all 100 destination activity guides →';
    a.style.cssText='font-weight:800;color:inherit;text-decoration:underline;text-underline-offset:3px';
    p.appendChild(a);
    head.appendChild(p);
  }

  function applyDestinationFromQuery(){
    const wanted=new URLSearchParams(location.search).get('destination');
    if(!wanted)return;
    const select=document.getElementById('destination');
    if(!select)return;
    const option=[...select.options].find(o=>o.value.toLowerCase()===wanted.toLowerCase());
    if(!option)return;
    select.value=option.value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
  }

  linkCards();
  addHubLink();
  applyDestinationFromQuery();
  document.getElementById('languageToggle')?.addEventListener('click',()=>queueMicrotask(()=>{linkCards();addHubLink();}));
})();
