import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(status:number,reason:string)=>NextResponse.json({error:reason},{status,headers:{"Cache-Control":"no-store"}});
type SarvamPayload={
 app_id?:unknown;attempt_id?:unknown;campaign_id?:unknown;user_phone_number?:unknown;
 interaction_id?:unknown;connectivity_status?:unknown;completion_status?:unknown;
 output_agent_variables?:unknown; duration?:unknown;start_datetime?:unknown;end_datetime?:unknown;interaction_transcript?:unknown;
};
function textOf(value:unknown,max=200){return typeof value==="string"?value.slice(0,max):"";}
function iso(value:unknown){if(typeof value!=="string"||!value)return null;const d=new Date(value);return Number.isFinite(d.getTime())?d.toISOString():null;}
function safeTranscript(value:unknown){
 if(!Array.isArray(value))return null;
 return value.slice(0,150).filter(t=>t&&typeof t==="object"&&["agent","user"].includes(t.role)&&typeof t.en_text==="string").map(t=>({role:t.role,en_text:t.en_text.slice(0,1000)}));
}
export async function POST(req:NextRequest){
 const secret=process.env.SARVAM_WEBHOOK_SIGNING_SECRET;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const adminKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret||!url||!adminKey)return fail(503,"Sarvam webhook not configured");
 const signature=req.headers.get("sarvam-signature")??"";
 const timestamp=req.headers.get("sarvam-timestamp")??"";
 if(!/^sha256=[a-f0-9]{64}$/i.test(signature)||!/^\d{10}$/.test(timestamp))return fail(401,"Signature required");
 const seconds=Number(timestamp);
 if(!Number.isSafeInteger(seconds)||Math.abs(Date.now()-seconds*1000)>300000)return fail(401,"Webhook timestamp expired");
 const raw=await req.text();
 if(raw.length>256000)return fail(413,"Payload too large");
 const encoder=new TextEncoder();
 const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const mac=new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(timestamp+"."+raw)));
 const expected="sha256="+Array.from(mac).map(b=>b.toString(16).padStart(2,"0")).join("");
 // Compare the fixed-size hex values without early exit.
 let mismatch=0;const observed=signature.toLowerCase();for(let i=0;i<expected.length;i++)mismatch|=expected.charCodeAt(i)^observed.charCodeAt(i);
 if(mismatch!==0)return fail(401,"Invalid webhook signature");
 let payload:SarvamPayload;
 try{payload=JSON.parse(raw) as SarvamPayload;}catch{return fail(400,"Malformed payload");}
 const attempt=textOf(payload.attempt_id),campaign=textOf(payload.campaign_id),agent=textOf(payload.app_id);
 if(attempt.length<3||agent.length<3)return fail(400,"Required Sarvam identifiers missing");
 const phone=textOf(payload.user_phone_number,25);
 if(phone&&!/^\+?[1-9]\d{7,14}$/.test(phone))return fail(400,"Invalid phone number");
 const admin=createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const connectivity=textOf(payload.connectivity_status,30);
 const completion=textOf(payload.completion_status,30);
 const status=connectivity==="connected"?"answered":connectivity==="busy"?"busy":connectivity==="no_answer"?"no_answer":connectivity==="failed"||completion==="failed"?"failed":"other";
 const duration=typeof payload.duration==="number"&&Number.isFinite(payload.duration)?Math.max(0,Math.min(86400,Math.round(payload.duration))):null;
 const output=payload.output_agent_variables&&typeof payload.output_agent_variables==="object"&&!Array.isArray(payload.output_agent_variables)?payload.output_agent_variables:null;
 const common={status,duration_seconds:duration,started_at:iso(payload.start_datetime),ended_at:iso(payload.end_datetime),transcript:safeTranscript(payload.interaction_transcript),output_variables:output,last_synced_at:new Date().toISOString()};
 if(!campaign){
  const {data:test,error}=await admin.from("voice_test_call_requests").select("id,agent_id").eq("sarvam_attempt_id",attempt).maybeSingle();
  if(error)return fail(503,"Test attempt lookup unavailable");
  if(!test||test.agent_id!==agent)return fail(422,"Unlinked test attempt");
  const {error:save}=await admin.from("voice_test_call_results").upsert({request_id:test.id,interaction_id:textOf(payload.interaction_id)||null,...common},{onConflict:"request_id"});
  if(save)return fail(503,"Unable to persist test result");
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }
 // Never take a tenant ID from a webhook payload or metadata. The verified Sarvam
 // campaign ID must already be explicitly linked to an internal CRM campaign.
 const {data:link,error:lookupError}=await admin.from("voice_campaign_links").select("dealership_id,agent_id,campaign_id").eq("sarvam_campaign_id",campaign).maybeSingle();
 if(lookupError)return fail(503,"Campaign lookup unavailable");
 if(!link)return fail(422,"Unlinked Sarvam campaign");
 if(link.agent_id!==agent)return fail(422,"Agent/campaign mismatch");
 const record={
  dealership_id:link.dealership_id,sarvam_attempt_id:attempt,sarvam_campaign_id:campaign,agent_id:agent,
  sarvam_interaction_id:textOf(payload.interaction_id,200)||null,dialed_number:phone||null,
  ...common
 };
 const existing=record.sarvam_interaction_id?await admin.from("voice_call_records").select("id").eq("dealership_id",link.dealership_id).eq("sarvam_interaction_id",record.sarvam_interaction_id).maybeSingle():{data:null,error:null};
 if(existing.error)return fail(503,"Interaction reconciliation unavailable");
 const {error:saveError}=existing.data?await admin.from("voice_call_records").update(record).eq("id",existing.data.id).eq("dealership_id",link.dealership_id):await admin.from("voice_call_records").upsert(record,{onConflict:"dealership_id,sarvam_attempt_id"});
 if(saveError)return fail(503,"Unable to persist verified call result");
 // Receipt is secondary to the uniquely keyed, idempotent call record.
 const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(raw)));
 const hash=Array.from(digest).map(b=>b.toString(16).padStart(2,"0")).join("");
 await admin.from("voice_webhook_receipts").upsert({dealership_id:link.dealership_id,delivery_id:attempt,payload_hash:hash},{onConflict:"dealership_id,delivery_id"});
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
export async function GET(){return fail(405,"Method not allowed");}
