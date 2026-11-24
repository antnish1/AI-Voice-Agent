"use server";
import {revalidatePath} from "next/cache";
import {requireItSuperUser} from "@/lib/it-access";

export async function saveVoiceProfile(form:FormData):Promise<{error?:string;ok?:boolean}>{
 try{
  const {supabase,user}=await requireItSuperUser();
  const dealershipId=String(form.get("dealershipId")??"");
  const agentId=String(form.get("agentId")??"").trim();
  const version=Number(form.get("version"));
  const connectionId=String(form.get("connectionId")??"").trim();
  const rawCaller=String(form.get("callerNumber")??"").trim().replace(/[\s()-]/g,"");
  const callerNumber=/^[6-9]\d{9}$/.test(rawCaller)?"+91"+rawCaller:/^91[6-9]\d{9}$/.test(rawCaller)?"+"+rawCaller:rawCaller;
  const active=form.get("active")==="yes";
  if(!/^[\da-f-]{36}$/i.test(dealershipId))return {error:"Choose a valid dealership."};
  if(!/^[A-Za-z0-9_.-]{3,200}$/.test(agentId))return {error:"Enter the real Sarvam Agent ID, not its display name."};
  if(!Number.isInteger(version)||version<1)return {error:"Enter the committed agent version number from Sarvam; a draft version cannot be used for calling."};
  // The database permits display names on inactive drafts, but active profiles
  // must use a genuine connection identifier. Never treat a name as verified.
  const idPattern=/^[A-Za-z0-9_.-]{3,200}$/;
  const draftNamePattern=/^[A-Za-z0-9][A-Za-z0-9 _().-]{2,199}$/;
  if(active&&!idPattern.test(connectionId))
   return {error:"To activate this profile, enter the actual Sarvam telephony Connection ID. 'Sarvam Managed (Vobiz)' is only its display name."};
  if(!active&&!draftNamePattern.test(connectionId))
   return {error:"Enter a valid telephony connection name or ID. Inactive drafts can use 'Sarvam Managed (Vobiz)'."};
  if(!/^\+[1-9]\d{7,14}$/.test(callerNumber))return {error:"Enter a valid connected caller number. Indian 10-digit numbers are automatically formatted as +91XXXXXXXXXX."};
  const {data:dealership,error:dealerError}=await supabase.from("dealerships").select("id").eq("id",dealershipId).maybeSingle();
  if(dealerError||!dealership)return {error:"Dealership not found."};
  const {error}=await supabase.from("dealership_voice_profiles").upsert({
   dealership_id:dealershipId,agent_id:agentId,app_version:version,
   connection_id:connectionId,caller_number:callerNumber,active,updated_by:user.id,
   updated_at:new Date().toISOString()
  },{onConflict:"dealership_id"});
  if(error)return {error:"Unable to save dealership profile. Verify RLS and the reviewed database migration."};
  revalidatePath("/settings/voice-profiles");
  return {ok:true};
 }catch{return {error:"IT Super User authorization failed."};}
}
