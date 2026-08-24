(()=>{
  const A=window.KVA;if(!A)return;
  const q=new URLSearchParams(location.search),days=Math.max(2,Math.min(7,+q.get('days')||4));
  const {lev,city,name,I,esc,pg,set,head,line,checks,draw}=A;
  const footer=()=>`<div class="footer-note">KIDVENTURO • ${esc(name)} in ${esc(city)}</div>`;
  const journalBody=(d)=>{
    if(lev==='young') return `${head('DAY '+d,'My picture diary','✏️')}<p class="label">MY DAY FELT LIKE…</p><div class="mood-row">😄 🤩 😴 😮 😋</div><p class="label">MY FAVOURITE THING WAS…</p>${line()}${draw('DRAW MY BEST MOMENT FROM DAY '+d,'')}<p class="label">ONE WORD FOR TODAY</p>${line()}`;
    if(lev==='older') return `${head('DAY '+d,'Explorer field journal','✏️')}<p class="label">MOST IMPORTANT OBSERVATION</p>${line()}${line()}<p class="label">A FACT OR IDEA I CAN VERIFY</p>${line()}${line()}<p class="label">HOW TODAY CHANGED MY VIEW OF ${esc(city.toUpperCase())}</p>${line()}${line()}<p class="label">A QUESTION I STILL HAVE</p>${line()}${draw('QUICK FIELD SKETCH — DAY '+d)}`;
    return `${head('DAY '+d,'My travel journal','✏️')}<p class="label">BEST THING I SAW</p>${line()}${line()}<p class="label">SOMETHING NEW I LEARNED</p>${line()}${line()}<p class="label">SOMETHING THAT MADE ME LAUGH</p>${line()}<p class="label">MY MOOD: 😄 🤩 😴 😮 😋</p>${draw('DRAW ONE MOMENT FROM DAY '+d)}`;
  };
  const bonusBest=()=> lev==='young'
    ? `${head('BEST OF THE TRIP','My super favourites','🏆')}<div class="card mint"><h3>Circle your winners</h3><p>Best place: 🏛️ 🌳 🌊 🏙️</p><p>Best taste: 😋 🙂 😐</p><p>Best moment: 😄 🤩 😮</p></div>${draw('DRAW THE BEST THING I SAW','')}<p class="label">I WANT TO REMEMBER…</p>${line()}`
    : lev==='older'
    ? `${head('TRIP SYNTHESIS','What mattered most?','🏆')}<p class="label">THE MOST IMPORTANT PLACE OR IDEA</p>${line()}${line()}<p class="label">ONE PIECE OF EVIDENCE THAT CHANGED MY FIRST IMPRESSION</p>${line()}${line()}<p class="label">MY STRONGEST RECOMMENDATION — AND WHY</p>${line()}${line()}<div class="card mint"><strong>${I[0]} Specialist note:</strong> connect one memory to ${esc(I[1])}.</div>`
    : `${head('BEST OF THE TRIP','My top discoveries','🏆')}<div class="card mint"><h3>Choose your winners</h3><p>Favourite place:</p>${line()}<p>Favourite food:</p>${line()}<p>Best surprise:</p>${line()}</div>${draw('DRAW THE MOMENT YOU WOULD REPLAY')}`;
  const journeyHome=()=> lev==='young'
    ? `${head('GOING HOME','My memory capsule','🎒')}<p class="muted">The trip is ending, but the story stays.</p>${checks(['I can name one place I visited','I remember one local word','I tried or spotted a local food','I found something surprising'])}${draw('DRAW ONE THING I WILL TELL SOMEONE AT HOME','')}<div class="card yellow"><strong>Next adventure:</strong> where should we go?</div>`
    : lev==='older'
    ? `${head('JOURNEY HOME','Memory capsule & reflection','🎒')}<p class="label">WHAT I UNDERSTAND NOW THAT I DIDN’T BEFORE</p>${line()}${line()}<p class="label">A DETAIL I THINK I WILL STILL REMEMBER IN A YEAR</p>${line()}${line()}<p class="label">ONE QUESTION I WOULD RESEARCH NEXT</p>${line()}${line()}<div class="card yellow"><strong>Next destination hypothesis:</strong> what kind of city would you compare with ${esc(city)}?</div>`
    : `${head('JOURNEY HOME','Pack the memories','🎒')}<p class="muted">Finish these before the trip disappears into the camera roll.</p>${checks(['Name your favourite landmark','Remember one local word','Choose your best food','Pick your funniest moment','Choose one photo to print'])}<p class="label">THE STORY I WILL TELL FIRST</p>${line()}${line()}${draw('A TINY MEMORY FROM '+city)}`;

  if(days===2){ set(16,bonusBest()); set(17,journeyHome()); }
  if(days===3){ set(17,journeyHome()); }

  if(days>4){
    const anchor=pg(18);
    for(let d=5;d<=days;d++){
      const s=document.createElement('section');
      s.className='page trip-added-page';
      s.innerHTML=journalBody(d)+footer();
      anchor.parentNode.insertBefore(s,anchor);
    }
  }

  const hunt=pg(8);
  if(hunt){
    const note=document.createElement('div'); note.className='card mint'; note.style.marginTop='8mm';
    const msg=days===2?'Priority mode: choose 6 clues you really want to find.':days===3?'City-break mode: aim for 3–4 clues per day.':days===4?'Classic mode: spread the hunt across the whole trip.':days===5?'Slow-explorer mode: try 2–3 clues each day and leave time to wander.':'Week mode: choose a different mini-theme each day and do not rush the list.';
    note.innerHTML=`<strong>${days}-day rhythm:</strong> ${msg}`;
    hunt.insertBefore(note,hunt.querySelector('.footer-note'));
  }

  const prep=pg(3);
  if(prep){
    const card=document.createElement('div'); card.className='card soft'; card.style.marginTop='8mm';
    const rhythm=days<=2?'A short, high-energy city break: choose priorities and keep plenty of free time.':days<=4?'A balanced trip: one main mission, one food discovery and one quiet activity per day.':days===5?'A slower trip: mix major sights with neighbourhood discoveries and rest.':'A full week: explore in themes, revisit favourites and leave room for spontaneous days.';
    card.innerHTML=`<h3>🗓️ Your ${days}-day adventure rhythm</h3><p>${rhythm}</p>`;
    prep.insertBefore(card,prep.querySelector('.footer-note'));
  }

  const pages=[...document.querySelectorAll('.page')],total=pages.length;
  pages.forEach((p,i)=>p.dataset.page=`${i+1}/${total}`);
  const small=document.querySelector('.toolbar-copy small');
  const ageMode=lev==='young'?'Look, point, circle and draw.':lev==='older'?'Investigate, compare, explain and collect evidence.':'Observe, solve clues and record discoveries.';
  if(small) small.textContent=`${total} printable pages • A4 • ${days}-day trip • ${ageMode}`;
  document.body.dataset.tripDays=String(days);
})();
