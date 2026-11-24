import {requireMembership} from "@/lib/auth";
import {ReportsDirectory} from "./reports-directory";
export default async function Reports(){
 const {supabase,membership}=await requireMembership();if(!membership)return null;
 const id=membership.dealership_id;
 const [customers,campaigns,imports,pending,listed]=await Promise.all([
  supabase.from("customers").select("id",{count:"exact",head:true}).eq("dealership_id",id),
  supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",id),
  supabase.from("customer_import_batches").select("id",{count:"exact",head:true}).eq("dealership_id",id),
  supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",id).eq("status","PENDING_MANAGER_APPROVAL"),
  supabase.from("campaigns").select("id,name,status,created_at").eq("dealership_id",id).order("created_at",{ascending:false}).limit(250)
 ]);
 if([customers,campaigns,imports,pending,listed].some(x=>x.error))throw new Error("Could not load dealership report records.");
 // Read all authorized records, not just the first PostgREST page.
 const all=async (table:string,columns:string)=>{
  const rows:Record<string,unknown>[]=[];
  for(let offset=0;;offset+=500){
   const {data,error}=await supabase.from(table).select(columns).eq("dealership_id",id).order("id").range(offset,offset+499);
   if(error)throw new Error("Could not load service records.");
   const batch=(data??[]) as unknown as Record<string,unknown>[];
   rows.push(...batch);if(batch.length<500)break;
  }
  return rows;
 };
 const [people,history,prospects,batches]=await Promise.all([
  all("customers","id,name,mobile,created_at"),
  all("customer_import_rows","id,customer_id,batch_id,row_number,source_data,status"),
  all("campaign_prospects","id,customer_name,mobile,vehicle_model,registration_number,service_type,service_due,last_service,follow_up_at,call_summary,created_at,updated_at"),
  all("customer_import_batches","id,created_at")
 ]);
 const str=(x:unknown)=>typeof x==="string"||typeof x==="number"?String(x):"";
 const normalize=(x:string)=>x.toLowerCase().replace(/[^a-z0-9]/g,"");
 const byId=new Map(people.map(x=>[str(x.id),x]));
 const batchDates=new Map(batches.map(x=>[str(x.id),str(x.created_at)]));
 const rows=new Map<string,{values:string[];date:string}>();
 const seenCustomers=new Set<string>();
 const key=(mobile:string,reg:string)=>mobile.replace(/\\D/g,"").replace(/^91(?=\\d{10}$)/,"")+"|"+normalize(reg);
 const put=(values:string[],date:string,unique:string)=>{
  const k=values[1]&&values[3]?key(values[1],values[3]):unique;
  const old=rows.get(k);
  if(!old||date>=old.date)rows.set(k,{values:values.map((v,i)=>v||old?.values[i]||""),date});
 };
 for(const h of history.sort((a,b)=>(batchDates.get(str(a.batch_id))??"").localeCompare(batchDates.get(str(b.batch_id))??"")||Number(a.row_number)-Number(b.row_number))){
  if(h.status==="REJECTED")continue;
  const p=byId.get(str(h.customer_id));if(!p)continue;
  seenCustomers.add(str(p.id));
  const raw=h.source_data&&typeof h.source_data==="object"?h.source_data as Record<string,unknown>:{};
  const fields=Object.fromEntries(Object.entries(raw).map(([k,v])=>[normalize(k),str(v)]));
  const get=(...keys:string[])=>keys.map(k=>fields[normalize(k)]).find(Boolean)??"";
  put([get("Customer Name")||str(p.name),str(p.mobile),get("Model","vehicle_model"),get("Reg. Number","registration_number"),get("Service Type"),get("Service DueDate","service_due"),get("Last ServiceDate","last_service"),get("Original CallDate"),get("Last Reported Mileage"),get("Last Follow up date"),get("Last Follow up Remarks")],batchDates.get(str(h.batch_id))??str(p.created_at),"import:"+str(h.id));
 }
 for(const p of prospects.sort((a,b)=>str(a.updated_at).localeCompare(str(b.updated_at)))){
  put([str(p.customer_name),str(p.mobile),str(p.vehicle_model),str(p.registration_number),str(p.service_type),str(p.service_due),str(p.last_service),"","", "",str(p.call_summary)],str(p.updated_at)||str(p.created_at),"prospect:"+str(p.id));
 }
 for(const p of people)if(!seenCustomers.has(str(p.id))&&!Array.from(rows.values()).some(r=>r.values[1]&&key(r.values[1],"")===key(str(p.mobile),"")))put([str(p.name),str(p.mobile),"","","","","","","","",""],str(p.created_at),"customer:"+str(p.id));
 const serviceRecords=Array.from(rows.values()).sort((a,b)=>b.date.localeCompare(a.date));
 return <ReportsDirectory serviceRecords={serviceRecords} metrics={{customers:customers.count??0,campaigns:campaigns.count??0,imports:imports.count??0,pending:pending.count??0}} campaigns={listed.data??[]}/>;
}