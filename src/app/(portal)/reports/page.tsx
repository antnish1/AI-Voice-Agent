import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
import {reportValues,phoneKey,type OperationalReport} from "@/lib/report-fields";
import {ReportsDirectory} from "./reports-directory";
import type {TestCallReport} from "./test-call-reports";
export default async function Reports(){
 const {supabase,membership,user,memberships}=await requireMembership();if(!membership)return null;
 const id=membership.dealership_id;
 const dealershipView=!isItSuperUser(user.id,user.email??"",memberships.some(m=>m.role==="super_admin")?"super_admin":"");
 const testReports:TestCallReport[]=[];
 let testLoadError=false;
 if(!dealershipView){
  // Test requests belong to IT, not the currently selected dealership. Existing RLS and ownership still apply.
  for(let offset=0;;offset+=200){
   const {data,error}=await supabase.from("voice_test_call_requests").select("id,phone_last4,agent_id,agent_version,connection_id,caller_number,status,created_at,sarvam_attempt_id").eq("user_id",user.id).order("created_at",{ascending:false}).order("id").range(offset,offset+199);
   if(error){testLoadError=true;break;}
   const batch=data??[];
   const ids=batch.map(x=>x.id);
   const linked=ids.length?await supabase.from("voice_test_call_results").select("request_id,status,duration_seconds,started_at,transcript").in("request_id",ids):{data:[],error:null};
   if(linked.error)testLoadError=true;
   for(const t of batch){const call=(linked.data??[]).find(x=>x.request_id===t.id);testReports.push({...t,caller_number:t.caller_number?String(t.caller_number).slice(-4):null,outcome:call?.status??null,duration_seconds:call?.duration_seconds??null,started_at:call?.started_at??null,has_transcript:Array.isArray(call?.transcript)&&call.transcript.length>0});}
   if(batch.length<200)break;
  }
 }
 const dealershipOptions=dealershipView?[]:await (async()=>{
  const options:{id:string;name:string}[]=[];
  for(let offset=0;;offset+=500){
   const {data,error}=await supabase.from("dealerships").select("id,name").order("id").range(offset,offset+499);
   if(error)throw Error("Could not load dealership report options.");
   options.push(...(data??[]));if((data??[]).length<500)break;
  }
  return options.sort((a,b)=>a.name.localeCompare(b.name));
 })();
 const dealerIds=dealershipView?[id]:dealershipOptions.map(d=>d.id);
 async function loadDealership(dealerId:string){
 const [customers,campaigns,imports,pending]=await Promise.all([
  supabase.from("customers").select("id",{count:"exact",head:true}).eq("dealership_id",dealerId),
  supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",dealerId),
  supabase.from("customer_import_batches").select("id",{count:"exact",head:true}).eq("dealership_id",dealerId),
  supabase.from("campaigns").select("id",{count:"exact",head:true}).eq("dealership_id",dealerId).eq("status","PENDING_MANAGER_APPROVAL")
 ]);
 if([customers,campaigns,imports,pending].some(x=>x.error))throw Error("Could not load dealership report records.");
 const listed:{id:string;name:string;status:string;created_at:string;dealership_id:string}[]=[];
 for(let offset=0;;offset+=500){
  const {data,error}=await supabase.from("campaigns").select("id,name,status,created_at,dealership_id").eq("dealership_id",dealerId).order("id").range(offset,offset+499);
  if(error)throw Error("Could not load campaigns.");
  listed.push(...(data??[]));if((data??[]).length<500)break;
 }
 const all=async (table:string,columns:string)=>{
  const rows:Record<string,unknown>[]=[];
  for(let offset=0;;offset+=500){
   const {data,error}=await supabase.from(table).select(columns).eq("dealership_id",dealerId).order("id").range(offset,offset+499);
   if(error)throw Error("Could not load service records.");
   const batch=(data??[]) as unknown as Record<string,unknown>[];
   rows.push(...batch);if(batch.length<500)break;
  }
  return rows;
 };
 const [people,history,prospects,batches,calls,links,appointments,callbacks,pickups]=await Promise.all([
  all("customers","id,name,mobile,created_at"),
  all("customer_import_rows","id,customer_id,batch_id,row_number,source_data,status"),
  all("campaign_prospects","id,campaign_id,customer_name,mobile,vehicle_model,registration_number,service_type,service_due,last_service,follow_up_at,call_summary,next_action,created_at,updated_at"),
  all("customer_import_batches","id,created_at"),
  all("voice_call_records","id,customer_id,sarvam_campaign_id,sarvam_attempt_id,dialed_number,status,duration_seconds,started_at,output_variables"),
  all("voice_campaign_links","id,campaign_id,sarvam_campaign_id"),
  all("crm_appointments","id,customer_id,status,appointment_at,updated_at"),
  all("crm_callbacks","id,customer_id,status,requested_at,updated_at"),
  all("crm_pickup_drop","id,customer_id,status,requested_at,pickup_address,drop_address,updated_at")
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
  put([str(p.customer_name),str(p.mobile),str(p.vehicle_model),str(p.registration_number),str(p.service_type),str(p.service_due),str(p.last_service),"","","",""],str(p.updated_at)||str(p.created_at),"prospect:"+str(p.id));
 }
 for(const p of people)if(!seenCustomers.has(str(p.id))&&!Array.from(rows.values()).some(r=>r.values[1]&&key(r.values[1],"")===key(str(p.mobile),"")))put([str(p.name),str(p.mobile),"","","","","","","","",""],str(p.created_at),"customer:"+str(p.id));
 const inputs=Array.from(rows.entries());
 const linkMap=new Map(links.map(l=>[str(l.sarvam_campaign_id),str(l.campaign_id)]));
 const unique=<T,>(xs:T[])=>xs.length===1?xs[0]:undefined;
 const latest=(xs:Record<string,unknown>[],customerId:string)=>customerId?xs.filter(x=>str(x.customer_id)===customerId).sort((a,b)=>str(b.updated_at).localeCompare(str(a.updated_at)))[0]:undefined;
 const operations=(customerId:string)=>({appointment:latest(appointments,customerId),callback:latest(callbacks,customerId),pickup:latest(pickups,customerId)});
 const matched=new Set<string>();
 const testAttemptIds=new Set(testReports.map(t=>t.sarvam_attempt_id).filter(Boolean));
 const serviceRecords:OperationalReport[]=calls.filter(c=>!testAttemptIds.has(str(c.sarvam_attempt_id))).map(c=>{
  const phone=phoneKey(c.dialed_number);
  const external=str(c.sarvam_campaign_id);
  const campaign=linkMap.get(external)||(external?"historical:"+dealerId+":"+external:undefined);
  if(campaign&&external&&!linkMap.has(external)&&!listed.some(x=>x.id===campaign))listed.push({id:campaign,name:external==="MG-Remainin-348e8be3-4718"?"MG Remaining november":external,status:"HISTORICAL",created_at:str(c.started_at),dealership_id:dealerId});
  const p=campaign&&phone?unique(prospects.filter(x=>str(x.campaign_id)===campaign&&phoneKey(x.mobile)===phone)):undefined;
  const candidates=phone?inputs.filter(([,x])=>phoneKey(x.values[1])===phone):[];
  const match=p&&str(p.registration_number)?unique(candidates.filter(([,x])=>normalize(x.values[3])===normalize(str(p.registration_number)))):unique(candidates);
  if(match)matched.add(match[0]);
  const base=match?.[1].values??[];
  const person=byId.get(str(c.customer_id));
  const input=[str(p?.customer_name)||base[0]||str(person?.name),str(c.dialed_number)||base[1]||"",str(p?.vehicle_model)||base[2]||"",str(p?.registration_number)||base[3]||"",str(p?.service_type)||base[4]||"",str(p?.service_due)||base[5]||"",str(p?.last_service)||base[6]||"",base[7]||"",base[8]||"",base[9]||"",base[10]||""];
  return {id:"call:"+str(c.id),callId:str(c.id),date:str(c.started_at),campaignId:campaign,values:reportValues(input,c,p,operations(str(c.customer_id)))};
 });
 for(const [k,row] of inputs)if(!matched.has(k)){
  const phone=phoneKey(row.values[1]);
  const p=phone?unique(prospects.filter(x=>phoneKey(x.mobile)===phone&&normalize(str(x.registration_number))===normalize(row.values[3]??""))):undefined;
  const person=phone?unique(people.filter(x=>phoneKey(x.mobile)===phone)):undefined;
  serviceRecords.push({id:k,date:row.date,campaignId:p?str(p.campaign_id):undefined,values:reportValues(row.values,undefined,p,operations(str(person?.id)))});
 }
 serviceRecords.sort((a,b)=>b.date.localeCompare(a.date));
 // Keep campaign-specific records separate even when the same customer appears in several campaigns.
 const campaignRecords:OperationalReport[]=serviceRecords.filter(r=>!!r.callId);
 for(const prospect of prospects){
  const campaignId=str(prospect.campaign_id),mobile=phoneKey(prospect.mobile);
  if(campaignRecords.some(r=>r.campaignId===campaignId&&phoneKey(r.values[1])===mobile&&normalize(r.values[2]??"")===normalize(str(prospect.registration_number))))continue;
  const person=mobile?unique(people.filter(x=>phoneKey(x.mobile)===mobile)):undefined;
  const input=[str(prospect.customer_name),str(prospect.mobile),str(prospect.vehicle_model),str(prospect.registration_number),str(prospect.service_type),str(prospect.service_due),str(prospect.last_service),"","","",""];
  campaignRecords.push({id:"campaign-prospect:"+str(prospect.id),campaignId,date:str(prospect.updated_at)||str(prospect.created_at),values:reportValues(input,undefined,prospect,operations(str(person?.id)))});
 }
 return {dealershipId:dealerId,campaigns:listed,serviceRecords:serviceRecords.map(r=>({...r,dealershipId:dealerId})),campaignRecords:campaignRecords.map(r=>({...r,dealershipId:dealerId})),metrics:{customers:customers.count??0,campaigns:campaigns.count??0,imports:imports.count??0,pending:pending.count??0}};
 }
 // Keep joins isolated by dealership; never join identical phone numbers across tenants.
 const reports=[];
 for(const dealerId of dealerIds)reports.push(await loadDealership(dealerId));
 const serviceRecords=reports.flatMap(r=>r.serviceRecords).sort((a,b)=>b.date.localeCompare(a.date));
 const campaignRecords=reports.flatMap(r=>r.campaignRecords).sort((a,b)=>b.date.localeCompare(a.date));
 const campaigns=reports.flatMap(r=>r.campaigns).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 const metrics=reports.reduce((a,r)=>({customers:a.customers+r.metrics.customers,campaigns:a.campaigns+r.metrics.campaigns,imports:a.imports+r.metrics.imports,pending:a.pending+r.metrics.pending}),{customers:0,campaigns:0,imports:0,pending:0});
 return <ReportsDirectory testReports={testReports} testLoadError={testLoadError} dealershipView={dealershipView} dealershipOptions={dealershipOptions} dealershipMetrics={reports.map(r=>({dealershipId:r.dealershipId,...r.metrics}))} campaignRecords={campaignRecords} serviceRecords={serviceRecords} metrics={metrics} campaigns={campaigns}/>;
}
