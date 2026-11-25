import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {timingSafeEqual} from "node:crypto";
import {requireProviderConfig,sarvamGet} from "@/lib/sarvam/outbound-provider";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
const str=(v:unknown)=>typeof v==="string"?v:"";
const obj=(v:unknown)=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:null;
const iso=(v:unknown)=>{const s=str(v);if(!s)return null;const d=new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(s)?s:s+"Z");return Number.isFinite(d.getTime())?d.toISOString():null;};
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret)return reply({error:"Scheduled synchronization is not configured."},503);
 const supplied=Buffer.from(request.headers.get("authorization")??""),expected=Buffer.from("Bearer "+secret);
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return reply({error:"Unauthorized"},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return reply({error:"Database configuration unavailable"},503);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const began=Date.now(),end=new Date(began).toISOString(),start=new Date(began-48*3600000).toISOString();
 const {data:links,error}=await admin.from("voice_campaign_links").select("dealership_id,sarvam_campaign_id,agent_id").order("sarvam_campaign_id").limit(101);
 if(error)return reply({error:"Campaign lookup unavailable"},503);
 if((links??[]).length>100)return reply({error:"Too many linked campaigns for a single scheduled run"},503);
 let saved=0,failed=0,incomplete=0;
 for(const link of links??[]){
  if(Date.now()-began>35000){incomplete++;continue;}
  try{
   const {org,workspace}=requireProviderConfig();
   let more=true;
   for(let offset=0;more&&offset<500;offset+=50){
    if(Date.now()-began>35000){incomplete++;break;}
    const params=new URLSearchParams({start_datetime:start,end_datetime:end,filter_conditions:JSON.stringify([{field:"campaign_id",operator:"equals",value:link.sarvam_campaign_id}]),limit:"50",offset:String(offset)});
    const result=await sarvamGet("/api/analytics/v1/"+org+"/"+workspace+"/"+encodeURIComponent(link.agent_id)+"/attempts?"+params);
    if(!Array.isArray(result.items))throw Error("Invalid provider response");
    more=typeof result.next_page_uri==="string"&&!!result.next_page_uri;
    for(const item of result.items){
     if(Date.now()-began>35000){incomplete++;break;}
     const a=obj(item);if(!a||str(a.campaign_id)!==link.sarvam_campaign_id||!str(a.attempt_id))continue;
     const interaction=str(a.interaction_id);
     const status=({connected:"answered",busy:"busy",no_answer:"no_answer",failed:"failed"} as Record<string,string>)[str(a.connectivity_status).toLowerCase()];
     const existing=interaction?await admin.from("voice_call_records").select("id,sarvam_campaign_id,agent_id").eq("dealership_id",link.dealership_id).eq("sarvam_interaction_id",interaction).maybeSingle():{data:null,error:null};
     if(existing.error||existing.data&&(existing.data.sarvam_campaign_id!==link.sarvam_campaign_id||existing.data.agent_id!==link.agent_id))throw Error("Interaction scope conflict");
     const fields={dealership_id:link.dealership_id,sarvam_campaign_id:link.sarvam_campaign_id,agent_id:link.agent_id,sarvam_attempt_id:str(a.attempt_id),...(interaction?{sarvam_interaction_id:interaction}:{}),...(str(a.user_contact)?{dialed_number:str(a.user_contact)}:{}),...(status?{status}:{}),...(typeof a.duration_in_seconds==="number"&&Number.isFinite(a.duration_in_seconds)?{duration_seconds:Math.max(0,Math.min(86400,Math.round(a.duration_in_seconds)))}:{}),...(iso(a.start_datetime)?{started_at:iso(a.start_datetime)}:{}),...(iso(a.end_datetime)?{ended_at:iso(a.end_datetime)}:{}),last_synced_at:new Date().toISOString()};
     const result=existing.data?await admin.from("voice_call_records").update(fields).eq("id",existing.data.id).eq("dealership_id",link.dealership_id):await admin.from("voice_call_records").upsert({status:status??"other",...fields},{onConflict:"dealership_id,sarvam_attempt_id"});
     if(result.error)throw Error("Save failed");saved++;
    }
    if(offset===450&&more)incomplete++;
   }
  }catch{failed++;}
 }
 return reply({ok:failed===0&&incomplete===0,saved,failed,incomplete,linkedCampaigns:links?.length??0},failed||incomplete?503:200);
}
