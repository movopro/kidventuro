// Family guide pages: "Print / save this guide as PDF". Opens every FAQ answer first so the printed guide is complete.
// Nothing is sent or stored. Without JavaScript the button stays hidden and the browser's own print still works.
(function(){
  const openAll=()=>document.querySelectorAll('.seo-faq details').forEach(d=>{d.open=true;});
  addEventListener('beforeprint',openAll);
  document.querySelectorAll('[data-print-guide]').forEach(button=>{
    button.hidden=false;
    button.addEventListener('click',()=>{openAll();window.print();});
  });
})();
