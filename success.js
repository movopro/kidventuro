(()=>{
  const API_KEY='kidventuro:api_base';
  const REF_KEY='kidventuro:checkout_ref';
  const PAID_KEY='kidventuro:paid_ref';
  const SESSION_KEY='kidventuro:booklet';
  const statusEl=document.getElementById('status');
  const btn=document.getElementById('continueBtn');
  const help=document.getElementById('help');
  const order=(new URLSearchParams(location.search).get('order')||'').trim();
  const checkoutMode=window.KIDVENTURO_CONFIG?.checkoutMode==='live'?'live':'test';
  let ref='';
  let api='';

  try{
    // A receipt/confirmation order identifier describes the exact order being opened.
    // Do not let a stale browser ref from a previous purchase override it.
    if(!order) ref=sessionStorage.getItem(REF_KEY)||JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{}').kv_ref||'';
    api=(window.KIDVENTURO_CONFIG?.apiBase||sessionStorage.getItem(API_KEY)||'').replace(/\/$/,'');
    if(api) sessionStorage.setItem(API_KEY,api);
  }catch{}

  if(!api){
    statusEl.textContent='Payment verification is not configured yet.';
    statusEl.className='status error';
    help.textContent='The Kidventuro payment backend still needs its Cloudflare Worker URL.';
    return;
  }

  if(!ref&&!order){
    statusEl.textContent='We could not find this checkout session.';
    statusEl.className='status error';
    help.textContent='Return to Kidventuro and start checkout again, or use the personalized link from your order confirmation.';
    return;
  }

  const openBook=()=>{ window.location.href='booklet.html'; };
  btn.addEventListener('click',openBook);

  const saveFulfillment=data=>{
    const personalization=data?.personalization;
    if(!data?.ref||!personalization) return false;
    ref=data.ref;
    const product=data.product||personalization.product||'adventure';
    const session={
      product,
      name:personalization.name,
      age:personalization.age,
      destination:personalization.destination,
      interest:personalization.interest,
      days:personalization.days,
      lang:personalization.lang==='bg'?'bg':'en',
      kv_ref:ref,
      saved_at:Date.now()
    };
    if(product==='family'&&Array.isArray(personalization.children)){
      session.children=personalization.children.slice(0,3).map(child=>({
        name:child.name,
        age:child.age,
        interest:child.interest
      }));
    }
    try{
      sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));
      sessionStorage.setItem(REF_KEY,ref);
      sessionStorage.setItem(PAID_KEY,ref);
    }catch{}
    if(order) history.replaceState(null,'',location.pathname);
    return true;
  };

  const showReady=data=>{
    const label=data.product==='mini'?'Mini':data.product==='family'?'Family':'Adventure';
    statusEl.textContent=data.test_mode?`Test ${label} payment confirmed ✓`:`${label} payment confirmed ✓`;
    statusEl.className='status ok';
    btn.classList.remove('hidden');
    help.textContent='Your personalized Kidventuro product is ready to open. The printable book is currently generated in English.';
  };

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
      if(checkoutMode==='live'&&health.ready_live!==true){
        help.textContent='Live payment verification is not fully configured yet. Kidventuro support needs to check the Live Lemon Squeezy webhook secret.';
        return;
      }
      if(checkoutMode==='test'&&health.ready_test!==true){
        help.textContent='Test payment verification is not fully configured yet. Kidventuro support needs to check the Test Lemon Squeezy webhook secret.';
        return;
      }

      // Detailed webhook diagnostics are intentionally scoped to the opaque checkout ref
      // and are no longer exposed by the public health endpoint.
      if(!ref){
        help.textContent='The payment service is available, but this order has not been matched yet. Refresh once; if it still does not confirm, contact hello@kidventuro.com with the order identifier.';
        return;
      }
      const d=await fetch(`${api}/diagnostics?ref=${encodeURIComponent(ref)}`,{cache:'no-store',credentials:'omit'});
      const diag=await d.json().catch(()=>({}));
      const last=diag?.last;
      if(!d.ok||!last){
        help.textContent='No matching accepted Lemon Squeezy webhook has been recorded for this checkout yet. Refresh once, then contact support if it remains pending.';
        return;
      }
      const messages={
        ignored_missing_or_invalid_ref:'The checkout did not include the Kidventuro reference. Restart checkout from kidventuro.com.',
        ignored_unexpected_product:'The webhook was received but did not match a configured Kidventuro product.',
        ignored_checkout_session_product_mismatch:'The paid product did not match the Kidventuro checkout session. Restart checkout from kidventuro.com.',
        ignored_unexpected_price:'The paid Lemon Squeezy item price or currency did not match this Kidventuro package. Check the product price and checkout link.',
        ignored_unexpected_variant:'The webhook was received but its Lemon Squeezy variant did not match the locked product variant.',
        ignored_order_not_paid:'The webhook was received, but Lemon Squeezy did not report the order as paid.',
        ignored_ref_already_used:'This checkout reference was already used by a different paid order. Restart checkout from kidventuro.com.',
        ignored_ref_refunded:'This checkout reference belongs to an order that was already refunded and cannot be reactivated.',
        ignored_refund_unknown_entitlement:'A refund webhook was received for a checkout that has no stored paid entitlement.',
        rejected_wrong_mode_signature:'The Lemon Squeezy webhook reached the wrong Test/Live signing-secret path.',
        rejected_live_secret_missing:'Live checkout reached Kidventuro, but the Live webhook secret is not configured.',
        entitlement_refunded:'This order has been refunded, so the product cannot be opened.',
        entitlement_created:'The payment webhook was accepted. Refresh this page once; Cloudflare KV may need a few more seconds to propagate.',
        entitlement_already_exists:'The payment was already accepted. Refresh this page to reopen the product.'
      };
      help.textContent=messages[last.result]||`Lemon Squeezy webhook received (${last.event||'unknown event'}), but it did not unlock this purchase.`;
    }catch{
      help.textContent='Could not load payment diagnostics. Refresh this page and try again.';
    }
  };

  let tries=0;
  const maxTries=24;
  const poll=async()=>{
    tries++;
    try{
      const query=order?`order=${encodeURIComponent(order)}`:`ref=${encodeURIComponent(ref)}`;
      const r=await fetch(`${api}/fulfillment?${query}`,{cache:'no-store',credentials:'omit'});
      const data=await r.json().catch(()=>({}));

      if(r.ok&&data.paid===true&&saveFulfillment(data)){
        showReady(data);
        return;
      }
      if(data.refunded===true){
        statusEl.textContent='This order has been refunded.';
        statusEl.className='status error';
        help.textContent='The Kidventuro product is no longer available for this order.';
        return;
      }
      if(data.reason==='personalization_expired'){
        statusEl.textContent='Payment confirmed, but personalization has expired.';
        statusEl.className='status error';
        help.textContent='Contact hello@kidventuro.com with your order identifier so we can help recreate the product.';
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