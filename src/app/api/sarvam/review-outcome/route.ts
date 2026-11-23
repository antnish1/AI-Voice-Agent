import {NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";
import {normalizePhone} from "@/lib/sarvam/recipient-validation";
export const runtime="nodejs";
// Save a human-reviewed disposition only after a recorded connected call.
export async function POST(request:Request){
 try{
  const {supabase}=await requireItSuperUser();
  const input=await request.json(),id=String(input.prospectId??"");
  const interest=String(input.interest??"");
  const summary=String(input.summary??"").trim();
  const action=String(input.nextAction??"").trim();
  const followUp=String(input.followUpAt??"").trim();
  if(!/^[a-f0-9-]{36}$/i.test(id)||!["interested","not_interested","follow_up","human_assistance"].includes(interest)
   ||summary.length>2000||action.length>500||!summary)
   return NextResponse.json({error:"Choose a verified outcome and include a short factual call summary (max 2,000 characters)."}, {status:400});
  let followUpAt:null|string=null;
  if(followUp){
   const date=new Date(followUp);
   if(!Number.isFinite(date.getTime())||date.getTime()<Date.now()-86400000||date.getTime()>Date.now()+365*86400000)
    return NextResponse.json({error:"Follow-up date is outside the permitted range."},{status:400});
   followUpAt=date.toISOString();
  }
  const {data:prospect,error}=await supabase.from("campaign_prospects").select("campaign_id,dealership_id,mobile")
   .eq("id",id).maybeSingle();
  if(error||!prospect)return NextResponse.json({error:"Recipient not found."},{status:404});
  const {data:launch}=await supabase.from("voice_campaign_launches").select("sarvam_campaign_id")
   .eq("campaign_id",prospect.campaign_id).eq("dealership_id",prospect.dealership_id).maybeSingle();
  if(!launch?.sarvam_campaign_id)return NextResponse.json({error:"No launched campaign with verified calls."},{status:409});
  const {data:calls,error:callError}=await supabase.from("voice_call_records").select("dialed_number,status")
   .eq("dealership_id",prospect.dealership_id).eq("sarvam_campaign_id",launch.sarvam_campaign_id)
   .eq("status","answered").limit(1000);
  if(callError||!calls?.some(c=>normalizePhone(c.dialed_number??"")===prospect.mobile))
   return NextResponse.json({error:"No saved answered call matches this customer. Do not record an unverified conversation."},{status:409});
  const {error:updateError}=await supabase.from("campaign_prospects").update({
   interest,call_summary:summary,next_action:action||null,follow_up_at:followUpAt,updated_at:new Date().toISOString()
  }).eq("id",id).eq("campaign_id",prospect.campaign_id).eq("dealership_id",prospect.dealership_id);
  if(updateError)return NextResponse.json({error:"Could not save the reviewed customer outcome."},{status:503});
  return NextResponse.json({ok:true,message:"Reviewed customer outcome saved."},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Outcome review authorization failed."},{status:403});}
}
