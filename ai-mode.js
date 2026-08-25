(()=>{
  const ai=window.KIDVENTURO_AI;
  if(!ai||typeof ai!=='object') return;

  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const pages=[...document.querySelectorAll('.page')];
  if(!pages.length) return;
  const kicker=p=>p.querySelector('.kicker')?.textContent.trim().toUpperCase()||'';
  const find=(names)=>pages.find(p=>names.includes(kicker(p)));
  const insertCard=(page,title,text,kind='mint')=>{
    if(!page||!text||page.querySelector('.ai-personalized')) return;
    const footer=page.querySelector('.footer-note');
    const card=document.createElement('div');
    card.className=`card ${kind} ai-personalized`;
    card.style.marginTop='7mm';
    card.innerHTML=`<h3>✨ ${esc(title)}</h3><p>${esc(text)}</p>`;
    page.insertBefore(card,footer||null);
  };

  const product=document.body.dataset.product||'adventure';
  const mission=product==='family'?(ai.family_mission||ai.interest_mission):ai.interest_mission;
  const missionPage=find(['OBSERVE','I SPY','CITY HUNT','LOOK AROUND','TEAMWORK','TOGETHER']);
  insertCard(missionPage,'Your tailored mission',mission);

  const memoryPage=find(['KEEP IT','MEMORIES','REVIEW','MY FAVOURITES']);
  insertCard(memoryPage,'One more thing to notice',ai.reflection_prompt,'soft');

  const cover=document.querySelector('.page.cover');
  if(cover&&ai.destination_hook&&!cover.querySelector('.ai-hook')){
    const node=document.createElement('p');
    node.className='ai-hook';
    node.style.cssText='position:relative;z-index:2;margin-top:8mm;max-width:130mm;font-size:13px;font-weight:700;line-height:1.45';
    node.textContent=`✨ ${ai.destination_hook}`;
    const copy=cover.querySelector('.cover-copy');
    copy?.appendChild(node);
  }

  document.body.dataset.aiPersonalized='true';
})();
