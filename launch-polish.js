(()=>{
  const runtime=window.KIDVENTURO_CONFIG||{};
  const isBg=()=>document.documentElement.lang==='bg';
  const mode=runtime.checkoutMode==='live'?'live':'test';
  const allCheckoutUrls=['mini','adventure','family'].every(k=>/^https:\/\/kidventuro\.lemonsqueezy\.com\/checkout\/buy\/[a-z0-9-]+$/i.test(String(runtime.checkoutUrls?.[k]||'')));
  document.body.dataset.checkoutMode=mode;
  document.body.dataset.checkoutReady=allCheckoutUrls?'true':'false';

  const bgInterests={
    dinosaurs:'Динозаври 🦖',space:'Космос 🚀',animals:'Животни 🐾',football:'Футбол ⚽',art:'Изкуство 🎨',
    mysteries:'Загадки 🔎',castles:'Замъци и рицари 🏰',science:'Наука 🧪',vehicles:'Превозни средства 🚗',nature:'Природа 🌿',
    food:'Храна и готвене 🍳',music:'Музика 🎵',superheroes:'Супергерои 🦸',history:'История 📜',ocean:'Океан и морски живот 🐠',trains:'Влакове 🚆'
  };
  const enInterests={
    dinosaurs:'Dinosaurs 🦖',space:'Space 🚀',animals:'Animals 🐾',football:'Football ⚽',art:'Art 🎨',mysteries:'Mysteries 🔎',
    castles:'Castles & knights 🏰',science:'Science 🧪',vehicles:'Vehicles 🚗',nature:'Nature 🌿',food:'Food & cooking 🍳',music:'Music 🎵',
    superheroes:'Superheroes 🦸',history:'History 📜',ocean:'Ocean & sea life 🐠',trains:'Trains 🚆'
  };

  const style=document.createElement('style');
  style.textContent=`
    .kv-test-banner{position:sticky;top:0;z-index:9999;padding:9px 16px;text-align:center;background:#20312f;color:#fff;font-size:12px;font-weight:900;letter-spacing:.04em}
    .kv-language-note{display:block;margin-top:8px;color:#65736f;font-size:12px;line-height:1.45}
    .kv-language-note strong{color:#20312f}
    .kv-launch-badge{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:7px 10px;border-radius:999px;background:#dff4ea;color:#20312f;font-size:11px;font-weight:900}
    .kv-unavailable{opacity:.55;pointer-events:none}
  `;
  document.head.appendChild(style);

  let banner=null;
  if(mode==='test'){
    banner=document.createElement('div');
    banner.className='kv-test-banner';
    banner.setAttribute('role','status');
    document.body.prepend(banner);
  }

  let languageNote=document.querySelector('.kv-language-note');
  if(!languageNote){
    languageNote=document.createElement('small');
    languageNote.className='kv-language-note';
    const formNote=document.querySelector('.creator-card .form-note');
    formNote?.insertAdjacentElement('afterend',languageNote);
  }

  const pricing=document.querySelector('.pricing-section .section-head');
  let launchBadge=document.querySelector('.kv-launch-badge');
  if(pricing&&!launchBadge){
    launchBadge=document.createElement('span');
    launchBadge.className='kv-launch-badge';
    pricing.appendChild(launchBadge);
  }

  const faqGrid=document.querySelector('.faq-grid');
  let languageFaq=document.getElementById('bookLanguageFaq');
  if(faqGrid&&!languageFaq){
    languageFaq=document.createElement('details');
    languageFaq.id='bookLanguageFaq';
    languageFaq.innerHTML='<summary></summary><p></p>';
    faqGrid.appendChild(languageFaq);
  }

  function setI18n(key,en,bg){
    try{
      if(typeof translations!=='undefined'){
        if(translations.en) translations.en[key]=en;
        if(translations.bg) translations.bg[key]=bg;
      }
    }catch{}
    document.querySelectorAll(`[data-i18n="${key}"]`).forEach(el=>el.textContent=isBg()?bg:en);
  }

  function localizeSelects(){
    const bg=isBg();
    const interest=document.getElementById('interest');
    if(interest){
      [...interest.options].forEach(option=>{
        const label=(bg?bgInterests:enInterests)[option.value];
        if(label) option.textContent=label;
      });
    }
    const days=document.getElementById('tripDays');
    if(days){
      [...days.options].forEach(option=>{
        option.textContent=bg?`${option.value} дни`:`${option.value} days`;
      });
    }
  }

  function setLabelText(label,text){
    if(!label) return;
    const node=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
    if(node) node.nodeValue=text;
  }

  function localizeFamilyDialog(){
    const dialog=document.getElementById('familyCheckoutDialog');
    if(!dialog) return;
    const bg=isBg();
    const h2=dialog.querySelector('h2');
    const sub=dialog.querySelector('.kv-family-sub');
    const close=dialog.querySelector('.kv-family-close');
    const cancel=dialog.querySelector('.kv-family-cancel');
    const submit=dialog.querySelector('button[type="submit"]');
    if(h2) h2.textContent=bg?'Създай семейното приключение':'Build your family adventure';
    if(sub) sub.textContent=bg?'Добави до три деца. Дестинацията и дните се взимат от основната форма. Книжката се генерира на английски.':'Add up to three children. Destination and trip length come from the main form. The printable book is generated in English.';
    if(close) close.setAttribute('aria-label',bg?'Затвори':'Close');
    if(cancel) cancel.textContent=bg?'Отказ':'Cancel';
    if(submit) submit.textContent=bg?'Към Family плащане — €14.90':'Continue to Family checkout — €14.90';
    [...dialog.querySelectorAll('.kv-family-child')].forEach((card,i)=>{
      const legend=card.querySelector('legend');
      if(legend) legend.textContent=bg?`Дете ${i+1}${i===0?' *':' (по избор)'}`:`Child ${i+1}${i===0?' *':' (optional)'}`;
      const labels=card.querySelectorAll('label');
      setLabelText(labels[0],bg?'Име / прякор':'Name / nickname');
      setLabelText(labels[1],bg?'Възраст':'Age');
      setLabelText(labels[2],bg?'Интерес':'Interest');
      const select=card.querySelector('.kv-child-interest');
      if(select){
        [...select.options].forEach(option=>{
          const label=(bg?bgInterests:enInterests)[option.value];
          if(label) option.textContent=label;
        });
      }
    });
  }

  function refresh(){
    const bg=isBg();
    if(banner) banner.textContent=bg?'ТЕСТОВ РЕЖИМ • Не се извършва реално плащане':'TEST MODE • No real payment is taken';
    if(languageNote) languageNote.innerHTML=bg
      ? '<strong>Език на продукта:</strong> книжките в текущата версия се генерират на английски. Българският превод на сайта е за удобство при поръчка.'
      : '<strong>Product language:</strong> printable books are currently generated in English.';
    if(launchBadge) launchBadge.textContent=bg?'✓ Еднократно плащане • без абонамент':'✓ One-time purchase • no subscription';
    if(languageFaq){
      languageFaq.querySelector('summary').textContent=bg?'На какъв език е книжката?':'What language is the printable book?';
      languageFaq.querySelector('p').textContent=bg
        ? 'Текущата версия на Mini, Adventure и Family се генерира на английски. Интерфейсът на сайта може да се използва и на български.'
        : 'Mini, Adventure and Family are currently generated in English. The website interface is also available in Bulgarian.';
    }
    const toggle=document.getElementById('languageToggle');
    if(toggle) toggle.setAttribute('aria-label',bg?'Switch to English':'Превключи на български');

    setI18n('heroSub',
      'Personalized travel activities that keep kids busy on the journey and curious once you arrive.',
      'Персонализирани занимания, които държат децата ангажирани по пътя и любопитни, когато пристигнете.');
    setI18n('heroSample','See what\'s inside','Виж какво има вътре');
    setI18n('trust1','50 destinations','50 дестинации');
    setI18n('trust2','Print at home','Печат у дома');
    setI18n('trust3','Made for ages 4–12','За деца 4–12 г.');
    setI18n('trust4','One-time purchase','Еднократна покупка');
    setI18n('heroProof','No app. No subscription. Save as PDF, print it and pack it with the snacks.','Без приложение. Без абонамент. Запази като PDF, принтирай и сложи книжката при нещата за пътуването.');
    const proof=document.querySelector('[data-i18n="heroProof"]');
    if(proof){
      proof.innerHTML=bg
        ? '<strong>Без приложение. Без абонамент.</strong> Запази като PDF, принтирай и сложи книжката при нещата за пътуването.'
        : '<strong>No app. No subscription.</strong> Save as PDF, print it and pack it with the snacks.';
    }

    setI18n('createSub','Choose the child, destination and trip. See the idea before you buy anything.','Избери детето, дестинацията и пътуването. Виж идеята преди да купиш.');
    setI18n('step2Text','Activities adapt to the child\'s age, interests, destination and trip length, so the book feels made for this trip.','Заниманията се адаптират към възрастта, интересите, дестинацията и дните, така че книжката да е направена за точно това пътуване.');
    setI18n('step3Text','Save the book as PDF, print it and bring it on the plane, train or road trip.','Запази книжката като PDF, принтирай я и я вземи в самолета, влака или колата.');

    setI18n('useEyebrow','MADE FOR REAL TRAVEL DAYS','ЗА ИСТИНСКИ ПЪТУВАНИЯ');
    setI18n('useTitle','Useful long before the museum gift shop.','Полезна много преди магазина за сувенири.');
    setI18n('useSub','Kidventuro gives children something to do when travel is slow — and something to look for when the adventure starts.','Kidventuro дава на децата занимание, когато пътуването е бавно — и неща за откриване, когато приключението започне.');
    setI18n('use1Title','Getting there','По пътя');
    setI18n('use1Text','Bingo, puzzles and quiet pages for flights, trains and long drives.','Бинго, пъзели и спокойни занимания за самолети, влакове и дълги пътувания с кола.');
    setI18n('use2Title','The waiting bits','Докато чакате');
    setI18n('use2Text','Something useful to pull out at the gate, hotel lobby or restaurant table.','Полезно занимание за гейта, хотелското фоайе или масата в ресторанта.');
    setI18n('use3Title','Exploring the city','Докато разглеждате');
    setI18n('use3Text','Scavenger hunts and observation missions that get kids looking up at the place around them.','Мисии за откриване и наблюдение, които карат децата да гледат истинския град около тях.');
    setI18n('use4Title','Remembering the trip','След пътуването');
    setI18n('use4Text','Drawing, journal and certificate pages turn the booklet into a simple travel keepsake.','Страници за рисуване, дневник и сертификат превръщат книжката в малък спомен от пътуването.');

    setI18n('destEyebrow','50 DESTINATIONS','50 ДЕСТИНАЦИИ');
    setI18n('destTitle','50 destinations. Thousands of possible adventures.','50 дестинации. Хиляди възможни приключения.');
    setI18n('formNote',
      'No child account is created. Use a first name or nickname only. Personalization is stored temporarily only to create and deliver the adventure.',
      'Не се създава детски профил. Използвай само първо име или прякор. Персонализацията се пази временно само за създаване и доставка на приключението.');

    setI18n('pricingTitle','Pick the version that fits the trip.','Избери версията, която пасва на пътуването.');
    setI18n('pricingSub','One-time purchase. Digital delivery. No subscription and nothing to ship.','Еднократна покупка. Дигитална доставка. Без абонамент и без доставка на физически продукт.');
    setI18n('buyTrust1Top','DIGITAL','ДИГИТАЛНО');
    setI18n('buyTrust1','Ready after payment','Готово след плащане');
    setI18n('buyTrust2Top','ONE-TIME','ЕДНОКРАТНО');
    setI18n('buyTrust2','No subscription','Без абонамент');
    setI18n('buyTrust3Top','PRINTABLE','ЗА ПЕЧАТ');
    setI18n('buyTrust3','A4 • Save as PDF','A4 • Запази като PDF');
    setI18n('buyTrust4Top','PERSONAL','ПЕРСОНАЛНО');
    setI18n('buyTrust4','Made for your trip','За твоето пътуване');
    setI18n('miniDesc','A compact pack for the journey or a short city break.','Компактен пакет за самото пътуване или кратък city break.');
    setI18n('miniBest','Best for: a quick screen-free activity pack','Най-подходящ за: бърз пакет без екран');
    setI18n('advDesc','The complete trip companion for one child.','Пълният спътник за пътуването на едно дете.');
    setI18n('advBest','Best for: most family city trips','Най-подходящ за: повечето семейни градски пътувания');
    setI18n('familyDesc','One shared adventure for up to three children.','Едно общо приключение за до три деца.');
    setI18n('familyBest','Best for: siblings or children travelling together','Най-подходящ за: братя, сестри или деца, които пътуват заедно');
    setI18n('pricingNote',
      'Secure one-time checkout. Personalized digital delivery after payment. No subscription.',
      'Сигурно еднократно плащане. Персонализирана дигитална доставка след плащане. Без абонамент.');

    setI18n('faq1a',
      'No. Kidventuro is a digital printable adventure. Open it after payment, then use Print / Save as PDF.',
      'Не. Kidventuro е дигитално приключение за печат. Отвори го след плащане и използвай Print / Save as PDF.');
    setI18n('faq2a',
      'No. No child account is needed. An adult completes the secure checkout.',
      'Не. Не е нужен детски профил. Сигурното плащане се извършва от възрастен.');
    setI18n('faq3a',
      'We use only a first name or nickname, age, destination, interest and trip length. Child names and exact ages are not sent to the AI provider.',
      'Използваме само първо име или прякор, възраст, дестинация, интерес и дни. Имената и точната възраст на детето не се изпращат към AI доставчика.');
    setI18n('faq5q','How quickly do I get the book?','Колко бързо получавам книжката?');
    setI18n('faq5a','After a successful payment, Kidventuro opens the personalized printable book so you can save it as a PDF or print it.','След успешно плащане Kidventuro отваря персонализираната книжка, за да я запазиш като PDF или да я принтираш.');

    localizeSelects();
    localizeFamilyDialog();

    if(!allCheckoutUrls){
      document.querySelectorAll('.price-card a, #openBooklet').forEach(el=>{
        el.classList.add('kv-unavailable');
        el.setAttribute('aria-disabled','true');
        el.setAttribute('title',bg?'Checkout конфигурацията се обновява':'Checkout configuration is being updated');
      });
    }
  }

  if(mode==='live'&&allCheckoutUrls&&!document.getElementById('kidventuroStructuredData')){
    const jsonLd=document.createElement('script');
    jsonLd.id='kidventuroStructuredData';
    jsonLd.type='application/ld+json';
    jsonLd.textContent=JSON.stringify({
      '@context':'https://schema.org',
      '@type':'ItemList',
      name:'Kidventuro personalized printable travel adventures',
      itemListElement:[
        { '@type':'ListItem', position:1, item:{ '@type':'Product', name:'Kidventuro Mini', brand:{'@type':'Brand',name:'Kidventuro'}, description:'10-page personalized printable travel activity pack for ages 4–12.', offers:{'@type':'Offer',priceCurrency:'EUR',price:'5.90',url:'https://kidventuro.com/#pricing',availability:'https://schema.org/InStock'} } },
        { '@type':'ListItem', position:2, item:{ '@type':'Product', name:'Kidventuro Adventure', brand:{'@type':'Brand',name:'Kidventuro'}, description:'25–28-page personalized printable travel adventure for ages 4–12.', offers:{'@type':'Offer',priceCurrency:'EUR',price:'9.90',url:'https://kidventuro.com/#pricing',availability:'https://schema.org/InStock'} } },
        { '@type':'ListItem', position:3, item:{ '@type':'Product', name:'Kidventuro Family', brand:{'@type':'Brand',name:'Kidventuro'}, description:'Personalized printable family travel adventure for up to three children.', offers:{'@type':'Offer',priceCurrency:'EUR',price:'14.90',url:'https://kidventuro.com/#pricing',availability:'https://schema.org/InStock'} } }
      ]
    });
    document.head.appendChild(jsonLd);
  }

  refresh();
  document.getElementById('languageToggle')?.addEventListener('click',()=>queueMicrotask(refresh));
  document.addEventListener('click',event=>{
    if(event.target.closest('a[href="#checkout-family"]')) setTimeout(localizeFamilyDialog,0);
  });
})();