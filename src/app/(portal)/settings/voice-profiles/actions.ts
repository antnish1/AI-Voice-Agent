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
  const callerNumber=String(form.get("callerNumber")??"").trim();
  const active=form.get("active")==="yes";
  if(!/^[\da-f-]{36}$/i.test(dealershipId)||!Number.isInteger(version)||version<1||
   !/^[A-Za-z0-9_.-]{3,200}$/.test(agentId)||!/^[A-Za-z0-9_.-]{3,200}$/.test(connectionId)||
   !/^\+[1-9]\d{7,14}$/.test(callerNumber))return {error:"Enter verified Sarvam IDs, committed version and E.164 caller number."};
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
