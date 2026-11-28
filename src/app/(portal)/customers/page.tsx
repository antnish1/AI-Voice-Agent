import {reconcileMissingCampaignCustomers} from "@/lib/sarvam/customer-reconciliation";
import {requireMembership,canPrepare} from "@/lib/auth";
import {CustomersDirectory,type CustomerRow,type ImportRow} from "./customers-directory";
const PAGE_SIZE=12;
export default async function Customers({searchParams}:{searchParams:Promise<{q?:string;page?:string;status?:string;period?:string}>}){
 const {supabase,membership}=await requireMembership();if(!membership)return null;
 const params=await searchParams;
 const query=String(params.q??"").trim().replace(/[%,()"'\\]/g,"").slice(0,80);
 const status="all";
 const period="all";
 const requested=Math.max(1,Math.min(100000,Number.parseInt(String(params.page??"1"),10)||1));
 const id=membership.dealership_id;
 if(canPrepare(membership.role))await reconcileMissingCampaignCustomers(supabase,id);
 const makeQuery=()=>{let q=supabase.from("customers").select("id,name,mobile,consent_status,do_not_call,created_at",{count:"exact"}).eq("dealership_id",id);
  if(query)q=q.or(`name.ilike.%${query}%,mobile.ilike.%${query}%`);
  return q;
 };
 const [countResult,imports]=await Promise.all([
  makeQuery().range(0,0),
  supabase.from("customer_import_batches").select("id,filename,imported_rows,matched_rows,rejected_rows,created_at").eq("dealership_id",id).order("created_at",{ascending:false}).limit(5)
 ]);
 if(countResult.error||imports.error)throw new Error("Unable to load dealership customer records.");
 const count=countResult.count??0;
 const page=Math.min(requested,Math.max(1,Math.ceil(count/PAGE_SIZE)));
 const {data,error}=await makeQuery().order("created_at",{ascending:false}).range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1);
 if(error)throw new Error("Unable to load customer directory.");
 const customers=(data??[]) as CustomerRow[];
 const customerIds=customers.map(c=>c.id);
 const sourceById=new Map<string,string>();
 const importedFields=new Map<string,Record<string,unknown>>();
 if(customerIds.length){
  const {data:history}=await supabase.from("customer_import_rows").select("customer_id,source_data,customer_import_batches(filename)").eq("dealership_id",id).in("customer_id",customerIds).limit(250);
  for(const row of history??[]){
   if(!row.customer_id||sourceById.has(row.customer_id))continue;
   const batch=row.customer_import_batches as unknown as {filename:string}|null;
   const source=row.source_data as {entry_type?:string}|null;
   if(source&&typeof source==="object")importedFields.set(row.customer_id,source);
   sourceById.set(row.customer_id,source?.entry_type==="Manual"||batch?.filename==="manual-entry.csv"?"Manual":"CSV Upload");
  }
 }
 const calls:{customer_id:string|null;started_at:string|null;status:string;sarvam_campaign_id:string|null}[]=[];
 for(let offset=0;;offset+=500){
  const {data,error}=await supabase.from("voice_call_records").select("customer_id,started_at,status,sarvam_campaign_id").eq("dealership_id",id).not("customer_id","is",null).order("id").range(offset,offset+499);
  if(error)throw Error("Unable to load customer call history.");
  calls.push(...(data??[]));if((data??[]).length<500)break;
 }
 const latest=new Map<string,typeof calls[number]>();
 for(const call of calls){if(!call.customer_id)continue;const old=latest.get(call.customer_id);if(!old||(call.started_at??"")>(old.started_at??""))latest.set(call.customer_id,call);}
 const [active,callbacks,total]=await Promise.all([
  supabase.from("customers").select("id",{head:true,count:"exact"}).eq("dealership_id",id).eq("consent_status","verified").eq("do_not_call",false),
  supabase.from("crm_callbacks").select("customer_id").eq("dealership_id",id).in("status",["pending","requested","scheduled"]).not("customer_id","is",null),
  supabase.from("customers").select("id",{head:true,count:"exact"}).eq("dealership_id",id)
 ]);
 const metrics={total:total.error?null:total.count??0,active:active.error?null:active.count??0,contacted:new Set(calls.filter(c=>c.status==="answered").map(c=>c.customer_id)).size,followup:callbacks.error?null:new Set((callbacks.data??[]).map(c=>c.customer_id)).size};
 const [detailCalls,detailCallbacks,dealer]=await Promise.all([
  customerIds.length?supabase.from("voice_call_records").select("customer_id,started_at,status,output_variables,duration_seconds").eq("dealership_id",id).in("customer_id",customerIds).order("started_at",{ascending:false,nullsFirst:false}).limit(1000):Promise.resolve({data:[],error:null}),
  customerIds.length?supabase.from("crm_callbacks").select("customer_id,requested_at,status,notes").eq("dealership_id",id).in("customer_id",customerIds).in("status",["pending","requested","scheduled"]).order("requested_at",{ascending:true,nullsFirst:false}).limit(250):Promise.resolve({data:[],error:null}),
  supabase.from("dealerships").select("name").eq("id",id).maybeSingle()
 ]);
 if(detailCalls.error||detailCallbacks.error||dealer.error)throw Error("Unable to load customer profile details.");
 const scalar=(v:unknown)=>typeof v==="string"?v.trim().slice(0,2000):typeof v==="number"||typeof v==="boolean"?String(v):"";
 const records=customers.map(c=>{
  const history=(detailCalls.data??[]).filter(x=>x.customer_id===c.id);
  const callback=(detailCallbacks.data??[]).find(x=>x.customer_id===c.id);
  const imported=importedFields.get(c.id)??{};
  const pick=(...keys:string[])=>{for(const row of history){const fields=(row.output_variables??{}) as Record<string,unknown>;for(const key of keys){const value=scalar(fields[key]);if(value)return value;}}for(const key of keys){const value=scalar(imported[key]);if(value)return value;}return null;};
  const last=history[0],lastFields=(last?.output_variables??{}) as Record<string,unknown>;
  const ownCalls=calls.filter(x=>x.customer_id===c.id);
  return {...c,source:sourceById.get(c.id)??(latest.has(c.id)?"Sarvam":"Unknown"),lastContacted:ownCalls.filter(x=>x.status==="answered").map(x=>x.started_at??"").sort().at(-1)??null,campaign:latest.get(c.id)?.sarvam_campaign_id??null,
   dealership:dealer.data?.name??null,vehicleModel:pick("vehicle_model","Model","Vehicle Model"),registration:pick("registration_number","Reg. Number","Registration Number"),lastService:pick("last_service_date","Last ServiceDate"),serviceDue:pick("next_service_due_date","Service DueDate"),serviceType:pick("service_type","Service Type"),mileage:pick("last_reported_mileage","Last Reported Mileage"),warranty:pick("warranty_active"),address:pick("customer_address"),remarks:scalar(lastFields.customer_remarks)||scalar(lastFields.call_summary)||null,lastOutcome:scalar(lastFields.call_disposition)||last?.status||null,attempts:ownCalls.length,followup:callback?.requested_at??null,followupStatus:callback?.status??null,
   callHistory:history.slice(0,10).map(x=>({date:x.started_at,status:x.status,duration:x.duration_seconds,outcome:scalar((x.output_variables as Record<string,unknown>|null)?.call_disposition)||null}))};
 });
 return <CustomersDirectory metrics={metrics} customers={records} count={count} page={page} pageSize={PAGE_SIZE} query={query} status={status} period={period} dealershipId={id} canManage={canPrepare(membership.role)} imports={(imports.data??[]) as ImportRow[]}/>;
}
