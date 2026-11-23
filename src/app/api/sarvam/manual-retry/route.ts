import {NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";
export const runtime="nodejs";
// Review-only manual retry request. It never calls or submits to Sarvam.
export async function POST(request:Request){
 try{
  const {supabase,user}=await requireItSuperUser();
  const input=await request.json(),id=String(input.prospectId??"");
  if(!/^[\da-f-]{36}$/i.test(id)||input.confirm!=="REQUEST MANUAL RETRY")
   return NextResponse.json({error:"Valid prospect and explicit retry-review confirmation required."},{status:400});
  const {data:prospect,error}=await supabase.from("campaign_prospects")
   .select("id,campaign_id,dealership_id,queue_state,retry_requested")
   .eq("id",id).maybeSingle();
  if(error||!prospect||!["busy","no_answer","failed"].includes(prospect.queue_state))
   return NextResponse.json({error:"Only confirmed busy, no-answer or failed calls can be reviewed for retry."},{status:409});
  const {data:campaign}=await supabase.from("campaigns").select("status").eq("id",prospect.campaign_id).eq("dealership_id",prospect.dealership_id).maybeSingle();
  const {data:launch}=await supabase.from("voice_campaign_launches").select("sarvam_campaign_id,state")
   .eq("campaign_id",prospect.campaign_id).eq("dealership_id",prospect.dealership_id).maybeSingle();
  if(campaign?.status!=="APPROVED"||!launch?.sarvam_campaign_id||launch.state==="needs_reconciliation")
   return NextResponse.json({error:"A fully approved and reconciled launched campaign is required."},{status:409});
  const {error:insertError}=await supabase.from("campaign_retry_requests").insert({
   prospect_id:id,campaign_id:prospect.campaign_id,dealership_id:prospect.dealership_id,
   requested_by:user.id,state:"pending_review"
  });
  if(insertError)return NextResponse.json({error:"Retry review already requested or could not be recorded."},{status:409});
  return NextResponse.json({ok:true,message:"Retry queued for manual review only. No call has been scheduled."},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Manual retry review could not be authorized."},{status:403});}
}
