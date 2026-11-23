"use client";
import {useState,useTransition} from "react";
import {saveVoiceProfile} from "./actions";
type SarvamOption={id:string;name:string;direction:string;status:string;version:unknown};
type VerifiedDetails={deploymentId:string;agentId:string;version:number;channelDirection:string;status:string;eligible:boolean;connections:{connectionId:string;callerNumber:string}[];reason:string|null};
type Dealership={id:string;name:string;profile?:{agent_id:string;app_version:number;connection_id:string;caller_number:string;active:boolean}|null};
export function ProfileEditor({dealerships}:{dealerships:Dealership[]}){
 const [id,setId]=useState(dealerships[0]?.id??""),[busy,start]=useTransition(),[message,setMessage]=useState("");
 const dealer=dealerships.find(d=>d.id===id),p=dealer?.profile;
 const [revision,setRevision]=useState(0);
 const [activateDefaults,setActivateDefaults]=useState(dealerships[0]?.profile?.active??false);
 const [options,setOptions]=useState<SarvamOption[]>([]);
 const [selectedDeployment,setSelectedDeployment]=useState("");
 const [verified,setVerified]=useState<VerifiedDetails|null>(null);
 const [selectedConnection,setSelectedConnection]=useState(0);
 const [loading,setLoading]=useState(false),[lookupError,setLookupError]=useState("");
 async function loadDeployments(){
  setLoading(true);setLookupError("");setVerified(null);setSelectedDeployment("");setOptions([]);
  try{
   const response=await fetch("/api/sarvam/verified-profile",{cache:"no-store"});
   const result=await response.json();
   if(!response.ok)throw Error(result.error??"Could not fetch Sarvam deployments.");
   setOptions(result.deployments??[]);
   if(!result.deployments?.length)setLookupError("No outbound Sarvam deployments found in this workspace. Check the Sarvam workspace and committed agent deployment.");
  }catch(e){setLookupError(e instanceof Error?e.message:"Sarvam lookup failed.");}
  finally{setLoading(false);}
 }
 async function chooseDeployment(deploymentId:string){
  setSelectedDeployment(deploymentId);setVerified(null);setLookupError("");
  if(!deploymentId)return;
  setLoading(true);
  try{
   const response=await fetch("/api/sarvam/verified-profile?deploymentId="+encodeURIComponent(deploymentId),{cache:"no-store"});
   const result=await response.json();
   if(!response.ok)throw Error(result.error??"Cannot verify this Sarvam deployment.");
   if(!result.eligible){setLookupError(result.reason??"The deployment is not eligible for outbound calls.");return;}
   setVerified(result);setSelectedConnection(0);setRevision(v=>v+1);setMessage("");
  }catch(e){setLookupError(e instanceof Error?e.message:"Could not verify deployment.");}
  finally{setLoading(false);}
 }
 const chosen=verified?.connections[selectedConnection];

 return <section className="crm-panel" style={{maxWidth:790}}>
  <h2>Dealership AI Calling Defaults</h2>
  <p className="muted">Configure a verified agent and outbound number once. Campaign creators only select their dealership and Excel file. Saving settings does not place calls or authorize campaign launch.</p>
  <label className="wizard-field">Dealership<select value={id} onChange={e=>{setId(e.target.value);setRevision(v=>v+1);setMessage("");setVerified(null);setSelectedDeployment("");setOptions([]);setLookupError("");setActivateDefaults(dealerships.find(d=>d.id===e.target.value)?.profile?.active??false);}}>
   {dealerships.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select></label>

  <div className="crm-panel" style={{padding:13,marginTop:12,background:"#f7fbfd",borderRadius:12}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
    <strong style={{fontSize:12}}>Import verified settings from Sarvam</strong>
    <button type="button" className="btn-outline small" onClick={()=>void loadDeployments()} disabled={loading||busy}>{loading?"Checking Sarvam…":"Load from Sarvam"}</button>
   </div>
   {options.length>0&&<label className="wizard-field" style={{marginTop:10}}>Outbound deployment
    <select value={selectedDeployment} disabled={loading||busy} onChange={e=>void chooseDeployment(e.target.value)}>
     <option value="">Select verified deployment</option>
     {options.map(o=><option key={o.id} value={o.id}>{o.name} · v{o.version==null?"?":String(o.version)} · {o.status||"status unknown"}</option>)}
    </select>
   </label>}
   {verified?.eligible&&<div style={{marginTop:10}}>
    {verified.connections.length>1&&<label className="wizard-field">Connected caller number
     <select value={selectedConnection} onChange={e=>{setSelectedConnection(Number(e.target.value));setRevision(v=>v+1);}}>
      {verified.connections.map((c,i)=><option key={c.connectionId+"-"+c.callerNumber} value={i}>{c.callerNumber} · {c.connectionId}</option>)}
     </select>
    </label>}
    <p style={{fontSize:11,color:"#27745c",margin:"6px 0 0"}} role="status">Verified active outbound deployment. Fields populated below; review and save to activate CRM defaults. No calls will be placed.</p>
   </div>}
   {lookupError&&<p role="alert" className="form-error" style={{margin:"8px 0 0"}}>{lookupError}</p>}
  </div>
  <form key={id+"-"+revision} style={{display:"grid",gap:16,marginTop:18}} onChange={()=>setMessage("")} action={form=>start(async()=>{setMessage("");form.set("active",activateDefaults?"yes":"no");const r=await saveVoiceProfile(form);setMessage(r.error??r.message??"Profile saved.");})}>
   <input type="hidden" name="dealershipId" value={id}/>
   <label className="wizard-field">Sarvam Agent ID<input name="agentId" required defaultValue={verified?.agentId??p?.agent_id??""} placeholder="Copy verified agent ID from Sarvam"/></label>
   <label className="wizard-field">Committed Agent Version<input name="version" required type="number" min={1} defaultValue={verified?.version??p?.app_version??1}/></label>
   <label className="wizard-field">Telephony Connection ID or Name<input name="connectionId" required defaultValue={chosen?.connectionId??p?.connection_id??""} placeholder="e.g. Sarvam Managed (Vobiz)"/><small className="muted">Connection names can be saved as inactive drafts. Only actual connection IDs can be activated.</small></label>
   <label className="wizard-field">Connected Caller Number<input name="callerNumber" type="tel" required defaultValue={chosen?.callerNumber??p?.caller_number??""} placeholder="8064272200 or +918064272200"/><small className="muted">Indian 10-digit mobile numbers are saved automatically with +91.</small></label>
   <label style={{display:"flex",gap:10,fontSize:14,alignItems:"center"}}><input type="checkbox" name="active" value="yes" checked={activateDefaults} onChange={e=>{setActivateDefaults(e.target.checked);setMessage("");}}/>Use these verified defaults for newly created drafts</label>
   <div className="helper-banner">A connection name is not a verified telephony ID. Save it with defaults unchecked until the actual ID is confirmed. Calls still require verified telephony, consent checks, approval and server launch permission.</div>
   {message&&<p className={!message.startsWith("Profile saved")?"form-error":"helper-banner"} role="status">{message}</p>}
   <button type="submit" className="btn-primary" disabled={busy}>{busy?"Saving…":"Save Verified Profile"}</button>
  </form>
 </section>;
}
