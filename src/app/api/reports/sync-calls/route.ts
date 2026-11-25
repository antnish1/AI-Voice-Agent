import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {requireItSuperUser} from "@/lib/it-access";
import {requireProviderConfig,sarvamGet} from "@/lib/sarvam/outbound-provider";
export const runtime="nodejs";
export const maxDuration=60;
const headers={"Cache-Control":"private, no-store"};
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers});
const str=(v:unknown)=>typeof v==="string"?v:"";
const iso=(v:unknown)=>{const s=str(v);if(!s)return null;const d=new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(s)?s:s+"Z");return Number.isFinite(d.getTime())?d.toISOString():null;};
const statusOf=(v:unknown)=>({connected:"answered",busy:"busy",no_answer:"no_answer",failed:"failed"} as Record<string,string>)[str(v).toLowerCase()]??"other";
const object=(v:unknown)=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:null;
async function list(agent:string,kind:"attempts"|"interactions",field:string,value:string,start:string,end:string,offset=0){
 const {org,workspace}=requireProviderConfig();
 const params=new URLSearchParams({start_datetime:start,end_datetime:end,filter_conditions:JSON.stringify([{field,operator:"equals",value}]),limit:"50",offset:String(offset),...(kind==="interactions"?{include_transcript:"true"}:{})});
 const result=await sarvamGet("/api/analytics/v1/"+org+"/"+workspace+"/"+encodeURIComponent(agent)+"/"+kind+"?"+params);
 if(!Array.isArray(result.items))throw Error("Invalid analytics response");
 return {items:result.items.map(object).filter((x):x is Record<string,unknown>=>!!x),more:typeof result.next_page_uri==="string"&&!!result.next_page_uri};
}
export async function POST(request:Request){
 let ctx;try{ctx=await requireItSuperUser();}catch{return reply({error:"Not authorized"},403);}
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return reply({error:"Result synchronization is not configured."},503);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 let body:Record<string,unknown>;try{body=await request.json();}catch{return reply({error:"Invalid request"},400);}
 const kind=body.kind,id=str(body.id),offset=Number(body.offset??0);const phase=body.phase==="interactions"?"interactions":"attempts";
 if(!["test","campaign"].includes(String(kind))||!/^[a-f0-9-]{36}$/i.test(id)||!Number.isSafeInteger(offset)||offset<0)return reply({error:"Invalid sync scope"},400);
 try{
  let agent="",field="",value="",start="",dealer="",requestId="";
  if(kind==="test"){
   const {data,error}=await ctx.supabase.from("voice_test_call_requests").select("id,agent_id,sarvam_attempt_id,created_at").eq("id",id).eq("user_id",ctx.user.id).maybeSingle();
   if(error||!data||!data.sarvam_attempt_id)return reply({error:"Test request unavailable"},404);
   agent=data.agent_id;field="attempt_id";value=data.sarvam_attempt_id;requestId=data.id;start=new Date(new Date(data.created_at).getTime()-3600000).toISOString();
  }else{
   const {data,error}=await ctx.supabase.from("voice_campaign_links").select("agent_id,sarvam_campaign_id,dealership_id,created_at").eq("campaign_id",id).maybeSingle();
   if(error||!data)return reply({error:"No linked Sarvam campaign"},404);
   agent=data.agent_id;field="campaign_id";value=data.sarvam_campaign_id;dealer=data.dealership_id;const earliest=await admin.from("voice_call_records").select("started_at").eq("dealership_id",dealer).eq("sarvam_campaign_id",value).eq("agent_id",agent).not("started_at","is",null).order("started_at").limit(1).maybeSingle();if(earliest.error)throw Error("Historical date lookup failed");start=new Date(Math.min(new Date(data.created_at).getTime(),new Date(earliest.data?.started_at??data.created_at).getTime())-86400000).toISOString();
  }
  const end=new Date().toISOString();
  const page=await list(agent,phase,field,value,start,end,offset);
  let saved=0,inserted=0,updated=0;
  for(const a of page.items){
   if(str(a[field])!==value)continue;
   if(phase==="interactions"){
    const interaction=str(a.interaction_id);
    if(!interaction)continue;
    const transcript=Array.isArray(a.interaction_transcript)?a.interaction_transcript.map(object).filter((t):t is Record<string,unknown>=>!!t&&["agent","user"].includes(str(t.role))&&typeof t.en_text==="string").map(t=>({role:str(t.role),en_text:str(t.en_text).slice(0,4000)})):[];
    const output=object(a.output_agent_variables)??object(a.agent_variables);
    if(kind==="campaign"){
     const existing=await admin.from("voice_call_records").select("id,agent_id,sarvam_campaign_id,output_variables").eq("dealership_id",dealer).eq("sarvam_interaction_id",interaction).maybeSingle();
     if(existing.error||existing.data&&(existing.data.agent_id!==agent||existing.data.sarvam_campaign_id!==value))throw Error("Interaction scope conflict");
     if(!existing.data)continue;
     const fields={...(transcript.length?{transcript}:{}),...(output?{output_variables:{...object(existing.data.output_variables),...output}}:{}),last_synced_at:new Date().toISOString()};
     const {error}=await admin.from("voice_call_records").update(fields).eq("id",existing.data.id).eq("dealership_id",dealer);if(error)throw Error("Interaction update failed");
    }else{
     const {error}=await admin.from("voice_test_call_results").update({...(transcript.length?{transcript}:{}),last_synced_at:new Date().toISOString()}).eq("request_id",requestId).eq("interaction_id",interaction);if(error)throw Error("Test interaction update failed");
    }
    saved++;updated++;continue;
   }
   if(!str(a.attempt_id))continue;
   if(kind==="test"&&str(a.campaign_id))continue;
   const interaction=str(a.interaction_id);
   const record={status:statusOf(a.connectivity_status),duration_seconds:typeof a.duration_in_seconds==="number"&&Number.isFinite(a.duration_in_seconds)?Math.max(0,Math.round(a.duration_in_seconds)):null,started_at:iso(a.start_datetime),ended_at:iso(a.end_datetime),last_synced_at:new Date().toISOString()};
   if(kind==="test"){
    const {error}=await admin.from("voice_test_call_results").upsert({request_id:requestId,interaction_id:interaction||null,...record},{onConflict:"request_id"});if(error)throw Error("Save failed");
   }else{
    const existing=interaction?await admin.from("voice_call_records").select("id,sarvam_campaign_id,agent_id,sarvam_attempt_id,output_variables").eq("dealership_id",dealer).eq("sarvam_interaction_id",interaction).maybeSingle():{data:null,error:null};if(existing.error)throw Error("Duplicate lookup failed");if(existing.data&&(existing.data.sarvam_campaign_id!==value||existing.data.agent_id!==agent))throw Error("Interaction scope conflict");
    const byAttempt=await admin.from("voice_call_records").select("id,sarvam_campaign_id,agent_id,sarvam_interaction_id,output_variables").eq("dealership_id",dealer).eq("sarvam_attempt_id",str(a.attempt_id)).maybeSingle();
    if(byAttempt.error||byAttempt.data&&(byAttempt.data.sarvam_campaign_id!==value||byAttempt.data.agent_id!==agent||interaction&&byAttempt.data.sarvam_interaction_id&&byAttempt.data.sarvam_interaction_id!==interaction)||existing.data&&byAttempt.data&&existing.data.id!==byAttempt.data.id)throw Error("Attempt identity conflict");
    const prior=existing.data??byAttempt.data;
    const fields={dealership_id:dealer,sarvam_campaign_id:value,sarvam_attempt_id:str(a.attempt_id),agent_id:agent,...(interaction?{sarvam_interaction_id:interaction}:{}),...(str(a.user_contact)?{dialed_number:str(a.user_contact)}:{}),...(record.status!=="other"||!prior?{status:record.status}:{}),...(record.duration_seconds!==null?{duration_seconds:record.duration_seconds}:{}),...(record.started_at?{started_at:record.started_at}:{}),...(record.ended_at?{ended_at:record.ended_at}:{}),last_synced_at:record.last_synced_at};
    const {error}=prior?await admin.from("voice_call_records").update(fields).eq("id",prior.id).eq("dealership_id",dealer):await admin.from("voice_call_records").insert(fields);if(error)throw Error("Save failed");if(prior)updated++;else inserted++;
   }
   saved++;
  }
  return reply({ok:true,saved,inserted,updated,nextOffset:page.more?offset+50:null,nextPhase:!page.more&&phase==="attempts"?"interactions":null});
 }catch{return reply({error:"Sarvam synchronization unavailable. Check provider access and retry later."},502);}
}
