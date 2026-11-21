"use client";
import {useState} from "react";

type Glyph="truck"|"car"|"check"|"clock"|"cancel"|"search"|"calendar"|"plus"|"map"|"eye"|"edit"|"trash"|"pin"|"info"|"refresh";
function Icon({name,size=18}:{name:Glyph;size?:number}){
 const paths:Record<Glyph,React.ReactNode>={
 truck:<><path d="M2 6h13v11H2zM15 10h4l3 4v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
 car:<><path d="m5 10 2-5h10l2 5M4 10h16l2 3v6h-3v-2H5v2H2v-6z"/><path d="M6 14h2M16 14h2"/></>,
 check:<><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
 cancel:<><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></>,
 search:<><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18"/></>,
 plus:<path d="M12 4v16M4 12h16"/>,
 map:<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/></>,
 eye:<><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
 edit:<path d="m4 16 12-12 4 4-12 12-5 1z"/>,
 trash:<><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
 pin:<><path d="M12 22s8-9 8-14a8 8 0 0 0-16 0c0 5 8 14 8 14Z"/><circle cx="12" cy="8" r="3"/></>,
 info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
 refresh:<><path d="M20 8a8 8 0 0 0-14-3L4 7V3m0 4h4M4 16a8 8 0 0 0 14 3l2-2v4m0-4h-4"/></>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function MapBanner(){return <svg className="pd-banner-art" viewBox="0 0 440 122" aria-hidden="true">
 <defs><linearGradient id="pdSky" x1="0" x2="1"><stop stopColor="#d8f4ff"/><stop offset="1" stopColor="#84b7ef"/></linearGradient></defs>
 <path d="M0 105Q50 52 110 91T225 75T440 89V122H0Z" fill="#81d9d4" opacity=".36"/>
 {Array.from({length:15},(_,i)=><rect key={i} x={20+i*27} y={58-(i%4)*10} width={11+(i%3)*7} height={66} fill={i%3===0?"#7bc1e8":"#afd8ec"} opacity=".47"/>)}
 <path d="M0 111 127 57 262 62 440 115" fill="#f4fcff" stroke="#8dc5e2" strokeWidth="3"/>
 <path d="M0 122 145 78 273 80 440 122" fill="#e7f4e7" stroke="#90c6cc" strokeWidth="2"/>
 <path d="m120 112 110-55 77 23 60-34" fill="none" stroke="#2588db" strokeWidth="3" strokeDasharray="7 4" strokeLinecap="round"/>
 <circle cx="120" cy="112" r="6" fill="#138db4" stroke="#fff" strokeWidth="3"/>
 <path d="M305 20a20 20 0 0 0-40 0c0 14 20 35 20 35s20-21 20-35Z" fill="#117edc" stroke="#b9eaff" strokeWidth="3"/><circle cx="285" cy="20" r="7" fill="white"/>
 <path d="M28 91q12-26 24-1m330-2q11-24 23-1" stroke="#31ad9f" strokeWidth="6" fill="none" opacity=".55"/>
 </svg>}
const metrics=[{label:"Total Requests",icon:"car" as const,tone:"blue"},{label:"Completed",icon:"check" as const,tone:"green"},{label:"Pending",icon:"clock" as const,tone:"orange"},{label:"Cancelled",icon:"cancel" as const,tone:"purple"}];
const tabs=["All","Pending","Completed","Cancelled"] as const;
export function PickupDropDirectory({children}:{children:React.ReactNode}){
 const [search,setSearch]=useState(""),[status,setStatus]=useState("all"),[range,setRange]=useState("30"),[tab,setTab]=useState<(typeof tabs)[number]>("All");
 const reset=()=>{setSearch("");setStatus("all");setRange("30");setTab("All");};
 return <div className="pd-reference">
  <header className="pd-hero"><div className="pd-hero-heading"><span className="pd-hero-icon"><Icon name="truck" size={29}/></span><div><h1>Pickup &amp; Drop</h1><p>Manage customer pickup and drop requests</p></div></div><div className="pd-hero-banner"><MapBanner/></div></header>
  {children}
 </div>;
}