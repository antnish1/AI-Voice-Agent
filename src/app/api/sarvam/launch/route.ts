import {NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";
import {callingEnabled,sha256,sarvamPost,sarvamPath} from "@/lib/sarvam/outbound-provider";
import {normalizePhone,prepareRecipients} from "@/lib/sarvam/recipient-validation";
export const runtime="nodejs";

const days:Record<string,string>={Mon:"Monday",Tue:"Tuesday",Wed:"Wednesday",Thu:"Thursday",Fri:"Friday",Sat:"Saturday",Sun:"Sunday"};
export async function POST(request:Request){
 try{
  const {supabase,user}=await requireItSuperUser();
  if(!callingEnabled("campaign"))return NextResponse.json({error:"Campaign launch is disabled in Vercel Production. No calls have been initiated."},{status:403});
  const input=await request.json();
  const id=String(input.campaignId??"");
  if(!/^[\da-f-]{36}$/i.test(id))return NextResponse.json({error:"Invalid campaign ID"},{status:400});
  const {data:campaign,error:campaignError}=await supabase.from("campaigns").select("id,name,dealership_id,status,approved_by,approved_at").eq("id",id).maybeSingle();
  if(campaignError||!campaign||campaign.status!=="APPROVED"||!campaign.approved_by||!campaign.approved_at)
   return NextResponse.json({error:"A manager-approved local campaign is required before launching."},{status:403});
  if(input.confirm!=="LAUNCH "+campaign.name)return NextResponse.json({error:"Type the exact campaign launch confirmation."},{status:400});
  const [{data:batch,error:batchError},{data:config,error:configError},{data:test,error:testError}]=await Promise.all([
   supabase.from("campaign_recipient_batches").select("*").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle(),
   supabase.from("campaign_draft_configs").select("configuration").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle(),
   supabase.from("voice_test_call_requests").select("id").eq("user_id",user.id).eq("status","submitted").eq("agent_id",String(input.agentId??"")).gte("created_at",new Date(Date.now()-86400000).toISOString()).limit(1)
  ]);
  if(batchError||configError||testError||!batch||!config||!test?.length)
   return NextResponse.json({error:"A locked recipient cohort, matching approved configuration and a recent test call are required."},{status:409});
  const setup=config.configuration as {agent_label?:string;agent_version_label?:string;telephony_label?:string;outgoing_number_label?:string;schedule?:{start?:string;end?:string;days?:string[];from?:string;to?:string}};
  const agent=String(input.agentId??""),version=Number(input.appVersion),connection=String(input.connectionId??""),sender=normalizePhone(String(input.callerNumber??""));
  if(!/^[\w.\-]{3,200}$/.test(agent)||!Number.isInteger(version)||version<1||
     !/^[\w.\-]{3,200}$/.test(connection)||!sender||
     setup.agent_label!==agent||setup.agent_version_label!==String(version)||
     setup.telephony_label!==connection||normalizePhone(setup.outgoing_number_label??"")!==sender)
   return NextResponse.json({error:"Agent, committed version, connection and caller number must exactly match the approved campaign draft."},{status:400});
  const start=new Date(String(input.startAt??"")),end=new Date(String(input.endAt??""));
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||
     start.getTime()<Date.now()+3600000||end.getTime()<=start.getTime()||end.getTime()>start.getTime()+30*86400000||
     start.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"})!==setup.schedule?.start||
     end.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"})!==setup.schedule?.end)
   return NextResponse.json({error:"Use the approved IST campaign dates, starting at least one hour from now, with a maximum 30-day period."},{status:400});
  const schedule=setup.schedule;
  if(!schedule||!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.from??"")||
     !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.to??"")||
     (schedule.from??"")>=(schedule.to??"")||!schedule.days?.length||schedule.days.some(x=>!days[x]))
   return NextResponse.json({error:"Approved dialing schedule is invalid."},{status:400});
  if(!process.env.SARVAM_STORED_WEBHOOK_ID)
   return NextResponse.json({error:"A signed stored Sarvam webhook ID is required before campaign launch."},{status:503});
  const {data:file,error:fileError}=await supabase.storage.from("frontvox-campaign-cohorts").download(batch.object_path);
  if(fileError||!file)return NextResponse.json({error:"Approved recipient file cannot be retrieved."},{status:503});
  const csv=await file.text();
  if(sha256(csv)!==batch.csv_sha256)return NextResponse.json({error:"Recipient cohort digest changed after approval."},{status:409});
  const prepared=prepareRecipients(csv,{phoneColumn:batch.phone_column,consentColumn:batch.consent_column,dncColumn:batch.dnc_column,variableMapping:batch.variable_mapping??{}});
  if(prepared.eligible!==batch.eligible_records||prepared.excluded!==0)
   return NextResponse.json({error:"Recipient counts do not match the locked approved cohort."},{status:409});
  const launchBody={
   name:campaign.name,description:"Approved FrontVox AI campaign",app_config:{
    app_id:agent,app_version:version,app_type:"agent",attempts_per_second:1,
    connection_configs:[{connection_id:connection,phone_numbers:[sender],weight:1}],
    retry_config:{max_retries:0,retry_interval_minutes:30},
    webhook_config:{webhook_id:process.env.SARVAM_STORED_WEBHOOK_ID}
   },
   start_timestamp:start.toISOString(),end_timestamp:end.toISOString(),
   allowed_schedule:{timezone:"Asia/Kolkata",allowed_start_time:schedule.from,allowed_end_time:schedule.to,allowed_days:schedule.days.map(x=>days[x])}
  };
  const configHash=sha256(JSON.stringify(launchBody));
  const {data:reservation,error:reserveError}=await supabase.from("voice_campaign_launches").insert({
   campaign_id:id,dealership_id:campaign.dealership_id,recipient_sha256:batch.csv_sha256,
   config_sha256:configHash,state:"creating",initiated_by:user.id
  }).select("campaign_id").single();
  if(reserveError||!reservation)return NextResponse.json({error:"This campaign already has a launch attempt. Check its state; do not retry blindly."},{status:409});
  let providerId="";
  try{
   const created=await sarvamPost(sarvamPath("campaigns"),launchBody);
   if(typeof created.campaign_id!=="string"||!created.campaign_id)throw Error("Missing provider campaign ID");
   providerId=created.campaign_id;
   const {error:updatedError}=await supabase.from("voice_campaign_launches").update({sarvam_campaign_id:providerId,state:"campaign_created",updated_at:new Date().toISOString()}).eq("campaign_id",id);
   if(updatedError)throw Error("Could not save remote campaign ID");
   const {error:linkError}=await supabase.from("voice_campaign_links").insert({campaign_id:id,dealership_id:campaign.dealership_id,sarvam_campaign_id:providerId,agent_id:agent});
   if(linkError)throw Error("Could not map remote campaign for signed webhooks");
  }catch{
   await supabase.from("voice_campaign_launches").update({state:"needs_reconciliation",updated_at:new Date().toISOString()}).eq("campaign_id",id);
   return NextResponse.json({error:"Campaign creation result is uncertain. Check Sarvam and reconcile before another attempt; no automatic retries."},{status:502});
  }
  // Reserve cohort submission before calling provider so retries cannot double-enqueue calls.
  const {error:reserveCohortError}=await supabase.from("voice_campaign_launches").update({state:"cohort_submitting",updated_at:new Date().toISOString()}).eq("campaign_id",id).eq("state","campaign_created");
  if(reserveCohortError)return NextResponse.json({error:"Remote campaign created but cohort reservation failed. Do not retry launch."},{status:502});
  try{
   const streamed=await sarvamPost(sarvamPath("campaigns","/"+encodeURIComponent(providerId)+"/cohorts/stream"),{
    name:batch.cohort_name,users:prepared.users
   });
   if(typeof streamed.cohort_id!=="string"||!streamed.cohort_id)throw Error("Provider did not acknowledge cohort");
   await supabase.from("voice_campaign_launches").update({state:"cohort_submitted",sarvam_cohort_id:streamed.cohort_id,updated_at:new Date().toISOString()}).eq("campaign_id",id);
   return NextResponse.json({ok:true,campaignId:providerId,cohortId:streamed.cohort_id,cohortStatus:streamed.status??"processing",message:"Sarvam accepted campaign and recipient cohort. Confirm processing status before the scheduled dialing window."});
  }catch{
   await supabase.from("voice_campaign_launches").update({state:"needs_reconciliation",updated_at:new Date().toISOString()}).eq("campaign_id",id);
   return NextResponse.json({error:"Remote campaign created but cohort upload outcome is uncertain. Reconcile in Sarvam before the start time; never resend automatically."},{status:502});
  }
 }catch{return NextResponse.json({error:"Campaign launch was not authorized or its configuration could not be validated."},{status:403});}
}
