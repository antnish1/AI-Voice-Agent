import {requireMembership} from "@/lib/auth";
import {textValue} from "@/lib/report-fields";
type Kind="appointments"|"callbacks"|"pickup-drop";
export async function SarvamRequestQueue({kind}:{kind:Kind}){
 const {supabase,membership}=await requireMembership();if(!membership)return null;
 const rows: {id:string;dialed_number:string|null;started_at:string|null;output_variables:unknown}[]=[];
 for(let offset=0;;offset+=250){
  const {data,error}=await supabase.from("voice_call_records").select("id,dialed_number,started_at,output_variables").eq("dealership_id",membership.dealership_id).not("output_variables","is",null).order("id").range(offset,offset+249);
  if(error)return <p role="alert">AI request records could not be loaded.</p>;
  rows.push(...(data??[]));if((data??[]).length<250)break;
 }
 const requests=rows.flatMap(r=>{
  const v=r.output_variables&&typeof r.output_variables==="object"&&!Array.isArray(r.output_variables)?r.output_variables as Record<string,unknown>:{};
  const get=(k:string)=>textValue(v[k]);const yes=(k:string)=>get(k).toLowerCase()==="true";
  const include=kind==="appointments"?yes("appointment_requested"):kind==="callbacks"?yes("callback_required")||yes("followup_requested"):yes("pickup_drop_requested")||yes("pickup_drop_required")||yes("pickup_required");
  if(!include)return [];
  const preferred=kind==="appointments"?[get("appointment_preferred_date"),get("appointment_preferred_time")].filter(Boolean).join(" "):kind==="callbacks"?get("callback_preferred_datetime")||get("followup_preferred_datetime"):[get("pickup_preferred_date"),get("pickup_preferred_time")].filter(Boolean).join(" ");
  return [{...r,name:get("customer_name"),preferred,details:kind==="pickup-drop"?[get("pickup_address"),get("drop_address")].filter(Boolean).join(" → "):get("call_summary")}];
 }).sort((a,b)=>(b.started_at??"").localeCompare(a.started_at??""));
 return <section className="crm-panel" style={{marginTop:16}}><div className="panel-title"><h2>AI-captured requests ({requests.length})</h2></div><p className="muted">Historical call requests; verify with the customer before scheduling. These are not confirmed bookings.</p><div className="tablewrap"><table className="crm-table"><thead><tr><th>Customer</th><th>Mobile</th><th>Call date</th><th>Preferred date / time</th><th>Details</th><th>Status</th></tr></thead><tbody>{requests.map(r=><tr key={r.id}><td>{r.name||"—"}</td><td>{r.dialed_number||"—"}</td><td>{r.started_at?new Date(r.started_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}):"—"}</td><td>{r.preferred||"Not specified"}</td><td style={{whiteSpace:"normal",maxWidth:380}}>{r.details||"—"}</td><td>Requested</td></tr>)}{!requests.length&&<tr><td colSpan={6}>No AI-captured requests.</td></tr>}</tbody></table></div></section>;
}
