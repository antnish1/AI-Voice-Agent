import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {requireItSuperUser} from "@/lib/it-access";
import {parseHistoricalCsv} from "@/lib/sarvam/historical-import";
export const runtime="nodejs";
export const maxDuration=60;
const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(request:Request){
 let ctx;try{ctx=await requireItSuperUser();}catch{return reply({error:"IT Super User access required."},403);}
 if(!ctx.membership)return reply({error:"Select a dealership first."},400);
 if(Number(request.headers.get("content-length")??0)>4200000)return reply({error:"File too large (4 MB maximum)."},413);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return reply({error:"Import is not configured."},503);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 let form:FormData;try{form=await request.formData();}catch{return reply({error:"Invalid upload."},400);}
 const file=form.get("file"),dealer=String(form.get("dealershipId")??""),timezone=String(form.get("timezone")??"");
 if(!(file instanceof File)||!file.name.toLowerCase().endsWith(".csv")||file.size>4000000||!file.size||form.get("confirm")!=="yes")return reply({error:"Choose a CSV and confirm permission to import historical call data."},400);
 if(dealer!==ctx.membership.dealership_id)return reply({error:"Switch to the selected dealership before importing."},403);
 let parsed;try{parsed=parseHistoricalCsv(await file.text()).convert(timezone);}catch(e){return reply({error:e instanceof Error?e.message:"Invalid CSV."},400);}
 // Only existing trusted campaign/agent associations may establish tenancy.
 const pairs=new Map(parsed.map(r=>[JSON.stringify([r.campaign,r.agent]),r]));
 for(const {campaign,agent} of pairs.values()){
  const linked=await admin.from("voice_campaign_links").select("dealership_id,agent_id").eq("sarvam_campaign_id",campaign).limit(2);
  if(linked.error)return reply({error:"Campaign validation unavailable."},503);
  if(linked.data?.length){if(linked.data.length!==1||linked.data[0].dealership_id!==dealer||linked.data[0].agent_id!==agent)return reply({error:"Campaign/agent belongs to a different scope."},409);}
  else return reply({error:"Campaign is not linked to the CRM. Create a verified campaign mapping before importing."},409);
 }
 const ids=parsed.map(r=>r.interaction);
 const existing=await admin.from("voice_call_records").select("sarvam_interaction_id").eq("dealership_id",dealer).in("sarvam_interaction_id",ids);
 if(existing.error)return reply({error:"Duplicate check unavailable."},503);
 const seen=new Set((existing.data??[]).map(r=>r.sarvam_interaction_id));
 const records=parsed.filter(r=>!seen.has(r.interaction)).map(r=>({dealership_id:dealer,sarvam_attempt_id:"csv:"+r.interaction,sarvam_interaction_id:r.interaction,sarvam_campaign_id:r.campaign,agent_id:r.agent,dialed_number:r.phone,status:r.status,duration_seconds:r.duration,started_at:r.started,ended_at:r.ended,transcript:r.transcript,output_variables:r.output}));
 if(!records.length)return reply({ok:true,inserted:0,duplicates:parsed.length});
 const saved=await admin.from("voice_call_records").upsert(records,{onConflict:"dealership_id,sarvam_attempt_id",ignoreDuplicates:true}).select("id");
 if(saved.error)return reply({error:"Import failed; no success claimed. Retry after checking database access."},503);
 const inserted=saved.data?.length??0;return reply({ok:true,inserted,duplicates:parsed.length-inserted});
}
