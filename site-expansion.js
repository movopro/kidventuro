(()=>{
  const extras=[
    ['Munich','🇩🇪','Palaces • science • parks','Дворци • наука • паркове',['Marienplatz clock hunt','English Garden explorer'],['Лов на часовника на Мариенплац','Изследовател в Английската градина']],
    ['Salzburg','🇦🇹','Fortress • music • mountains','Крепост • музика • планини',['Fortress detail detective','Mozart music-symbol hunt'],['Детектив на детайлите в крепостта','Лов на музикални символи на Моцарт']],
    ['Zurich','🇨🇭','Lake • trams • chocolate','Езеро • трамваи • шоколад',['Lake-and-bridge spotter','Tram detective'],['Открий езерото и мостовете','Трамваен детектив']],
    ['Brussels','🇧🇪','Waffles • comics • Atomium','Гофрети • комикси • Атомиум',['Atomium shape challenge','Comic-mural colour hunt'],['Предизвикателство с формите на Атомиума','Лов на цветове по комикс стенописите']],
    ['Bruges','🇧🇪','Canals • bells • chocolate','Канали • камбани • шоколад',['Canal bridge detective','Belfry bell-tower hunt'],['Детектив на мостовете над каналите','Лов на камбанарията']],
    ['Dublin','🇮🇪','Books • bridges • green parks','Книги • мостове • зелени паркове',['Liffey bridge hunt','Dublin doorway detective'],['Лов на мостовете над Лифи','Детектив на дъблинските врати']],
    ['Edinburgh','🇬🇧','Castle • hills • legends','Замък • хълмове • легенди',['Castle-wall detective','Royal Mile symbol hunt'],['Детектив на крепостните стени','Лов на символи по Royal Mile']],
    ['Stockholm','🇸🇪','Islands • ships • old town','Острови • кораби • стар град',['Island-and-bridge bingo','Vasa ship detective'],['Бинго с острови и мостове','Детектив на кораба Васа']],
    ['Oslo','🇳🇴','Fjord • sculptures • explorers','Фиорд • скулптури • изследователи',['Fjord-view spotter','Polar explorer challenge'],['Открий гледките към фиорда','Полярно изследователско предизвикателство']],
    ['Helsinki','🇫🇮','Sea fortress • trams • design','Морска крепост • трамваи • дизайн',['Design-shape hunt','Suomenlinna explorer mission'],['Лов на дизайнерски форми','Мисия изследовател в Суоменлина']],
    ['Milan','🇮🇹','Cathedral • design • trams','Катедрала • дизайн • трамваи',['Duomo spire count','Galleria mosaic hunt'],['Преброй шпиловете на Дуомото','Лов на мозайки в Галерията']],
    ['Naples','🇮🇹','Pizza • volcano • sea','Пица • вулкан • море',['Vesuvius view challenge','Naples street-detail hunt'],['Предизвикателство с гледка към Везувий','Лов на улични детайли в Неапол']],
    ['Seville','🇪🇸','Tiles • palaces • oranges','Плочки • дворци • портокали',['Tile-pattern detective','Orange-tree bingo'],['Детектив на шарките по плочките','Бинго с портокалови дървета']],
    ['Valencia','🇪🇸','Paella • gardens • future','Паеля • градини • бъдеще',['Future-building shape hunt','Turia Garden explorer'],['Лов на футуристични форми','Изследовател в градините Турия']],
    ['Porto','🇵🇹','River • bridges • tiles','Река • мостове • плочки',['Blue-tile detective','Douro bridge hunt'],['Детектив на сините плочки','Лов на мостовете над Дуро']],
    ['Nice','🇫🇷','Sea • colours • sunshine','Море • цветове • слънце',['Mediterranean colour hunt','Old-town shutter bingo'],['Лов на средиземноморски цветове','Бинго с капаците в стария град']],
    ['Dubrovnik','🇭🇷','Walls • sea • stone streets','Стени • море • каменни улици',['City-wall detective','Adriatic detail hunt'],['Детектив на градските стени','Лов на адриатически детайли']],
    ['Krakow','🇵🇱','Dragon • castle • square','Дракон • замък • площад',['Wawel dragon hunt','Market-square detective'],['Лов на дракона от Вавел','Детектив на пазарния площад']],
    ['Warsaw','🇵🇱','Mermaid • parks • skyline','Русалка • паркове • силует',['Mermaid symbol hunt','Old-vs-new city challenge'],['Лов на символа на русалката','Предизвикателство старо срещу ново']],
    ['Bucharest','🇷🇴','Grand buildings • parks • culture','Величествени сгради • паркове • култура',['Architecture detail hunt','Bucharest pattern bingo'],['Лов на архитектурни детайли','Бинго с шарки от Букурещ']],
    ['Sofia','🇧🇬','Mountain • history • parks','Планина • история • паркове',['Vitosha view challenge','Cyrillic city-sign hunt'],['Предизвикателство с гледка към Витоша','Лов на градски табели на кирилица']],
    ['Abu Dhabi','🇦🇪','Domes • museums • sea','Куполи • музеи • море',['Grand Mosque pattern hunt','Corniche sea-view bingo'],['Лов на шарки в Голямата джамия','Бинго с морски гледки по Корниш']],
    ['Seoul','🇰🇷','Palaces • food • city lights','Дворци • храна • градски светлини',['Hangul sign detective','Palace-roof shape hunt'],['Детектив на табелите с хангъл','Лов на форми по дворцовите покриви']],
    ['Hong Kong','🇭🇰','Ferries • skyline • food','Фериботи • силует • храна',['Star Ferry spotter','Skyline reflection hunt'],['Открий Star Ferry','Лов на отражения в силуета']],
    ['Kuala Lumpur','🇲🇾','Twin towers • food • tropical city','Кули близнаци • храна • тропически град',['Twin-tower shape challenge','Tropical city bingo'],['Предизвикателство с формите на кулите близнаци','Тропическо градско бинго']]
  ];

  const coreBg={
    Rome:['Древни чудеса • фонтани • пица',['Детектив при Колизеума','Лов на следи при фонтаните']],
    Paris:['Кули • изкуство • кафенета',['Открий Айфеловата кула','Лов на цветовете на Париж']],
    London:['Кралски следи • автобуси • мостове',['Бинго с червени автобуси','Лов на кралски символи']],
    Barcelona:['Мозайки • футбол • море',['Лов на формите на Гауди','Бинго с цветове от мозайките']],
    Dubai:['Небостъргачи • пустиня • бъдеще',['Открий силуета на града','Пъзел с пустинни шарки']],
    Amsterdam:['Канали • велосипеди • лалета',['Детектив на мостовете над каналите','Велосипедно бинго']],
    Vienna:['Дворци • музика • торта',['Лов на дворцови детайли','Бинго с музикални символи']],
    Prague:['Замъци • мостове • часовници',['Лов на замъчни кули','Следи от астрономическия часовник']],
    Berlin:['Улично изкуство • история • влакове',['Лов на символа на мечката','Детектив на уличното изкуство']],
    Lisbon:['Трамваи • плочки • гледки',['Бинго с жълти трамваи','Лов на шарки по плочките']],
    Athens:['Митове • храмове • слънце',['Детектив на Акропола','Лов на митологични символи']],
    Istanbul:['Фериботи • куполи • базари',['Лов на фериботите по Босфора','Бинго с куполи и кули']],
    'New York':['Таксита • паркове • небостъргачи',['Бинго с жълти таксита','Открий небостъргачите']],
    Orlando:['Семейни забавления • езера • слънце',['Лов на форми в тематичните паркове','Бинго с природата на Флорида']],
    Tokyo:['Влакове • храмове • неон',['Детектив на знаците по гарите','Бинго с вендинг автомати']],
    Kyoto:['Тории • бамбук • чай',['Преброй портите тории','Лов на бамбукови шарки']],
    Singapore:['Супердървета • храна • силует',['Детектив на Мерлиона','Лов на формите на супердърветата']],
    Sydney:['Пристанище • животни • плажове',['Лов на формите на Операта','Бинго с пристанищни фериботи']],
    Copenhagen:['Велосипеди • замъци • канали',['Лов на цветни къщи','Велосипедно бинго']],
    Budapest:['Дунав • замъци • бани',['Детектив на мостовете над Дунав','Лов на замъчни детайли']],
    Venice:['Канали • мостове • маски',['Бинго с гондоли','Лов на маски и мостове']],
    Florence:['Ренесанс • изкуство • джелато',['Лов на ренесансови детайли','Предизвикателство с куполи и статуи']],
    Madrid:['Дворци • футбол • изкуство',['Лов на дворцови символи','Футболно градско бинго']],
    Bangkok:['Храмове • тук-тукове • пазари',['Лов на храмови цветове','Бинго с тук-тукове']],
    Reykjavik:['Вулкани • дъги • пристанище',['Лов на цветовете на Рейкявик','Предизвикателство с вулканични форми']]
  };

  const extraMap=Object.fromEntries(extras.map(([name,flag,enDesc,bgDesc,enMissions,bgMissions])=>[name,{flag,enDesc,bgDesc,enMissions,bgMissions}]));

  function addDestinations(){
    const select=document.getElementById('destination');
    if(select){
      const existing=new Set([...select.options].map(o=>o.value));
      extras.forEach(([name,flag])=>{
        if(existing.has(name)) return;
        const option=document.createElement('option');
        option.value=name;
        option.textContent=`${name} ${flag}`;
        select.appendChild(option);
      });
    }

    const grid=document.querySelector('.destination-grid');
    if(grid){
      const existing=new Set([...grid.querySelectorAll('h3')].map(h=>h.textContent.trim()));
      extras.forEach(([name,flag,enDesc])=>{
        if(existing.has(name)) return;
        const article=document.createElement('article');
        article.className='destination-card';
        article.innerHTML=`<div><span>${flag}</span><h3>${name}</h3><p>${enDesc}</p></div>`;
        grid.appendChild(article);
      });
    }
  }

  function updateCount(){
    const bg=document.documentElement.lang==='bg';
    const eyebrow=document.querySelector('[data-i18n="destEyebrow"]');
    const title=document.querySelector('[data-i18n="destTitle"]');
    if(eyebrow) eyebrow.textContent=bg?'50 ДЕСТИНАЦИИ':'50 DESTINATIONS';
    if(title) title.textContent=bg?'50 дестинации. Хиляди възможни приключения.':'50 destinations. Thousands of possible adventures.';
  }

  function updateDestinationCards(){
    const bg=document.documentElement.lang==='bg';
    document.querySelectorAll('.destination-grid .destination-card').forEach(card=>{
      const name=card.querySelector('h3')?.textContent.trim();
      const p=card.querySelector('p');
      if(!name||!p) return;
      if(extraMap[name]) p.textContent=bg?extraMap[name].bgDesc:extraMap[name].enDesc;
      else if(coreBg[name]&&bg) p.textContent=coreBg[name][0];
    });
  }

  function updateMissionPreview(){
    const bg=document.documentElement.lang==='bg';
    const destination=document.getElementById('destination')?.value;
    let missions=null;
    if(extraMap[destination]) missions=bg?extraMap[destination].bgMissions:extraMap[destination].enMissions;
    else if(bg&&coreBg[destination]) missions=coreBg[destination][1];
    if(!missions) return;
    const one=document.getElementById('missionOne');
    const two=document.getElementById('missionTwo');
    if(one) one.textContent=missions[0];
    if(two) two.textContent=missions[1];
  }

  function setCopy(key,en,bg){
    const el=document.querySelector(`[data-i18n="${key}"]`);
    if(el) el.textContent=document.documentElement.lang==='bg'?bg:en;
  }

  function updateProductionCopy(){
    setCopy('formNote',
      'No child account is created. Use a first name or nickname only. Personalization is stored temporarily only to create and deliver the adventure.',
      'Не се създава детски профил. Използвай само първо име или прякор. Персонализацията се пази временно само за създаване и доставка на приключението.');
    setCopy('step2Text',
      'Games, missions and activities adapt to age, interests, destination and trip length. Paid books can also receive a privacy-reduced AI enhancement.',
      'Игрите, мисиите и заниманията се адаптират към възрастта, интересите, дестинацията и дните. Платените книжки могат да получат и AI допълнение с минимизирани данни.');
    setCopy('pricingNote',
      'Secure one-time checkout. Personalized digital delivery after payment. No subscription.',
      'Сигурно еднократно плащане. Персонализирана дигитална доставка след плащане. Без абонамент.');
    setCopy('faq1a',
      'No. Kidventuro is a digital printable adventure. Open it after payment, then use Print / Save as PDF.',
      'Не. Kidventuro е дигитално приключение за печат. Отвори го след плащане и използвай Print / Save as PDF.');
    setCopy('faq2a',
      'No. No child account is needed. An adult completes the secure checkout.',
      'Не. Не е нужен детски профил. Сигурното плащане се извършва от възрастен.');
    setCopy('faq3a',
      'We use only a first name or nickname, age, destination, interest and trip length. For AI enrichment, child names and exact ages are not sent to the AI provider.',
      'Използваме само първо име или прякор, възраст, дестинация, интерес и дни. При AI допълнението имената и точната възраст на детето не се изпращат към AI доставчика.');
  }

  function refresh(){
    addDestinations();
    updateCount();
    updateDestinationCards();
    updateMissionPreview();
    updateProductionCopy();
  }

  refresh();

  const destination=document.getElementById('destination');
  destination?.addEventListener('input',()=>queueMicrotask(updateMissionPreview));
  destination?.addEventListener('change',()=>queueMicrotask(updateMissionPreview));
  document.getElementById('previewForm')?.addEventListener('submit',()=>queueMicrotask(updateMissionPreview));
  document.getElementById('languageToggle')?.addEventListener('click',()=>queueMicrotask(refresh));

  window.KIDVENTURO_DESTINATION_COUNT=50;
})();