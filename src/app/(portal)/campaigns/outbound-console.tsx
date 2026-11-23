"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {makeCallOutcomeReport} from "@/lib/campaign-excel";
type CallRecord={dialed_number:string|null;status:string;duration_seconds:number|null;started_at:string|null;ended_at:string|null;sarvam_attempt_id:string;agent_id:string|null};
type Props={campaign:{id:string;name:string;status:string};config:{agent_label?:string;agent_version_label?:string;telephony_label?:string;outgoing_number_label?:string;schedule?:{start?:string;end?:string}}|null;batch:{cohort_name:string;eligible_records:number;total_records:number;csv_sha256:string}|null;launch:{state:string;sarvam_campaign_id:string|null;sarvam_cohort_id:string|null}|null;testEnabled:boolean;liveEnabled:boolean;callRecords:CallRecord[]};
type Result={ok?:boolean;error?:string;message?:string;eligible?:number;excluded?:number;attemptId?:string;campaignId?:string;cohortId?:string};
const style={display:"grid",gap:13,maxWidth:760} as const;
export function OutboundConsole({campaign,config,batch,launch,testEnabled,liveEnabled,callRecords}:Props){
 const router=useRouter();
 const [message,setMessage]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [agentId,setAgentId]=useState(config?.agent_label??"");
 const [version,setVersion]=useState(config?.agent_version_label??"1");
 const [connection,setConnection]=useState(config?.telephony_label??"");
 const [caller,setCaller]=useState(config?.outgoing_number_label??"");
 const [phone,setPhone]=useState("");
 const [startAt,setStartAt]=useState((config?.schedule?.start??"")+"T10:00");
 const [endAt,setEndAt]=useState((config?.schedule?.end??"")+"T18:00");
 const [confirmCall,setConfirmCall]=useState(false),[confirmLaunch,setConfirmLaunch]=useState(false),[reviewedTest,setReviewedTest]=useState(false),[confirmControl,setConfirmControl]=useState(false);
 const send=async(url:string,payload:FormData|Record<string,unknown>)=>{
  setError("");setMessage("");setBusy(true);
  try{
   const response=await fetch(url,{method:"POST",body:payload instanceof FormData?payload:JSON.stringify(payload),headers:payload instanceof FormData?undefined:{"Content-Type":"application/json"},cache:"no-store"});
   const data:Result=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error??"Request failed.");
   setMessage(data.message??(data.eligible!==undefined?`Staged ${data.eligible} eligible recipients. ${data.excluded} excluded by validation.`:"Operation accepted."));
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not complete request.");}finally{setBusy(false);}
 };
 const changeControl=async(action:"pause"|"resume")=>{
  if(!confirmControl)return;setBusy(true);setMessage("");setError("");
  try{
   const response=await fetch("/api/sarvam/campaign-status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:campaign.id,action,confirm:action==="pause"?"PAUSE CAMPAIGN":"RESUME CAMPAIGN"}),cache:"no-store"});
   const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error??"Campaign action failed.");
   setMessage(data.message??"Campaign status updated.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to update campaign.");}
  finally{setBusy(false);setConfirmControl(false);}
 };
 const refreshCohort=async()=>{setBusy(true);setError("");setMessage("");try{const res=await fetch("/api/sarvam/cohort-status?campaignId="+encodeURIComponent(campaign.id),{cache:"no-store"});const data=await res.json();if(!res.ok)throw Error(data.error??"Status check failed");setMessage(data.message+" Provider status: "+data.providerStatus+". Valid: "+String(data.valid??"pending")+", rejected: "+String(data.rejected??"pending")+".");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Could not check provider.");}finally{setBusy(false);}};
 return <div style={{display:"grid",gap:18}}>
  {message&&<p className="helper-banner" role="status">{message}</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  <section className="crm-panel">
   <h2>1. Customer readiness</h2>
   <p className="muted">Stage up to 250 consented recipients in private storage. Ineligible and do-not-call rows are excluded. Files are NOT sent to Sarvam until a separately approved launch.</p>
   {batch&&<div className="helper-banner">Locked cohort: <strong>{batch.cohort_name}</strong> · {batch.eligible_records} eligible of {batch.total_records} · SHA-256 {batch.csv_sha256.slice(0,12)}…</div>}
   {campaign.status==="DRAFT"&&!batch?<form style={style} onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);form.set("campaignId",campaign.id);void send("/api/sarvam/recipients",form);}}>
    <label className="wizard-field">CSV file (max 5MB)<input type="file" name="file" accept=".csv,text/csv" required/></label>
    <label className="wizard-field">Cohort name<input name="cohortName" defaultValue="FrontVox Pilot 1" required maxLength={50}/></label>
    <div className="wizard-grid">
     <label className="wizard-field">Phone number CSV column<input name="phoneColumn" placeholder="Mobile" required/></label>
     <label className="wizard-field">Consent column<input name="consentColumn" placeholder="consent" required/></label>
     <label className="wizard-field">Do not call column<input name="dncColumn" placeholder="do_not_call" required/></label>
    </div>
    <label className="wizard-field">Agent variable mapping JSON (optional)<textarea name="variableMapping" defaultValue={'{"customer_name":"Customer Name"}'} rows={3}/><small>Keys are existing Sarvam agent variable names; values are CSV column names. Use {"{}"} if no personalisation is needed.</small></label>
    <label style={{display:"flex",gap:9,alignItems:"start",fontSize:13}}><input name="certifyConsent" value="yes" type="checkbox" required/> I confirm these recipients opted in to this calling purpose and the list is screened against our DNC records. No live calling is authorized by staging.</label>
    <button disabled={busy} className="btn-primary" type="submit">Stage & Lock Eligible Recipients</button>
   </form>:<p className="muted">Eligible recipients are securely staged. Once submitted for approval, changes require a new campaign and fresh approval.</p>}
  </section>
  <section className="crm-panel">
   <h2>2. Verify AI Agent (test call)</h2>
   <p className="muted">Only IT Super User, an allowlisted phone number, explicit confirmation, a 10-minute duplicate guard and a maximum of 3 calls per 24 hours. Real calls consume Sarvam credits.</p>
   <form style={style} onSubmit={e=>{e.preventDefault();void send("/api/sarvam/test-call",{agentId,appVersion:Number(version),connectionId:connection,callerNumber:caller,phone,confirm:"PLACE ONE REAL TEST CALL"});}}>
    <div className="wizard-grid">
     <label className="wizard-field">Sarvam Agent ID<input value={agentId} onChange={e=>setAgentId(e.target.value)} required/></label>
     <label className="wizard-field">Committed version<input value={version} onChange={e=>setVersion(e.target.value)} type="number" min={1} required/></label>
     <label className="wizard-field">Telephony connection ID<input value={connection} onChange={e=>setConnection(e.target.value)} required/></label>
     <label className="wizard-field">Connected caller number<input value={caller} onChange={e=>setCaller(e.target.value)} placeholder="+91..." required/></label>
     <label className="wizard-field">Allowlisted test recipient number<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91..." required/></label>
    </div>
    <label style={{display:"flex",gap:9,alignItems:"start",fontSize:13}}><input type="checkbox" checked={confirmCall} onChange={e=>setConfirmCall(e.target.checked)}/> I authorize one real, potentially chargeable test call to this number.</label>
    <button className="btn-primary" type="submit" disabled={busy||!testEnabled||!confirmCall}>{testEnabled?"Place One Test Call":"Test Calls Disabled by Server"}</button>
   </form>
  </section>
  <section className="crm-panel">
   <h2>3. Start Campaign</h2>
   <p className="muted">Only an approved, immutable campaign with a locked consent-screened cohort, a test call in the last 24 hours, matching agent/version/connection, a signed Sarvam webhook and an explicit final confirmation can be submitted. Start time must be at least one hour in the future.</p>
   {launch&&<div className="helper-banner">Provider operation: <strong>{launch.state}</strong>. Campaign ID: {launch.sarvam_campaign_id??"Pending / unknown"}. Cohort ID: {launch.sarvam_cohort_id??"Pending"}. Do not repeat a launch if the result is unknown.{launch.sarvam_cohort_id&&<div style={{marginTop:10}}><button type="button" className="btn-outline small" disabled={busy} onClick={()=>void refreshCohort()}>Verify Sarvam Cohort Processing</button></div>}</div>}
   <form style={style} onSubmit={e=>{e.preventDefault();if(!startAt||!endAt)return;void send("/api/sarvam/launch",{campaignId:campaign.id,agentId,appVersion:Number(version),connectionId:connection,callerNumber:caller,startAt:new Date(startAt).toISOString(),endAt:new Date(endAt).toISOString(),confirm:"LAUNCH "+campaign.name,reviewedTestResult:reviewedTest});}}>
    <div className="wizard-grid">
     <label className="wizard-field">Campaign start (local time)<input type="datetime-local" value={startAt} onChange={e=>setStartAt(e.target.value)} required/></label>
     <label className="wizard-field">Campaign end (local time)<input type="datetime-local" value={endAt} onChange={e=>setEndAt(e.target.value)} required/></label>
    </div>
    <label style={{display:"flex",gap:9,alignItems:"start",fontSize:13}}><input type="checkbox" checked={reviewedTest} onChange={e=>setReviewedTest(e.target.checked)}/> I checked the real Sarvam test-call result and verified the agent audio, telephony and intended customer experience.</label>
    <label style={{display:"flex",gap:9,alignItems:"start",fontSize:13}}><input type="checkbox" checked={confirmLaunch} onChange={e=>setConfirmLaunch(e.target.checked)}/> I reviewed the approved cohort and recognize that launching schedules real, chargeable calls to {batch?.eligible_records??0} eligible recipients.</label>
    <button className="btn-primary" type="submit" disabled={busy||!liveEnabled||campaign.status!=="APPROVED"||!batch||!!launch||!confirmLaunch||!reviewedTest}>{!liveEnabled?"Start Campaign Disabled":campaign.status!=="APPROVED"?"Requires Campaign Approval":launch?"Launch Already Reserved":"Start Campaign"}</button>
   </form>
   {launch?.sarvam_campaign_id&&<div className="helper-banner" style={{marginTop:15}}>
    <strong>Campaign controls</strong><p className="muted">Pause queueing stops new Sarvam calls after the provider accepts the request; in-progress calls may finish. Resume remains subject to live calling being enabled and a verified cohort.</p>
    <label style={{display:"flex",alignItems:"start",gap:9,margin:"10px 0",fontSize:13}}><input type="checkbox" checked={confirmControl} onChange={e=>setConfirmControl(e.target.checked)} disabled={busy}/> I understand this changes the real Sarvam campaign state.</label>
    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button type="button" className="btn-outline small" disabled={busy||!confirmControl} onClick={()=>void changeControl("pause")}>Pause queueing</button><button type="button" className="btn-primary small" disabled={busy||!liveEnabled||!confirmControl||launch.state!=="cohort_completed"} onClick={()=>void changeControl("resume")}>Resume campaign</button></div>
   </div>}

  </section>
  <section className="crm-panel">
   <div className="panel-title"><h2>4. Call results & detailed report</h2><span>{callRecords.length} saved results</span></div>
   <p className="muted">Results appear only after Sarvam sends verified call outcomes and the CRM saves them. A submitted campaign is not a completed call.</p>
   {callRecords.length>0?<><div className="tablewrap"><table className="crm-table"><thead><tr><th>Number</th><th>Connectivity</th><th>Duration</th><th>Started</th></tr></thead><tbody>{callRecords.slice(0,100).map((call,i)=><tr key={call.sarvam_attempt_id+"-"+i}><td>{call.dialed_number??"Not recorded"}</td><td>{call.status.replaceAll("_"," ")}</td><td>{call.duration_seconds??"—"} sec</td><td>{call.started_at?new Date(call.started_at).toLocaleString("en-IN"):"—"}</td></tr>)}</tbody></table></div><button type="button" className="btn-outline small" style={{marginTop:12}} onClick={()=>{const file=makeCallOutcomeReport(callRecords);const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download="FrontVox_Call_Outcomes_"+campaign.id.slice(0,8)+".xlsx";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>↓ Download Detailed Report (Excel)</button></>:<div className="helper-banner">No verified call outcomes yet. The report will be available when provider results have been processed.</div>}
   <p className="muted">This report contains stored connectivity, duration and attempt metadata. Customer interest, follow-up actions and AI summaries are not yet available in the verified call-record schema, so they are not fabricated.</p>
  </section>
 </div>;
}
