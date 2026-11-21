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
 const {data,error}=await supabase.from("campaigns").update({status:"PENDING_MANAGER_APPROVAL"}).eq("id",id).eq("dealership_id",dealershipId).eq("status","DRAFT").select("id");
 if(error||!data?.length)throw new Error("Could not submit campaign.");
 revalidatePath("/campaigns");revalidatePath("/approvals");
}
