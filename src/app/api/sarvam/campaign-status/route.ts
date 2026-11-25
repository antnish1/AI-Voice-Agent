import {NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";
import {callingEnabled,sarvamGet,sarvamPut,sarvamPath} from "@/lib/sarvam/outbound-provider";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const {supabase,user}=await requireItSuperUser();
  const input=await request.json();
  const campaignId=String(input.campaignId??""),action=String(input.action??"");
  if(!/^[a-f0-9-]{36}$/i.test(campaignId)||!["pause","resume"].includes(action))
   return NextResponse.json({error:"Invalid campaign action."},{status:400});
  if(input.confirm!==(action==="pause"?"PAUSE CAMPAIGN":"RESUME CAMPAIGN"))
   return NextResponse.json({error:"Explicit lifecycle confirmation required."},{status:400});
  if(action==="resume"&&!callingEnabled("campaign"))
   return NextResponse.json({error:"Campaign resuming is disabled by the production launch switch."},{status:403});
  const [{data:campaign,error:a},{data:launch,error:b},{data:unknown,error:c}]=await Promise.all([
   supabase.from("campaigns").select("id,dealership_id,status").eq("id",campaignId).maybeSingle(),
   supabase.from("voice_campaign_launches").select("campaign_id,dealership_id,state,sarvam_campaign_id").eq("campaign_id",campaignId).maybeSingle(),
   supabase.from("voice_campaign_control_events").select("id").eq("campaign_id",campaignId).eq("status","unknown").limit(1)
  ]);
  if(a||b||c||!campaign||!launch||!launch.sarvam_campaign_id||campaign.dealership_id!==launch.dealership_id||campaign.status!=="APPROVED")
   return NextResponse.json({error:"Only an authorized launched campaign can be controlled."},{status:403});
  if(action==="resume"&&(unknown?.length||launch.state!=="cohort_completed"))
   return NextResponse.json({error:"Resolve unknown operations and verify the full accepted cohort before resuming."},{status:409});
  const path=sarvamPath("campaigns","/"+encodeURIComponent(launch.sarvam_campaign_id));
  const provider=await sarvamGet(path);
  const status=String(provider.status??"").toLowerCase();
  if(action==="pause"&&status==="paused"||action==="resume"&&status==="active"){const {error}=await supabase.from("voice_campaign_launches").update({provider_status:status}).eq("campaign_id",campaignId);if(error)throw Error("Status could not be saved");return NextResponse.json({ok:true,providerStatus:status,message:"Sarvam campaign is already in the requested state."});}
  if(action==="pause"&&!["active","scheduled"].includes(status)||action==="resume"&&status!=="paused")
   return NextResponse.json({error:"Sarvam reports "+(status||"an unknown state")+". The requested transition is not available."},{status:409});
  const {data:reservation,error:reservationError}=await supabase.from("voice_campaign_control_events").insert({
   campaign_id:campaignId,dealership_id:campaign.dealership_id,action,status:"pending",initiated_by:user.id,provider_status:status
  }).select("id").single();
  if(reservationError||!reservation)return NextResponse.json({error:"A lifecycle action is already pending; check its provider outcome before retrying."},{status:409});
  try{
   const result=await sarvamPut(path+"/status",{action});
   const state=String(result.status??"").toLowerCase();
   const expected=action==="pause"?"paused":"active";
   if(state&&state!==expected)throw Error("Provider returned an unexpected campaign state.");
   const {error:logError}=await supabase.from("voice_campaign_control_events").update({
    status:"confirmed",provider_status:expected,updated_at:new Date().toISOString()
   }).eq("id",reservation.id).eq("status","pending");
   if(logError)throw Error("Provider accepted action but audit update failed.");
   const {error:syncError}=await supabase.from("voice_campaign_launches").update({provider_status:expected}).eq("campaign_id",campaignId);if(syncError)throw Error("Could not save confirmed status");
   return NextResponse.json({ok:true,providerStatus:state||"accepted",message:"Sarvam accepted the campaign "+action+" request. Check the provider status to confirm no further calls are being queued."});
  }catch{
   await supabase.from("voice_campaign_control_events").update({status:"unknown",updated_at:new Date().toISOString()}).eq("id",reservation.id);
   return NextResponse.json({error:"Provider outcome uncertain. Verify campaign status in Sarvam before another action."},{status:502});
  }
 }catch{return NextResponse.json({error:"Could not authorize campaign lifecycle action."},{status:403});}
}

export async function GET(request:Request){try{const {supabase}=await requireItSuperUser();const id=new URL(request.url).searchParams.get("campaignId")??"";if(!/^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({error:"Invalid campaign ID"},{status:400});const {data:l,error}=await supabase.from("voice_campaign_launches").select("sarvam_campaign_id").eq("campaign_id",id).maybeSingle();if(error||!l?.sarvam_campaign_id)return NextResponse.json({error:"No provider campaign"},{status:404});const result=await sarvamGet(sarvamPath("campaigns","/"+encodeURIComponent(l.sarvam_campaign_id)));const status=String(result.status??"").toLowerCase();if(!["scheduled","active","paused","completed","cancelled","canceled","in_progress"].includes(status))return NextResponse.json({error:"Unrecognized provider status"},{status:409});const {error:save}=await supabase.from("voice_campaign_launches").update({provider_status:status}).eq("campaign_id",id);if(save)throw Error();return NextResponse.json({ok:true,providerStatus:status});}catch{return NextResponse.json({error:"Unable to verify provider status"},{status:502});}}
