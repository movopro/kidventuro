(()=>{
  const extras=[
    ['Munich','🇩🇪','Palaces • science • parks',['Marienplatz clock hunt','English Garden explorer']],
    ['Salzburg','🇦🇹','Fortress • music • mountains',['Fortress detail detective','Mozart music-symbol hunt']],
    ['Zurich','🇨🇭','Lake • trams • chocolate',['Lake-and-bridge spotter','Tram detective']],
    ['Brussels','🇧🇪','Waffles • comics • Atomium',['Atomium shape challenge','Comic-mural colour hunt']],
    ['Bruges','🇧🇪','Canals • bells • chocolate',['Canal bridge detective','Belfry bell-tower hunt']],
    ['Dublin','🇮🇪','Books • bridges • green parks',['Liffey bridge hunt','Dublin doorway detective']],
    ['Edinburgh','🇬🇧','Castle • hills • legends',['Castle-wall detective','Royal Mile symbol hunt']],
    ['Stockholm','🇸🇪','Islands • ships • old town',['Island-and-bridge bingo','Vasa ship detective']],
    ['Oslo','🇳🇴','Fjord • sculptures • explorers',['Fjord-view spotter','Polar explorer challenge']],
    ['Helsinki','🇫🇮','Sea fortress • trams • design',['Design-shape hunt','Suomenlinna explorer mission']],
    ['Milan','🇮🇹','Cathedral • design • trams',['Duomo spire count','Galleria mosaic hunt']],
    ['Naples','🇮🇹','Pizza • volcano • sea',['Vesuvius view challenge','Naples street-detail hunt']],
    ['Seville','🇪🇸','Tiles • palaces • oranges',['Tile-pattern detective','Orange-tree bingo']],
    ['Valencia','🇪🇸','Paella • gardens • future',['Future-building shape hunt','Turia Garden explorer']],
    ['Porto','🇵🇹','River • bridges • tiles',['Blue-tile detective','Douro bridge hunt']],
    ['Nice','🇫🇷','Sea • colours • sunshine',['Mediterranean colour hunt','Old-town shutter bingo']],
    ['Dubrovnik','🇭🇷','Walls • sea • stone streets',['City-wall detective','Adriatic detail hunt']],
    ['Krakow','🇵🇱','Dragon • castle • square',['Wawel dragon hunt','Market-square detective']],
    ['Warsaw','🇵🇱','Mermaid • parks • skyline',['Mermaid symbol hunt','Old-vs-new city challenge']],
    ['Bucharest','🇷🇴','Grand buildings • parks • culture',['Architecture detail hunt','Bucharest pattern bingo']],
    ['Sofia','🇧🇬','Mountain • history • parks',['Vitosha view challenge','Cyrillic city-sign hunt']],
    ['Abu Dhabi','🇦🇪','Domes • museums • sea',['Grand Mosque pattern hunt','Corniche sea-view bingo']],
    ['Seoul','🇰🇷','Palaces • food • city lights',['Hangul sign detective','Palace-roof shape hunt']],
    ['Hong Kong','🇭🇰','Ferries • skyline • food',['Star Ferry spotter','Skyline reflection hunt']],
    ['Kuala Lumpur','🇲🇾','Twin towers • food • tropical city',['Twin-tower shape challenge','Tropical city bingo']]
  ];

  const missionMap=Object.fromEntries(extras.map(([name,,,missions])=>[name,missions]));

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
      extras.forEach(([name,flag,desc])=>{
        if(existing.has(name)) return;
        const article=document.createElement('article');
        article.className='destination-card';
        article.innerHTML=`<div><span>${flag}</span><h3>${name}</h3><p>${desc}</p></div>`;
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

  function updateMissionPreview(){
    const destination=document.getElementById('destination')?.value;
    const missions=missionMap[destination];
    if(!missions) return;
    const one=document.getElementById('missionOne');
    const two=document.getElementById('missionTwo');
    if(one) one.textContent=missions[0];
    if(two) two.textContent=missions[1];
  }

  addDestinations();
  updateCount();
  updateMissionPreview();

  const destination=document.getElementById('destination');
  destination?.addEventListener('input',()=>queueMicrotask(updateMissionPreview));
  destination?.addEventListener('change',()=>queueMicrotask(updateMissionPreview));
  document.getElementById('previewForm')?.addEventListener('submit',()=>queueMicrotask(updateMissionPreview));
  document.getElementById('languageToggle')?.addEventListener('click',()=>queueMicrotask(()=>{updateCount();updateMissionPreview();}));

  window.KIDVENTURO_DESTINATION_COUNT=50;
})();
