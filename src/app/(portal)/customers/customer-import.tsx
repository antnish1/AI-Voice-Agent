"use client";
import {useState,useTransition,useEffect,useRef} from "react";
import {useRouter} from "next/navigation";
import {createBrowserSupabase} from "@/lib/supabase/browser";
type Preview={row:number;name:string;phone:string;error:string};
const cleanPhone=(v:string)=>v.trim().replace(/[() .-]/g,"");
function parseCSV(s:string){
 const records:string[][]=[];let cell="",row:string[]=[],quoted=false;
 for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
 else if(c===","&&!quoted){row.push(cell);cell="";}
 else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&s[i+1]==="\n")i++;row.push(cell);if(row.some(x=>x.trim()))records.push(row);row=[];cell="";}
 else cell+=c;}
 row.push(cell);if(row.some(x=>x.trim()))records.push(row);return records;
}
export function CustomerImport({dealershipId,onClose}:{dealershipId:string;onClose:()=>void}){
 const [filename,setFilename]=useState(""),[headers,setHeaders]=useState<string[]>([]),[rows,setRows]=useState<string[][]>([]),[nameCol,setNameCol]=useState(""),[phoneCol,setPhoneCol]=useState(""),[error,setError]=useState(""),[success,setSuccess]=useState(""),[busy,startTransition]=useTransition(),[open,setOpen]=useState(false);
 const router=useRouter();
 const dialogRef=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=dialogRef.current;if(dialog&&!dialog.open)dialog.showModal();return ()=>{if(dialog?.open)dialog.close();};},[]);

 const picked=async(file:File|undefined)=>{if(!file)return;setError("");setSuccess("");
 if(!/\.csv$/i.test(file.name)){setError("CSV import is available now. Excel (.xlsx/.xls) will be supported in a later phase.");return;}
 if(file.size>300000){setError("For this initial importer, use a CSV under 300 KB with up to 500 records.");return;}
 const data=parseCSV(await file.text());if(data.length<2){setError("CSV must contain a header and at least one row.");return;}
 if(data.length>501){setError("This importer supports up to 500 rows per batch. Please split the file.");return;}
 const h=data[0].map(x=>x.trim());if(new Set(h).size!==h.length){setError("CSV has duplicate column names. Please rename them.");return;}
 setHeaders(h);setRows(data.slice(1));setFilename(file.name);
 setNameCol(h.find(x=>/^(customer.?name|name|insured.?name)$/i.test(x))??"");
 setPhoneCol(h.find(x=>/^(mobile|phone|phone.?number|contact.?number)$/i.test(x))??"");
 setOpen(true);};
 const preview:Preview[]=rows.map((r,i)=>{const name=r[headers.indexOf(nameCol)]?.trim()??"",phone=cleanPhone(r[headers.indexOf(phoneCol)]??"");const error=!nameCol||!phoneCol?"Map customer name and mobile columns":name.length<2||name.length>150?"Invalid customer name":! /^\+?[1-9]\d{7,14}$/.test(phone)?"Invalid phone number":"";return {row:i+2,name,phone,error};});
 const seen=new Set<string>();for(const p of preview){if(p.error)continue;const key=p.name.toLowerCase()+"|"+p.phone;if(seen.has(key))p.error="Duplicate name and number in this file";else seen.add(key);}
 const valid=preview.filter(p=>!p.error).length;const rejected=preview.length-valid;
 const importNow=()=>{if(!rows.length||!nameCol||!phoneCol){setError("Select the customer name and mobile columns.");return;}setError("");startTransition(async()=>{
 try{const supabase=createBrowserSupabase();const records=rows.map(r=>({name:r[headers.indexOf(nameCol)]??"",mobile:r[headers.indexOf(phoneCol)]??"",source_fields:Object.fromEntries(headers.map((h,i)=>[h,(r[i]??"").slice(0,500)]))}));
 const {data,error:e}=await supabase.rpc("import_dealership_customers",{p_dealership_id:dealershipId,p_filename:filename,p_records:records});
 if(e){setError("Import failed: "+e.message);return;}setSuccess(`Imported ${data.imported_rows} new customers, matched ${data.matched_rows} existing, rejected ${data.rejected_rows} rows. All calling consent remains unverified.`);setOpen(false);setRows([]);setFilename("");router.refresh();
 }catch{setError("Unable to upload customer records.");}});};
 return <dialog ref={dialogRef} className="customer-import-dialog" aria-labelledby="customer-import-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><div className="customer-import-inner"><div className="customer-import-heading"><h2 id="customer-import-title">Upload Customers</h2><button type="button" aria-label="Close upload" disabled={busy} onClick={onClose}>×</button></div><div className="helper-banner">Imports are limited to your dealership. Consent remains <strong>unverified</strong>; no calls are initiated.</div><label className="upload-zone" style={{display:"block",cursor:"pointer"}}><span style={{fontSize:24}}>⇧</span><strong>Choose a CSV customer list</strong><small>CSV only · Up to 500 rows · 300 KB</small><input type="file" accept=".csv,text/csv" style={{display:"none"}} onChange={e=>{void picked(e.target.files?.[0]);e.target.value="";}}/></label>
 {success&&<p role="status" className="helper-banner" style={{marginTop:14}}>{success}</p>}{error&&<p className="form-error" role="alert" style={{marginTop:14}}>{error}</p>}
 {open&&<div className="customer-import-preview"><div className="panel-title"><h2>Map and review: {filename}</h2><button className="btn-outline small" onClick={()=>setOpen(false)}>Close preview</button></div><div className="wizard-grid"><label className="wizard-field">Customer name column<select value={nameCol} onChange={e=>setNameCol(e.target.value)}><option value="">Choose column</option>{headers.map(h=><option key={h}>{h}</option>)}</select></label><label className="wizard-field">Mobile column<select value={phoneCol} onChange={e=>setPhoneCol(e.target.value)}><option value="">Choose column</option>{headers.map(h=><option key={h}>{h}</option>)}</select></label></div><div className="metric-grid" style={{gridTemplateColumns:"repeat(3,minmax(0,1fr))"}}>{[{label:"Total records",value:rows.length},{label:"Basic valid",value:valid},{label:"Rejected",value:rejected}].map(x=><div className="metric-card" style={{minHeight:54}} key={x.label}><span className="metric-label">{x.label}</span><div className="metric-value">{x.value}</div></div>)}</div><div className="tablewrap"><table className="crm-table"><thead><tr><th>CSV row</th><th>Customer</th><th>Mobile</th><th>Validation</th></tr></thead><tbody>{preview.slice(0,15).map(p=><tr key={p.row}><td>{p.row}</td><td>{p.name||"—"}</td><td>{p.phone||"—"}</td><td><span className={p.error?"status-pill rejected":"status-pill approved"}>{p.error||"Basic check passed"}</span></td></tr>)}</tbody></table></div><p className="muted">Showing the first 15 rows. Database validation runs again when you import. Rejected records remain available in import history.</p><div className="wizard-footer"><span className="wizard-note">No calling or campaign launch will occur.</span><button disabled={busy||!nameCol||!phoneCol} onClick={importNow} className="btn-primary">{busy?"Importing…":"Import customers"}</button></div></div>}{!open&&<div className="customer-import-footer"><button type="button" className="btn-outline" onClick={onClose}>{success?"Done":"Cancel"}</button></div>}</div></dialog>;
}
