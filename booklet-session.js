(()=>{
  const KEY='kidventuro:booklet';
  const allowed=['name','age','destination','interest','days','lang'];
  if(!location.search){
    try{
      const raw=sessionStorage.getItem(KEY);
      if(raw){
        const data=JSON.parse(raw), params=new URLSearchParams();
        allowed.forEach(k=>{ if(data[k]!==undefined&&data[k]!==null) params.set(k,String(data[k])); });
        if([...params].length) history.replaceState(null,'',`${location.pathname}?${params.toString()}`);
      }
    }catch(e){ console.warn('Kidventuro session data unavailable',e); }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    if(location.search) history.replaceState(null,'',location.pathname);
  },{once:true});
})();
