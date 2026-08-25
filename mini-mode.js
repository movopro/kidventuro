(()=>{
  const pages=[...document.querySelectorAll('.page')];
  if(!pages.length) return;

  const byNumber=n=>document.querySelector(`.page[data-page^="${n}/"]`);
  const together=pages.find(p=>p.querySelector('.kicker')?.textContent.trim().toUpperCase()==='TOGETHER');
  const certificate=pages.find(p=>p.classList.contains('certificate'));
  const keep=[byNumber(1),byNumber(2),byNumber(4),byNumber(6),byNumber(8),byNumber(9),byNumber(10),byNumber(11),together,certificate].filter(Boolean);
  const keepSet=new Set(keep);

  pages.forEach(p=>{ if(!keepSet.has(p)) p.remove(); });

  const miniPages=[...document.querySelectorAll('.page')];
  miniPages.forEach((p,i)=>p.dataset.page=`${i+1}/${miniPages.length}`);

  const cover=document.querySelector('.page.cover');
  const coverKicker=cover?.querySelector('.cover-copy .kicker');
  if(coverKicker) coverKicker.textContent='MY MINI TRAVEL ADVENTURE';

  const title=document.getElementById('toolbarTitle');
  if(title){
    const plain=title.textContent.replace(/Adventure/i,'Mini Adventure');
    title.textContent=plain;
  }

  const small=document.querySelector('.toolbar-copy small');
  if(small) small.textContent=`${miniPages.length} printable pages • A4 • Kidventuro Mini`;

  document.body.classList.add('product-mini');
})();
