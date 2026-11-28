"use server";
import {revalidatePath} from "next/cache";
import {requireMembership,canPrepare} from "@/lib/auth";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function saveCustomerQuickAction(form:FormData):Promise<{ok?:boolean;error?:string}>{
 const dealershipId=String(form.get("dealership_id")??""),customerId=String(form.get("customer_id")??""),kind=String(form.get("kind")??""),notes=String(form.get("notes")??"").trim();
 if(!uuid.test(dealershipId)||!uuid.test(customerId)||!["callback","remark"].includes(kind)||notes.length>2000)return {error:"Invalid customer or notes."};
 try{
  const {supabase,membership,user}=await requireMembership(dealershipId);
  if(!membership||membership.dealership_id!==dealershipId||!canPrepare(membership.role))return {error:"Only authorized IT staff may manage customer records."};
  const {data:customer,error}=await supabase.from("customers").select("id,name,mobile,consent_status,do_not_call").eq("id",customerId).eq("dealership_id",dealershipId).maybeSingle();
  if(error||!customer)return {error:"Customer not found in your selected dealership."};
  if(kind==="remark"){
   if(!notes)return {error:"Enter a remark."};
   const {error:e}=await supabase.from("customer_staff_remarks").insert({dealership_id:dealershipId,customer_id:customerId,body:notes,created_by:user.id});
   if(e)return {error:"Unable to save remark. Check database setup."};
  }else{
   if(customer.do_not_call||customer.consent_status!=="verified")return {error:"Calling is blocked or consent is unverified. Follow-up cannot be scheduled until calling permission is verified."};
   const time=String(form.get("scheduled_at")??""),priority=String(form.get("priority")??"medium");
   const date=new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(time)?time+":00+05:30":"invalid");
   if(!Number.isFinite(date.getTime())||date.getTime()<=Date.now()||!["low","medium","high"].includes(priority)||!customer.mobile)return {error:"Enter a future IST date/time, priority and valid customer phone."};
   const {error:e}=await supabase.from("crm_callbacks").insert({dealership_id:dealershipId,customer_id:customerId,customer_name:customer.name,mobile:customer.mobile,requested_at:date.toISOString(),priority,status:"pending",source:"manual",notes,created_by:user.id});
   if(e)return {error:"Unable to save follow-up."};
  }
  revalidatePath("/customers");revalidatePath("/callbacks");revalidatePath("/dashboard");return {ok:true};
 }catch{return {error:"Customer action could not be saved."};}
}
