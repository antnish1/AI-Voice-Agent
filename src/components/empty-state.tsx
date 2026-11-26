import type {ReactNode} from "react";
import "./empty-state.css";
type Kind="customers"|"campaigns"|"calls"|"reports"|"agents"|"users"|"documents"|"activity"|"appointments"|"approvals"|"pickup";
const glyphs:Record<Kind,ReactNode>={
 customers:<><circle cx="115" cy="56" r="9"/><circle cx="96" cy="61" r="6"/><circle cx="134" cy="61" r="6"/><path d="M99 84v-5a16 16 0 0 1 32 0v5M85 83v-5a11 11 0 0 1 13-10m34 0a11 11 0 0 1 13 10v5"/></>,
 users:<><circle cx="115" cy="58" r="11"/><path d="M94 87v-4a21 21 0 0 1 42 0v4"/></>,
 campaigns:<><path d="m94 61 35-15v37L94 73zM94 61h-8v12h8m7 2 5 14h10l-5-11M136 56l8-5m-8 14h9m-9 9 8 5"/></>,
 calls:<path d="m94 49 10-3 7 12-7 5q5 12 17 17l5-7 12 7-3 10q-7 8-21-2Q94 78 89 61q-3-8 5-12z"/>,
 reports:<><path d="M91 87h48M98 87V70h8v17m8 0V59h8v28m8 0V47h8v40"/></>,
 agents:<><path d="M96 70v-7a19 19 0 0 1 38 0v7M96 69h8v15h-7q-4 0-4-4v-7q0-4 3-4zm38 0h-8v15h7q4 0 4-4v-7q0-4-3-4zM127 85q0 7-12 7"/></>,
 documents:<><rect x="99" y="47" width="32" height="42" rx="4"/><path d="M106 58h18m-18 10h18m-18 10h13"/></>,
 activity:<path d="M86 70h15l8-19 12 35 9-16h15"/>,
 appointments:<><rect x="92" y="52" width="46" height="38" rx="5"/><path d="M92 64h46m-34-18v12m22-12v12m-22 17h7m8 0h7"/></>,
 approvals:<><path d="M115 45l23 9v16q0 14-23 22-23-8-23-22V54zM104 69l8 8 14-16"/></>,
 pickup:<><path d="M88 57h32v23H88zM120 65h12l10 9v6h-22"/><circle cx="99" cy="83" r="6"/><circle cx="132" cy="83" r="6"/></>
};
export function EmptyState({kind,title,description,action,compact=false}:{kind:Kind;title:string;description?:string;action?:ReactNode;compact?:boolean}){
 return <div className={"crm-empty-state"+(compact?" crm-empty-compact":"")}>
 <svg viewBox="0 0 250 175" aria-hidden="true" className="crm-empty-art" fill="none">
 <ellipse cx="122" cy="158" rx="87" ry="9" fill="var(--empty-cloud)"/><circle cx="51" cy="99" r="25" fill="var(--empty-cloud)"/><circle cx="193" cy="91" r="31" fill="var(--empty-cloud)"/>
 <rect x="66" y="18" width="98" height="132" rx="13" fill="var(--empty-paper)" stroke="var(--empty-edge)" strokeWidth="2"/><rect x="91" y="12" width="49" height="13" rx="6.5" fill="#4c91dc"/><path d="M104 18h23" stroke="#bce9ff" strokeWidth="4" strokeLinecap="round"/>
 <g stroke="var(--empty-symbol)" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">{glyphs[kind]}</g>
 <path d="M90 109h49m-49 13h40m-40 12h28" stroke="var(--empty-edge)" strokeWidth="5" strokeLinecap="round"/>
 <circle cx="180" cy="109" r="22" fill="var(--empty-paper)" stroke="#438de4" strokeWidth="5"/><path d="m196 126 20 20" stroke="#3479ca" strokeWidth="6" strokeLinecap="round"/>
 <path d="M38 41v14m-7-7h14m140-21v14m-7-7h14M45 133l4 7 7 4-7 4-4 7-4-7-7-4 7-4z" stroke="#83b9f5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="m38 96 7 7 12-14" stroke="#10aaa5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
 </svg><h3>{title}</h3>{description&&<p>{description}</p>}{action&&<div className="crm-empty-action">{action}</div>}</div>;
}
