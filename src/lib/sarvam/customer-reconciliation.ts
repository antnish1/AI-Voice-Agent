import "server-only";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
import {prepareRecipients} from "./recipient-validation";
import {sha256} from "./outbound-provider";
export async function reconcileMissingCampaignCustomers(db:SupabaseClient,dealershipId:string){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return;
 const {data:missing,error}=await db.from("voice_call_records").select("sarvam_campaign_id").eq("dealership_id",dealershipId).is("customer_id",null).not("sarvam_campaign_id","is",null).limit(250);
 if(error||!missing?.length)return;
 const ids=[...new Set(missing.map(x=>x.sarvam_campaign_id).filter(Boolean))].slice(0,10);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 for(const externalId of ids){
  try{
   const {data:link}=await admin.from("voice_campaign_links").select("campaign_id").eq("dealership_id",dealershipId).eq("sarvam_campaign_id",externalId).maybeSingle();
   if(!link)continue;
   const {data:b}=await admin.from("campaign_recipient_batches").select("object_path,csv_sha256,phone_column,consent_column,dnc_column,variable_mapping").eq("dealership_id",dealershipId).eq("campaign_id",link.campaign_id).maybeSingle();
   if(!b||!b.object_path.startsWith(dealershipId+"/"+link.campaign_id+"/"))continue;
   const {data:file,error:downloadError}=await admin.storage.from("frontvox-campaign-cohorts").download(b.object_path);
   if(downloadError||!file||file.size>5*1024*1024)continue;
   const csv=await file.text();if(sha256(csv)!==b.csv_sha256)continue;
   const prepared=prepareRecipients(csv,{phoneColumn:b.phone_column,consentColumn:b.consent_column,dncColumn:b.dnc_column,variableMapping:b.variable_mapping});
   const rows=prepared.users.map(u=>({mobile:u.user_phone_number,name:u.app_variables.customer_name??"",source_fields:{entry_type:"Campaign",...Object.fromEntries(Object.entries(u.app_variables).filter(([k])=>["customer_name","vehicle_model","registration_number","service_type","last_service_date","next_service_due_date","last_reported_mileage","customer_address","warranty_active"].includes(k)).map(([k,v])=>[k,v.slice(0,200)]))}}));
   const result=await admin.rpc("sync_verified_campaign_customers",{p_campaign:link.campaign_id,p_dealership:dealershipId,p_rows:rows});
   if(result.error)console.warn("Customer reconciliation failed",{campaignId:link.campaign_id});
  }catch{console.warn("Customer reconciliation unavailable");}
 }
}
