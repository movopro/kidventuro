import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {handleAnalyticsEvent,trackAnalytics} from './src/analytics.js';

class CaptureAnalytics{
  constructor(){this.points=[];}
  writeDataPoint(point){this.points.push(point);}
}

{
  const client=await readFile(new URL('../analytics.js',import.meta.url),'utf8');
  assert.ok(client.includes("https://static.cloudflareinsights.com/beacon.min.js"),'Cloudflare Web Analytics beacon must stay enabled');
  assert.ok(client.includes("823a0ee660884dec9ecfad5650f38e4e"),'Cloudflare Web Analytics token must stay configured');
  assert.ok(client.includes("location.hostname==='kidventuro.com'"),'Cloudflare beacon must be limited to the public Kidventuro hostname');
  assert.equal(client.includes('childName'),false,'analytics client must not read child name fields');
  assert.equal(client.includes('childAge'),false,'analytics client must not read child age fields');
  assert.equal(client.includes('kv_ref'),false,'analytics client must not send checkout refs');
}

{
  const analytics=new CaptureAnalytics();
  const env={ANALYTICS:analytics};
  const ok=trackAnalytics(env,'payment_confirmed',{
    product:'adventure',path:'/success.html',lang:'en',source:'facebook',medium:'paid-social',campaign:'rome-launch',
    referrer:'facebook.com',country:'BG',mode:'live',amount:9.9,
    name:'Alex',age:'7',ref:'11111111-2222-4333-8444-555555555555',order:'secret-order-id',email:'parent@example.com'
  });
  assert.equal(ok,true);
  assert.equal(analytics.points.length,1);
  const point=analytics.points[0];
  assert.equal(point.indexes[0],'payment_confirmed');
  assert.equal(point.blobs.length,10);
  assert.deepEqual(point.blobs,[
    'payment_confirmed','adventure','/success.html','en','facebook','paid-social','rome-launch','facebook.com','BG','live'
  ]);
  assert.deepEqual(point.doubles,[1,9.9]);
  const serialized=JSON.stringify(point);
  for(const forbidden of ['Alex','11111111-2222-4333-8444-555555555555','secret-order-id','parent@example.com']){
    assert.equal(serialized.includes(forbidden),false,`analytics must not contain PII/checkout identifiers: ${forbidden}`);
  }
}

{
  const analytics=new CaptureAnalytics();
  const env={ANALYTICS:analytics};
  const request=new Request('https://kidventuro-api.example/analytics/event',{
    method:'POST',
    headers:{'Content-Type':'application/json','Origin':'https://kidventuro.com'},
    body:JSON.stringify({
      event:'checkout_clicked',product:'family',path:'/',lang:'bg',source:'pinterest',medium:'social',campaign:'family-trip',referrer:'pinterest.com',mode:'test',
      name:'Mia',age:'12',kv_ref:'should-never-be-recorded',order_id:'should-never-be-recorded'
    })
  });
  const response=await handleAnalyticsEvent(request,env);
  assert.equal(response.status,204);
  assert.equal(analytics.points.length,1);
  const serialized=JSON.stringify(analytics.points[0]);
  assert.equal(serialized.includes('Mia'),false);
  assert.equal(serialized.includes('should-never-be-recorded'),false);
}

{
  const analytics=new CaptureAnalytics();
  const env={ANALYTICS:analytics};
  const invalid=await handleAnalyticsEvent(new Request('https://kidventuro-api.example/analytics/event',{
    method:'POST',headers:{'Content-Type':'application/json','Origin':'https://kidventuro.com'},body:JSON.stringify({event:'child_name_viewed'})
  }),env);
  assert.equal(invalid.status,400);
  assert.equal(analytics.points.length,0);

  const wrongOrigin=await handleAnalyticsEvent(new Request('https://kidventuro-api.example/analytics/event',{
    method:'POST',headers:{'Content-Type':'application/json','Origin':'https://evil.example'},body:JSON.stringify({event:'page_view'})
  }),env);
  assert.equal(wrongOrigin.status,403);
  assert.equal(analytics.points.length,0);
}

console.log('Cloudflare Web Analytics beacon, privacy-safe funnel events and PII exclusion tests passed');
