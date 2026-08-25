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

export async function getAiEnrichment(ref,session,env){
  const cached=await env.ENTITLEMENTS.get(aiKey(ref));
  if(cached){
    try{return {ai:true,cached:true,...JSON.parse(cached)};}catch{}
  }

  if(!env.OPENAI_API_KEY) return {ai:false,reason:'not_configured'};

  const profile=privacySafeProfile(session);
  const model=String(env.OPENAI_MODEL||'gpt-5.6-luna');
  const prompt=`You create short, child-safe microcopy for Kidventuro printable family travel activity books.\n\nRules:\n- Audience: children ages 4-12, always supervised by an adult.\n- Never tell a child to wander away, approach strangers, enter restricted/private areas, touch exhibits, climb structures, cross roads alone, or do anything risky/disruptive.\n- Do not give opening hours, prices, live conditions, medical/legal/safety advice, or claims that require current information.\n- Do not invent destination facts. Make observational and creative missions that work even if a particular venue is closed.\n- Do not ask for or mention a child's name.\n- Keep language warm, concise and printable.\n- Return ONLY a JSON object with exactly these string keys: destination_hook, interest_mission, family_mission, reflection_prompt.\n\nProfile (intentionally contains no names):\n${JSON.stringify(profile)}\n\nRequirements:\n- destination_hook: one sentence, <= 24 words, makes this destination feel distinctive without stating a fragile fact.\n- interest_mission: one safe observation/drawing/pattern mission tailored to the age band and interest, <= 32 words.\n- family_mission: one cooperative mission suitable for the whole family, <= 32 words.\n- reflection_prompt: one question that helps the child remember a sensory/detail-based moment, <= 24 words.`;

  let response;
  try{
    response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({model,input:prompt,max_output_tokens:450})
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

export const __test={privacySafeProfile,parseJsonText,cleanContent,outputText};
