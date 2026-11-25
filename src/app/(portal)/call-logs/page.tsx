import {requireMembership} from "@/lib/auth";
import {textValue} from "@/lib/report-fields";
import {CallLogsDirectory,type CallRecord} from "./call-logs-directory";
export default async function CallLogs(){
 const {supabase,membership}=await requireMembership();
 if(!membership)return null;
 const dealer=membership.dealership_id;
 const rows:Record<string,unknown>[]=[];
 for(let offset=0;;offset+=250){
  const {data,error}=await supabase.from("voice_call_records").select("id,customer_id,sarvam_attempt_id,sarvam_interaction_id,sarvam_campaign_id,agent_id,dialed_number,status,duration_seconds,started_at,transcript,output_variables").eq("dealership_id",dealer).order("started_at",{ascending:false,nullsFirst:false}).order("id").range(offset,offset+249);
  if(error)throw new Error("Unable to load verified call records.");
  rows.push(...(data??[]));if((data??[]).length<250)break;
 }
 const customerIds=Array.from(new Set(rows.map(r=>textValue(r.customer_id)).filter(Boolean)));
 const names=new Map<string,string>();
 for(let offset=0;offset<customerIds.length;offset+=100){
  const {data,error}=await supabase.from("customers").select("id,name").eq("dealership_id",dealer).in("id",customerIds.slice(offset,offset+100));
  if(error)throw new Error("Unable to load linked customer names.");
  for(const c of data??[])names.set(c.id,c.name);
 }
 const calls=rows.map(r=>{
  const output=r.output_variables&&typeof r.output_variables==="object"&&!Array.isArray(r.output_variables)?r.output_variables as Record<string,unknown>:{};
  const {output_variables,customer_id,...call}=r;
  return {...call,customer_name:textValue(output.customer_name)||names.get(textValue(customer_id))||null} as CallRecord;
 });
 return <CallLogsDirectory calls={calls}/>;
}
