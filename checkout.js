(()=>{
  const expansionReady=import('./site-expansion.js').catch(err=>console.warn('Kidventuro destination expansion unavailable',err));
  const PRODUCTS={
    mini:{
      price:'€5.90',
      checkoutUrl:'https://kidventuro.lemonsqueezy.com/checkout/buy/b68dbe91-5c2d-4ede-b9b6-a1e9625627be'
    },
    adventure:{
      price:'€9.90',
      checkoutUrl:'https://kidventuro.lemonsqueezy.com/checkout/buy/002731fe-1735-4287-8223-450d8ef41202'
    },
    family:{
      price:'€14.90',
      checkoutUrl:'https://kidventuro.lemonsqueezy.com/checkout/buy/e49470c6-bd0e-4533-a206-c254fa84908f'
    }
  };
  const API='https://kidventuro-api.m-oreshkov.workers.dev';
  const SESSION_KEY='kidventuro:booklet';

  const makeRef=()=>{
    if(window.crypto&&typeof window.crypto.randomUUID==='function') return window.crypto.randomUUID();
    const bytes=new Uint8Array(16);
    if(window.crypto&&typeof window.crypto.getRandomValues==='function') window.crypto.getRandomValues(bytes);
    else for(let i=0;i<bytes.length;i++) bytes[i]=Math.floor(Math.random()*256);
    return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  };

  const mainValues=()=>({
    name:(document.getElementById('childName')?.value||'').trim().slice(0,20),
    age:document.getElementById('childAge')?.value||'7',
    destination:document.getElementById('destination')?.value||'Rome',
    interest:document.getElementById('interest')?.value||'dinosaurs',
    days:document.getElementById('tripDays')?.value||'4',
    lang:document.documentElement.lang==='bg'?'bg':'en'
  });

  const saveCheckoutSession=(product='adventure',familyChildren=null)=>{
    if(!PRODUCTS[product]) throw new Error('invalid_product');
    // A checkout reference is single-use. Never reuse a ref that may already have a paid entitlement.
    const ref=makeRef();
    const main=mainValues();

    const data={product,...main,kv_ref:ref,saved_at:Date.now()};
    if(product==='family'){
      if(!Array.isArray(familyChildren)||familyChildren.length<1||familyChildren.length>3) throw new Error('family_children_required');
      data.children=familyChildren;
      data.name=familyChildren[0].name;
      data.age=familyChildren[0].age;
      data.interest=familyChildren[0].interest;
    }else if(!main.name){
      throw new Error('name_required');
    }

    try{
      sessionStorage.removeItem('kidventuro:paid_ref');
      sessionStorage.removeItem('kidventuro:ai');
      sessionStorage.setItem(SESSION_KEY,JSON.stringify(data));
      sessionStorage.setItem('kidventuro:checkout_ref',ref);
    }catch(e){console.warn('Kidventuro checkout session could not be stored',e);}
    return data;
  };

  const registerCheckoutSession=async data=>{
    const payload={
      ref:data.kv_ref,
      product:data.product,
      name:data.name,
      age:data.age,
      destination:data.destination,
      interest:data.interest,
      days:data.days,
      lang:data.lang
    };
    if(data.product==='family') payload.children=data.children;

    const r=await fetch(`${API}/checkout/session`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'omit',
      cache:'no-store',
      body:JSON.stringify(payload)
    });
    const body=await r.json().catch(()=>({}));
    if(!r.ok||body.ok!==true) throw new Error(body.error||'checkout_session_failed');
  };

  const buildCheckoutUrl=(ref,product)=>{
    const config=PRODUCTS[product];
    if(!config?.checkoutUrl) throw new Error('checkout_not_connected');
    const url=new URL(config.checkoutUrl);
    url.searchParams.set('checkout[custom][kv_ref]',ref);
    url.searchParams.set('checkout[custom][product]',product);
    return url.toString();
  };

  const startCheckout=async(product='adventure',e,familyChildren=null)=>{
    if(e) e.preventDefault();
    await expansionReady;
    const trigger=e?.currentTarget;
    const originalText=trigger?.textContent||'';
    try{
      if(!PRODUCTS[product]?.checkoutUrl) throw new Error('checkout_not_connected');
      if(trigger){
        trigger.setAttribute('aria-busy','true');
        trigger.textContent=document.documentElement.lang==='bg'?'Подготвяме плащането…':'Preparing secure checkout…';
      }
      const data=saveCheckoutSession(product,familyChildren);
      await registerCheckoutSession(data);
      window.location.assign(buildCheckoutUrl(data.kv_ref,product));
    }catch(err){
      console.error('Kidventuro checkout preparation failed',err);
      alert(document.documentElement.lang==='bg'
        ? 'Не успяхме да подготвим сигурното плащане. Провери въведените данни и опитай отново.'
        : 'We could not prepare the secure checkout. Check the details and try again.');
      if(trigger){
        trigger.removeAttribute('aria-busy');
        trigger.textContent=originalText;
      }
    }
  };

  const familyDialog=()=>{
    let dialog=document.getElementById('familyCheckoutDialog');
    if(dialog) return dialog;

    const ageOptions=document.getElementById('childAge')?.innerHTML||'<option>4</option><option>5</option><option>6</option><option>7</option><option>8</option><option>9</option><option>10</option><option>11</option><option>12</option>';
    const interestOptions=document.getElementById('interest')?.innerHTML||'<option value="dinosaurs">Dinosaurs</option>';
    const main=mainValues();

    dialog=document.createElement('dialog');
    dialog.id='familyCheckoutDialog';
    dialog.innerHTML=`
      <form method="dialog" class="kv-family-form">
        <button class="kv-family-close" value="cancel" aria-label="Close">×</button>
        <p class="kv-family-kicker">KIDVENTURO FAMILY</p>
        <h2>Build your family adventure</h2>
        <p class="kv-family-sub">Add up to three children. Destination and trip length come from the main form.</p>
        <div class="kv-family-grid">
          ${[1,2,3].map((n)=>`<fieldset class="kv-family-child" data-child="${n}">
            <legend>Child ${n}${n===1?' *':' (optional)'}</legend>
            <label>Name / nickname<input class="kv-child-name" maxlength="20" autocomplete="off"></label>
            <label>Age<select class="kv-child-age">${ageOptions}</select></label>
            <label>Interest<select class="kv-child-interest">${interestOptions}</select></label>
          </fieldset>`).join('')}
        </div>
        <div class="kv-family-actions">
          <button type="button" class="btn btn-ghost kv-family-cancel">Cancel</button>
          <button type="submit" value="continue" class="btn btn-primary">Continue to Family checkout — €14.90</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);

    const style=document.createElement('style');
    style.textContent=`
      #familyCheckoutDialog{width:min(920px,94vw);border:0;border-radius:26px;padding:0;box-shadow:0 30px 90px #20312f55;color:#20312f}
      #familyCheckoutDialog::backdrop{background:#20312f88;backdrop-filter:blur(4px)}
      .kv-family-form{padding:28px;position:relative;background:#fffdf9}.kv-family-close{position:absolute;right:18px;top:14px;border:0;background:transparent;font-size:32px;cursor:pointer;color:#687773}
      .kv-family-kicker{font-size:11px;font-weight:900;letter-spacing:.14em;color:#2b7a78;margin:0 0 6px}.kv-family-form h2{margin:0 0 8px;font-size:30px}.kv-family-sub{color:#687773;margin:0 0 20px}
      .kv-family-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.kv-family-child{border:1px solid #ddd7ce;border-radius:16px;padding:15px;background:#fff8ef}.kv-family-child legend{font-weight:900;padding:0 5px}
      .kv-family-child label{display:grid;gap:5px;margin:10px 0;font-size:12px;font-weight:800}.kv-family-child input,.kv-family-child select{width:100%;padding:10px;border:1px solid #cfd7d4;border-radius:10px;background:white;color:#20312f}
      .kv-family-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px;flex-wrap:wrap}
      @media(max-width:760px){.kv-family-grid{grid-template-columns:1fr}.kv-family-form{padding:22px 16px}.kv-family-form h2{font-size:24px}}
    `;
    document.head.appendChild(style);

    const childCards=[...dialog.querySelectorAll('.kv-family-child')];
    childCards[0].querySelector('.kv-child-name').value=main.name;
    childCards[0].querySelector('.kv-child-age').value=main.age;
    childCards[0].querySelector('.kv-child-interest').value=main.interest;
    childCards.slice(1).forEach(card=>{
      card.querySelector('.kv-child-age').value=main.age;
      card.querySelector('.kv-child-interest').value=main.interest;
    });
    dialog.querySelector('.kv-family-cancel').addEventListener('click',()=>dialog.close('cancel'));
    return dialog;
  };

  const collectFamilyChildren=dialog=>{
    const cards=[...dialog.querySelectorAll('.kv-family-child')];
    const children=[];
    cards.forEach((card,i)=>{
      const name=(card.querySelector('.kv-child-name').value||'').trim().slice(0,20);
      if(!name){
        if(i===0) throw new Error('first_child_required');
        return;
      }
      children.push({
        name,
        age:card.querySelector('.kv-child-age').value,
        interest:card.querySelector('.kv-child-interest').value
      });
    });
    if(children.length<1||children.length>3) throw new Error('family_children_required');
    return children;
  };

  const openFamilyCheckout=async e=>{
    if(e) e.preventDefault();
    await expansionReady;
    const trigger=e?.currentTarget;
    const dialog=familyDialog();
    dialog.returnValue='';
    const onClose=()=>{
      dialog.removeEventListener('close',onClose);
      if(dialog.returnValue!=='continue') return;
      try{
        const children=collectFamilyChildren(dialog);
        startCheckout('family',{preventDefault(){},currentTarget:trigger},children);
      }catch{
        alert(document.documentElement.lang==='bg'?'Добави поне първото дете.':'Please add at least the first child.');
      }
    };
    dialog.addEventListener('close',onClose);
    dialog.showModal();
  };

  const oldBooklet=document.getElementById('openBooklet');
  if(oldBooklet){
    const checkoutButton=oldBooklet.cloneNode(true);
    oldBooklet.replaceWith(checkoutButton);
    checkoutButton.addEventListener('click',e=>startCheckout('adventure',e));
  }

  const cards=[...document.querySelectorAll('.price-card')];
  const miniButton=cards[0]?.querySelector('a');
  const adventureButton=cards[1]?.querySelector('a');
  const familyButton=cards[2]?.querySelector('a');

  if(miniButton){
    miniButton.setAttribute('href','#checkout-mini');
    miniButton.addEventListener('click',e=>startCheckout('mini',e));
  }
  if(adventureButton){
    adventureButton.setAttribute('href','#checkout-adventure');
    adventureButton.addEventListener('click',e=>startCheckout('adventure',e));
  }
  if(familyButton){
    familyButton.setAttribute('href','#checkout-family');
    familyButton.addEventListener('click',openFamilyCheckout);
  }

  window.KidventuroCheckout={start:(product,e)=>startCheckout(product,e),products:PRODUCTS};

  try{
    translations.en.openBooklet='Unlock full adventure — €9.90 →';
    translations.bg.openBooklet='Отключи пълното приключение — €9.90 →';
    translations.en.createPreview='Get Adventure — €9.90';
    translations.bg.createPreview='Вземи Adventure — €9.90';
    translations.en.tryPreview='Get Mini — €5.90';
    translations.bg.tryPreview='Вземи Mini — €5.90';
    translations.en.tryPreview2='Get Family — €14.90';
    translations.bg.tryPreview2='Вземи Family — €14.90';
    translations.en.pricingNote='Secure one-time checkout. Personalized digital delivery after payment.';
    translations.bg.pricingNote='Сигурно еднократно плащане. Персонализирана дигитална доставка след плащане.';
    applyLanguage();
  }catch(e){console.warn('Kidventuro checkout labels unavailable',e);}
})();
