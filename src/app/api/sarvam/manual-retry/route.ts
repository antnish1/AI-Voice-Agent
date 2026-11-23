import {NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";
import {normalizePhone} from "@/lib/sarvam/recipient-validation";
export const runtime="nodejs";
// Review-only manual retry request. It never calls or submits to Sarvam.
export async function POST(request:Request){
 try{
  const {supabase,user}=await requireItSuperUser();
  const input=await request.json(),id=String(input.prospectId??"");
  if(!/^[\da-f-]{36}$/i.test(id)||input.confirm!=="REQUEST MANUAL RETRY")
   return NextResponse.json({error:"Valid prospect and explicit retry-review confirmation required."},{status:400});
  const {data:prospect,error}=await supabase.from("campaign_prospects")
   .select("id,campaign_id,dealership_id,mobile")
   .eq("id",id).maybeSingle();
  if(error||!prospect)return NextResponse.json({error:"Campaign recipient not found."},{status:404});
  const {data:campaign}=await supabase.from("campaigns").select("status").eq("id",prospect.campaign_id).eq("dealership_id",prospect.dealership_id).maybeSingle();
  const {data:launch}=await supabase.from("voice_campaign_launches").select("sarvam_campaign_id,state")
   .eq("campaign_id",prospect.campaign_id).eq("dealership_id",prospect.dealership_id).maybeSingle();
  if(campaign?.status!=="APPROVED"||!launch?.sarvam_campaign_id||launch.state==="needs_reconciliation")
   return NextResponse.json({error:"A fully approved and reconciled launched campaign is required."},{status:409});
  // Require an actual saved terminal outcome for this phone number, not a user-supplied queue label.
  const {data:recorded,error:callError}=await supabase.from("voice_call_records")
   .select("dialed_number,status,started_at,ended_at").eq("dealership_id",prospect.dealership_id)
   .eq("sarvam_campaign_id",launch.sarvam_campaign_id).order("started_at",{ascending:false}).limit(1000);
  if(callError||!recorded)return NextResponse.json({error:"Cannot verify provider call outcomes."},{status:503});
  const latest=recorded.find(call=>normalizePhone(call.dialed_number??"")===prospect.mobile);
  if(!latest||!["busy","no_answer","failed"].includes(latest.status))
   return NextResponse.json({error:"A verified latest busy, no-answer or failed call is required. No retry was requested."},{status:409});
  const {error:insertError}=await supabase.from("campaign_retry_requests").insert({
   prospect_id:id,campaign_id:prospect.campaign_id,dealership_id:prospect.dealership_id,
   requested_by:user.id,state:"pending_review"
  });
  if(insertError)return NextResponse.json({error:"Retry review already requested or could not be recorded."},{status:409});
  return NextResponse.json({ok:true,message:"Retry queued for manual review only. No call has been scheduled."},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Manual retry review could not be authorized."},{status:403});}
}
