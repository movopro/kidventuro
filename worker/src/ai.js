const aiKey=ref=>`ai:${ref}`;

const ageBand=age=>{
  const n=Number(age);
  if(n<=6) return '4-6';
  if(n<=9) return '7-9';
  return '10-12';
};

function privacySafeProfile(session){
  const base={
    product:String(session?.product||'adventure'),
    destination:String(session?.destination||'').slice(0,40),
    days:String(session?.days||''),
    language:session?.lang==='bg'?'Bulgarian':'English'
  };
  if(base.product==='family'){
    base.children=(Array.isArray(session?.children)?session.children:[]).slice(0,3).map(child=>({
      age_band:ageBand(child?.age),
      interest:String(child?.interest||'').slice(0,40)
    }));
  }else{
    base.child={
      age_band:ageBand(session?.age),
      interest:String(session?.interest||'').slice(0,40)
    };
  }
  return base;
}

function outputText(payload){
  if(typeof payload?.output_text==='string') return payload.output_text;
  const parts=[];
  for(const item of payload?.output||[]){
    for(const content of item?.content||[]){
      if(typeof content?.text==='string') parts.push(content.text);
    }
  }
  return parts.join('\n');
}

function parseJsonText(text){
  const cleaned=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const start=cleaned.indexOf('{'),end=cleaned.lastIndexOf('}');
  if(start<0||end<start) return null;
  try{return JSON.parse(cleaned.slice(start,end+1));}catch{return null;}
}

function short(value,max){
  return String(value||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);
}

function cleanContent(value){
  if(!value||typeof value!=='object') return null;
  const content={
    destination_hook:short(value.destination_hook,180),
    interest_mission:short(value.interest_mission,220),
    family_mission:short(value.family_mission,220),
    reflection_prompt:short(value.reflection_prompt,180)
  };
  if(!content.destination_hook||!content.interest_mission||!content.reflection_prompt) return null;
  if(!content.family_mission) content.family_mission=content.interest_mission;
  return content;
}

const enrichmentSchema={
  type:'object',
  properties:{
    destination_hook:{type:'string'},
    interest_mission:{type:'string'},
    family_mission:{type:'string'},
    reflection_prompt:{type:'string'}
  },
  required:['destination_hook','interest_mission','family_mission','reflection_prompt'],
  additionalProperties:false
};

export async function getAiEnrichment(ref,session,env){
  const cached=await env.ENTITLEMENTS.get(aiKey(ref));
  if(cached){
    try{return {ai:true,cached:true,...JSON.parse(cached)};}catch{}
  }

  if(!env.OPENAI_API_KEY) return {ai:false,reason:'not_configured'};

  const profile=privacySafeProfile(session);
  const model=String(env.OPENAI_MODEL||'gpt-5.6-luna');
  const instructions=`Create short, child-safe microcopy for Kidventuro printable family travel activity books.

Safety and quality rules:
- Audience: children ages 4-12, always supervised by an adult.
- Never tell a child to wander away, approach strangers, enter restricted/private areas, touch exhibits, climb structures, cross roads alone, or do anything risky or disruptive.
- Do not give opening hours, prices, live conditions, medical/legal/safety advice, or claims that require current information.
- Do not invent destination facts. Prefer observation, drawing, pattern, colour, sound and memory missions that still work if a particular venue is closed.
- Do not ask for or mention a child's name.
- Keep language warm, concise and printable.
- Write in the profile language.

Field requirements:
- destination_hook: one sentence, no more than 24 words, making the destination feel distinctive without a fragile factual claim.
- interest_mission: one safe mission tailored to the age band and interest, no more than 32 words.
- family_mission: one cooperative mission suitable for the whole family, no more than 32 words.
- reflection_prompt: one question about a sensory or visual detail worth remembering, no more than 24 words.`;

  let response;
  try{
    response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        model,
        instructions,
        input:`Privacy-reduced Kidventuro profile (contains no child names):\n${JSON.stringify(profile)}`,
        reasoning:{effort:'none'},
        text:{
          verbosity:'low',
          format:{
            type:'json_schema',
            name:'kidventuro_enrichment',
            strict:true,
            schema:enrichmentSchema
          }
        },
        max_output_tokens:300,
        store:false
      })
    });
  }catch{
    return {ai:false,reason:'provider_unavailable'};
  }

  if(!response.ok) return {ai:false,reason:'provider_error',status:response.status};
  let payload;
  try{payload=await response.json();}catch{return {ai:false,reason:'invalid_provider_response'};}
  const content=cleanContent(parseJsonText(outputText(payload)));
  if(!content) return {ai:false,reason:'invalid_ai_content'};

  const record={model,content,created_at:new Date().toISOString()};
  await env.ENTITLEMENTS.put(aiKey(ref),JSON.stringify(record),{expirationTtl:60*60*24*7});
  return {ai:true,cached:false,...record};
}

export const __test={privacySafeProfile,parseJsonText,cleanContent,outputText,enrichmentSchema};
