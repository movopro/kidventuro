const $ = (id) => document.getElementById(id);

const translations = {
  en: {
    navHow:"How it works", navDestinations:"Destinations", navPricing:"Pricing", navCreate:"Create a book",
    eyebrow:"PERSONALIZED • PRINTABLE • READY IN MINUTES",
    heroTitle:"Turn every trip into an <em>adventure.</em>",
    heroSub:"A travel activity book made for your child, their age and the place you're visiting.",
    heroCta:"Create a free preview", heroSample:"See an example",
    trust1:"No app needed", trust2:"Print at home", trust3:"Made for ages 4–12",
    createEyebrow:"TRY IT NOW", createTitle:"Make their adventure personal.",
    createSub:"Fill in four things. Kidventuro turns them into a travel book concept instantly.",
    labelName:"Child's first name", labelAge:"Age", labelDays:"Trip length", labelDestination:"Destination",
    labelInterest:"What do they love?", generateBtn:"Generate my preview",
    formNote:"Demo only — no account, payment or personal data is saved.",
    previewTag:"LIVE PREVIEW", previewAdventure:"A KIDVENTURO ADVENTURE FOR", openSample:"Open printable sample →", openBooklet:"Generate 25-page demo →",
    howEyebrow:"HOW IT WORKS", howTitle:"From “Are we there yet?” to “What’s next?”",
    step1Title:"Tell us about your explorer", step1Text:"Name, age, destination and the things they love.",
    step2Title:"We build the adventure", step2Text:"Games, missions, facts and activities adapt to the trip.",
    step3Title:"Print, pack, explore", step3Text:"Download the PDF and bring it on the plane, train or road trip.",
    destEyebrow:"DESTINATIONS", destTitle:"25 destinations. Thousands of possible adventures.",
    sampleEyebrow:"WHAT'S INSIDE", sampleTitle:"Less screen time. More “I found it!”",
    sampleText:"Each book mixes quiet travel activities with missions that make children notice the real destination around them.",
    sample1:"Travel bingo & scavenger hunts", sample2:"Age-adapted puzzles and mazes", sample3:"Local words, food and fun facts",
    sample4:"Drawing, journaling and memory pages", sample5:"Personalized explorer certificate", printSample:"Print demo page",
    pricingEyebrow:"SIMPLE PRICING", pricingTitle:"One small purchase. One much better trip.",
    miniDesc:"A quick travel pack for the journey.", mini1:"10 printable pages", mini2:"Personalized cover", mini3:"Travel games & puzzles",
    advDesc:"The full Kidventuro experience.", adv1:"25 printable pages", adv2:"Destination missions", adv3:"Personalized activities", adv4:"Explorer certificate",
    familyDesc:"One adventure for up to three children.", family1:"Up to 3 kids", family2:"Age-adapted activities", family3:"Shared family missions",
    tryPreview:"Try preview", tryPreview2:"Try preview", createPreview:"Create preview", mostPopular:"MOST POPULAR",
    pricingNote:"MVP preview pricing — checkout will be connected before launch.",
    faqTitle:"Parents ask. We answer.", q1:"Is this a physical book?", a1:"No. Kidventuro is a downloadable PDF designed to print at home, at work or at a local print shop.",
    q2:"Do I need an app?", a2:"No app and no child account. The finished adventure is a simple printable file.",
    q3:"Do you store my child's data?", a3:"The production version is designed to use only the minimum personalization data needed to create the book and to avoid building child profiles.",
    q4:"What ages is it for?", a4:"The first version targets ages 4–12, with activities adjusted by age group.",
    finalEyebrow:"THE TRIP STARTS BEFORE TAKEOFF", finalTitle:"Make the next family trip theirs, too.", finalBtn:"Create a preview",
    footerText:"Personalized travel adventures for curious kids.", footerPricing:"Pricing", footerHow:"How it works",
    modalPrint:"Print / Save as PDF"
  },
  bg: {
    navHow:"Как работи", navDestinations:"Дестинации", navPricing:"Цени", navCreate:"Създай книжка",
    eyebrow:"ПЕРСОНАЛИЗИРАНА • ЗА ПЕЧАТ • ГОТОВА ЗА МИНУТИ",
    heroTitle:"Превърни всяко пътуване в <em>приключение.</em>",
    heroSub:"Книжка с активности, създадена за твоето дете, неговата възраст и мястото, което ще посетите.",
    heroCta:"Създай безплатен преглед", heroSample:"Виж пример",
    trust1:"Без приложение", trust2:"Печат у дома", trust3:"За деца 4–12 г.",
    createEyebrow:"ОПИТАЙ СЕГА", createTitle:"Направи приключението лично.",
    createSub:"Попълни четири неща. Kidventuro веднага създава концепция за персонализирана книжка.",
    labelName:"Име на детето", labelAge:"Възраст", labelDays:"Продължителност", labelDestination:"Дестинация",
    labelInterest:"Какво обича?", generateBtn:"Генерирай преглед",
    formNote:"Само демо — не се създава профил и не запазваме въведените данни.",
    previewTag:"ПРЕГЛЕД НА ЖИВО", previewAdventure:"KIDVENTURO ПРИКЛЮЧЕНИЕ ЗА", openSample:"Отвори примерна страница →", openBooklet:"Генерирай 25-странично демо →",
    howEyebrow:"КАК РАБОТИ", howTitle:"От „Стигнахме ли?“ до „Какво следва?“",
    step1Title:"Разкажи ни за малкия пътешественик", step1Text:"Име, възраст, дестинация и любимите му неща.",
    step2Title:"Ние създаваме приключението", step2Text:"Игри, мисии, факти и занимания според пътуването.",
    step3Title:"Принтирай, прибери, изследвай", step3Text:"Свали PDF файла и го вземи в самолета, влака или колата.",
    destEyebrow:"ДЕСТИНАЦИИ", destTitle:"25 дестинации. Хиляди възможни приключения.",
    sampleEyebrow:"КАКВО ИМА ВЪТРЕ", sampleTitle:"По-малко екран. Повече „Намерих го!“",
    sampleText:"Всяка книжка комбинира спокойни занимания за път с мисии, които карат детето да забелязва истинския свят около себе си.",
    sample1:"Travel bingo и scavenger hunt", sample2:"Пъзели и лабиринти според възрастта", sample3:"Местни думи, храна и любопитни факти",
    sample4:"Рисуване, дневник и страници за спомени", sample5:"Персонализиран сертификат за изследовател", printSample:"Принтирай демо страница",
    pricingEyebrow:"ЯСНИ ЦЕНИ", pricingTitle:"Една малка покупка. Едно много по-хубаво пътуване.",
    miniDesc:"Бърз пакет за самото пътуване.", mini1:"10 страници за печат", mini2:"Персонализирана корица", mini3:"Игри и пъзели за път",
    advDesc:"Пълното Kidventuro преживяване.", adv1:"25 страници за печат", adv2:"Мисии според дестинацията", adv3:"Персонализирани активности", adv4:"Сертификат за изследовател",
    familyDesc:"Едно приключение за до три деца.", family1:"До 3 деца", family2:"Активности според възрастта", family3:"Семейни мисии",
    tryPreview:"Опитай преглед", tryPreview2:"Опитай преглед", createPreview:"Създай преглед", mostPopular:"НАЙ-ПОПУЛЯРЕН",
    pricingNote:"MVP тестови цени — плащането ще бъде свързано преди реалния старт.",
    faqTitle:"Родителите питат. Ние отговаряме.", q1:"Това физическа книжка ли е?", a1:"Не. Kidventuro е PDF файл за сваляне, който може да се принтира у дома, в офиса или в копирен център.",
    q2:"Трябва ли приложение?", a2:"Не. Няма приложение и няма профил на детето. Получаваш обикновен файл за печат.",
    q3:"Пазите ли данните на детето?", a3:"Финалната версия ще използва само минималните данни, нужни за персонализацията, без да създава профили на деца.",
    q4:"За каква възраст е?", a4:"Първата версия е за 4–12 години, като активностите се адаптират според възрастовата група.",
    finalEyebrow:"ПЪТУВАНЕТО ЗАПОЧВА ПРЕДИ ИЗЛИТАНЕТО", finalTitle:"Направи следващото семейно пътуване и тяхно приключение.", finalBtn:"Създай преглед",
    footerText:"Персонализирани приключения за любопитни малки пътешественици.", footerPricing:"Цени", footerHow:"Как работи",
    modalPrint:"Принтирай / Запази като PDF"
  }
};

const destinations = [
  ["Rome","🇮🇹","Ancient wonders • fountains • pizza"],["Paris","🇫🇷","Towers • art • cafés"],["London","🇬🇧","Royal clues • buses • bridges"],["Barcelona","🇪🇸","Mosaics • football • sea"],["Dubai","🇦🇪","Skyscrapers • desert • future"],["Amsterdam","🇳🇱","Canals • bikes • tulips"],["Vienna","🇦🇹","Palaces • music • cake"],["Prague","🇨🇿","Castles • bridges • clocks"],["Berlin","🇩🇪","Street art • history • trains"],["Lisbon","🇵🇹","Trams • tiles • viewpoints"],["Athens","🇬🇷","Myths • temples • sunshine"],["Istanbul","🇹🇷","Ferries • domes • bazaars"],["New York","🇺🇸","Taxis • parks • skyscrapers"],["Orlando","🇺🇸","Family fun • lakes • sunshine"],["Tokyo","🇯🇵","Trains • temples • neon"],["Kyoto","🇯🇵","Torii • bamboo • tea"],["Singapore","🇸🇬","Supertrees • food • skyline"],["Sydney","🇦🇺","Harbour • wildlife • beaches"],["Copenhagen","🇩🇰","Bikes • castles • canals"],["Budapest","🇭🇺","Danube • castles • baths"],["Venice","🇮🇹","Canals • bridges • masks"],["Florence","🇮🇹","Renaissance • art • gelato"],["Madrid","🇪🇸","Palaces • football • art"],["Bangkok","🇹🇭","Temples • tuk-tuks • markets"],["Reykjavik","🇮🇸","Volcanoes • rainbows • harbour"]
];
const interests = [
  ["dinosaurs","Dinosaurs","🦖","динозаври"],["space","Space","🚀","космос"],["animals","Animals","🐾","животни"],["football","Football","⚽","футбол"],["art","Art","🎨","изкуство"],["mysteries","Mysteries","🔎","загадки"],["castles","Castles & knights","🏰","замъци и рицари"],["science","Science","🧪","наука"],["vehicles","Vehicles","🚗","превозни средства"],["nature","Nature","🌿","природа"],["food","Food & cooking","🍳","храна и готвене"],["music","Music","🎵","музика"],["superheroes","Superheroes","🦸","супергерои"],["history","History","📜","история"],["ocean","Ocean & sea life","🐠","океан и морски живот"],["trains","Trains","🚆","влакове"]
];
const destinationData = {
  "Rome": { sentence: "Explore Rome through local clues, mini missions and {interest}-powered discoveries.", missions:["Colosseum detective","Fountain clue hunt","{interest} explorer challenge"] },
  "Paris": { sentence: "Explore Paris through local clues, mini missions and {interest}-powered discoveries.", missions:["Eiffel Tower spotter","Paris colour hunt","{interest} explorer challenge"] },
  "London": { sentence: "Explore London through local clues, mini missions and {interest}-powered discoveries.", missions:["Red bus bingo","Royal symbol hunt","{interest} explorer challenge"] },
  "Barcelona": { sentence: "Explore Barcelona through local clues, mini missions and {interest}-powered discoveries.", missions:["Gaudí shape hunt","Mosaic colour bingo","{interest} explorer challenge"] },
  "Dubai": { sentence: "Explore Dubai through local clues, mini missions and {interest}-powered discoveries.", missions:["Skyline spotter","Desert pattern puzzle","{interest} explorer challenge"] },
  "Amsterdam": { sentence: "Explore Amsterdam through local clues, mini missions and {interest}-powered discoveries.", missions:["Canal bridge detective","Bicycle bingo","{interest} explorer challenge"] },
  "Vienna": { sentence: "Explore Vienna through local clues, mini missions and {interest}-powered discoveries.", missions:["Palace detail hunt","Music symbol bingo","{interest} explorer challenge"] },
  "Prague": { sentence: "Explore Prague through local clues, mini missions and {interest}-powered discoveries.", missions:["Castle tower hunt","Astronomical clock clues","{interest} explorer challenge"] },
  "Berlin": { sentence: "Explore Berlin through local clues, mini missions and {interest}-powered discoveries.", missions:["Bear symbol hunt","Street-art detective","{interest} explorer challenge"] },
  "Lisbon": { sentence: "Explore Lisbon through local clues, mini missions and {interest}-powered discoveries.", missions:["Yellow tram bingo","Tile pattern hunt","{interest} explorer challenge"] },
  "Athens": { sentence: "Explore Athens through local clues, mini missions and {interest}-powered discoveries.", missions:["Acropolis detective","Mythology symbol hunt","{interest} explorer challenge"] },
  "Istanbul": { sentence: "Explore Istanbul through local clues, mini missions and {interest}-powered discoveries.", missions:["Bosphorus ferry hunt","Dome-and-tower bingo","{interest} explorer challenge"] },
  "New York": { sentence: "Explore New York through local clues, mini missions and {interest}-powered discoveries.", missions:["Yellow taxi bingo","Skyscraper spotter","{interest} explorer challenge"] },
  "Orlando": { sentence: "Explore Orlando through local clues, mini missions and {interest}-powered discoveries.", missions:["Theme-park shape hunt","Florida nature bingo","{interest} explorer challenge"] },
  "Tokyo": { sentence: "Explore Tokyo through local clues, mini missions and {interest}-powered discoveries.", missions:["Train-sign detective","Vending-machine bingo","{interest} explorer challenge"] },
  "Kyoto": { sentence: "Explore Kyoto through local clues, mini missions and {interest}-powered discoveries.", missions:["Torii gate count","Bamboo pattern hunt","{interest} explorer challenge"] },
  "Singapore": { sentence: "Explore Singapore through local clues, mini missions and {interest}-powered discoveries.", missions:["Merlion detective","Supertree shape hunt","{interest} explorer challenge"] },
  "Sydney": { sentence: "Explore Sydney through local clues, mini missions and {interest}-powered discoveries.", missions:["Opera House shape hunt","Harbour ferry bingo","{interest} explorer challenge"] },
  "Copenhagen": { sentence: "Explore Copenhagen through local clues, mini missions and {interest}-powered discoveries.", missions:["Colourful-house hunt","Bicycle bingo","{interest} explorer challenge"] },
  "Budapest": { sentence: "Explore Budapest through local clues, mini missions and {interest}-powered discoveries.", missions:["Danube bridge hunt","Castle lookout clues","{interest} explorer challenge"] },
  "Venice": { sentence: "Explore Venice through local clues, mini missions and {interest}-powered discoveries.", missions:["Gondola spotter","Bridge-count challenge","{interest} explorer challenge"] },
  "Florence": { sentence: "Explore Florence through local clues, mini missions and {interest}-powered discoveries.", missions:["Renaissance detail hunt","Dome detective","{interest} explorer challenge"] },
  "Madrid": { sentence: "Explore Madrid through local clues, mini missions and {interest}-powered discoveries.", missions:["Palace gate detective","Football-and-art bingo","{interest} explorer challenge"] },
  "Bangkok": { sentence: "Explore Bangkok through local clues, mini missions and {interest}-powered discoveries.", missions:["Tuk-tuk bingo","Temple pattern hunt","{interest} explorer challenge"] },
  "Reykjavik": { sentence: "Explore Reykjavik through local clues, mini missions and {interest}-powered discoveries.", missions:["Rainbow-street hunt","Volcano clue bingo","{interest} explorer challenge"] }
};
const interestBG = Object.fromEntries(interests.map(([key,, ,bg])=>[key,bg]));
const interestEN = Object.fromEntries(interests.map(([key,label])=>[key,label]));

let currentLang = "en";

function populateCatalog(){
  const destinationSelect=$("destination"), interestSelect=$("interest");
  const selectedDestination=destinationSelect.value||"Rome", selectedInterest=interestSelect.value||"dinosaurs";
  destinationSelect.innerHTML=destinations.map(([name,flag])=>`<option value="${name}">${name} ${flag}</option>`).join("");
  interestSelect.innerHTML=interests.map(([key,label,emoji])=>`<option value="${key}">${label} ${emoji}</option>`).join("");
  destinationSelect.value=destinations.some(d=>d[0]===selectedDestination)?selectedDestination:"Rome";
  interestSelect.value=interests.some(i=>i[0]===selectedInterest)?selectedInterest:"dinosaurs";
  const grid=document.querySelector(".destination-grid");
  if(grid) grid.innerHTML=destinations.map(([name,flag,desc])=>`<article class="destination-card"><div><span>${flag}</span><h3>${name}</h3><p>${desc}</p></div></article>`).join("");
}

function applyLanguage() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const value = translations[currentLang][key];
    if (!value) return;
    if (value.includes("<em>")) el.innerHTML = value;
    else el.textContent = value;
  });
  $("languageToggle").textContent = currentLang === "en" ? "BG" : "EN";
  updatePreview();
}

function updatePreview() {
  const name = ($("childName").value.trim() || (currentLang === "en" ? "Explorer" : "Пътешественик")).slice(0,20);
  const age = $("childAge").value;
  const destination = $("destination").value;
  const interest = $("interest").value;
  const data = destinationData[destination] || destinationData.Rome;
  const interestLabel = interestEN[interest] || interest;

  $("previewName").textContent = name.toUpperCase();
  $("previewAge").textContent = currentLang === "en" ? `AGE ${age}` : `${age} ГОДИНИ`;
  $("previewDestination").textContent = destination.toUpperCase();

  if (currentLang === "en") {
    $("previewSentence").textContent = data.sentence.replace("{interest}", interestLabel.toLowerCase());
    $("missionOne").textContent = data.missions[0];
    $("missionTwo").textContent = data.missions[1];
    $("missionThree").textContent = data.missions[2].replace("{interest}", interestLabel);
  } else {
    const ibg = interestBG[interest] || interest;
    $("previewSentence").textContent = `Изследвай ${destination} чрез местни загадки, мини мисии и приключения, вдъхновени от ${ibg}.`;
    $("missionOne").textContent = data.missions[0];
    $("missionTwo").textContent = data.missions[1];
    $("missionThree").textContent = `Предизвикателство: ${ibg}`;
  }

  $("modalTitle").textContent = currentLang === "en"
    ? `${name}'s ${destination} Detective Mission`
    : `Детективската мисия на ${name} в ${destination}`;
  $("printIntro").textContent = currentLang === "en"
    ? `Welcome to ${destination}, ${name}! Today you're a city detective.`
    : `Добре дошъл/дошла в ${destination}, ${name}! Днес си градски детектив.`;
}

function openModal(){
  $("sampleModal").classList.add("open");
  $("sampleModal").setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}
function closeModal(){
  $("sampleModal").classList.remove("open");
  $("sampleModal").setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

populateCatalog();
$("languageToggle").addEventListener("click", () => {
  currentLang = currentLang === "en" ? "bg" : "en";
  applyLanguage();
});

$("previewForm").addEventListener("submit", (e) => {
  e.preventDefault();
  updatePreview();
  $("previewCard").animate(
    [{transform:"scale(.985)", opacity:.75},{transform:"scale(1)",opacity:1}],
    {duration:280,easing:"ease-out"}
  );
});

["childName","childAge","destination","interest","tripDays"].forEach(id => {
  $(id).addEventListener("input", updatePreview);
  $(id).addEventListener("change", updatePreview);
});

$("openSample").addEventListener("click", openModal);
$("openBooklet").addEventListener("click", () => {
  const q = new URLSearchParams({
    name: $("childName").value.trim() || "Alex",
    age: $("childAge").value,
    destination: $("destination").value,
    interest: $("interest").value,
    days: $("tripDays").value,
    lang: currentLang
  });
  window.location.href = `booklet.html?${q.toString()}`;
});
$("printSample").addEventListener("click", openModal);
$("modalPrint").addEventListener("click", () => window.print());
document.querySelectorAll("[data-close-modal]").forEach(el => el.addEventListener("click", closeModal));
document.addEventListener("keydown", e => { if(e.key === "Escape") closeModal(); });
$("year").textContent = new Date().getFullYear();
applyLanguage();
