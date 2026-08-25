(()=>{
  const SESSION_KEY='kidventuro:booklet';
  let data={};
  try{data=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{}')||{};}catch{}

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const children=Array.isArray(data.children)?data.children.slice(0,3):[];
  const city=String(data.destination||'Rome');
  const days=Number(data.days)||4;
  const base=window.KV_CITY?.[city]||window.KV_CITY?.Rome;
  if(!base||children.length<1){
    document.getElementById('book').innerHTML='<section class="page"><h1>Family adventure unavailable</h1><p>Please return to Kidventuro and recreate the Family checkout.</p></section>';
    return;
  }

  const D={...base,words:window.KV_LANG?.[base.lang]||window.KV_LANG?.en||[]};
  const interestInfo=key=>window.KV_INTERESTS?.[key]||['⭐','Curiosity','notice something unusual'];
  const level=age=>Number(age)<=6?'Little Explorer':Number(age)<=9?'City Detective':'Master Explorer';
  const levelIcon=age=>Number(age)<=6?'🌟':Number(age)<=9?'🔎':'🧭';
  const ageChallenge=(child,I)=>{
    const age=Number(child.age);
    if(age<=6) return `Find 5 things connected to ${I[1]}, circle your favourite, then draw it.`;
    if(age<=9) return `Solve three clues, find one detail connected to ${I[1]}, and explain it to the family.`;
    return `Collect three pieces of evidence about ${I[1]} in ${city} and explain what they reveal about the place.`;
  };

  const footer=`<div class="footer-note">KIDVENTURO FAMILY • ${esc(city)}</div>`;
  const page=(body,cls='')=>`<section class="page ${cls}">${body}${footer}</section>`;
  const head=(k,t,e)=>`<div class="title-row"><div><p class="kicker">${esc(k)}</p><h2>${esc(t)}</h2></div><div class="emoji">${e}</div></div>`;
  const line=()=>'<div class="line"></div>';
  const checks=a=>`<div class="checklist">${a.map(x=>`<div class="check"><span class="box"></span><span>${esc(x)}</span></div>`).join('')}</div>`;
  const missions=a=>`<div class="missions">${a.map((x,i)=>`<div class="mission"><b>${i+1}</b><div>${esc(x)}</div></div>`).join('')}</div>`;
  const draw=(label,h='70mm')=>`<div class="draw small" style="height:${h}">${esc(label)}</div>`;

  const familyNames=children.map(c=>esc(c.name)).join(' • ');
  const icons=children.map(c=>interestInfo(c.interest)[0]).join(' ');
  const allInterests=children.map(c=>interestInfo(c.interest)[1]);

  let P=[];
  P.push(page(`
    <div class="brandline">KIDVENTURO FAMILY</div>
    <div class="cover-copy">
      <p class="kicker">OUR PERSONALIZED FAMILY TRAVEL ADVENTURE</p>
      <h1>${esc(city)}</h1>
      <p class="child">${familyNames}</p>
      <div class="chips"><span class="chip">${D.flag} ${esc(D.country)}</span><span class="chip">${days} day trip</span><span class="chip">${children.length} explorer${children.length>1?'s':''}</span></div>
    </div>
    <div class="cover-icons">${icons} ${D.icons||''}</div>
  `,'cover'));

  P.push(page(`${head('MEET THE TEAM','Our explorer team','👨‍👩‍👧‍👦')}
    <div style="display:grid;gap:7mm;margin-top:9mm">
      ${children.map(c=>{const I=interestInfo(c.interest);return `<div class="card mint"><p class="label">${levelIcon(c.age)} ${level(c.age).toUpperCase()}</p><h2>${esc(c.name)}</h2><p><strong>Age ${esc(c.age)}</strong> • ${I[0]} Loves ${esc(I[1])}</p><p>${esc(ageChallenge(c,I))}</p></div>`}).join('')}
    </div>`));

  P.push(page(`${head('TEAMWORK','Choose your family roles','🤝')}
    <p class="muted">Swap roles whenever you want. Everyone gets a turn.</p>
    ${missions(['Navigator — helps choose the next stop','Detail Detective — spots things others miss','Food Scout — chooses one local taste to investigate','Photo Director — suggests one family photo','Word Captain — remembers a local phrase','Memory Keeper — records the funniest moment'])}
    <div class="card yellow" style="margin-top:10mm"><strong>Family rule:</strong> nobody has to finish every mission. Curiosity beats rushing.</div>`));

  P.push(page(`${head('READY?','Pack as a team','🎒')}
    ${checks(['Kidventuro Family book','Pencils / colouring pencils','Water bottles','Comfortable shoes','Weather gear','Tickets / travel cards','Small snacks','Camera with an adult','One tiny travel mascot','Good mood','Space for souvenirs','Curiosity'])}
    <div class="card mint" style="margin-top:12mm"><h3>${icons} Explorer powers</h3><p>${esc(allInterests.join(' • '))}</p></div>`));

  P.push(page(`${head('ROUTE','Our family mission map','🗺️')}
    <p class="muted">Write four stops. Let a different explorer choose or describe each one.</p>
    ${[1,2,3,4].map(i=>`<div class="rating"><strong>STOP ${i}</strong>${line()}<span>★</span></div>`).join('')}
    ${draw('DRAW YOUR FAMILY ROUTE')}`));

  const bingo=[['🚲','bicycle'],['🐕','dog'],['🎨','street art'],['🍦','ice cream'],['🌳','big tree'],['📷','camera'],['🎵','music'],['🗺️','map'],['☕','café'],['🚪','colourful door'],['🌸','flowers'],['🚌','bus'],['⛲','fountain'],['🏛️','old building'],['⭐','something surprising'],['👨‍👩‍👧‍👦','family moment']];
  P.push(page(`${head('LOOK TOGETHER','Family travel bingo','👀')}
    <p class="muted">Work as one team. Four in a row wins; a full board is legendary.</p>
    <div class="bingo">${bingo.map(([e,t])=>`<div><span><strong>${e}</strong>${esc(t)}</span></div>`).join('')}</div>`));

  P.push(page(`${head('CITY HUNT','Shared scavenger hunt','🔎')}
    <p class="muted">Split the clues between explorers or solve them together.</p>
    ${checks((D.hunt||[]).slice(0,12))}
    <div class="card yellow" style="margin-top:10mm"><strong>Team bonus:</strong> find something that connects two different explorer interests.</div>`));

  P.push(page(`${head('LANDMARK TEAM','Landmark detectives','🏛️')}
    <p class="muted">At each place, one explorer spots a detail and another asks a question.</p>
    ${missions((D.marks||[]).map(x=>`${x}: find one detail your family would normally miss.`))}
    <p class="label" style="margin-top:9mm">BEST FAMILY DISCOVERY</p>${line()}${line()}`));

  P.push(page(`${head('TASTE TOGETHER','Family food mission','🍴')}
    <p class="muted">Spot, share or learn about a local food. Nobody has to taste something they do not want.</p>
    ${missions((D.food||[]).map(x=>`Investigate ${x} — who would try it first?`))}
    <div class="card mint" style="margin-top:10mm"><strong>Family food winner:</strong>${line()}<span class="stars">☆ ☆ ☆ ☆ ☆</span></div>`));

  P.push(page(`${head('LOCAL WORDS','Speak like a local together','💬')}
    <div class="two" style="margin-top:9mm">${(D.words||[]).slice(0,4).map(([a,b])=>`<div class="card soft"><p class="label">SAY</p><h2>${esc(a)}</h2><p>${esc(b)}</p></div>`).join('')}</div>
    <div class="card mint" style="margin-top:10mm"><h3>Family phrase challenge</h3><p>Each explorer chooses one phrase. Use it politely with an adult.</p></div>`));

  children.forEach((c,index)=>{
    const I=interestInfo(c.interest);
    P.push(page(`${head(`EXPLORER ${index+1}`,`${c.name}'s personal challenge`,I[0])}
      <div class="card mint"><p class="label">${levelIcon(c.age)} ${level(c.age).toUpperCase()}</p><h2>${esc(c.name)}</h2><p>Age ${esc(c.age)} • Specialist power: ${I[0]} ${esc(I[1])}</p></div>
      <div class="card yellow" style="margin-top:9mm"><h3>Your mission</h3><p>${esc(ageChallenge(c,I))}</p><p><strong>Interest clue:</strong> ${esc(I[2])}.</p></div>
      <p class="label" style="margin-top:9mm">WHAT I FOUND</p>${line()}${line()}
      ${draw(`${c.name.toUpperCase()}: DRAW YOUR BEST DISCOVERY`)}`));
  });

  P.push(page(`${head('CAMERA','Family photo missions','📷')}
    <div class="photo-grid"><div class="photo">Everyone copies a statue or landmark pose</div><div class="photo">One photo connecting two explorer interests</div><div class="photo">A tiny detail most visitors miss</div><div class="photo">The funniest family face of the trip</div></div>
    <div class="card yellow" style="margin-top:8mm"><strong>Photo rule:</strong> ask an adult before photographing other people.</div>`));

  P.push(page(`${head('MEMORIES','Our family travel journal','✏️')}
    <p class="label">BEST THING WE SAW</p>${line()}${line()}
    <p class="label">FUNNIEST MOMENT</p>${line()}${line()}
    <p class="label">BEST FOOD / SNACK</p>${line()}
    <p class="label">ONE THING EACH EXPLORER NOTICED</p>${children.map(c=>`<p><strong>${esc(c.name)}:</strong></p>${line()}`).join('')}`));

  P.push(page(`${head('TEST THE TEAM','Family city quiz','🏆')}
    <div class="quiz">${(D.quiz||[]).slice(0,3).map((z,i)=>`<div class="question"><strong>${i+1}. ${esc(z[0])}</strong><div class="answers">${z.slice(1).map(a=>`<span>${esc(a)}</span>`).join('')}</div></div>`).join('')}
      <div class="question"><strong>4. Which explorer found the most surprising detail?</strong>${line()}</div>
      <div class="question"><strong>5. What should another family definitely notice in ${esc(city)}?</strong>${line()}</div>
    </div>`));

  P.push(page(`${head('AWARDS','Explorer awards','⭐')}
    <p class="muted">Give every explorer a different award.</p>
    <div style="display:grid;gap:8mm;margin-top:9mm">${children.map(c=>`<div class="card soft"><h2>${esc(c.name)}</h2><p>🏅 Award: _______________________________________</p><p>Because: _______________________________________</p><p>Favourite memory: ______________________________</p></div>`).join('')}</div>`));

  P.push(page(`<div class="brandline">KIDVENTURO FAMILY</div><div class="seal">★</div><p class="kicker">OFFICIAL FAMILY EXPLORER CERTIFICATE</p><h1>Adventure completed by</h1><h1 style="color:var(--orange);font-size:44px;margin-top:10mm">${familyNames}</h1><p style="font-size:18px;margin-top:8mm">who explored <strong>${D.flag} ${esc(city)}</strong> as a team with curiosity, kindness and excellent detective skills.</p><div class="signatures"><div class="signature">DATE</div><div class="signature">FAMILY SIGNATURE</div></div>`,'certificate'));

  const total=P.length;
  const book=document.getElementById('book');
  book.innerHTML=P.join('');
  [...book.querySelectorAll('.page')].forEach((p,i)=>p.dataset.page=`${i+1}/${total}`);
  document.body.dataset.product='family';
  document.getElementById('toolbarTitle').textContent=`${city} Family Adventure`;
  const small=document.querySelector('.toolbar-copy small');
  if(small) small.textContent=`${total} printable pages • A4 • ${children.length} explorer${children.length>1?'s':''} • ${days}-day trip`;
  document.getElementById('printBtn').onclick=()=>window.print();
  document.getElementById('backBtn').onclick=()=>location.href='index.html#create';
})();
