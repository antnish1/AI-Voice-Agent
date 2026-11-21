"use client";
import {useMemo,useState} from "react";
type Agent={id:string;name:string;version:string;category:string;status:"Active"|"Inactive";recommended:boolean;description:string;portrait:"woman"|"man"|"glasses"|"megaphone"|"robot";tone:string};
const previews:Agent[]=[
 {id:"support",name:"Customer Support Agent",version:"v2.0",category:"Support",status:"Active",recommended:true,description:"Helps customers with service queries and support requests.",portrait:"woman",tone:"blue"},
 {id:"sales",name:"Sales Outreach Agent",version:"v1.5",category:"Sales",status:"Active",recommended:false,description:"Reach out to potential customers with product information.",portrait:"man",tone:"sky"},
 {id:"reminder",name:"Service Reminder Agent",version:"v1.2",category:"Service",status:"Active",recommended:false,description:"Reminds customers about service appointments.",portrait:"glasses",tone:"peach"},
 {id:"promotion",name:"Promotion Agent",version:"v1.0",category:"Marketing",status:"Active",recommended:false,description:"Inform customers about latest offers and promotions.",portrait:"megaphone",tone:"violet"},
 {id:"feedback",name:"Feedback Agent",version:"v1.0",category:"Feedback",status:"Inactive",recommended:false,description:"Collect customer feedback and ratings.",portrait:"robot",tone:"indigo"}
];
function Icon({name,size=17}:{name:string;size?:number}){
 const common={width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.9,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
 const path:Record<string,React.ReactNode>={
 search:<><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></>,
 refresh:<><path d="M20 7a8 8 0 0 0-14-2L4 7"/><path d="M4 3v4h4M4 17a8 8 0 0 0 14 2l2-2"/><path d="M20 21v-4h-4"/></>,
 plus:<path d="M12 5v14M5 12h14"/>,
 play:<path d="m9 6 10 6-10 6z" fill="currentColor" stroke="none"/>,
 users:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-2c0-3 3-5 6-5s6 2 6 5v2M16 6a3 3 0 0 1 0 6m1 2c2.5.4 4 2 4 4v2"/></>,
 check:<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
 pause:<><circle cx="12" cy="12" r="9"/><path d="M10 8v8M14 8v8"/></>,
 star:<path d="m12 2 3.1 6.3L22 9.3l-5 4.8 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.8 6.9-1z"/>,
 sound:<><path d="M3 9v6M7 5v14M11 2v20M15 7v10M19 4v16M23 10v4"/></>,
 arrow:<path d="m9 18 6-6-6-6"/>,
 mic:<><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></>,
 info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>
 };
 return <svg {...common} aria-hidden="true">{path[name]??path.info}</svg>;
}
function Portrait({kind}:{kind:Agent["portrait"]}){
 if(kind==="robot")return <svg className="agent-portrait-svg" viewBox="0 0 120 120" role="img" aria-label="Robot illustration">
 <defs><linearGradient id="robotpaint" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#e9f5ff"/><stop offset="1" stopColor="#7d9feb"/></linearGradient></defs><circle cx="60" cy="60" r="58" fill="#e2e9fb"/><path d="M28 108c8-24 56-27 64 0" fill="#4878c7"/><rect x="26" y="33" width="68" height="53" rx="20" fill="url(#robotpaint)" stroke="#5274b9" strokeWidth="3"/><rect x="32" y="42" width="56" height="34" rx="13" fill="#172e69"/><rect x="41" y="50" width="15" height="12" rx="6" fill="#53ddff"/><rect x="64" y="50" width="15" height="12" rx="6" fill="#53ddff"/><path d="M50 69q10 7 20 0" fill="none" stroke="#53ddff" strokeWidth="2"/><path d="M60 32V20" stroke="#6586ca" strokeWidth="4"/><circle cx="60" cy="17" r="5" fill="#68bbf2"/></svg>;
 if(kind==="megaphone")return <svg className="agent-portrait-svg" viewBox="0 0 120 120" role="img" aria-label="Promotion agent illustration"><defs><linearGradient id="megapaint" x1="0" x2="1"><stop stopColor="#3e60df"/><stop offset="1" stopColor="#8c63ec"/></linearGradient></defs><circle cx="60" cy="60" r="58" fill="#e6e7ff"/><path d="M28 50h20l38-20v60L48 70H28z" fill="url(#megapaint)" stroke="#3646af" strokeWidth="3"/><rect x="25" y="48" width="14" height="25" rx="6" fill="#6370ed"/><path d="m46 72 9 27H40l-8-26" fill="#404abb"/><path d="M93 44l9-8M94 61h13M93 76l10 8" stroke="#6b72d7" strokeWidth="4" strokeLinecap="round"/></svg>;
 return <svg className="agent-portrait-svg" viewBox="0 0 120 120" role="img" aria-label="Illustrated customer representative">
 <circle cx="60" cy="60" r="58" fill={kind==="man"?"#d9ebfa":kind==="glasses"?"#f8e6df":"#e8eefb"}/>
 <path d="M15 119c4-28 23-40 45-40s42 12 45 40" fill={kind==="man"?"#2c4d7b":kind==="glasses"?"#47718b":"#456fab"}/>
 <path d="M51 79h18v18H51z" fill="#efbb9e"/><path d="M42 94l18 20 18-20-9-6H51z" fill="#fff"/>
 <ellipse cx="60" cy="53" rx="27" ry="32" fill="#efc1a6"/>
 <path d={kind==="man"?"M33 49q-5-34 27-33 35-1 29 35-12-15-17-14-17 12-39 12Z":"M30 66q-9-42 18-48 37-11 43 26l-2 34-11-10-1-32q-21 17-42 8l-1 30Z"} fill={kind==="glasses"?"#3b2a2c":kind==="woman"?"#52342e":"#42302a"}/>
 <ellipse cx="48" cy="55" rx="2" ry="2.7" fill="#403132"/><ellipse cx="71" cy="55" rx="2" ry="2.7" fill="#403132"/>
 <path d="M54 69q6 5 12 0" fill="none" stroke="#b9736c" strokeWidth="2" strokeLinecap="round"/>
 {kind==="glasses"&&<g stroke="#29384d" fill="none" strokeWidth="2.2"><rect x="37" y="47" rx="7" width="22" height="18"/><rect x="62" y="47" rx="7" width="22" height="18"/><path d="M59 53h3M37 52l-6-2M84 52l7-2"/></g>}
 </svg>;
}
function BannerRobot(){return <svg className="agent-banner-robot" viewBox="0 0 210 140" aria-hidden="true">
 <ellipse cx="119" cy="131" rx="75" ry="13" fill="#4a8fe9" opacity=".18"/><path d="M65 127c10-30 95-30 107 0" fill="#e9f8ff"/><path d="M77 120c13-22 70-22 84 0" fill="#7abcfb"/><rect x="61" y="31" width="116" height="79" rx="34" fill="#f6fbff" stroke="#87bbed" strokeWidth="5"/><rect x="72" y="42" width="94" height="58" rx="23" fill="#102e61"/><ellipse cx="101" cy="69" rx="15" ry="12" fill="#43d6ff"/><ellipse cx="139" cy="69" rx="15" ry="12" fill="#43d6ff"/><circle cx="101" cy="69" r="6" fill="#d9fcff"/><circle cx="139" cy="69" r="6" fill="#d9fcff"/><path d="M112 85q8 7 17 0" stroke="#48d6ff" strokeWidth="3" fill="none"/><path d="M118 31V20" stroke="#8cbcf0" strokeWidth="5"/><circle cx="118" cy="14" r="7" fill="#46ddf2"/><path d="M58 54q-12 13-7 30M180 55q14 13 7 30" fill="none" stroke="#d6eeff" strokeWidth="10"/></svg>}
function AgentCard({agent,onDetails}:{agent:Agent;onDetails:(a:Agent)=>void}){
 return <article className="agent-preview-card">
  {agent.recommended&&<span className="agent-ribbon">★ Recommended</span>}
  <div className="agent-card-status"><span className={agent.status==="Active"?"agent-state-active":"agent-state-inactive"}>● {agent.status}</span><span className="agent-version">{agent.version}</span></div>
  <div className="agent-card-content"><div className={"agent-card-portrait tone-"+agent.tone}><Portrait kind={agent.portrait}/></div><div className="agent-card-copy"><h3>{agent.name}</h3><p>{agent.description}</p></div></div>
  <div className="agent-card-actions"><button type="button" className="agent-sample-disabled" disabled title="Sample playback requires Sarvam integration"><span className="agent-sample-icon"><Icon name="play" size={11}/></span> Play Sample</button><button type="button" className="agent-detail-button" onClick={()=>onDetails(agent)}>View Details</button><button type="button" className="agent-use-disabled" disabled title="Sarvam API not connected">Use Agent</button></div>
 </article>;
}
export function AgentsDirectory(){
 const [search,setSearch]=useState(""),[status,setStatus]=useState("all"),[category,setCategory]=useState("all"),[version,setVersion]=useState("all"),[selected,setSelected]=useState<Agent|null>(null);
 const filtered=useMemo(()=>previews.filter(a=>(a.name+" "+a.description+" "+a.version).toLowerCase().includes(search.trim().toLowerCase())&&(status==="all"||a.status===status)&&(category==="all"||a.category===category)&&(version==="all"||a.version===version)),[search,status,category,version]);
 const clear=()=>{setSearch("");setStatus("all");setCategory("all");setVersion("all");};
 return <div className="agent-directory">
  <div className="agent-page-hero"><div className="agent-hero-heading"><div className="agent-hero-icon"><Icon name="sound" size={26}/></div><div><h1>AI Voice Agents</h1><p>Choose from our powerful AI voice agents to create intelligent calling campaigns</p></div></div>
   <div className="agent-hero-banner"><div><strong>Smarter Conversations.<br/>Higher Conversions.</strong><p>Leverage advanced AI voice agents for better engagement.</p></div><div className="agent-waveform" aria-hidden="true">▏│▎▏│▌│▏│▎▏│▌</div><BannerRobot/></div></div>
  <div className="agent-stats-grid">{[
   {label:"Total Agents",number:"—",note:"Awaiting API",icon:"users",tone:"blue"},
   {label:"Active Agents",number:"—",note:"Awaiting API",icon:"check",tone:"green"},
   {label:"Inactive Agents",number:"—",note:"Awaiting API",icon:"pause",tone:"purple"},
   {label:"Recommended",number:"—",note:"Awaiting API",icon:"star",tone:"orange"}
  ].map(m=><article className={"agent-stat-card agent-tone-"+m.tone} key={m.label}><span className="agent-stat-icon"><Icon name={m.icon} size={23}/></span><div><span>{m.label}</span><strong>{m.number}</strong><small>{m.note}</small></div><svg viewBox="0 0 85 35" aria-hidden="true"><path d="M1 25Q12 4 24 19T46 13T68 19T84 6" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M1 25Q12 4 24 19T46 13T68 19T84 6V35H1Z" fill="currentColor" opacity=".06"/></svg></article>)}</div>
  <div className="agent-page-controls"><label className="agent-list-search"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search agents..." aria-label="Search preview agents"/></label>
   <select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filter preview status"><option value="all">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
   <select value={category} onChange={e=>setCategory(e.target.value)} aria-label="Filter category"><option value="all">All Categories</option>{["Support","Sales","Service","Marketing","Feedback"].map(x=><option key={x}>{x}</option>)}</select>
   <select value={version} onChange={e=>setVersion(e.target.value)} aria-label="Filter version"><option value="all">All Versions</option>{["v2.0","v1.5","v1.2","v1.0"].map(x=><option key={x}>{x}</option>)}</select>
   <button type="button" className="agent-refresh" onClick={clear}><Icon name="refresh"/> Reset</button><button type="button" className="agent-create-disabled" disabled title="Agent creation will become available after Sarvam connection"><Icon name="plus"/> Create Agent</button>
  </div>
  <p className="agent-demo-note"><strong>UI design preview:</strong> The five example agents below are illustrative only. No Sarvam agents, versions, recordings or live availability are connected.</p>
  <div className="agent-card-grid">{filtered.map(a=><AgentCard agent={a} key={a.id} onDetails={setSelected}/>)}
  {filtered.length===0&&<div className="agent-no-results"><strong>No matching agents in this preview</strong><p>Try a different name, category, version or status.</p><button onClick={clear} type="button">Clear filters</button></div>}
  <aside className="agent-custom-card"><div><h3>Create Your Own<br/>AI Voice Agent</h3><p>Customize instructions, voice and behaviour for your business needs.</p><button type="button" disabled title="Agent creation requires Sarvam API">Create Agent <Icon name="arrow" size={13}/></button></div><div className="agent-custom-art"><div className="agent-mic-glow"/><span aria-hidden="true">🎙</span></div></aside></div>
  {selected&&<div className="agent-preview-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null);}}><section role="dialog" aria-modal="true" aria-label={selected.name+" details"} className="agent-preview-modal"><button type="button" aria-label="Close agent details" className="agent-modal-close" onClick={()=>setSelected(null)}>×</button><div className="agent-modal-title"><span className={"agent-card-portrait tone-"+selected.tone}><Portrait kind={selected.portrait}/></span><div><h2>{selected.name}</h2><span>Illustrative agent · {selected.version}</span></div></div><p>{selected.description}</p><dl><div><dt>Category</dt><dd>{selected.category}</dd></div><div><dt>Reference status</dt><dd>{selected.status} (sample only)</dd></div><div><dt>Sarvam connection</dt><dd>Not connected</dd></div></dl><div className="agent-preview-warning">Agent versions, sample playback and campaign selection will be enabled only after the Sarvam API is connected.</div><button type="button" onClick={()=>setSelected(null)} className="agent-modal-done">Close</button></section></div>}
 </div>;
}
