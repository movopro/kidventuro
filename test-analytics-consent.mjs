// Behaviour test for the consent-first Google Analytics layer in analytics.js.
// Runs the real file against a small fake page (node:vm), so it checks what the
// script DOES, not just which strings it contains:
//   - nothing is requested from Google before the visitor chooses
//   - "Accept" loads gtag.js and sends real gtag commands (arguments objects -
//     the arrow-function gtag this replaces pushed arrays, which Google ignores)
//   - "Decline" / withdrawing keeps Google off and deletes the _ga cookies
//   - the choice is remembered, the footer link reopens it, texts follow the page language
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('./analytics.js',import.meta.url),'utf8');
const TAG='G-77YBK1S40E';
const CONSENT_KEY='kidventuro_analytics_consent_v1';

function page({lang='en',host='kidventuro.com',consent=null,cookies={},footer='landing'}={}){
  const attached=node=>{for(let n=node;n;n=n.parentNode){if(n===doc.head||n===doc.body)return true;}return false;};
  const all=[];
  const matches=(el,selector)=>{
    let m=selector.match(/^script\[src="(.+)"\]$/);
    if(m) return el.tagName==='SCRIPT'&&el.src===m[1];
    m=selector.match(/^script\[src\*="(.+)"\]$/);
    if(m) return el.tagName==='SCRIPT'&&String(el.src||'').includes(m[1]);
    if(selector.startsWith('.')) return String(el.className||'').split(/\s+/).includes(selector.slice(1));
    return el.tagName===selector.toUpperCase();
  };
  class El{
    constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.listeners={};this.dataset={};this.style={};this.parentNode=null;this.className='';this.id='';this.textContent='';all.push(this);}
    setAttribute(k,v){this.attributes[k]=String(v);}
    getAttribute(k){return this.attributes[k]??null;}
    appendChild(c){c.parentNode=this;this.children.push(c);return c;}
    remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(c=>c!==this);this.parentNode=null;}}
    addEventListener(t,f){(this.listeners[t]??=[]).push(f);}
    click(){for(const f of this.listeners.click||[])f({target:this,preventDefault(){}});}
    querySelector(sel){const walk=n=>{for(const c of n.children||[]){if(c instanceof El&&matches(c,sel))return c;const d=walk(c);if(d)return d;}return null;};return walk(this);}
  }
  const jar=new Map(Object.entries(cookies));
  const doc={
    readyState:'complete',
    documentElement:{lang},
    head:null,body:null,referrer:'',
    createElement:tag=>new El(tag),
    createTextNode:text=>({nodeType:3,textContent:text}),
    getElementById:id=>all.find(el=>el.id===id&&attached(el))||null,
    querySelector:sel=>all.find(el=>attached(el)&&matches(el,sel))||null,
    querySelectorAll:()=>[],
    addEventListener(){},
    get cookie(){return [...jar].map(([k,v])=>`${k}=${v}`).join('; ');},
    set cookie(value){const [pair,...attrs]=value.split(';');const [name,val]=pair.split('=');if(attrs.some(a=>/^\s*max-age=0\s*$/i.test(a)))jar.delete(name.trim());else jar.set(name.trim(),val);}
  };
  doc.head=new El('head');doc.body=new El('body');
  const foot=doc.body.appendChild(new El('footer'));
  if(footer==='landing'){const links=foot.appendChild(new El('div'));links.className='footer-links';}
  else foot.className=footer;
  const store=new Map(consent?[[CONSENT_KEY,consent]]:[]);
  const sent=[];
  const ctx={
    document:doc,
    location:{hostname:host,pathname:lang==='es'?'/es/':'/',search:'',origin:`https://${host}`},
    localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    KIDVENTURO_CONFIG:{google:{gtmId:'',tagId:TAG},apiBase:'https://api.test',checkoutMode:'test'},
    URLSearchParams,URL,console,
    fetch:(url,opts)=>{sent.push(JSON.parse(opts.body));return Promise.resolve({});},
    requestIdleCallback:fn=>fn(),
    setTimeout:fn=>fn(),
    addEventListener(){}
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(source,ctx,{filename:'analytics.js'});
  const scripts=()=>all.filter(el=>el.tagName==='SCRIPT'&&attached(el)).map(el=>el.src);
  const googleScripts=()=>scripts().filter(src=>/googletagmanager\.com|google-analytics\.com/.test(src));
  const commands=()=>(ctx.dataLayer||[]).filter(x=>Object.prototype.toString.call(x)==='[object Arguments]').map(x=>Array.from(x));
  const button=kind=>all.find(el=>el.getAttribute('data-kv-consent')===kind&&attached(el));
  const banner=()=>doc.getElementById('kvConsent');
  const settings=()=>doc.getElementById('kvCookieSettings');
  return {ctx,doc,store,jar,sent,foot,googleScripts,commands,button,banner,settings};
}

// First visit: a choice is asked for, and Google is not contacted at all.
{
  const p=page();
  assert.equal(p.googleScripts().length,0,'nothing may be requested from Google before consent');
  assert.equal(p.commands().length,0,'no gtag command may be queued before consent');
  assert.ok(p.banner(),'first visit must show the cookie banner');
  assert.equal(p.button('accept').textContent,'Accept');
  assert.equal(p.button('decline').textContent,'Decline');
  assert.ok(p.settings(),'the footer must offer Cookie settings');
  assert.equal(p.settings().textContent,'Cookie settings');
  assert.ok(p.sent.some(e=>e.event==='page_view'),'the cookie-free Kidventuro funnel still counts the page view');

  // Accept: gtag.js loads, and the page being read is counted once.
  p.button('accept').click();
  assert.equal(p.store.get(CONSENT_KEY),'granted');
  assert.equal(p.banner(),null,'the banner closes after a choice');
  assert.deepEqual(p.googleScripts(),[`https://www.googletagmanager.com/gtag/js?id=${TAG}`]);
  const cmds=p.commands();
  const config=cmds.find(c=>c[0]==='config');
  assert.ok(config,'gtag config must be queued as an arguments object');
  assert.equal(config[1],TAG);
  assert.equal(config[2].allow_google_signals,false);
  assert.equal(config[2].allow_ad_personalization_signals,false);
  assert.equal(config[2].send_page_view,false);
  assert.equal(cmds.filter(c=>c[0]==='event'&&c[1]==='page_view').length,1,'the current page view reaches Google exactly once');

  // Later events go to Google too, without child or order data.
  p.ctx.KidventuroAnalytics.track('checkout_clicked',{product:'mini'});
  const checkout=p.commands().find(c=>c[0]==='event'&&c[1]==='checkout_clicked');
  assert.ok(checkout,'events after consent reach Google');
  assert.deepEqual(Object.keys(checkout[2]).sort(),['checkout_mode','language','page_path','product','traffic_campaign','traffic_medium','traffic_source']);
}

// Decline: remembered, and Google stays off even when events happen.
{
  const p=page();
  p.button('decline').click();
  assert.equal(p.store.get(CONSENT_KEY),'denied');
  assert.equal(p.banner(),null);
  p.ctx.KidventuroAnalytics.track('pricing_viewed');
  assert.equal(p.googleScripts().length,0,'declining keeps Google off');
  assert.equal(p.commands().length,0);
}

// Returning visitors: the stored choice is used without asking again.
{
  const yes=page({consent:'granted'});
  assert.equal(yes.banner(),null,'a remembered Accept must not ask again');
  assert.equal(yes.googleScripts().length,1);
  assert.equal(yes.commands().filter(c=>c[0]==='event'&&c[1]==='page_view').length,1);

  const no=page({consent:'denied'});
  assert.equal(no.banner(),null,'a remembered Decline must not ask again');
  assert.equal(no.googleScripts().length,0);
  no.settings().click();
  assert.ok(no.banner(),'Cookie settings reopens the choice');
  no.button('accept').click();
  assert.equal(no.googleScripts().length,1,'changing to Accept turns Google on');
}

// Withdrawing consent: Google is disabled on the page and its cookies are removed.
{
  const p=page({consent:'granted',cookies:{_ga:'GA1.1.1',_ga_77YBK1S40E:'GS1.1',kv_lang:'en'}});
  p.settings().click();
  p.button('decline').click();
  assert.equal(p.store.get(CONSENT_KEY),'denied');
  assert.equal(p.ctx[`ga-disable-${TAG}`],true,'Google Analytics must be disabled for the rest of the page');
  assert.equal(p.jar.has('_ga'),false,'the _ga cookie must be deleted');
  assert.equal(p.jar.has('_ga_77YBK1S40E'),false,'the _ga_<id> cookie must be deleted');
  assert.equal(p.jar.get('kv_lang'),'en','other cookies are left alone');
  const before=p.commands().length;
  p.ctx.KidventuroAnalytics.track('print_clicked');
  assert.equal(p.commands().length,before,'nothing more is sent to Google after withdrawing');
}

// Spanish pages get Spanish texts, and a " · " before the link in the inline footer.
{
  const p=page({lang:'es',footer:'seo-foot'});
  assert.equal(p.button('accept').textContent,'Aceptar');
  assert.equal(p.button('decline').textContent,'Rechazar');
  assert.equal(p.settings().textContent,'Configurar cookies');
  assert.equal(p.foot.children.at(-2).textContent,' · ');
}

// Anywhere but the public site (local previews, tests), Google and the banner stay away.
{
  const p=page({host:'localhost',consent:'granted'});
  assert.equal(p.googleScripts().length,0);
  assert.equal(p.banner(),null);
  assert.equal(p.settings(),null);
}

console.log('Consent-first Google Analytics tests passed');
