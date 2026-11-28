"use client";
import {useState,useTransition,useEffect,useRef} from "react";
import {createPortal} from "react-dom";
import "./campaign-popup-white.css";
import {useRouter} from "next/navigation";
import {createSimpleCampaign} from "./actions";
import {excelToRows,makeRecipientTemplate,rowsToCsv,RECIPIENT_TEMPLATE_HEADERS} from "@/lib/campaign-excel";

type Dealer={id:string;name:string;configured:boolean};
type Preview={filename:string;csv:string;total:number;eligible:number;excluded:number;invalid:number;duplicate:number;sample:string[][];headers:string[];simple:boolean};
import {LEGACY_RECIPIENT_HEADERS} from "@/lib/sarvam/recipient-template";
const consentYes=new Set(["yes","true","1","opted_in","consented"]);
const dncNo=new Set(["no","false","0",""]);
const phone=(s:string)=>{const v=s.trim().replace(/[\s().-]/g,"");return /^[6-9]\d{9}$/.test(v)?"+91"+v:/^91[6-9]\d{9}$/.test(v)?"+"+v:/^\+[1-9]\d{7,14}$/.test(v)?v:null;};
function parseCsv(value:string):string[][] {
 const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;const data=value.replace(/^\uFEFF/,"");
 for(let i=0;i<data.length;i++){const c=data[i];
  if(c==='"'){if(quoted&&data[i+1]==='"'){cell+='"';i++;}else if(quoted){quoted=false;}else if(!cell){quoted=true;}else throw Error("Malformed CSV quotation.");}
  else if(c===","&&!quoted){row.push(cell);cell="";}
  else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&data[i+1]==="\n")i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell="";}
  else cell+=c;
 }
 if(quoted)throw Error("Unclosed CSV quotation.");
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
function downloadBlob(blob:Blob,name:string) {
 const url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download=name;anchor.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function CampaignWizard({dealerships,initialDealershipId,canOpenOutbound}:{dealerships:Dealer[];initialDealershipId:string;canOpenOutbound:boolean}){
 const router=useRouter();
 const uploadInputRef=useRef<HTMLInputElement>(null);
 const removeUploadedFile=()=>{if(busy||reading||existingDraft)return;setPreview(null);setConsentCertified(false);setError("");if(uploadInputRef.current)uploadInputRef.current.value="";};
 const [modalHost,setModalHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{setModalHost(document.querySelector<HTMLElement>(".crm-app"));},[]);
 const [dealershipId,setDealershipId]=useState(initialDealershipId);
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit"}).formatToParts(new Date());
 const currentYear=Number(today.find(p=>p.type==="year")?.value??"2026");
 const [month,setMonth]=useState(today.find(p=>p.type==="month")?.value??"01"),[year,setYear]=useState(String(currentYear));
 const [reference,setReference]=useState(""),[success,setSuccess]=useState(false),[copied,setCopied]=useState(false);
 const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
 const [preview,setPreview]=useState<Preview|null>(null),[busy,startTransition]=useTransition(),[reading,setReading]=useState(false);
 const [consentCertified,setConsentCertified]=useState(false),[error,setError]=useState(""),[existingDraft,setExistingDraft]=useState("");
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==="Escape"&&!busy)router.push("/campaigns");};document.addEventListener("keydown",key);return ()=>document.removeEventListener("keydown",key);},[router,busy]);
 async function chooseFile(file:File|undefined){
  if(!file)return;setPreview(null);setExistingDraft("");setConsentCertified(false);setError("");
  if(file.size>5*1024*1024||file.size<1||!/\.(xlsx|csv)$/i.test(file.name)){setError("Choose an Excel (.xlsx) or CSV file up to 5 MB.");return;}
  setReading(true);
  try{
   const rows=/\.xlsx$/i.test(file.name)?await excelToRows(file):parseCsv(await file.text());
   if(rows.length<2||rows.length>251)throw Error("Upload 1–250 recipient rows per campaign.");
   const headers=rows[0].map(x=>x.trim());
   if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw Error("Excel headers must be unique and non-empty.");
   const full=headers.includes("user_phone_number");
   const simple=full||headers.includes("phone_number");
   for(const required of simple?(full?RECIPIENT_TEMPLATE_HEADERS:LEGACY_RECIPIENT_HEADERS):["Mobile","consent","do_not_call"])if(!headers.includes(required))throw Error("Missing required column: "+required+". Download the template.");
   if(simple&&/\.xlsx$/i.test(file.name))for(const row of rows.slice(1))while(row.length<headers.length)row.push("");
   if(rows.some((r,i)=>i>0&&r.length!==headers.length))throw Error("Some rows have a different column count.");
   const idx=headers.indexOf(simple?(full?"user_phone_number":"phone_number"):"Mobile"),ci=headers.indexOf("consent"),di=headers.indexOf("do_not_call");
   let eligible=0,invalid=0,duplicate=0;const seen=new Set<string>();
   for(const row of rows.slice(1)){
    const value=phone(row[idx]);if(!value){invalid++;continue;}
    if(seen.has(value)){duplicate++;continue;}
    if(!simple&&(!consentYes.has(row[ci].trim().toLowerCase())||!dncNo.has(row[di].trim().toLowerCase())))continue;
    seen.add(value);eligible++;
   }
   const csv=rowsToCsv(rows);
   if(new Blob([csv]).size>5*1024*1024)throw Error("Converted CSV exceeds 5 MB.");
   setPreview({filename:file.name,csv,total:rows.length-1,eligible,excluded:rows.length-1-eligible,invalid,duplicate,headers,simple,sample:rows.slice(1,4)});
  }catch(e){setError(e instanceof Error?e.message:"Unable to read customer Excel.");}
  finally{setReading(false);}
 }
 function submit(){
  if(!preview||!dealershipId||busy)return;
  if(!consentCertified){setError("Confirm consent and DNC screening before creating the campaign.");return;}
  if(!preview.eligible){setError("No eligible consented recipients. Check the Excel file.");return;}
  setError("");
  startTransition(async()=>{
   let id=existingDraft;
   if(!id){
    const created=await createSimpleCampaign(dealershipId,preview.filename,preview.total,"",year+"-"+month+"-01");
    if(!created.id){setError(created.error??"Could not create campaign.");return;}
    id=created.id;setExistingDraft(id);setReference(created.reference??"");
   }
   const form=new FormData();
   form.set("campaignId",id);form.set("file",new File([preview.csv],"recipients.csv",{type:"text/csv"}));
   form.set("cohortName","Service Reminders");form.set("phoneColumn",preview.simple?"phone_number":"Mobile");
   if(preview.simple)form.set("serviceTemplate","yes");
   form.set("consentColumn","consent");form.set("dncColumn","do_not_call");
   form.set("variableMapping","{}");form.set("certifyConsent","yes");
   try{
    const response=await fetch("/api/sarvam/recipients",{method:"POST",body:form,cache:"no-store"});
    const data=await response.json();
    if(!response.ok||!data.ok){setError((data.error??"Could not stage recipient file.")+" The draft was retained; retrying will not create another draft.");return;}
    setSuccess(true);
   }catch{setError("Upload failed. Your draft was retained; retry to securely stage the same file.");}
  });
 }
 if(!modalHost)return null;
 if(success)return createPortal(
  <div className="campaign-modal-overlay">
   <section className="campaign-modal fc-success-campaign fc-success-reference-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-success-title" aria-describedby="campaign-success-description">
    <div className="fc-success-tick" aria-hidden="true">✓</div>
    <h2 id="campaign-success-title">Campaign Created Successfully</h2>
    <div className="fc-success-reference-status" id="campaign-success-description">
     <span>Your AI calling campaign is ready.</span>
     <span className="status-pill campaign-status-badge campaign-status-pending">Pending</span>
    </div>
    <div className="fc-success-reference-card">
     <div className="fc-success-reference-info"><span>UNIQUE CAMPAIGN ID</span><strong className="fc-success-reference">{reference}</strong></div>
     <button type="button" className="fc-success-copy-icon" aria-label={copied?"Campaign ID copied":"Copy campaign ID"} title={copied?"Copied":"Copy campaign ID"} onClick={async()=>{try{await navigator.clipboard.writeText(reference);setCopied(true);}catch{setCopied(false);}}}>
      {copied?<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>:<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>}
     </button>
    </div>
    <div className="fc-success-actions">
     <button type="button" className="fc-success-cancel" onClick={()=>{router.push("/campaigns");router.refresh();}}>Cancel</button>
     <button type="button" className="fc-success-view" onClick={()=>{router.push(canOpenOutbound?"/campaigns/"+existingDraft+"/outbound":"/campaigns?view="+encodeURIComponent(existingDraft));router.refresh();}}>View Campaign <span aria-hidden="true">→</span></button>
    </div>
   </section>
  </div>,modalHost);
 return createPortal(<div className="campaign-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)router.push("/campaigns");}}>
  <section className="campaign-modal fc-compact-campaign fc-reference-create" role="dialog" aria-modal="true" aria-labelledby="campaign-dialog-title">
   <header className="campaign-modal-header fc-reference-create-header">
    <span className="fc-create-phone-icon" aria-hidden="true"><img src="/call-logs-total-3d.svg" width={76} height={76} alt=""/></span>
    <div className="fc-create-heading-copy"><h2 id="campaign-dialog-title">Create AI Calling Campaign</h2><p>Upload customer data to create a campaign.</p></div>
    <button type="button" className="fc-create-close" aria-label="Close Create Campaign" title="Close" disabled={busy} onClick={()=>router.push("/campaigns")}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg></button>
   </header>
   <div className="campaign-modal-scroll fc-compact-scroll fc-reference-create-scroll">
    <div className="fc-compact-fields">
     {canOpenOutbound&&<label className="campaign-form-label">Dealership <span>*</span>
      <span className="fc-create-dealer-select"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10h18l-2-6H5l-2 6Zm2 0v10h14V10M9 20v-6h6v6M2 10c0 2 3 3 5 1 2 2 4 2 5 0 2 2 4 2 5 0 2 2 5 1 5-1"/></svg>
      <select className="campaign-pill-input" value={dealershipId} disabled={busy||!!existingDraft||dealerships.length===1} onChange={e=>{setDealershipId(e.target.value);setPreview(null);setExistingDraft("");}}>
       {dealerships.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
      </select></span>
     </label>}
     <div className="campaign-form-label fc-reference-period">Campaign Month &amp; Year <span>*</span><div className="fc-period-fields"><label>Month<select aria-label="Campaign month" className="campaign-pill-input" value={month} disabled={busy||!!existingDraft} onChange={e=>setMonth(e.target.value)}>{months.map((m,i)=><option key={m} value={String(i+1).padStart(2,"0")}>{m}</option>)}</select></label><label>Year<select aria-label="Campaign year" className="campaign-pill-input" value={year} disabled={busy||!!existingDraft} onChange={e=>setYear(e.target.value)}>{Array.from({length:currentYear-1899},(_,i)=>currentYear-i).map(y=><option key={y} value={y}>{y}</option>)}</select></label></div></div>
     
    </div>
    <div className="fc-compact-excel-head">
     <strong>Customer Excel / CSV</strong>
     <button type="button" className="fc-template-icon fc-template-text" title="Download Excel template" aria-label="Download Excel template" onClick={()=>downloadBlob(makeRecipientTemplate(),"Frontier_Voice_CRM_Recipient_Template.xlsx")}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg><span>Download Template</span>
     </button>
    </div>
    <input ref={uploadInputRef} id="fc-create-upload-input" className="fc-create-hidden-file" type="file" accept=".xlsx,.csv" disabled={busy||reading||!!existingDraft} onChange={e=>void chooseFile(e.target.files?.[0])}/>
    {preview?<div className="fc-reference-upload-success"><span className="fc-reference-file-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M10 9v12M4 15h16"/></svg></span><div className="fc-reference-file-copy"><strong>{preview.filename}</strong><span>Successfully validated</span></div><button type="button" aria-label="Remove uploaded file" title={existingDraft?"Campaign draft already created":"Remove file"} disabled={busy||reading||!!existingDraft} onClick={removeUploadedFile}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6m4-6v6"/></svg></button></div>:
    <label htmlFor="fc-create-upload-input" className="upload-zone fc-compact-upload"><strong>{reading?"Checking file…":"Upload Excel / CSV"}</strong><small>Up to 5 MB</small></label>}
    {preview&&<div className="fc-reference-readiness">
     <h3>Recipient Readiness</h3>
     <div className="fc-reference-metrics">
      <div className="fc-reference-metric"><strong>{preview.total}</strong><span>Total rows</span></div>
      <div className="fc-reference-metric fc-reference-eligible"><strong>{preview.eligible}</strong><span>Eligible</span></div>
      <div className="fc-reference-metric fc-reference-excluded"><strong>{preview.excluded}</strong><span>Excluded</span></div>
      <div className="fc-reference-metric fc-reference-invalid"><strong>{preview.invalid} / {preview.duplicate}</strong><span>Invalid / Duplicate</span></div>
     </div>
     <div className="fc-reference-sample"><table><thead><tr><th>Mobile</th><th>Customer</th><th>Model</th><th>Reg. No.</th></tr></thead><tbody>{preview.sample.map((row,i)=>{const get=(...names:string[])=>{const index=preview.headers.findIndex(h=>names.some(n=>h.trim().toLowerCase()===n.toLowerCase()));return index<0?"—":row[index]||"—";};const mobile=get("Mobile","phone_number","user_phone_number");return <tr key={i}><td>{mobile==="—"?"—":"••••••"+mobile.replace(/\D/g,"").slice(-4)}</td><td>{get("Customer Name","Customer","Name","customer_name")}</td><td>{get("Model","Vehicle Model","vehicle_model")}</td><td>{get("Reg. Number","Registration Number","Reg No.","Reg. No.","Vehicle Number")}</td></tr>;})}</tbody></table></div>
    </div>}
    <label className="fc-compact-consent fc-reference-consent"><input type="checkbox" checked={consentCertified} disabled={busy} onChange={e=>setConsentCertified(e.target.checked)}/>I confirm customer consent and DNC/suppression screening.</label>
    {error&&<p role="alert" className="form-error">{error}</p>}
   </div>
   <footer className="campaign-modal-footer fc-reference-create-footer"><div className="fc-reference-eligible-footer">{preview&&<><span aria-hidden="true">♧</span> {preview.eligible} eligible {preview.eligible===1?"recipient":"recipients"}</>}</div><div className="fc-reference-footer-buttons"><button type="button" className="campaign-modal-back" disabled={busy} onClick={()=>router.push("/campaigns")}>Cancel</button><button type="button" disabled={busy||reading||!preview||!preview.eligible||!consentCertified} onClick={submit} className="campaign-modal-next"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5.2 3.2h3.5l1.5 5-2.3 2a17 17 0 0 0 6.2 6.2l2-2.3 4.7 1.5v3.5c0 1.6-1.1 2.2-2.6 2C10.8 20 4 13.3 3.3 5.6c-.1-1.1.5-2.4 1.9-2.4Z"/><path d="M14 4a6 6 0 0 1 6 6m-6-3a3 3 0 0 1 3 3"/></svg>{busy?"Creating…":"Create Campaign"}</button></div></footer>
  </section>
 </div>,modalHost);
}
