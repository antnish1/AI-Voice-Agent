import {NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";
import {sarvamGet,sarvamPath} from "@/lib/sarvam/outbound-provider";
export const runtime="nodejs";
export async function GET(request:Request){
 try{
  const {supabase}=await requireItSuperUser();
  const id=new URL(request.url).searchParams.get("campaignId")??"";
  if(!/^[\da-f-]{36}$/i.test(id))return NextResponse.json({error:"Invalid campaign ID"},{status:400});
  const [{data:launch,error:a},{data:batch,error:b}]=await Promise.all([
   supabase.from("voice_campaign_launches").select("campaign_id,dealership_id,sarvam_campaign_id,sarvam_cohort_id,state").eq("campaign_id",id).maybeSingle(),
   supabase.from("campaign_recipient_batches").select("dealership_id,eligible_records").eq("campaign_id",id).maybeSingle()
  ]);
  if(a||b||!launch||!batch||launch.dealership_id!==batch.dealership_id||!launch.sarvam_campaign_id||!launch.sarvam_cohort_id)
   return NextResponse.json({error:"Linked Sarvam campaign and cohort are not available for verification."},{status:404});
  const status=await sarvamGet(sarvamPath("campaigns","/"+encodeURIComponent(launch.sarvam_campaign_id)+"/cohorts/"+encodeURIComponent(launch.sarvam_cohort_id)));
  const providerStatus=String(status.status??"unknown"),result=status.result as {valid_records?:number;rejected_records?:number}|null;
  const valid=typeof result?.valid_records==="number"?result.valid_records:null;
  const rejected=typeof result?.rejected_records==="number"?result.rejected_records:null;
  let state=launch.state;
  if(providerStatus==="failed"||(providerStatus==="completed"&&(valid!==batch.eligible_records||rejected!==0))){
   state="needs_reconciliation";
  }else if(providerStatus==="completed"&&valid===batch.eligible_records&&rejected===0){
   state="cohort_completed";
  }
  if(state!==launch.state){
   const {error}=await supabase.from("voice_campaign_launches").update({state,updated_at:new Date().toISOString()}).eq("campaign_id",id);
   if(error)return NextResponse.json({error:"Provider status verified but could not be saved. Recheck manually."},{status:502});
  }
  return NextResponse.json({state,providerStatus,expected:batch.eligible_records,valid,rejected,
   message:state==="cohort_completed"?"Sarvam confirmed every eligible recipient was processed without rejection.":"Confirm provider counts and correct issues before dialing."},
   {headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Could not verify Sarvam cohort status. Check provider logs and permissions."},{status:502});}
}
