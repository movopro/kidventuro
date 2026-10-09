// Seasonal page: highlight the visitor's current month and show it first. The page is complete without this script.
(()=>{
  const m=new Date().getMonth()+1,sec=document.getElementById('m'+m),nav=document.querySelector('.month-nav');
  if(!sec||!nav)return;
  const label=document.documentElement.lang==='es'?'Este mes':'This month';
  const badge=document.createElement('span');badge.className='now';badge.textContent=label;
  sec.querySelector('h2')?.appendChild(badge);
  nav.querySelector(`a[href="#m${m}"]`)?.setAttribute('aria-current','true');
  nav.after(sec);
})();
