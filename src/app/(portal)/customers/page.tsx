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
 const records=customers.map(c=>({...c,source:sourceById.get(c.id)??"Unknown"}));
 return <CustomersDirectory customers={records} count={count} page={page} pageSize={PAGE_SIZE} query={query} status={status} period={period} dealershipId={id} canManage={canPrepare(membership.role)} imports={(imports.data??[]) as ImportRow[]}/>;
}
