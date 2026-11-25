"use client";
import {useEffect,useRef} from "react";
type Props={name:string;dealership:string;status:string;created:string;approved:string;autoOpen?:boolean};
export function CampaignDetailsPopup({name,dealership,status,created,autoOpen=false}:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(autoOpen&&!dialog.current?.open)dialog.current?.showModal();},[autoOpen]);
 const fields=[["Dealership",dealership,"building"],["Created",created,"calendar"]];
 const close=()=>dialog.current?.close();
 const tone=status==="Ongoing"||status==="Complete"?"approved":status==="Reject"?"rejected":"pending";
 return <><button type="button" className="btn-outline small" onClick={()=>dialog.current?.showModal()}>View</button>
 <dialog ref={dialog} aria-label="Campaign Details" className="fc-campaign-details-dialog" onClick={e=>{if(e.target===e.currentTarget)close();}}>
 <section className="fc-details-surface">
 <header className="fc-details-heading"><span className="fc-details-emblem" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 11V7l9-4v18l-9-4v-6ZM13 7l6-2v14l-6-2M4 11H2v6h3l2 4"/></svg></span><div><h2>Campaign Details</h2><p>Campaign overview</p></div><button type="button" className="fc-details-close" aria-label="Close campaign details" onClick={close}>×</button></header>
 <dl className="fc-details-grid"><div className="fc-details-identity"><div><dt>Campaign ID</dt><dd>{name}</dd><span className={`status-pill ${tone}`}>{status.replaceAll("_"," ")}</span></div></div>{fields.map(([label,value,kind])=><div key={label}><span className="fc-details-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{kind==="building"?<path d="M3 21h18M5 21V5l7-2v18M12 9h7v12M8 8v1m0 3v1m0 3v1m7-4v1m0 3v1"/>:kind==="calendar"?<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>:<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>}</svg></span><div><dt>{label}</dt><dd>{value}</dd></div></div>)}</dl>
 <footer className="fc-details-footer"><button type="button" className="fc-details-ok" onClick={close}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg> OK</button></footer>
 </section></dialog></>;
}
