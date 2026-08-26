const ALLOWED_ORIGIN='https://kidventuro.com';
const CLIENT_EVENTS=new Set([
  'page_view','preview_generated','sample_opened','pricing_viewed','checkout_clicked',
  'booklet_opened','print_clicked','language_changed'
]);
const SERVER_EVENTS=new Set([
  'checkout_registered','payment_confirmed','payment_refunded','fulfillment_opened'
]);
const PRODUCTS=new Set(['mini','adventure','family']);

const clean=(value,max=80)=>String(value||'')
  .replace(/[\u0000-\u001f\u007f]/g,'')
  .replace(/[^a-zA-Z0-9._~:/?&=+@%\- ]/g,'')
  .trim()
  .slice(0,max);

const cleanProduct=value=>PRODUCTS.has(String(value||'').toLowerCase())?String(value).toLowerCase():'';
const cleanMode=value=>value==='live'?'live':value==='test'?'test':'';
const safePath=value=>{
  const path=clean(value,120);
  return /^\/[a-zA-Z0-9._~\-/]*$/.test(path)?path:'';
};

export function trackAnalytics(env,event,details={}){
  if(!env?.ANALYTICS) return false;
  const name=clean(event,40);
  if(!CLIENT_EVENTS.has(name)&&!SERVER_EVENTS.has(name)) return false;

  const product=cleanProduct(details.product);
  const path=safePath(details.path);
  const lang=details.lang==='bg'?'bg':details.lang==='en'?'en':'';
  const source=clean(details.source,64);
  const medium=clean(details.medium,64);
  const campaign=clean(details.campaign,80);
  const referrer=clean(details.referrer,100);
  const country=clean(details.country,8).toUpperCase();
  const mode=cleanMode(details.mode);
  const amount=Number(details.amount||0);

  env.ANALYTICS.writeDataPoint({
    indexes:[name],
    blobs:[name,product,path,lang,source,medium,campaign,referrer,country,mode],
    doubles:[1,Number.isFinite(amount)?amount:0]
  });
  return true;
}

export async function handleAnalyticsEvent(request,env){
  if(request.headers.get('Origin')!==ALLOWED_ORIGIN){
    return new Response(null,{status:403,headers:{'Access-Control-Allow-Origin':ALLOWED_ORIGIN,'Cache-Control':'no-store'}});
  }
  const declared=Number(request.headers.get('Content-Length')||0);
  if(Number.isFinite(declared)&&declared>2048) return new Response(null,{status:413});
  let raw='';
  try{raw=await request.text();}catch{return new Response(null,{status:400});}
  if(new TextEncoder().encode(raw).byteLength>2048) return new Response(null,{status:413});

  let body;
  try{body=JSON.parse(raw);}catch{return new Response(null,{status:400});}
  const event=clean(body?.event,40);
  if(!CLIENT_EVENTS.has(event)) return new Response(null,{status:400});

  trackAnalytics(env,event,{
    product:body?.product,
    path:body?.path,
    lang:body?.lang,
    source:body?.source,
    medium:body?.medium,
    campaign:body?.campaign,
    referrer:body?.referrer,
    country:request.cf?.country||'',
    mode:body?.mode
  });

  return new Response(null,{
    status:204,
    headers:{
      'Access-Control-Allow-Origin':ALLOWED_ORIGIN,
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Vary':'Origin'
    }
  });
}
