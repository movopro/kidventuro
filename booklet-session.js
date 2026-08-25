(()=>{
  const KEY='kidventuro:booklet';
  const PAID_KEY='kidventuro:paid_ref';
  const allowed=['name','age','destination','interest','days','lang'];
  try{
    const raw=sessionStorage.getItem(KEY);
    const data=raw?JSON.parse(raw):null;
    const paidRef=sessionStorage.getItem(PAID_KEY)||'';
    if(!data||!data.kv_ref||paidRef!==data.kv_ref){
      location.replace('index.html#pricing');
      return;
    }
    if(!location.search){
      const params=new URLSearchParams();
      allowed.forEach(k=>{ if(data[k]!==undefined&&data[k]!==null) params.set(k,String(data[k])); });
      if([...params].length) history.replaceState(null,'',`${location.pathname}?${params.toString()}`);
    }
  }catch(e){
    console.warn('Kidventuro session data unavailable',e);
    location.replace('index.html#pricing');
    return;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    if(location.search) history.replaceState(null,'',location.pathname);
  },{once:true});
})();
