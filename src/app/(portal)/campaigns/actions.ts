"use server";
import { revalidatePath } from "next/cache";
import { requireMembership, canPrepare } from "@/lib/auth";

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
