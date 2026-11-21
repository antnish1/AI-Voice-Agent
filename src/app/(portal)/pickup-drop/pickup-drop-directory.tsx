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
export function PickupDropDirectory(){
 const [search,setSearch]=useState(""),[status,setStatus]=useState("all"),[range,setRange]=useState("30"),[tab,setTab]=useState<(typeof tabs)[number]>("All");
 const reset=()=>{setSearch("");setStatus("all");setRange("30");setTab("All");};
 return <div className="pd-reference">
  <header className="pd-hero"><div className="pd-hero-heading"><span className="pd-hero-icon"><Icon name="truck" size={29}/></span><div><h1>Pickup &amp; Drop</h1><p>Manage customer pickup and drop requests</p></div></div><div className="pd-hero-banner"><MapBanner/></div></header>
  <div className="pd-metrics">{metrics.map(x=><article className={"pd-metric tone-"+x.tone} key={x.label}><span className="pd-metric-icon"><Icon name={x.icon} size={23}/></span><div><span>{x.label}</span><strong>—</strong><small>Workflow not connected</small></div><svg viewBox="0 0 86 36" aria-hidden="true"><path d="M1 28Q14 8 26 21T46 14T67 20T85 6" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M1 28Q14 8 26 21T46 14T67 20T85 6V36H1Z" fill="currentColor" opacity=".06"/></svg></article>)}</div>
  <div className="pd-toolbar"><label className="pd-search"><Icon name="search" size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search pickup and drop requests" placeholder="Search by customer name or phone number..."/></label><select aria-label="Request status filter" value={status} onChange={e=>{setStatus(e.target.value);setTab(e.target.value==="all"?"All":e.target.value==="pending"?"Pending":e.target.value==="completed"?"Completed":"Cancelled");}}><option value="all">All Status</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><select aria-label="Campaign filter" disabled title="Campaign links will be available after integration"><option>All Campaigns</option></select><label className="pd-range"><Icon name="calendar" size={15}/><select aria-label="Date range" value={range} onChange={e=>setRange(e.target.value)}><option value="7">Last 7 Days</option><option value="30">Date Range: 30 Days</option><option value="90">Last 90 Days</option><option value="all">All Dates</option></select></label><button className="pd-reset" type="button" onClick={reset} title="Reset filters" aria-label="Reset filters"><Icon name="refresh" size={16}/></button><button className="pd-create" disabled type="button" title="Request creation will be available after a secure database workflow is connected"><Icon name="plus" size={16}/> New Request</button></div>
  <div className="pd-content-grid">
   <section className="pd-map-panel"><header><h2>Pickup &amp; Drop Map</h2><span title="Route mapping will be enabled after locations are verified">View Full Map <span aria-hidden="true">→</span></span></header><div className="pd-map-placeholder" role="img" aria-label="Map placeholder: no verified pickup or drop locations available"><div className="pd-map-grid" aria-hidden="true"/><div className="pd-map-empty"><span><Icon name="map" size={24}/></span><strong>Map ready for locations</strong><p>Verified pickup and drop addresses will appear here.</p></div></div><footer><Icon name="pin" size={14}/> No verified route coordinates available</footer></section>
   <section className="pd-requests-panel"><header><h2><Icon name="car" size={19}/> Pickup &amp; Drop Requests</h2><nav aria-label="Pickup request status">{tabs.map(x=><button type="button" key={x} aria-current={tab===x?"page":undefined} className={tab===x?"active":""} onClick={()=>{setTab(x);setStatus(x==="All"?"all":x.toLowerCase());}}>{x} (—)</button>)}</nav></header><div className="tablewrap"><table className="pd-requests-table"><thead><tr><th>#</th><th>Customer Name</th><th>Phone Number</th><th>Pickup Address</th><th>Drop Location</th><th>Request Date</th><th>Status</th><th>Actions</th></tr></thead><tbody><tr><td colSpan={8} className="pd-no-records"><span><Icon name="truck" size={22}/></span><strong>No pickup or drop requests available</strong><p>Once the operational workflow is connected, customer requests and verified routes will appear in this table.</p><div aria-label="View edit delete actions unavailable" className="pd-inactive-actions"><Icon name="eye" size={15}/><Icon name="edit" size={15}/><Icon name="trash" size={15}/></div></td></tr></tbody></table></div><footer className="pd-pagination"><span>Showing 0 pickup and drop requests</span><nav aria-label="Pickup request pages"><button type="button" disabled aria-label="Previous page">‹</button><button type="button" className="active" aria-current="page">1</button><button type="button" disabled aria-label="Next page">›</button></nav></footer></section>
  </div>
  <p className="pd-safety-note"><Icon name="info" size={13}/> A customer request is not a confirmed booking. Pickup date, address and workshop availability require verification before confirmation. No routes or bookings have been fabricated.</p>
 </div>;
}