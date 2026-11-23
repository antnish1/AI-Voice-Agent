import {NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";
import {prepareRecipients,parseCSV,normalizePhone} from "@/lib/sarvam/recipient-validation";
import {sha256} from "@/lib/sarvam/outbound-provider";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const {supabase,user}=await requireItSuperUser();
  const form=await request.formData();
  const campaignId=String(form.get("campaignId")??"");
  if(!/^[0-9a-f-]{36}$/i.test(campaignId))return NextResponse.json({error:"Invalid campaign ID"},{status:400});
  const {data:campaign,error:campaignError}=await supabase.from("campaigns").select("id,dealership_id,status").eq("id",campaignId).maybeSingle();
  if(campaignError||!campaign||campaign.status!=="DRAFT")return NextResponse.json({error:"Only an authorized DRAFT campaign can accept recipients."},{status:403});
  const file=form.get("file");
  if(!(file instanceof File)||file.size>5*1024*1024||!file.size||!/\.csv$/i.test(file.name))
   return NextResponse.json({error:"Upload one CSV file (1 byte–5 MB)."},{status:400});
  const cohortName=String(form.get("cohortName")??"").trim();
  if(!/^[\w\- ]{1,50}$/.test(cohortName))return NextResponse.json({error:"Cohort name must be 1–50 letters, numbers, spaces or hyphens."},{status:400});
  let mapping:Record<string,string>;
  try{const v=JSON.parse(String(form.get("variableMapping")||"{}"));if(!v||typeof v!=="object"||Array.isArray(v))throw Error();mapping=v;}catch{return NextResponse.json({error:"Invalid agent variable mapping JSON."},{status:400});}
  const options={phoneColumn:String(form.get("phoneColumn")??""),consentColumn:String(form.get("consentColumn")??""),dncColumn:String(form.get("dncColumn")??""),variableMapping:mapping};
  const prepared=prepareRecipients(await file.text(),options);
  if(form.get("certifyConsent")!=="yes")return NextResponse.json({error:"Confirm customer consent and DNC screening before staging."},{status:400});
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
  // Index only data supplied in the already consent-screened Excel/CSV. No CRM or external RC lookup.
  const parsed=parseCSV(prepared.csv),headers=parsed[0],idx=(key:string)=>headers.indexOf(key);
  const value=(row:string[],key:string)=>idx(key)<0?null:(row[idx(key)]??"").trim().slice(0,300)||null;
  const entries=parsed.slice(1).map((row,i)=>({
   campaign_id:campaign.id,dealership_id:campaign.dealership_id,
   recipient_identifier:prepared.users[i].user_identifier,
   mobile:normalizePhone(row[idx(options.phoneColumn)]??"")!,
   customer_name:value(row,"Customer Name"),
   registration_number:value(row,"Reg. Number"),
   vehicle_model:value(row,"Model"),service_type:value(row,"Service Type"),
   service_due:value(row,"Service DueDate"),last_service:value(row,"Last ServiceDate"),
   customer_source:"excel",readiness:"ready",queue_state:"pending"
  }));
  const {error:prospectError}=await supabase.from("campaign_prospects")
   .upsert(entries,{onConflict:"campaign_id,recipient_identifier",ignoreDuplicates:true});
  if(prospectError)return NextResponse.json({error:"Recipients are staged but customer-index creation failed. Do not submit until repaired."},{status:503});
  return NextResponse.json({ok:true,eligible:prepared.eligible,excluded:prepared.excluded,sha256:digest,staged:true},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error&&/recipient|CSV|column|Row|mapping|consent|DNC|phone/i.test(e.message)?e.message:"Recipient staging failed."},{status:400});}
}
