"use client";
import {useState,useTransition,useEffect} from "react";
import "./campaign-popup-white.css";
import {useRouter} from "next/navigation";
import {createSimpleCampaign} from "./actions";
import {excelToRows,makeRecipientTemplate,rowsToCsv} from "@/lib/campaign-excel";

type Dealer={id:string;name:string;configured:boolean};
type Preview={filename:string;csv:string;total:number;eligible:number;excluded:number;invalid:number;duplicate:number;sample:string[][];headers:string[]};
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
   for(const required of ["Mobile","consent","do_not_call"])if(!headers.includes(required))throw Error("Missing required column: "+required+". Download the template.");
   if(rows.some((r,i)=>i>0&&r.length!==headers.length))throw Error("Some rows have a different column count.");
   const idx=headers.indexOf("Mobile"),ci=headers.indexOf("consent"),di=headers.indexOf("do_not_call");
   let eligible=0,invalid=0,duplicate=0;const seen=new Set<string>();
   for(const row of rows.slice(1)){
    const value=phone(row[idx]);if(!value){invalid++;continue;}
    if(seen.has(value)){duplicate++;continue;}
    if(!consentYes.has(row[ci].trim().toLowerCase())||!dncNo.has(row[di].trim().toLowerCase()))continue;
    seen.add(value);eligible++;
   }
   const csv=rowsToCsv(rows);
   if(new Blob([csv]).size>5*1024*1024)throw Error("Converted CSV exceeds 5 MB.");
   setPreview({filename:file.name,csv,total:rows.length-1,eligible,excluded:rows.length-1-eligible,invalid,duplicate,headers,sample:rows.slice(1,4)});
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
   form.set("cohortName","Service Reminders");form.set("phoneColumn","Mobile");
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
 if(success)return <div className="campaign-modal-overlay"><section className="campaign-modal fc-success-campaign" role="dialog" aria-modal="true" aria-labelledby="campaign-success-title"><div className="fc-success-tick" aria-hidden="true">✓</div><h2 id="campaign-success-title">Campaign Created Successfully</h2><p>Unique Campaign ID</p><strong className="fc-success-reference">{reference}</strong><div className="fc-success-status"><span>Status</span><span className="status-pill">Pending</span></div><div className="fc-success-actions"><button type="button" className="btn-outline" onClick={async()=>{try{await navigator.clipboard.writeText(reference);setCopied(true);}catch{setCopied(false);}}}>{copied?"Copied":"Copy Campaign ID"}</button><button type="button" className="btn-primary" onClick={()=>{router.push(canOpenOutbound?"/campaigns/"+existingDraft+"/outbound":"/campaigns?view="+encodeURIComponent(existingDraft));router.refresh();}}>View Campaign</button></div></section></div>;
 return <div className="campaign-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)router.push("/campaigns");}}>
  <section className="campaign-modal fc-compact-campaign" role="dialog" aria-modal="true" aria-labelledby="campaign-dialog-title">
   <header className="campaign-modal-header"><div><h2 id="campaign-dialog-title">Create AI Calling Campaign</h2></div><button type="button" className="campaign-modal-close" aria-label="Close" onClick={()=>router.push("/campaigns")}>×</button></header>
   <div className="campaign-modal-scroll fc-compact-scroll">
    <div className="fc-compact-fields">
     {canOpenOutbound&&<label className="campaign-form-label">Dealership <span>*</span>
      <select className="campaign-pill-input" value={dealershipId} disabled={busy||!!existingDraft||dealerships.length===1} onChange={e=>{setDealershipId(e.target.value);setPreview(null);setExistingDraft("");}}>
       {dealerships.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
     </label>}
     <div className="campaign-form-label">Campaign Month &amp; Year <span>*</span><div className="fc-period-fields"><select aria-label="Campaign month" className="campaign-pill-input" value={month} disabled={busy||!!existingDraft} onChange={e=>setMonth(e.target.value)}>{months.map((m,i)=><option key={m} value={String(i+1).padStart(2,"0")}>{m}</option>)}</select><select aria-label="Campaign year" className="campaign-pill-input" value={year} disabled={busy||!!existingDraft} onChange={e=>setYear(e.target.value)}>{Array.from({length:currentYear-1899},(_,i)=>currentYear-i).map(y=><option key={y} value={y}>{y}</option>)}</select></div></div>
     
    </div>
    <div className="fc-compact-excel-head">
     <strong>Customer Excel</strong>
     <button type="button" className="fc-template-icon fc-template-text" title="Download Excel template" aria-label="Download Excel template" onClick={()=>downloadBlob(makeRecipientTemplate(),"FrontVox_Recipient_Template.xlsx")}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg><span>Download Template</span>
     </button>
    </div>
    <label className="upload-zone fc-compact-upload"><span aria-hidden="true" className="fc-upload-symbol">⇧</span><strong>{reading?"Checking file…":"Upload Excel / CSV"}</strong><small>Up to 5 MB</small><input type="file" accept=".xlsx,.csv" disabled={busy||reading||!!existingDraft} style={{display:"none"}} onChange={e=>void chooseFile(e.target.files?.[0])}/></label>
    {preview&&<div className="crm-panel fc-compact-preview">
     <div className="panel-title"><h2>Recipient readiness</h2><span>{preview.filename}</span></div>
     <div className="wizard-grid">
      <div className="review-row"><span>Total rows</span><strong>{preview.total}</strong></div>
      <div className="review-row"><span>Eligible</span><strong>{preview.eligible}</strong></div>
      <div className="review-row"><span>Held / excluded</span><strong>{preview.excluded}</strong></div>
      <div className="review-row"><span>Invalid / duplicate</span><strong>{preview.invalid} / {preview.duplicate}</strong></div>
     </div>
     <div className="tablewrap fc-compact-preview-table"><table className="crm-table"><thead><tr>{preview.headers.slice(0,4).map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{preview.sample.map((row,i)=><tr key={i}>{row.slice(0,4).map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>

    </div>}
    <label className="fc-compact-consent"><input type="checkbox" checked={consentCertified} disabled={busy} onChange={e=>setConsentCertified(e.target.checked)}/>I confirm customer consent and DNC/suppression screening.</label>
    {error&&<p role="alert" className="form-error">{error}</p>}
   </div>
   <footer className="campaign-modal-footer"><button type="button" className="campaign-modal-back" onClick={()=>router.push("/campaigns")}>Cancel</button>{preview&&<span className="campaign-step-count">{preview.eligible} eligible</span>}<button type="button" disabled={busy||reading||!preview||!preview.eligible||!consentCertified} onClick={submit} className="campaign-modal-next">{busy?"Creating…":"Create Campaign"}</button></footer>
  </section>
 </div>;
}
