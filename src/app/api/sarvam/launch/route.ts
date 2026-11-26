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
  if(campaignError||!campaign||!["DRAFT","PENDING","PENDING_MANAGER_APPROVAL","PAUSED","APPROVED"].includes(campaign.status))
   return NextResponse.json({error:"A pending or held local campaign is required before launching."},{status:403});
  if(input.confirm!=="LAUNCH "+campaign.name||input.reviewedTestResult!==true)return NextResponse.json({error:"Exact campaign confirmation and explicit reviewed-test acknowledgment are required."},{status:400});
  const [{data:batch,error:batchError},{data:config,error:configError},{data:test,error:testError}]=await Promise.all([
   supabase.from("campaign_recipient_batches").select("*").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle(),
   supabase.from("campaign_draft_configs").select("configuration").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle(),
   supabase.from("voice_test_call_requests").select("id,agent_id,agent_version,connection_id,caller_number")
    .eq("user_id",user.id).eq("status","submitted").eq("agent_id",String(input.agentId??""))
    .gte("created_at",new Date(Date.now()-86400000).toISOString()).limit(20)
  ]);
  if(batchError||configError||testError||!batch||!config||!test?.length)
   return NextResponse.json({error:"A locked recipient cohort, matching approved configuration and a recent test call from AI Voice Agents are required."},{status:409});
  const setup=config.configuration as {agent_label?:string;agent_version_label?:string;telephony_label?:string;outgoing_number_label?:string;schedule?:{start_mode?:"now"|"custom";start?:string;end?:string;days?:string[];from?:string;to?:string;retry_interval_minutes?:number}};
  const agent=String(input.agentId??""),version=Number(input.appVersion),connection=String(input.connectionId??""),sender=normalizePhone(String(input.callerNumber??""));
  if(!/^[\w.\-]{3,200}$/.test(agent)||!Number.isInteger(version)||version<1||
     !/^[\w.\-]{3,200}$/.test(connection)||!sender||
     setup.agent_label!==agent||setup.agent_version_label!==String(version)||
     setup.telephony_label!==connection||normalizePhone(setup.outgoing_number_label??"")!==sender)
   return NextResponse.json({error:"Agent, committed version, connection and caller number must exactly match the approved campaign draft."},{status:400});
  if(!test.some(attempt=>attempt.agent_id===agent&&attempt.agent_version===version&&
    attempt.connection_id===connection&&attempt.caller_number===sender))
   return NextResponse.json({error:"The recent test-call attempt must use the approved agent version, telephony connection and caller number. Re-test this exact setup from AI Voice Agents before launch."},{status:409});
  const schedule=setup.schedule;
  const approvedStart=new Date((schedule?.start??"")+"T"+(schedule?.from??"")+":00+05:30"),end=new Date((schedule?.end??"")+"T"+(schedule?.to??"")+":00+05:30");
  const start=new Date(Math.max(approvedStart.getTime(),schedule?.start_mode==="now"?Date.now()+120000:approvedStart.getTime()));
  const istDate=(date:Date)=>{
   const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
   const get=(part:string)=>parts.find(p=>p.type===part)?.value??"";
   return get("year")+"-"+get("month")+"-"+get("day");
  };
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||
     start.getTime()<Date.now()||end.getTime()<=start.getTime()||end.getTime()>start.getTime()+30*86400000||
     (schedule?.start_mode!=="now"&&istDate(start)!==setup.schedule?.start)||
     istDate(end)!==setup.schedule?.end)
   return NextResponse.json({error:"Use a valid approved IST schedule with a future end time and a maximum 30-day period. For immediate calling select Now."},{status:400});
  const interval=schedule?.retry_interval_minutes??30;
  if(!Number.isInteger(interval)||interval<1||interval>10080)return NextResponse.json({error:"Approved retry interval is invalid."},{status:400});
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
   name:campaign.name,description:"Approved Frontier Voice CRM campaign",app_config:{
    app_id:agent,app_version:version,app_type:"agent",attempts_per_second:1,
    connection_configs:[{connection_id:connection,phone_numbers:[sender],weight:1}],
    retry_config:{max_retries:0,retry_interval_minutes:interval},
    webhook_config:{webhook_id:process.env.SARVAM_STORED_WEBHOOK_ID}
   },
   start_timestamp:start.toISOString(),end_timestamp:end.toISOString(),
   allowed_schedule:{timezone:"Asia/Kolkata",allowed_start_time:schedule.from,allowed_end_time:schedule.to,allowed_days:schedule.days.map(x=>days[x])}
  };
  const configHash=sha256(JSON.stringify(launchBody));
  const {data:reservation,error:reserveError}=await supabase.rpc("frontvox_reserve_direct_launch",{p_campaign:id,p_dealer:campaign.dealership_id,p_expected_config:config.configuration,p_recipient_hash:batch.csv_sha256,p_config_hash:configHash});
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
   const {error:statusError}=await supabase.from("voice_campaign_launches").update({state:"cohort_submitted",provider_status:"scheduled",sarvam_cohort_id:streamed.cohort_id,updated_at:new Date().toISOString()}).eq("campaign_id",id);
   if(statusError)throw Error("Could not persist cohort state");
   return NextResponse.json({ok:true,campaignId:providerId,cohortId:streamed.cohort_id,cohortStatus:streamed.status??"processing",message:"Sarvam accepted campaign and recipient cohort. Confirm processing status before the scheduled dialing window."});
  }catch{
   await supabase.from("voice_campaign_launches").update({state:"needs_reconciliation",updated_at:new Date().toISOString()}).eq("campaign_id",id);
   return NextResponse.json({error:"Remote campaign created but cohort upload outcome is uncertain. Reconcile in Sarvam before the start time; never resend automatically."},{status:502});
  }
 }catch{return NextResponse.json({error:"Campaign launch was not authorized or its configuration could not be validated."},{status:403});}
}
