"use server";
import { revalidatePath } from "next/cache";
import { requireMembership, canPrepare } from "@/lib/auth";
type WizardInput={dealershipId:string;name:string;configuration:{
 description:string;agent_label:string;agent_version_label:string;telephony_label:string;outgoing_number_label:string;
 schedule:{start:string;end:string;days:string[];from:string;to:string;cps:number;max_retries:number;retry_interval_minutes:number};
 recipient_preview:{filename:string;total_rows:number;phone_column:string;preview_only:true};
}};
export async function saveWizardDraft(input:WizardInput):Promise<{error?:string;id?:string}>{
 try{
  if(!input||typeof input.name!=="string"||input.name.trim().length<3||input.name.trim().length>120) return {error:"Campaign name must be 3–120 characters."};
  const {supabase,membership}=await requireMembership(input.dealershipId);
  if(!membership||!canPrepare(membership.role))return {error:"Not authorized to prepare campaigns."};
  const c=input.configuration,s=c?.schedule,r=c?.recipient_preview;
  if(!c||!s||!r||!Array.isArray(s.days)||s.days.some(d=>!["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].includes(d))||
     !Number.isInteger(s.cps)||s.cps<1||s.cps>30||!Number.isInteger(s.max_retries)||s.max_retries<0||s.max_retries>10||
     !Number.isInteger(s.retry_interval_minutes)||s.retry_interval_minutes<1||s.retry_interval_minutes>10080||
     (s.start&&s.end&&s.end<s.start)||!Number.isInteger(r.total_rows)||r.total_rows<0||r.total_rows>50000||r.preview_only!==true)
     return {error:"Campaign settings are invalid."};
  // Do not accept recipient files, personal data, or guessed Sarvam IDs in a draft config.
  const clean=(v:string)=>String(v??"").slice(0,200);
  const safe={
   description:clean(c.description).slice(0,200),
   agent_label:clean(c.agent_label),agent_version_label:clean(c.agent_version_label),
   telephony_label:clean(c.telephony_label),outgoing_number_label:clean(c.outgoing_number_label),
   schedule:{start:clean(s.start),end:clean(s.end),days:s.days,from:clean(s.from),to:clean(s.to),cps:s.cps,max_retries:s.max_retries,retry_interval_minutes:s.retry_interval_minutes},
   recipient_preview:{filename:clean(r.filename),total_rows:r.total_rows,phone_column:clean(r.phone_column),preview_only:true},
   sarvam_connected:false,launch_enabled:false
  };
  const {data,error}=await supabase.rpc("create_campaign_draft_with_config",{p_dealership_id:input.dealershipId,p_name:input.name.trim(),p_configuration:safe});
  if(error)return {error:"Could not save draft. Please check database permissions and try again."};
  revalidatePath("/campaigns");revalidatePath("/dashboard");
  return {id:String(data)};
 }catch{return {error:"Could not save this campaign draft."};}
}
export async function createCampaign(form:FormData){
 const dealershipId=String(form.get("dealership_id")??"");
 const name=String(form.get("name")??"").trim();
 if(name.length<3||name.length>120)throw new Error("Campaign name must be 3–120 characters.");
 const {supabase,user,membership}=await requireMembership(dealershipId);
 if(!membership||!canPrepare(membership.role))throw new Error("Not authorized to prepare campaigns.");
 const {error}=await supabase.from("campaigns").insert({name,dealership_id:dealershipId,created_by:user.id,status:"DRAFT"});
 if(error)throw new Error("Could not create campaign.");
 revalidatePath("/campaigns");
}
export async function submitCampaign(form:FormData){
 const dealershipId=String(form.get("dealership_id")??""),id=String(form.get("campaign_id")??"");
 const {supabase,membership}=await requireMembership(dealershipId);
 if(!membership||!canPrepare(membership.role))throw new Error("Not authorized.");
 const {data:config,error:configError}=await supabase.from("campaign_draft_configs").select("configuration").eq("campaign_id",id).eq("dealership_id",dealershipId).maybeSingle();
 if(configError)throw new Error("Could not verify campaign setup.");
 const {data:batch,error:batchError}=await supabase.from("campaign_recipient_batches").select("csv_sha256,eligible_records").eq("campaign_id",id).eq("dealership_id",dealershipId).maybeSingle();
 if(batchError||!batch||batch.eligible_records<1)throw new Error("Stage a consent-screened, DNC-filtered CSV cohort before submitting for approval.");
 const {data,error}=await supabase.from("campaigns").update({status:"PENDING_MANAGER_APPROVAL"}).eq("id",id).eq("dealership_id",dealershipId).eq("status","DRAFT").select("id");
 if(error||!data?.length)throw new Error("Could not submit campaign.");
 revalidatePath("/campaigns");revalidatePath("/approvals");
}

/** Minimal InsureIT-style creation. Settings are server-controlled, never inferred from an Excel sheet. */
export async function createSimpleCampaign(dealershipId:string,filename:string,totalRows:number):Promise<{error?:string;id?:string}>{
 try {
  const {supabase,membership}=await requireMembership(dealershipId);
  if(!membership||!canPrepare(membership.role)||membership.dealership_id!==dealershipId)return {error:"You cannot create campaigns for this dealership."};
  if(!Number.isInteger(totalRows)||totalRows<1||totalRows>250)return {error:"Select 1–250 customer records per campaign."};
  const {data:dealer,error}=await supabase.from("dealerships").select("name").eq("id",dealershipId).maybeSingle();
  if(error||!dealer?.name)return {error:"Could not verify the selected dealership."};
  // The date is based on IST, not the staff member's device clock. Start no sooner than tomorrow.
  const istToday=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const [year,month,day]=istToday.split("-").map(Number);
  const startUtc=Date.UTC(year,month-1,day+1);
  const date=(value:number)=>new Date(value).toISOString().slice(0,10);
  const start=date(startUtc),end=date(startUtc+7*86400000);
  const name=(dealer.name+" Service Campaign "+start).slice(0,120);
  const profileResult=await supabase.from("dealership_voice_profiles")
   .select("agent_id,app_version,connection_id,caller_number,active")
   .eq("dealership_id",dealershipId).maybeSingle();
  if(profileResult.error)return {error:"Dealership voice settings are not available. Apply the reviewed profile migration first."};
  const profile=profileResult.data?.active?profileResult.data:null;
  if(!profile)return {error:"This dealership needs a verified active Sarvam profile. Configure it in Voice Agent Defaults before creating a campaign."};
  const draft=await saveWizardDraft({dealershipId,name,configuration:{
   description:"Service reminder calling; requires verified Sarvam agent, telephony and manager approval.",
   agent_label:profile?.agent_id??"",agent_version_label:profile?String(profile.app_version):"",telephony_label:profile?.connection_id??"",outgoing_number_label:profile?.caller_number??"",
   schedule:{start,end,days:["Mon","Tue","Wed","Thu","Fri","Sat"],from:"10:00",to:"18:00",cps:1,max_retries:0,retry_interval_minutes:60},
   recipient_preview:{filename,total_rows:totalRows,phone_column:"Mobile",preview_only:true}
  }});
  return draft;
 }catch{return {error:"Could not create campaign draft."};}
}
