import Link from "next/link";
import {notFound} from "next/navigation";
import {requireItSuperUser} from "@/lib/it-access";
import {OutboundConsole} from "../../outbound-console";
import {ProspectDashboard,type ProspectView} from "../../prospect-dashboard";
import {normalizePhone} from "@/lib/sarvam/recipient-validation";
export default async function OutboundPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[\da-f-]{36}$/i.test(id))notFound();
 const {supabase}=await requireItSuperUser();
 const {data:campaign,error}=await supabase.from("campaigns").select("id,name,status,dealership_id").eq("id",id).maybeSingle();
 if(error||!campaign)notFound();
 const [configs,batches,launches]=await Promise.all([
  supabase.from("campaign_draft_configs").select("configuration").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle(),
  supabase.from("campaign_recipient_batches").select("cohort_name,total_records,eligible_records,csv_sha256").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle(),
  supabase.from("voice_campaign_launches").select("state,sarvam_campaign_id,sarvam_cohort_id").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle()
 ]);
 if(configs.error||batches.error||launches.error)throw Error("Outbound preparation tables have not been migrated.");
 const {data:callRecords,error:callError}=launches.data?.sarvam_campaign_id?
  await supabase.from("voice_call_records").select("dialed_number,status,duration_seconds,started_at,ended_at,sarvam_attempt_id,agent_id")
   .eq("dealership_id",campaign.dealership_id).eq("sarvam_campaign_id",launches.data.sarvam_campaign_id)
   .order("started_at",{ascending:false}).limit(1000):{data:[],error:null};
 if(callError)throw Error("Could not read saved campaign results.");
 const {data:prospects,error:prospectError}=await supabase.from("campaign_prospects").select(
  "id,recipient_identifier,mobile,customer_name,registration_number,vehicle_model,service_type,service_due,readiness,queue_state,interest,call_summary,follow_up_at,next_action,retry_requested,attempt_number,customer_source"
 ).eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).order("created_at",{ascending:true}).limit(250);
 if(prospectError)throw Error("Could not load campaign customer index.");
 const {data:retryReviews,error:retryError}=await supabase.from("campaign_retry_requests")
  .select("prospect_id").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).eq("state","pending_review").limit(250);
 if(retryError)throw Error("Could not read retry review requests.");
 const pendingRetries=new Set((retryReviews??[]).map(r=>r.prospect_id));
 const latest=new Map<string,NonNullable<typeof callRecords>[number]>();
 for(const call of callRecords??[]){
  const phone=normalizePhone(call.dialed_number??"");
  if(phone&&!latest.has(phone))latest.set(phone,call);
 }
 const view:ProspectView[]=(prospects??[]).map(p=>{
  const call=latest.get(p.mobile);
  return {...p,queue_state:call?.status??p.queue_state,
   connectivity:call?.status??null,duration_seconds:call?.duration_seconds??null,
   interest:p.interest??null,call_summary:p.call_summary??null,follow_up_at:p.follow_up_at??null,
   next_action:p.next_action??null,retry_requested:pendingRetries.has(p.id),
   customer_source:p.customer_source??"excel",
   registration_number:p.registration_number??null,vehicle_model:p.vehicle_model??null,
   service_type:p.service_type??null,service_due:p.service_due??null,
   customer_name:p.customer_name??null,readiness:p.readiness??"ready",
   attempt_number:p.attempt_number??0}
 });
 const config=configs.data?.configuration as {agent_label?:string;agent_version_label?:string;telephony_label?:string;outgoing_number_label?:string;schedule?:{start?:string;end?:string}}|null;
 return <main>
  <div className="page-head"><div><p className="eyebrow">FRONTVOX AI · OUTBOUND OPERATIONS</p><h1>{campaign.name}</h1><p>Review recipient readiness, verify the agent, and start calling only after approval.</p></div><Link className="btn-outline small" href="/campaigns">Back to Campaigns</Link></div>
  <div className="helper-banner">Campaign status: <strong>{campaign.status.replaceAll("_"," ")}</strong>. Sarvam calling is subject to independent server switches and user confirmation.</div>
  <OutboundConsole campaign={{id:campaign.id,name:campaign.name,status:campaign.status}} config={config} batch={batches.data} launch={launches.data} callRecords={callRecords??[]}
   testEnabled={process.env.ENABLE_TEST_CALLS==="true"} liveEnabled={process.env.ENABLE_LIVE_CALLS==="true"}/>
  <ProspectDashboard campaignName={campaign.name} prospects={view} uploaded={batches.data?.total_records??0} eligible={batches.data?.eligible_records??0}/>
 </main>;
}
