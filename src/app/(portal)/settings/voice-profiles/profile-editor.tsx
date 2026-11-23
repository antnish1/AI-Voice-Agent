"use client";
import {useState,useTransition} from "react";
import {saveVoiceProfile} from "./actions";
type Dealership={id:string;name:string;profile?:{agent_id:string;app_version:number;connection_id:string;caller_number:string;active:boolean}|null};
export function ProfileEditor({dealerships}:{dealerships:Dealership[]}){
 const [id,setId]=useState(dealerships[0]?.id??""),[busy,start]=useTransition(),[message,setMessage]=useState("");
 const dealer=dealerships.find(d=>d.id===id),p=dealer?.profile;
 const [revision,setRevision]=useState(0);
 return <section className="crm-panel" style={{maxWidth:790}}>
  <h2>Dealership AI Calling Defaults</h2>
  <p className="muted">Configure a verified agent and outbound number once. Campaign creators only select their dealership and Excel file. Saving settings does not place calls or authorize campaign launch.</p>
  <label className="wizard-field">Dealership<select value={id} onChange={e=>{setId(e.target.value);setRevision(v=>v+1);setMessage("");}}>
   {dealerships.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select></label>
  <form key={id+"-"+revision} style={{display:"grid",gap:16,marginTop:18}} action={form=>start(async()=>{setMessage("");const r=await saveVoiceProfile(form);setMessage(r.error??"Saved. Reload to view the latest profile.");})}>
   <input type="hidden" name="dealershipId" value={id}/>
   <label className="wizard-field">Sarvam Agent ID<input name="agentId" required defaultValue={p?.agent_id??""} placeholder="Copy verified agent ID from Sarvam"/></label>
   <label className="wizard-field">Committed Agent Version<input name="version" required type="number" min={1} defaultValue={p?.app_version??1}/></label>
   <label className="wizard-field">Telephony Connection ID<input name="connectionId" required defaultValue={p?.connection_id??""} placeholder="Verified connection ID"/></label>
   <label className="wizard-field">Connected Caller Number<input name="callerNumber" required defaultValue={p?.caller_number??""} placeholder="+91XXXXXXXXXX"/></label>
   <label style={{display:"flex",gap:10,fontSize:14,alignItems:"center"}}><input type="checkbox" name="active" value="yes" defaultChecked={p?.active??false}/>Use these verified defaults for newly created drafts</label>
   <div className="helper-banner">These details must match the real Sarvam workspace. Enabling a profile only pre-fills drafts; test-call confirmation, consent screening, manager approval, signed webhook and server launch switch remain mandatory.</div>
   {message&&<p className={message.startsWith("Saved")?"helper-banner":"form-error"} role="status">{message}</p>}
   <button type="submit" className="btn-primary" disabled={busy}>{busy?"Saving…":"Save Verified Profile"}</button>
  </form>
 </section>;
}
