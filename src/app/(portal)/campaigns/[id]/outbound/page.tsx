import Link from "next/link";
import {notFound} from "next/navigation";
import {requireItSuperUser} from "@/lib/it-access";
import {OutboundConsole} from "../../outbound-console";
export default async function OutboundPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[\da-f-]{36}$/i.test(id))notFound();
 const {supabase}=await requireItSuperUser();
 const {data:campaign,error}=await supabase.from("campaigns").select("id,name,status,dealership_id").eq("id",id).maybeSingle();
 if(error||!campaign)notFound();
 const [configs,batches,launches]=await Promise.all([
  supabase.from("campaign_draft_configs").select("configuration").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle(),
  supabase.from("campaign_recipient_batches").select("cohort_name,total_records,eligible_records,csv_sha256").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle(),
  supabase.from("voice_campaign_launches").select("state,sarvam_campaign_id,sarvam_cohort_id").eq("campaign_id",id).eq("dealership_id",campaign.dealership_id).maybeSingle()
 ]);
 if(configs.error||batches.error||launches.error)throw Error("Outbound preparation tables have not been migrated.");
 const config=configs.data?.configuration as {agent_label?:string;agent_version_label?:string;telephony_label?:string;outgoing_number_label?:string;schedule?:{start?:string;end?:string}}|null;
 return <main>
  <div className="page-head"><div><p className="eyebrow">FRONTVOX AI · OUTBOUND OPERATIONS</p><h1>{campaign.name}</h1><p>Prepare recipients, test on a verified number, and launch only after approval.</p></div><Link className="btn-outline small" href="/campaigns">Back to Campaigns</Link></div>
  <div className="helper-banner">Campaign status: <strong>{campaign.status.replaceAll("_"," ")}</strong>. Sarvam calling is subject to independent server switches and user confirmation.</div>
  <OutboundConsole campaign={{id:campaign.id,name:campaign.name,status:campaign.status}} config={config} batch={batches.data} launch={launches.data}
   testEnabled={process.env.ENABLE_TEST_CALLS==="true"} liveEnabled={process.env.ENABLE_LIVE_CALLS==="true"}/>
 </main>;
}
