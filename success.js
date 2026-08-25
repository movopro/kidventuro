(()=>{
  const API='https://api.kidventuro.com';
  const REF_KEY='kidventuro:checkout_ref';
  const PAID_KEY='kidventuro:paid_ref';
  const statusEl=document.getElementById('status');
  const btn=document.getElementById('continueBtn');
  const help=document.getElementById('help');
  let ref='';
  try{ref=sessionStorage.getItem(REF_KEY)||JSON.parse(sessionStorage.getItem('kidventuro:booklet')||'{}').kv_ref||'';}catch{}

  if(!ref){
    statusEl.textContent='We could not find this checkout session.';
    statusEl.className='status error';
    help.textContent='Return to Kidventuro, create the preview again, then start checkout from the same browser.';
    return;
  }

  const openBook=()=>{ window.location.href='booklet.html'; };
  btn.addEventListener('click',openBook);

  let tries=0;
  const maxTries=24;
  const poll=async()=>{
    tries++;
    try{
      const r=await fetch(`${API}/entitlement/status?ref=${encodeURIComponent(ref)}`,{cache:'no-store',credentials:'omit'});
      const data=await r.json().catch(()=>({}));
      if(r.ok&&data.paid===true){
        try{sessionStorage.setItem(PAID_KEY,ref);}catch{}
        statusEl.textContent=data.test_mode?'Test payment confirmed ✓':'Payment confirmed ✓';
        statusEl.className='status ok';
        btn.classList.remove('hidden');
        help.textContent='Your personalized adventure is ready to open.';
        return;
      }
    }catch{}
    if(tries>=maxTries){
      statusEl.textContent='Payment confirmation is taking longer than expected.';
      statusEl.className='status error';
      help.textContent='If the order succeeded, refresh this page after checking the webhook in Lemon Squeezy. Your checkout session is still saved in this browser.';
      return;
    }
    setTimeout(poll,2500);
  };
  poll();
})();
