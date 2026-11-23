"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {makeCampaignDetailedReport,type CampaignProspectReportRow} from "@/lib/campaign-excel";
export type ProspectView=CampaignProspectReportRow&{id:string;recipient_identifier:string;attempt_number:number};
export function ProspectDashboard({campaignName,prospects,uploaded,eligible}:{campaignName:string;prospects:ProspectView[];uploaded:number;eligible:number}){
 const router=useRouter(),[busy,setBusy]=useState(""),[notice,setNotice]=useState(""),[error,setError]=useState("");
 const [editing,setEditing]=useState(""),[interest,setInterest]=useState("interested"),[summary,setSummary]=useState(""),[nextAction,setNextAction]=useState(""),[followUp,setFollowUp]=useState("");
 const pending=prospects.filter(p=>p.queue_state==="pending"&&!p.connectivity).length;
 const connected=prospects.filter(p=>p.connectivity==="answered").length;
 const held=Math.max(0,uploaded-eligible)+prospects.filter(p=>p.readiness==="held").length;
 const requestRetry=async(p:ProspectView)=>{
  if(!window.confirm("Request manual review for retry? This will NOT place a call."))return;
  setBusy(p.id);setNotice("");setError("");
  try{
   const response=await fetch("/api/sarvam/manual-retry",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prospectId:p.id,confirm:"REQUEST MANUAL RETRY"}),cache:"no-store"});
   const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error??"Request failed");
   setNotice(data.message);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not request retry.");}
  finally{setBusy("");}
 };
 const saveOutcome=async(id:string)=>{
  if(!summary.trim())return setError("Enter a factual summary from the saved call.");
  setBusy(id);setNotice("");setError("");
  try{
   const response=await fetch("/api/sarvam/review-outcome",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prospectId:id,interest,summary,nextAction,followUpAt:followUp?new Date(followUp).toISOString():""}),cache:"no-store"});
   const data=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error??"Review failed.");
   setNotice(data.message);setEditing("");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not record reviewed call outcome.");}
  finally{setBusy("");}
 };
 const download=()=>{
  const blob=makeCampaignDetailedReport(campaignName,prospects);
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="FrontVox_Campaign_Report_"+new Date().toISOString().slice(0,10)+".xlsx";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <section className="crm-panel" style={{marginTop:18}}>
  <div className="panel-title"><h2>Customer-wise campaign readiness & results</h2><span>{prospects.length} indexed records</span></div>
  <div className="metric-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))"}}>
   {[["Uploaded",uploaded],["Eligible",eligible],["Held",held],["Pending",pending],["Connected",connected],
     ["Interested",prospects.filter(p=>p.interest==="interested").length],
     ["Follow-up",prospects.filter(p=>p.interest==="follow_up"||!!p.follow_up_at).length],
     ["Retry review",prospects.filter(p=>p.retry_requested).length]].map(([label,value])=>
    <div className="metric-card" style={{minHeight:80}} key={label}><span className="metric-label">{label}</span><div className="metric-value">{value}</div></div>)}
  </div>
  {notice&&<p role="status" className="helper-banner">{notice}</p>}
  {error&&<p role="alert" className="form-error">{error}</p>}
  <div style={{display:"flex",gap:12,justifyContent:"space-between",margin:"16px 0",flexWrap:"wrap"}}>
   <p className="muted">Matched to saved call records only; missing outcomes remain Pending. External RC/vehicle enrichment is not connected.</p>
   <button className="btn-outline small" type="button" disabled={!prospects.length} onClick={download}>↓ Download Detailed Report</button>
  </div>
  {prospects.length?<div className="tablewrap"><table className="crm-table"><thead><tr>
   <th>Customer</th><th>Mobile</th><th>Vehicle / Machine</th><th>Details</th><th>Call</th><th>Interest</th><th>Follow-up</th><th>Action</th>
  </tr></thead><tbody>{prospects.slice(0,250).map(p=><tr key={p.id}>
   <td>{p.customer_name??"Not provided"}</td><td>{p.mobile.slice(0,3)+"******"+p.mobile.slice(-3)}</td>
   <td>{p.registration_number??p.vehicle_model??"Not provided"}</td>
   <td>{p.readiness==="held"?"Held":p.customer_source==="crm"?"CRM matched":"Excel only"}</td>
   <td>{p.connectivity?.replaceAll("_"," ")??p.queue_state.replaceAll("_"," ")}</td>
   <td>{p.interest?.replaceAll("_"," ")??"—"}</td><td>{p.follow_up_at?new Date(p.follow_up_at).toLocaleString("en-IN"):"—"}</td>
   <td>{p.connectivity==="answered"?
    <button className="btn-outline small" type="button" disabled={!!busy} onClick={()=>{setEditing(p.id);setInterest(p.interest??"interested");setSummary(p.call_summary??"");setNextAction(p.next_action??"");setFollowUp(p.follow_up_at?p.follow_up_at.slice(0,16):"");}}>Review outcome</button>
    :["busy","no_answer","failed"].includes(p.connectivity??p.queue_state)&&!p.retry_requested?
    <button className="btn-outline small" type="button" disabled={busy===p.id||!!busy} onClick={()=>void requestRetry(p)}>{busy===p.id?"Requesting…":"Request Retry"}</button>
    :p.retry_requested?"Review pending":"—"}</td>
  </tr>)}</tbody></table></div>:<div className="helper-banner">No customer-wise records have been indexed. Upload and stage an eligible Excel list first.</div>}
  {editing&&<div className="crm-panel" style={{marginTop:16,padding:16,display:"grid",gap:12}}>
   <div className="panel-title"><h2>Review verified call outcome</h2><button type="button" className="btn-outline small" onClick={()=>setEditing("")}>Close</button></div>
   <label className="wizard-field">Customer response<select value={interest} onChange={e=>setInterest(e.target.value)}>
    <option value="interested">Interested</option><option value="not_interested">Not Interested</option><option value="follow_up">Follow-up Required</option><option value="human_assistance">Human Assistance</option>
   </select></label>
   <label className="wizard-field">Factual call summary<textarea rows={3} maxLength={2000} required value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Record only information verified from the actual call"/></label>
   <label className="wizard-field">Next action<input value={nextAction} maxLength={500} onChange={e=>setNextAction(e.target.value)} placeholder="e.g. Service advisor to call customer"/></label>
   <label className="wizard-field">Follow-up date / time<input type="datetime-local" value={followUp} onChange={e=>setFollowUp(e.target.value)}/></label>
   <button className="btn-primary" type="button" disabled={!!busy||!summary.trim()} onClick={()=>void saveOutcome(editing)}>{busy?"Saving…":"Save Reviewed Outcome"}</button>
   <p className="muted">Reviewing a result does not place a call, send a quotation or automatically create an appointment.</p>
  </div>}
  <p className="muted">Retry requests are audit-only pending review; they never initiate an automatic redial. Interest, summary and follow-up fields appear only if verified data has been saved.</p>
 </section>;
}
