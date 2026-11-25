import {notFound} from "next/navigation";
import {requireItSuperUser} from "@/lib/it-access";
import {parseCSV} from "@/lib/sarvam/recipient-validation";
import {sha256} from "@/lib/sarvam/outbound-provider";
import {CampaignReview} from "../../campaign-review";
export default async function OutboundPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[\da-f-]{36}$/i.test(id))notFound();
 const {supabase}=await requireItSuperUser();
 const {data:campaign,error}=await supabase.from("campaigns").select("id,name,status,dealership_id,created_by").eq("id",id).maybeSingle();
 if(error||!campaign)notFound();
 const [configs,batches,launches,dealer]=await Promise.all([
  supabase.from("campaign_draft_configs").select("configuration").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle(),
  supabase.from("campaign_recipient_batches").select("cohort_name,total_records,eligible_records,csv_sha256,object_path").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle(),
  supabase.from("voice_campaign_launches").select("state,sarvam_campaign_id,sarvam_cohort_id,provider_status").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle(),
  supabase.from("dealerships").select("name,email").eq("id",campaign.dealership_id).maybeSingle()
 ]);
 if(configs.error||batches.error||launches.error||dealer.error)throw Error("Unable to load campaign review.");
 let columns:string[]=[],rows:string[][]=[],recordError="";
 if(batches.data){
  try{
   const {data:file,error}=await supabase.storage.from("frontvox-campaign-cohorts").download(batches.data.object_path);
   if(error||!file)throw Error();
   const csv=await file.text();if(sha256(csv)!==batches.data.csv_sha256)throw Error();
   const parsed=parseCSV(csv);columns=parsed[0]??[];rows=parsed.slice(1);
   if(rows.length!==batches.data.eligible_records||rows.some(r=>r.length!==columns.length))throw Error();
  }catch{columns=[];rows=[];recordError="Unable to verify the locked recipient file. Launch is unavailable.";}
 }
 const config=configs.data?.configuration as {agent_label?:string;agent_version_label?:string;telephony_label?:string;outgoing_number_label?:string;schedule?:{start?:string;end?:string;days?:string[];from?:string;to?:string;cps?:number;max_retries?:number;retry_interval_minutes?:number}}|null;
 return <main className="review-reference-page">
 <CampaignReview campaign={{id:campaign.id,name:campaign.name,status:campaign.status,dealershipId:campaign.dealership_id}} dealership={dealer.data?.name??"Assigned dealership"} email={dealer.data?.email??""} config={config} batch={batches.data?{eligible_records:batches.data.eligible_records,total_records:batches.data.total_records}:null} launch={launches.data} columns={columns} rows={rows} recordError={recordError} liveEnabled={process.env.ENABLE_LIVE_CALLS==="true"}/></main>;
}
