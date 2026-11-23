"use server";
import {revalidatePath} from "next/cache";
import {requireItSuperUser} from "@/lib/it-access";

const providerId=/^[A-Za-z0-9_.-]{3,200}$/;
const connectionText=/^[A-Za-z0-9][A-Za-z0-9 _().-]{2,199}$/;

// Indian local numbers may be entered with or without +91; persist E.164 only.
function normalizeCallerNumber(input:string):string{
 const value=input.trim().replace(/[\s().-]/g,"");
 if(/^[6-9]\d{9}$/.test(value))return "+91"+value;
 if(/^91[6-9]\d{9}$/.test(value))return "+"+value;
 return value;
}

export async function saveVoiceProfile(form:FormData):Promise<{error?:string;ok?:boolean;message?:string}>{
 try{
  const {supabase,user}=await requireItSuperUser();
  const dealershipId=String(form.get("dealershipId")??"").trim();
  const agentId=String(form.get("agentId")??"").trim();
  const version=Number(form.get("version"));
  const connectionId=String(form.get("connectionId")??"").trim();
  const callerNumber=normalizeCallerNumber(String(form.get("callerNumber")??""));
  const requestedActive=form.get("active")==="yes";
  if(!/^[\da-f-]{36}$/i.test(dealershipId))return {error:"Choose a valid dealership."};
  if(!providerId.test(agentId))return {error:"Agent ID must be 3–200 letters, numbers, dots, hyphens or underscores."};
  if(!Number.isInteger(version)||version<1)return {error:"Enter a valid committed agent version (1 or higher)."};
  if(!connectionText.test(connectionId))return {error:"Enter a connection ID or a connection name (letters, numbers, spaces, brackets, dots, underscores or hyphens)."};
  if(!/^\+[1-9]\d{7,14}$/.test(callerNumber))return {error:"Enter a valid caller number, such as 8064272200 or +918064272200."};
  const displayNameOnly=!providerId.test(connectionId);
  if(requestedActive&&displayNameOnly)
   return {error:"The connection name can be saved, but cannot be activated as a verified ID. Uncheck 'Use these verified defaults' until you have the actual Sarvam connection ID."};
  const {data:dealership,error:dealerError}=await supabase.from("dealerships").select("id").eq("id",dealershipId).maybeSingle();
  if(dealerError||!dealership)return {error:"Dealership not found."};
  const {error}=await supabase.from("dealership_voice_profiles").upsert({
   dealership_id:dealershipId,agent_id:agentId,app_version:version,
   connection_id:connectionId,caller_number:callerNumber,
   active:requestedActive&&!displayNameOnly,updated_by:user.id,
   updated_at:new Date().toISOString()
  },{onConflict:"dealership_id"});
  if(error)return {error:"Unable to save dealership profile. Check database permissions and connection format."};
  revalidatePath("/settings/voice-profiles");
  revalidatePath("/campaigns/new");
  return {ok:true,message:displayNameOnly?
   "Profile saved as inactive. Caller number was standardized; add a verified Sarvam connection ID before activating campaign defaults.":
   "Profile saved successfully. Caller number is stored in international format."};
 }catch{return {error:"IT Super User authorization failed."};}
}
