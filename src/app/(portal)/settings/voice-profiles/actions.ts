"use server";
import {revalidatePath} from "next/cache";
import {requireItSuperUser} from "@/lib/it-access";

export async function saveVoiceProfile(form:FormData):Promise<{error?:string;ok?:boolean}>{
 try{
  const {supabase,user}=await requireItSuperUser();
  const agentId=String(form.get("agentId")??"").trim();
  const version=Number(form.get("version"));
  const connectionId=String(form.get("connectionId")??"").trim();
  const rawCaller=String(form.get("callerNumber")??"").trim().replace(/[\s()-]/g,"");
  const callerNumber=/^[6-9]\d{9}$/.test(rawCaller)?"+91"+rawCaller:/^91[6-9]\d{9}$/.test(rawCaller)?"+"+rawCaller:rawCaller;
  const active=form.get("active")==="yes";

  if(!/^[A-Za-z0-9_.-]{3,200}$/.test(agentId))return {error:"Enter the real Sarvam Agent ID, not its display name."};
  if(!Number.isSafeInteger(version)||version<1||version>2147483647)return {error:"Enter a positive whole-number agent version from Sarvam. Only committed versions may be used for calling."};
  // The database permits display names on inactive drafts, but active profiles
  // must use a genuine connection identifier. Never treat a name as verified.
  const idPattern=/^[A-Za-z0-9_.-]{3,200}$/;
  const draftNamePattern=/^[A-Za-z0-9][A-Za-z0-9 _().-]{2,199}$/;
  if(active&&!idPattern.test(connectionId))
   return {error:"To activate this profile, enter the actual Sarvam telephony Connection ID. 'Sarvam Managed (Vobiz)' is only its display name."};
  if(!active&&!draftNamePattern.test(connectionId))
   return {error:"Enter a valid telephony connection name or ID. Inactive drafts can use 'Sarvam Managed (Vobiz)'."};
  if(!/^\+[1-9]\d{7,14}$/.test(callerNumber))return {error:"Enter a valid connected caller number. Indian 10-digit numbers are automatically formatted as +91XXXXXXXXXX."};
  // Draft defaults are manually configured; catalogue membership is not proof of live readiness.
  // The launch/test routes retain their independent authorization and provider checks.
  const {error}=await supabase.from("global_voice_defaults").upsert({
   singleton:true,agent_id:agentId,app_version:version,
   connection_id:connectionId,caller_number:callerNumber,active,updated_by:user.id,
   updated_at:new Date().toISOString()
  },{onConflict:"singleton"});
  if(error)return {error:"Unable to save global voice defaults. Verify RLS and the reviewed database migration."};
  revalidatePath("/settings/voice-profiles");revalidatePath("/campaigns","layout");
  return {ok:true};
 }catch{return {error:"IT Super User authorization failed."};}
}
