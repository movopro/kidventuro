(()=>{
  const API_KEY='kidventuro:api_base';
  const REF_KEY='kidventuro:checkout_ref';
  const PAID_KEY='kidventuro:paid_ref';
  const statusEl=document.getElementById('status');
  const btn=document.getElementById('continueBtn');
  const help=document.getElementById('help');
  let ref='';
  let api='';

  try{
    ref=sessionStorage.getItem(REF_KEY)||JSON.parse(sessionStorage.getItem('kidventuro:booklet')||'{}').kv_ref||'';
    api=(window.KIDVENTURO_CONFIG?.apiBase||sessionStorage.getItem(API_KEY)||'').replace(/\/$/,'');
    if(api) sessionStorage.setItem(API_KEY,api);
  }catch{}

  if(!ref){
    statusEl.textContent='We could not find this checkout session.';
    statusEl.className='status error';
    help.textContent='Return to Kidventuro, create the preview again, then start checkout from the same browser.';
    return;
  }

  if(!api){
    statusEl.textContent='Payment verification is not configured yet.';
    statusEl.className='status error';
    help.textContent='The Kidventuro payment backend still needs its Cloudflare Worker URL.';
    return;
  }

  const openBook=()=>{ window.location.href='booklet.html'; };
  btn.addEventListener('click',openBook);

  const showDiagnostic=async()=>{
    statusEl.textContent='Payment has not been confirmed yet.';
    statusEl.className='status error';
    try{
      const r=await fetch(`${api}/health`,{cache:'no-store',credentials:'omit'});
      const health=await r.json().catch(()=>({}));
      if(!r.ok||health.ok!==true){
        help.textContent='The payment verification service is unavailable. Please try again shortly.';
        return;
      }
      if(health.storage!==true){
        help.textContent='Payment storage is not configured. Kidventuro support needs to check the Cloudflare KV binding.';
        return;
      }
      if(health.webhook_secret!==true){
        help.textContent='The Lemon Squeezy webhook secret is missing from the payment service.';
        return;
      }
      const last=health.last_webhook;
      if(!last){
        help.textContent='No signed Lemon Squeezy webhook has reached Kidventuro yet. In Test mode, make sure the webhook was created in Lemon Squeezy Test mode and uses this Worker URL.';
        return;
      }
      if(last.ref_hint&&last.ref_hint!==ref.slice(-8)){
        help.textContent='The payment service received a webhook, but it belongs to a different checkout session. Restart checkout from Kidventuro in this browser and try again.';
        return;
      }
      const messages={
        ignored_missing_or_invalid_ref:'Lemon Squeezy reached Kidventuro, but the checkout did not include the Kidventuro reference. Restart checkout from kidventuro.com and try again.',
        ignored_unexpected_product:'The webhook was received but did not match the Kidventuro Adventure product.',
        ignored_unexpected_variant:'The webhook was received but the Lemon Squeezy variant did not match the configured Adventure variant.',
        ignored_order_not_paid:'The webhook was received, but Lemon Squeezy did not report the order as paid.',
        entitlement_refunded:'This order has been refunded, so the adventure cannot be opened.',
        entitlement_created:'The payment webhook was accepted. Refresh this page once; Cloudflare KV may need a few more seconds to propagate.'
      };
      help.textContent=messages[last.result]||`Lemon Squeezy webhook received (${last.event||'unknown event'}), but it did not unlock this adventure.`;
    }catch{
      help.textContent='Could not load payment diagnostics. Refresh this page and try again.';
    }
  };

  let tries=0;
  const maxTries=24;
  const poll=async()=>{
    tries++;
    try{
      const r=await fetch(`${api}/entitlement/status?ref=${encodeURIComponent(ref)}`,{cache:'no-store',credentials:'omit'});
      const data=await r.json().catch(()=>({}));
      if(r.ok&&data.paid===true){
        try{sessionStorage.setItem(PAID_KEY,ref);}catch{}
        statusEl.textContent=data.test_mode?'Test payment confirmed ✓':'Payment confirmed ✓';
        statusEl.className='status ok';
        btn.classList.remove('hidden');
        help.textContent='Your personalized adventure is ready to open.';
        return;
      }
      if(data.refunded===true){
        statusEl.textContent='This order has been refunded.';
        statusEl.className='status error';
        help.textContent='The adventure is no longer available for this order.';
        return;
      }
    }catch{}
    if(tries>=maxTries){
      await showDiagnostic();
      return;
    }
    setTimeout(poll,2500);
  };
  poll();
})();
