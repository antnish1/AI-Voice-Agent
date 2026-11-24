"use client";
import {useRef} from "react";
type Props={name:string;dealership:string;status:string;created:string;approved:string;uploaded:number|null;eligible:number|null};
export function CampaignDetailsPopup({name,dealership,status,created,approved,uploaded,eligible}:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 const fields=[["Campaign name",name],["Dealership",dealership],["Created",created],["Approved",approved],["Uploaded recipients",uploaded??"Not staged"],["Eligible recipients",eligible??"Not staged"]];
 return <><button type="button" className="btn-outline small" onClick={()=>dialog.current?.showModal()}>View</button>
 <dialog ref={dialog} aria-label="Campaign Details" className="fc-campaign-details-dialog" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
 <section className="crm-panel" style={{margin:0,padding:24}}>
 <div className="panel-title" style={{display:"flex",alignItems:"center",gap:12}}><h2 style={{flex:1}}>Campaign Details</h2><span className="status-pill">{status.replaceAll("_"," ")}</span><button type="button" className="btn-outline small" aria-label="Close campaign details" onClick={()=>dialog.current?.close()}>×</button></div>
 <dl style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,210px),1fr))",gap:20,margin:0}}>{fields.map(([label,value])=><div key={label}><dt className="muted">{label}</dt><dd style={{margin:"4px 0 0",fontWeight:700,overflowWrap:"anywhere"}}>{value}</dd></div>)}</dl>
 </section></dialog></>;
}
