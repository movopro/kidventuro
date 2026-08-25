import assert from 'node:assert/strict';
import {getAiEnrichment,__test} from './src/ai.js';

class MemoryKV{
  constructor(){this.map=new Map();}
  async get(key){return this.map.has(key)?this.map.get(key):null;}
  async put(key,value){this.map.set(key,value);}
}

const ref='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const familySession={
  product:'family',destination:'Sofia',days:'5',lang:'en',
  children:[
    {name:'Emma',age:'5',interest:'animals'},
    {name:'Leo',age:'9',interest:'space'},
    {name:'Mia',age:'12',interest:'art'}
  ]
};

{
  const profile=__test.privacySafeProfile(familySession);
  const serialized=JSON.stringify(profile);
  assert.equal(profile.children.length,3);
  assert.equal(profile.children[0].age_band,'4-6');
  assert.equal(profile.children[1].age_band,'7-9');
  assert.equal(profile.children[2].age_band,'10-12');
  for(const name of ['Emma','Leo','Mia']) assert.equal(serialized.includes(name),false,`AI profile leaked child name ${name}`);
}

{
  const env={ENTITLEMENTS:new MemoryKV()};
  const result=await getAiEnrichment(ref,familySession,env);
  assert.equal(result.ai,false);
  assert.equal(result.reason,'not_configured','AI must degrade gracefully without an API key');
}

{
  const env={ENTITLEMENTS:new MemoryKV(),OPENAI_API_KEY:'test-key',OPENAI_MODEL:'gpt-test'};
  const originalFetch=globalThis.fetch;
  let calls=0;
  let captured='';
  globalThis.fetch=async(_url,options)=>{
    calls++;
    captured=String(options?.body||'');
    return new Response(JSON.stringify({
      output:[{content:[{type:'output_text',text:JSON.stringify({
        destination_hook:'Look for shapes, sounds and tiny details that make Sofia feel different from home.',
        interest_mission:'As a team, find three details connected to your interests and sketch the most surprising one.',
        family_mission:'Each explorer chooses one detail, then compare what everyone noticed without rushing.',
        reflection_prompt:'Which tiny sound, texture or colour will help you remember this day?'
      })}]}]
    }),{status:200,headers:{'Content-Type':'application/json'}});
  };

  try{
    const first=await getAiEnrichment(ref,familySession,env);
    assert.equal(first.ai,true);
    assert.equal(first.cached,false);
    assert.equal(first.model,'gpt-test');
    assert.ok(first.content.family_mission.includes('explorer'));
    for(const name of ['Emma','Leo','Mia']) assert.equal(captured.includes(name),false,`OpenAI request leaked child name ${name}`);

    const second=await getAiEnrichment(ref,familySession,env);
    assert.equal(second.ai,true);
    assert.equal(second.cached,true);
    assert.equal(calls,1,'AI enrichment should be cached per checkout reference');
  }finally{
    globalThis.fetch=originalFetch;
  }
}

console.log('AI privacy, fallback and cache tests passed');
