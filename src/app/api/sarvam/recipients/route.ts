import {createClient} from "@supabase/supabase-js";
import {NextResponse} from "next/server";
import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
import {enrichServiceRecipients} from "@/lib/sarvam/service-recipients";
import {prepareRecipients,parseCSV,normalizePhone} from "@/lib/sarvam/recipient-validation";
import {sha256} from "@/lib/sarvam/outbound-provider";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const {supabase,user,membership,memberships}=await requireMembership();
  if(!membership)return NextResponse.json({error:"Assigned dealership access required."},{status:403});
  const it=isItSuperUser(user.id,user.email??"",memberships.some(m=>m.role==="super_admin")?"super_admin":"");
  const form=await request.formData();
  const campaignId=String(form.get("campaignId")??"");
  if(!/^[0-9a-f-]{36}$/i.test(campaignId))return NextResponse.json({error:"Invalid campaign ID"},{status:400});
  const {data:campaign,error:campaignError}=await supabase.from("campaigns").select("id,dealership_id,status,created_by").eq("id",campaignId).eq("dealership_id",membership.dealership_id).maybeSingle();
  if(campaignError||!campaign||campaign.status!=="DRAFT"||(!it&&campaign.created_by!==user.id))return NextResponse.json({error:"You may upload recipients only to your own dealership drafts."},{status:403});
  const file=form.get("file");
  if(!(file instanceof File)||file.size>5*1024*1024||!file.size||!/\.csv$/i.test(file.name))
   return NextResponse.json({error:"Upload one CSV file (1 byte–5 MB)."},{status:400});
  const cohortName=String(form.get("cohortName")??"").trim();
  if(!/^[\w\- ]{1,50}$/.test(cohortName))return NextResponse.json({error:"Cohort name must be 1–50 letters, numbers, spaces or hyphens."},{status:400});
  let mapping:Record<string,string>;
  try{const v=JSON.parse(String(form.get("variableMapping")||"{}"));if(!v||typeof v!=="object"||Array.isArray(v))throw Error();mapping=v;}catch{return NextResponse.json({error:"Invalid agent variable mapping JSON."},{status:400});}
  const options={phoneColumn:String(form.get("phoneColumn")??""),consentColumn:String(form.get("consentColumn")??""),dncColumn:String(form.get("dncColumn")??""),variableMapping:mapping};
  if(form.get("certifyConsent")!=="yes")return NextResponse.json({error:"Confirm customer consent and DNC screening before staging."},{status:400});
  let csv=await file.text();
  if(form.get("serviceTemplate")==="yes"){
   const {data:dealer,error:dealerError}=await supabase.from("dealerships").select("name").eq("id",campaign.dealership_id).single();
   if(dealerError||!dealer)throw Error("Recipient dealership configuration unavailable.");
   const blocked=new Set<string>();
   for(let offset=0;;offset+=500){
    const {data:customers,error:customerError}=await supabase.from("customers").select("mobile,consent_status,do_not_call").eq("dealership_id",campaign.dealership_id).order("id").range(offset,offset+499);
    if(customerError||!customers)throw Error("Recipient DNC screening unavailable.");
    for(const customer of customers){
    const number=normalizePhone(customer.mobile??"");
    if(number&&(customer.do_not_call||!["yes","true","1","opted_in","consented","granted"].includes(String(customer.consent_status??"").toLowerCase())))blocked.add(number);
    }
    if(customers.length<500)break;
   }
   const result=enrichServiceRecipients(parseCSV(csv),dealer.name,blocked);
   csv=result.csv;mapping=result.mapping;
   options.phoneColumn="phone_number";options.consentColumn="consent";options.dncColumn="do_not_call";options.variableMapping=mapping;
  }
  const prepared=prepareRecipients(csv,options);
  const digest=sha256(prepared.csv);
  const objectPath=campaign.dealership_id+"/"+campaign.id+"/"+digest+".csv";
  const {error:storeError}=await supabase.storage.from("frontvox-campaign-cohorts")
   .upload(objectPath,new Blob([prepared.csv],{type:"text/csv"}),{contentType:"text/csv",upsert:false});
  if(storeError&&!/already exists|duplicate/i.test(storeError.message))
   return NextResponse.json({error:"Private recipient storage is not configured or upload failed."},{status:503});
  const {error:dbError}=await supabase.from("campaign_recipient_batches").upsert({
   campaign_id:campaign.id,dealership_id:campaign.dealership_id,object_path:objectPath,csv_sha256:digest,
   phone_column:options.phoneColumn,consent_column:options.consentColumn,dnc_column:options.dncColumn,
   variable_mapping:mapping,cohort_name:cohortName,total_records:prepared.total,
   eligible_records:prepared.eligible,uploaded_by:user.id
  },{onConflict:"campaign_id"});
  if(dbError)return NextResponse.json({error:"Could not lock the staged cohort. Check the campaign and migration."},{status:409});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({error:"Customer synchronization is not configured."},{status:503});
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const customerRows=prepared.users.map(u=>({mobile:u.user_phone_number,name:u.app_variables.customer_name??"",source_fields:{entry_type:"Campaign",...Object.fromEntries(Object.entries(u.app_variables).filter(([k])=>["customer_name","vehicle_model","vehicle_registration_number","registration_number","service_type","last_service_date","next_service_due_date","last_reported_mileage","customer_address","warranty_active"].includes(k)).map(([k,v])=>[k,v.slice(0,200)]))}}));
  const {error:syncError}=await admin.rpc("sync_verified_campaign_customers",{p_campaign:campaign.id,p_dealership:campaign.dealership_id,p_rows:customerRows});
  if(syncError)return NextResponse.json({error:"Customer synchronization failed. The campaign remains a draft; retry the upload before launching."},{status:503});
  const {data:finalized,error:finalizeError}=await supabase.from("campaigns").update({status:"PENDING"}).eq("id",campaignId).eq("dealership_id",campaign.dealership_id).eq("status","DRAFT").select("id");
  if(finalizeError||!finalized?.length)return NextResponse.json({error:"Recipient file staged but campaign could not be marked pending."},{status:409});
  return NextResponse.json({ok:true,eligible:prepared.eligible,excluded:prepared.excluded,sha256:digest,staged:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error&&/recipient|CSV|column|Row|mapping|consent|DNC|phone/i.test(e.message)?e.message:"Recipient staging failed."},{status:400});}
}
