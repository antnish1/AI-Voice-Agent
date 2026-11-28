import {reconcileMissingCampaignCustomers} from "@/lib/sarvam/customer-reconciliation";
import {requireMembership,canPrepare} from "@/lib/auth";
import type {CustomerRow,ImportRow} from "./customers-directory";
import {isItSuperUser} from "@/lib/it-access";
const PAGE_SIZE=12;
export async function loadCustomers(params:{q?:string;page?:string;campaign?:string;dealer?:string},exportAll=false){
 const {supabase,membership,user}=await requireMembership();if(!membership)return null;
 const query=String(params.q??"").trim().replace(/[%,()"'\\]/g,"").slice(0,80);
 const status="all";
 const period="all";
 const requested=Math.max(1,Math.min(100000,Number.parseInt(String(params.page??"1"),10)||1));
 const id=membership.dealership_id;
 const it=isItSuperUser(user.id,user.email??"",membership.role);
 const scope=(q:any)=>it&&dealerFilter==="all"?q:q.eq("dealership_id",dealerFilter==="all"?id:dealerFilter);
 const {data:dealerRows,error:dealerError}=await supabase.from("dealerships").select("id,name").order("name").limit(500);
 if(dealerError)throw Error("Unable to load dealerships.");
 const dealerships=(dealerRows??[]).filter(d=>it||d.id===id);
 const dealerFilter=it&&dealerships.some(d=>d.id===params.dealer)?params.dealer!:"all";
 const dealerNames=new Map(dealerships.map(d=>[d.id,d.name]));
 if(!exportAll&&canPrepare(membership.role)){for(const d of dealerships.filter(d=>dealerFilter==="all"||d.id===dealerFilter))await reconcileMissingCampaignCustomers(supabase,d.id);}
 const readAll=async <T,>(make:()=>any):Promise<T[]>=>{const result:T[]=[];for(let offset=0;;offset+=500){const {data,error}=await make().range(offset,offset+499);if(error)throw Error("Unable to load customer records.");result.push(...(data??[]));if((data??[]).length<500)return result;}};
 const campaigns=await readAll<{id:string;name:string;dealership_id:string}>(()=>scope(supabase.from("campaigns").select("id,name,dealership_id")).order("id"));
 const campaignFilter=campaigns.some(c=>c.id===params.campaign)?params.campaign!:"all";
 const campaignNames=new Map(campaigns.map(c=>[c.id,c.name]));
 const links=await readAll<{campaign_id:string;sarvam_campaign_id:string;dealership_id:string}>(()=>scope(supabase.from("voice_campaign_links").select("campaign_id,sarvam_campaign_id,dealership_id")).order("campaign_id").order("sarvam_campaign_id"));
 const linkNames=new Map(links.map(l=>[l.dealership_id+"|"+l.sarvam_campaign_id,campaignNames.get(l.campaign_id)??l.sarvam_campaign_id]));
 const makeQuery=()=>{let q=scope(supabase.from("customers").select("id,name,mobile,consent_status,do_not_call,created_at,dealership_id"));if(query)q=q.or(`name.ilike.%${query}%,mobile.ilike.%${query}%`);return q.order("created_at",{ascending:false}).order("id");};
 const allCustomers=await readAll<CustomerRow&{dealership_id:string}>(makeQuery);
 const campaignCustomers=new Set<string>();
 if(campaignFilter!=="all"){
  const target=campaigns.find(c=>c.id===campaignFilter)!;
  const external=new Set(links.filter(l=>l.campaign_id===target.id&&l.dealership_id===target.dealership_id).map(l=>l.sarvam_campaign_id));
  const callRows=await readAll<{customer_id:string|null;sarvam_campaign_id:string|null}>(()=>supabase.from("voice_call_records").select("customer_id,sarvam_campaign_id").eq("dealership_id",target.dealership_id).not("customer_id","is",null).order("id"));
  for(const v of callRows)if(v.customer_id&&v.sarvam_campaign_id&&external.has(v.sarvam_campaign_id))campaignCustomers.add(v.customer_id);
  const batches=await readAll<{id:string}>(()=>supabase.from("customer_import_batches").select("id").eq("dealership_id",target.dealership_id).eq("filename","campaign-"+target.id+".csv").order("id"));
  for(const b of batches){const rows=await readAll<{customer_id:string|null}>(()=>supabase.from("customer_import_rows").select("customer_id").eq("dealership_id",target.dealership_id).eq("batch_id",b.id).order("id"));for(const v of rows)if(v.customer_id)campaignCustomers.add(v.customer_id);}
 }
 const matched=campaignFilter==="all"?allCustomers:allCustomers.filter(c=>campaignCustomers.has(c.id));
 const count=matched.length,page=Math.min(requested,Math.max(1,Math.ceil(count/PAGE_SIZE)));
 const customers=exportAll?matched:matched.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 const customerIds=customers.map(c=>c.id);
 const imports=await scope(supabase.from("customer_import_batches").select("id,filename,imported_rows,matched_rows,rejected_rows,created_at")).order("created_at",{ascending:false}).limit(5);
 if(imports.error)throw Error("Unable to load import history.");
 const sourceById=new Map<string,string>();
 const importedFields=new Map<string,Record<string,unknown>>();
 const detailCalls: {data:any[]}={data:[]},detailCallbacks:{data:any[]}={data:[]};
 for(let offset=0;offset<customerIds.length;offset+=100){
  const chunk=customerIds.slice(offset,offset+100);
  const history=await readAll<any>(()=>scope(supabase.from("customer_import_rows").select("customer_id,source_data,customer_import_batches(filename)")).in("customer_id",chunk).order("id"));
  for(const row of history){if(!row.customer_id||sourceById.has(row.customer_id))continue;const source=row.source_data;if(source&&typeof source==="object")importedFields.set(row.customer_id,source);sourceById.set(row.customer_id,source?.entry_type==="Manual"?"Manual":source?.entry_type==="Campaign"?"Campaign":"CSV Upload");}
  detailCalls.data.push(...await readAll<any>(()=>scope(supabase.from("voice_call_records").select("customer_id,started_at,status,output_variables,duration_seconds,sarvam_campaign_id,dealership_id")).in("customer_id",chunk).order("started_at",{ascending:false,nullsFirst:false}).order("id")));
  detailCallbacks.data.push(...await readAll<any>(()=>scope(supabase.from("crm_callbacks").select("customer_id,requested_at,status,notes")).in("customer_id",chunk).in("status",["pending","requested","scheduled"]).order("requested_at",{ascending:true,nullsFirst:false}).order("id")));
 }
 const calls=await readAll<{customer_id:string|null;started_at:string|null;status:string;sarvam_campaign_id:string|null;dealership_id:string}>(()=>scope(supabase.from("voice_call_records").select("customer_id,started_at,status,sarvam_campaign_id,dealership_id")).not("customer_id","is",null).order("id"));
 const latest=new Map<string,typeof calls[number]>();for(const call of calls){if(!call.customer_id)continue;const old=latest.get(call.customer_id);if(!old||(call.started_at??"")>(old.started_at??""))latest.set(call.customer_id,call);}
 const active=await scope(supabase.from("customers").select("id",{head:true,count:"exact"})).eq("consent_status","verified").eq("do_not_call",false);
 const total=await scope(supabase.from("customers").select("id",{head:true,count:"exact"}));
 const callbacks=await readAll<{customer_id:string|null}>(()=>scope(supabase.from("crm_callbacks").select("customer_id")).in("status",["pending","requested","scheduled"]).not("customer_id","is",null).order("id"));
 const metrics={total:total.error?null:total.count??0,active:active.error?null:active.count??0,contacted:new Set(calls.filter(c=>c.status==="answered").map(c=>c.customer_id)).size,followup:new Set(callbacks.map(c=>c.customer_id)).size};
 const scalar=(v:unknown)=>typeof v==="string"?v.trim().slice(0,2000):typeof v==="number"||typeof v==="boolean"?String(v):"";
 const records=customers.map(c=>{
  const history=(detailCalls.data??[]).filter(x=>x.customer_id===c.id);
  const callback=(detailCallbacks.data??[]).find(x=>x.customer_id===c.id);
  const imported=importedFields.get(c.id)??{};
  const pick=(...keys:string[])=>{for(const row of history){const fields=(row.output_variables??{}) as Record<string,unknown>;for(const key of keys){const value=scalar(fields[key]);if(value)return value;}}for(const key of keys){const value=scalar(imported[key]);if(value)return value;}return null;};
  const last=history[0],lastFields=(last?.output_variables??{}) as Record<string,unknown>;
  const ownCalls=calls.filter(x=>x.customer_id===c.id);
  return {...c,source:sourceById.get(c.id)??(latest.has(c.id)?"Sarvam":"Unknown"),lastContacted:ownCalls.filter(x=>x.status==="answered").map(x=>x.started_at??"").sort().at(-1)??null,campaign:campaignFilter!=="all"?campaignNames.get(campaignFilter)??null:linkNames.get(c.dealership_id+"|"+(latest.get(c.id)?.sarvam_campaign_id??""))??latest.get(c.id)?.sarvam_campaign_id??null,
   dealership:dealerNames.get(c.dealership_id)??null,vehicleModel:pick("vehicle_model","Model","Vehicle Model"),registration:pick("registration_number","Reg. Number","Registration Number"),lastService:pick("last_service_date","Last ServiceDate"),serviceDue:pick("next_service_due_date","Service DueDate"),serviceType:pick("service_type","Service Type"),mileage:pick("last_reported_mileage","Last Reported Mileage"),warranty:pick("warranty_active"),address:pick("customer_address"),remarks:scalar(lastFields.customer_remarks)||scalar(lastFields.call_summary)||null,lastOutcome:scalar(lastFields.call_disposition)||last?.status||null,attempts:ownCalls.length,followup:callback?.requested_at??null,followupStatus:callback?.status??null,
   callHistory:history.slice(0,10).map(x=>({date:x.started_at,status:x.status,duration:x.duration_seconds,outcome:scalar((x.output_variables as Record<string,unknown>|null)?.call_disposition)||null}))};
 });
 return {metrics,customers:records,count,page,pageSize:PAGE_SIZE,query,status,period,dealershipId:id,canManage:canPrepare(membership.role),imports:(imports.data??[]) as ImportRow[],campaigns,dealerships,campaignFilter,dealerFilter,it};
}
