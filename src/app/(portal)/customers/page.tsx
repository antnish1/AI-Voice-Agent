import {requireMembership,canPrepare} from "@/lib/auth";
import {CustomersDirectory,type CustomerRow,type ImportRow} from "./customers-directory";
const PAGE_SIZE=12;
export default async function Customers({searchParams}:{searchParams:Promise<{q?:string;page?:string;status?:string;period?:string}>}){
 const {supabase,membership}=await requireMembership();if(!membership)return null;
 const params=await searchParams;
 const query=String(params.q??"").trim().replace(/[%,()"'\\]/g,"").slice(0,80);
 const status=["unverified","verified","declined"].includes(String(params.status))?String(params.status):"all";
 const period=["7","30","90"].includes(String(params.period))?String(params.period):"all";
 const requested=Math.max(1,Math.min(100000,Number.parseInt(String(params.page??"1"),10)||1));
 const id=membership.dealership_id;
 const makeQuery=()=>{let q=supabase.from("customers").select("id,name,mobile,consent_status,do_not_call,created_at",{count:"exact"}).eq("dealership_id",id);
  if(query)q=q.or(`name.ilike.%${query}%,mobile.ilike.%${query}%`);
  if(status!=="all")q=q.eq("consent_status",status);
  if(period!=="all"){const date=new Date();date.setUTCDate(date.getUTCDate()-Number(period));q=q.gte("created_at",date.toISOString());}
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
 if(customerIds.length){
  const {data:history}=await supabase.from("customer_import_rows").select("customer_id,source_data,customer_import_batches(filename)").eq("dealership_id",id).in("customer_id",customerIds).limit(250);
  for(const row of history??[]){
   if(!row.customer_id||sourceById.has(row.customer_id))continue;
   const batch=row.customer_import_batches as unknown as {filename:string}|null;
   const source=row.source_data as {entry_type?:string}|null;
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
 const records=customers.map(c=>({...c,source:sourceById.get(c.id)??(latest.has(c.id)?"Sarvam":"Unknown"),lastContacted:calls.filter(x=>x.customer_id===c.id&&x.status==="answered").map(x=>x.started_at??"").sort().at(-1)??null,campaign:latest.get(c.id)?.sarvam_campaign_id??null}));
 return <CustomersDirectory metrics={metrics} customers={records} count={count} page={page} pageSize={PAGE_SIZE} query={query} status={status} period={period} dealershipId={id} canManage={canPrepare(membership.role)} imports={(imports.data??[]) as ImportRow[]}/>;
}
