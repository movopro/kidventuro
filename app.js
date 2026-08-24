const $=id=>document.getElementById(id);

const translations={
  en:{
    navHow:'How it works',navDestinations:'Destinations',navPricing:'Pricing',navCreate:'Create a book',
    eyebrow:'PERSONALIZED • PRINTABLE • READY IN MINUTES',heroTitle:'Turn every trip into an <em>adventure.</em>',
    heroSub:"A travel activity book made for your child, their age and the place you're visiting.",heroCta:'Create a free preview',heroSample:'See an example',
    trust1:'No app needed',trust2:'Print at home',trust3:'Made for ages 4–12',
    createEyebrow:'TRY IT NOW',createTitle:'Make their adventure personal.',createSub:'Fill in five things. Kidventuro adapts the adventure to the child, destination and trip length.',
    labelName:"Child's first name",labelAge:'Age',labelDays:'Trip length',labelDestination:'Destination',labelInterest:'What do they love?',generateBtn:'Generate my preview',
    formNote:'Demo only — no child account is created. Use a first name or nickname only; the full demo keeps personalization temporarily in your browser session.',
    previewTag:'LIVE PREVIEW',previewAdventure:'A KIDVENTURO ADVENTURE FOR',openSample:'Open printable sample →',openBooklet:'Generate full demo →',
    howEyebrow:'HOW IT WORKS',howTitle:'From “Are we there yet?” to “What’s next?”',
    step1Title:'Tell us about your explorer',step1Text:'Name, age, trip length, destination and the things they love.',
    step2Title:'We build the adventure',step2Text:'Games, missions, facts and activities adapt to age, interests, destination and trip length.',
    step3Title:'Print, pack, explore',step3Text:'Save the book as PDF and bring it on the plane, train or road trip.',
    destEyebrow:'25 DESTINATIONS',destTitle:'25 destinations. Thousands of possible adventures.',
    sampleEyebrow:"WHAT'S INSIDE",sampleTitle:'Less screen time. More “I found it!”',sampleText:'Each book mixes quiet travel activities with missions that make children notice the real destination around them.',
    sample1:'Travel bingo & scavenger hunts',sample2:'Age-adapted puzzles and challenges',sample3:'Local words, food and fun facts',sample4:'Drawing, journaling and memory pages',sample5:'Personalized explorer certificate',printSample:'Print demo page',
    pricingEyebrow:'SIMPLE PRICING',pricingTitle:'One small purchase. One much better trip.',miniDesc:'A quick travel pack for the journey.',mini1:'10 printable pages',mini2:'Personalized cover',mini3:'Travel games & puzzles',
    advDesc:'The full Kidventuro experience.',adv1:'25–28 printable pages',adv2:'Destination missions',adv3:'Age, interest & trip-length adapted',adv4:'Explorer certificate',
    familyDesc:'One adventure for up to three children.',family1:'Up to 3 kids',family2:'Age-adapted activities',family3:'Shared family missions',tryPreview:'Try preview',tryPreview2:'Try preview',createPreview:'Create preview',mostPopular:'MOST POPULAR',
    pricingNote:'MVP preview pricing — checkout will be connected before public launch.',
    faqTitle:'A few parent questions.',faq1q:'Is this a physical book?',faq1a:'No. Kidventuro is a digital printable adventure. The current demo is saved as PDF through your browser.',
    faq2q:'Do I need to create an account?',faq2a:'No child account is required for the MVP. The paid checkout will be handled by an adult.',
    faq3q:'What personal information do you need?',faq3a:"Only a first name or nickname, age, destination, interest and trip length are used for personalization. Please do not enter a surname, full birth date, address, school, photo or sensitive information.",
    faq4q:'Who is responsible for travel safety?',faq4a:'An adult must supervise the child and decide whether each mission is safe and appropriate. Always follow local rules, weather guidance, transport rules and official opening information.',
    footerPrivacy:'Privacy',footerTerms:'Terms',footerRefunds:'Refunds & delivery',footerContact:'Contact',modalPrint:'Print / Save as PDF'
  },
  bg:{
    navHow:'Как работи',navDestinations:'Дестинации',navPricing:'Цени',navCreate:'Създай книжка',
    eyebrow:'ПЕРСОНАЛИЗИРАНА • ЗА ПЕЧАТ • ГОТОВА ЗА МИНУТИ',heroTitle:'Превърни всяко пътуване в <em>приключение.</em>',
    heroSub:'Книжка с активности, създадена за твоето дете, неговата възраст и мястото, което ще посетите.',heroCta:'Създай безплатен преглед',heroSample:'Виж пример',
    trust1:'Без приложение',trust2:'Печат у дома',trust3:'За деца 4–12 г.',
    createEyebrow:'ОПИТАЙ СЕГА',createTitle:'Направи приключението лично.',createSub:'Попълни пет неща. Kidventuro адаптира приключението към детето, дестинацията и продължителността на пътуването.',
    labelName:'Първо име на детето',labelAge:'Възраст',labelDays:'Продължителност',labelDestination:'Дестинация',labelInterest:'Какво обича?',generateBtn:'Генерирай преглед',
    formNote:'Само демо — не се създава детски профил. Използвай само първо име или прякор; пълното демо пази персонализацията временно в сесията на браузъра.',
    previewTag:'ПРЕГЛЕД НА ЖИВО',previewAdventure:'KIDVENTURO ПРИКЛЮЧЕНИЕ ЗА',openSample:'Отвори примерна страница →',openBooklet:'Генерирай пълно демо →',
    howEyebrow:'КАК РАБОТИ',howTitle:'От „Стигнахме ли?“ до „Какво следва?“',
    step1Title:'Разкажи ни за малкия пътешественик',step1Text:'Име, възраст, дни, дестинация и любими интереси.',
    step2Title:'Ние създаваме приключението',step2Text:'Игри, мисии, факти и занимания се адаптират към възрастта, интересите, дестинацията и дните.',
    step3Title:'Принтирай, прибери, изследвай',step3Text:'Запази книжката като PDF и я вземи в самолета, влака или колата.',
    destEyebrow:'25 ДЕСТИНАЦИИ',destTitle:'25 дестинации. Хиляди възможни приключения.',
    sampleEyebrow:'КАКВО ИМА ВЪТРЕ',sampleTitle:'По-малко екран. Повече „Намерих го!“',sampleText:'Всяка книжка комбинира спокойни занимания за път с мисии, които карат детето да забелязва истинския свят около себе си.',
    sample1:'Travel bingo и scavenger hunt',sample2:'Пъзели и предизвикателства според възрастта',sample3:'Местни думи, храна и любопитни факти',sample4:'Рисуване, дневник и страници за спомени',sample5:'Персонализиран сертификат за изследовател',printSample:'Принтирай демо страница',
    pricingEyebrow:'ЯСНИ ЦЕНИ',pricingTitle:'Една малка покупка. Едно много по-хубаво пътуване.',miniDesc:'Бърз пакет за самото пътуване.',mini1:'10 страници за печат',mini2:'Персонализирана корица',mini3:'Игри и пъзели за път',
    advDesc:'Пълното Kidventuro преживяване.',adv1:'25–28 страници за печат',adv2:'Мисии според дестинацията',adv3:'Според възраст, интереси и дни',adv4:'Сертификат за изследовател',
    familyDesc:'Едно приключение за до три деца.',family1:'До 3 деца',family2:'Активности според възрастта',family3:'Семейни мисии',tryPreview:'Опитай преглед',tryPreview2:'Опитай преглед',createPreview:'Създай преглед',mostPopular:'НАЙ-ПОПУЛЯРЕН',
    pricingNote:'MVP тестови цени — плащането ще бъде свързано преди публичния старт.',
    faqTitle:'Няколко въпроса от родители.',faq1q:'Това физическа книжка ли е?',faq1a:'Не. Kidventuro е дигитално приключение за печат. Текущото демо се запазва като PDF през браузъра.',
    faq2q:'Трябва ли да създавам профил?',faq2a:'За MVP не е нужен детски профил. Платеният checkout ще се извършва от възрастен.',
    faq3q:'Какви лични данни са нужни?',faq3a:'За персонализация използваме само първо име или прякор, възраст, дестинация, интерес и дни. Не въвеждай фамилия, пълна дата на раждане, адрес, училище, снимка или чувствителна информация.',
    faq4q:'Кой отговаря за безопасността по време на пътуването?',faq4a:'Детето трябва да бъде под надзор на възрастен, който преценява дали всяка мисия е безопасна и подходяща. Следвайте местните правила, времето, транспорта и официалната информация за работно време.',
    footerPrivacy:'Поверителност',footerTerms:'Условия',footerRefunds:'Възстановяване и доставка',footerContact:'Контакт',modalPrint:'Принтирай / Запази като PDF'
  }
};

const destinations=[
  ['Rome','🇮🇹','Ancient wonders • fountains • pizza'],['Paris','🇫🇷','Towers • art • cafés'],['London','🇬🇧','Royal clues • buses • bridges'],['Barcelona','🇪🇸','Mosaics • football • sea'],['Dubai','🇦🇪','Skyscrapers • desert • future'],['Amsterdam','🇳🇱','Canals • bikes • tulips'],['Vienna','🇦🇹','Palaces • music • cake'],['Prague','🇨🇿','Castles • bridges • clocks'],['Berlin','🇩🇪','Street art • history • trains'],['Lisbon','🇵🇹','Trams • tiles • viewpoints'],['Athens','🇬🇷','Myths • temples • sunshine'],['Istanbul','🇹🇷','Ferries • domes • bazaars'],['New York','🇺🇸','Taxis • parks • skyscrapers'],['Orlando','🇺🇸','Family fun • lakes • sunshine'],['Tokyo','🇯🇵','Trains • temples • neon'],['Kyoto','🇯🇵','Torii • bamboo • tea'],['Singapore','🇸🇬','Supertrees • food • skyline'],['Sydney','🇦🇺','Harbour • wildlife • beaches'],['Copenhagen','🇩🇰','Bikes • castles • canals'],['Budapest','🇭🇺','Danube • castles • baths'],['Venice','🇮🇹','Canals • bridges • masks'],['Florence','🇮🇹','Renaissance • art • gelato'],['Madrid','🇪🇸','Palaces • football • art'],['Bangkok','🇹🇭','Temples • tuk-tuks • markets'],['Reykjavik','🇮🇸','Volcanoes • rainbows • harbour']
];
const interests=[
  ['dinosaurs','Dinosaurs','🦖','динозаври'],['space','Space','🚀','космос'],['animals','Animals','🐾','животни'],['football','Football','⚽','футбол'],['art','Art','🎨','изкуство'],['mysteries','Mysteries','🔎','загадки'],['castles','Castles & knights','🏰','замъци и рицари'],['science','Science','🧪','наука'],['vehicles','Vehicles','🚗','превозни средства'],['nature','Nature','🌿','природа'],['food','Food & cooking','🍳','храна и готвене'],['music','Music','🎵','музика'],['superheroes','Superheroes','🦸','супергерои'],['history','History','📜','история'],['ocean','Ocean & sea life','🐠','океан и морски живот'],['trains','Trains','🚆','влакове']
];
const destinationData={
  'Rome':{missions:['Colosseum detective','Fountain clue hunt']},'Paris':{missions:['Eiffel Tower spotter','Paris colour hunt']},'London':{missions:['Red bus bingo','Royal symbol hunt']},'Barcelona':{missions:['Gaudí shape hunt','Mosaic colour bingo']},'Dubai':{missions:['Skyline spotter','Desert pattern puzzle']},'Amsterdam':{missions:['Canal bridge detective','Bicycle bingo']},'Vienna':{missions:['Palace detail hunt','Music symbol bingo']},'Prague':{missions:['Castle tower hunt','Astronomical clock clues']},'Berlin':{missions:['Bear symbol hunt','Street-art detective']},'Lisbon':{missions:['Yellow tram bingo','Tile pattern hunt']},'Athens':{missions:['Acropolis detective','Mythology symbol hunt']},'Istanbul':{missions:['Bosphorus ferry hunt','Dome-and-tower bingo']},'New York':{missions:['Yellow taxi bingo','Skyscraper spotter']},'Orlando':{missions:['Theme-park shape hunt','Florida nature bingo']},'Tokyo':{missions:['Train-sign detective','Vending-machine bingo']},'Kyoto':{missions:['Torii gate count','Bamboo pattern hunt']},'Singapore':{missions:['Merlion detective','Supertree shape hunt']},'Sydney':{missions:['Opera House shape hunt','Harbour ferry bingo']},'Copenhagen':{missions:['Colourful-house hunt','Bicycle bingo']},'Budapest':{missions:['Danube bridge hunt','Castle lookout clues']},'Venice':{missions:['Gondola spotter','Bridge-count challenge']},'Florence':{missions:['Renaissance detail hunt','Dome detective']},'Madrid':{missions:['Palace gate detective','Football-and-art bingo']},'Bangkok':{missions:['Tuk-tuk bingo','Temple pattern hunt']},'Reykjavik':{missions:['Rainbow-street hunt','Volcano clue bingo']}
};
const interestBG=Object.fromEntries(interests.map(([key,,,bg])=>[key,bg]));
const interestEN=Object.fromEntries(interests.map(([key,label])=>[key,label]));
let currentLang=localStorage.getItem('kidventuro:lang')==='bg'?'bg':'en';
let lastFocus=null;

function populateCatalog(){
  const destinationSelect=$('destination'),interestSelect=$('interest');
  if(!destinationSelect||!interestSelect)return;
  const selectedDestination=destinationSelect.value||'Rome',selectedInterest=interestSelect.value||'dinosaurs';
  destinationSelect.innerHTML=destinations.map(([name,flag])=>`<option value="${name}">${name} ${flag}</option>`).join('');
  interestSelect.innerHTML=interests.map(([key,label,emoji])=>`<option value="${key}">${label} ${emoji}</option>`).join('');
  destinationSelect.value=destinations.some(d=>d[0]===selectedDestination)?selectedDestination:'Rome';
  interestSelect.value=interests.some(i=>i[0]===selectedInterest)?selectedInterest:'dinosaurs';
  const grid=document.querySelector('.destination-grid');
  if(grid)grid.innerHTML=destinations.map(([name,flag,desc])=>`<article class="destination-card"><div><span>${flag}</span><h3>${name}</h3><p>${desc}</p></div></article>`).join('');
}

function applyLanguage(){
  document.documentElement.lang=currentLang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const value=translations[currentLang][el.dataset.i18n];
    if(!value)return;
    if(value.includes('<em>'))el.innerHTML=value;else el.textContent=value;
  });
  const toggle=$('languageToggle');if(toggle)toggle.textContent=currentLang==='en'?'BG':'EN';
  updatePreview();
}

function updatePreview(){
  const name=(($('childName')?.value||'').trim()||(currentLang==='en'?'Explorer':'Пътешественик')).slice(0,20);
  const age=$('childAge')?.value||'7',destination=$('destination')?.value||'Rome',interest=$('interest')?.value||'dinosaurs',days=$('tripDays')?.value||'4';
  const data=destinationData[destination]||destinationData.Rome,interestLabel=interestEN[interest]||interest,ibg=interestBG[interest]||interest;
  if($('previewName'))$('previewName').textContent=name.toUpperCase();
  if($('previewAge'))$('previewAge').textContent=currentLang==='en'?`AGE ${age} • ${days} DAYS`:`${age} Г. • ${days} ДНИ`;
  if($('previewDestination'))$('previewDestination').textContent=destination.toUpperCase();
  if($('previewSentence'))$('previewSentence').textContent=currentLang==='en'?`Explore ${destination} through local clues, mini missions and ${interestLabel.toLowerCase()}-powered discoveries.`:`Изследвай ${destination} чрез местни загадки, мини мисии и приключения, вдъхновени от ${ibg}.`;
  if($('missionOne'))$('missionOne').textContent=data.missions[0];
  if($('missionTwo'))$('missionTwo').textContent=data.missions[1];
  if($('missionThree'))$('missionThree').textContent=currentLang==='en'?`${interestLabel} explorer challenge`:`Предизвикателство: ${ibg}`;
  if($('modalTitle'))$('modalTitle').textContent=currentLang==='en'?`${name}'s ${destination} Mini Mission`:`Мини мисията на ${name} в ${destination}`;
  if($('printIntro'))$('printIntro').textContent=currentLang==='en'?`Welcome to ${destination}, ${name}! Look carefully, stay with your adult and collect clues.`:`Добре дошли в ${destination}! ${name} трябва да наблюдава внимателно, да остане с възрастния и да събира следи.`;
}

function openModal(){
  const modal=$('sampleModal');if(!modal)return;
  lastFocus=document.activeElement;modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  modal.querySelector('.modal-close')?.focus();
}
function closeModal(){
  const modal=$('sampleModal');if(!modal)return;
  modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';lastFocus?.focus?.();
}

populateCatalog();
$('languageToggle')?.addEventListener('click',()=>{currentLang=currentLang==='en'?'bg':'en';localStorage.setItem('kidventuro:lang',currentLang);applyLanguage();});
$('previewForm')?.addEventListener('submit',e=>{e.preventDefault();updatePreview();$('previewCard')?.animate([{transform:'scale(.985)',opacity:.75},{transform:'scale(1)',opacity:1}],{duration:280,easing:'ease-out'});});
['childName','childAge','destination','interest','tripDays'].forEach(id=>{const el=$(id);el?.addEventListener('input',updatePreview);el?.addEventListener('change',updatePreview);});
$('openSample')?.addEventListener('click',openModal);$('printSample')?.addEventListener('click',openModal);
$('openBooklet')?.addEventListener('click',()=>{
  const payload={name:($('childName')?.value||'').trim()||'Alex',age:$('childAge')?.value||'7',destination:$('destination')?.value||'Rome',interest:$('interest')?.value||'dinosaurs',days:$('tripDays')?.value||'4',lang:currentLang};
  try{sessionStorage.setItem('kidventuro:booklet',JSON.stringify(payload));}catch(e){console.warn('Session storage unavailable',e);}
  location.href='booklet.html';
});
$('modalPrint')?.addEventListener('click',()=>window.print());
document.querySelectorAll('[data-close-modal]').forEach(el=>el.addEventListener('click',closeModal));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
if($('year'))$('year').textContent=new Date().getFullYear();
applyLanguage();
