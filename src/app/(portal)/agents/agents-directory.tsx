"use client";
import {ArtworkImage} from "@/components/artwork-image";
import {EmptyState} from "@/components/empty-state";
import {useMemo,useState,useEffect,useRef,useId,type ReactNode} from "react";
import "./agents-directory.css";
type Profile={dealership_id:string;name:string;agent_id:string;app_version:number;connection_id:string;caller_number:string;active:boolean};
type Agent={id:string;name:string;version:string;category:string;status:"Active"|"Inactive";recommended:boolean;description:string;portrait:"woman"|"man"|"glasses"|"megaphone"|"robot";tone:string;profiles?:Profile[]};
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
function DetailGlyph({name}:{name:string}){
 const paths:Record<string,ReactNode>={copy:<><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3"/></>,layers:<><path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/></>,phone:<path d="M5 3h4l2 5-3 2c2 3 3 4 6 6l2-3 5 2v4c0 2-2 2-4 2C9 19 5 15 3 7c0-2 0-4 2-4z"/>,code:<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-2-15-4 18"/>,headset:<><path d="M3 13v-2a9 9 0 0 1 18 0v2M3 13h4v7H5a2 2 0 0 1-2-2zm18 0h-4v7h2a2 2 0 0 0 2-2zM17 20q0 2-5 2"/></>,close:<path d="m6 6 12 12M18 6 6 18"/>,check:<path d="m5 12 4 4 10-10"/>};
 return name==="users"?<Icon name="users" size={24}/>:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function ConfiguredAgentDetails({agent,onClose}:{agent:Agent;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [copied,setCopied]=useState(""),[copyError,setCopyError]=useState("");
 useEffect(()=>{const node=dialog.current;node?.showModal();return ()=>{if(node?.open)node.close();};},[]);
 const profiles=agent.profiles??[];
 const groups=new Map<string,Profile[]>();
 for(const p of profiles){const key=JSON.stringify([p.agent_id,p.connection_id,p.caller_number]);const group=groups.get(key)??[];group.push(p);groups.set(key,group);}
 const grouped=Array.from(groups.values());
 const fields=(p:Profile)=>[{label:"Sarvam Agent ID",value:p.agent_id,icon:"layers"},{label:"Connected Caller Number",value:p.caller_number,icon:"users"},{label:"Telephony Connection ID",value:p.connection_id,icon:"phone"}];
 async function copy(value:string,key:string){setCopyError("");setCopied("");try{await navigator.clipboard.writeText(value);setCopied(key);}catch{setCopyError("Clipboard unavailable. Select and copy the text manually.");}}
 const all=grouped.map(group=>[...fields(group[0]).map(f=>f.label+": "+f.value),"Assigned Dealerships:",...group.map(p=>p.name+" — Committed Agent Version: "+p.app_version)].join("\n")).join("\n\n");
 return <dialog ref={dialog} className="configured-agent-dialog" aria-labelledby="configured-agent-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="configured-agent-panel">
   <div className="configured-agent-wave top" aria-hidden="true"><i/><i/><i/></div><div className="configured-agent-wave bottom" aria-hidden="true"><i/><i/><i/></div>
   <button type="button" className="configured-agent-x" aria-label="Close agent details" onClick={onClose}><DetailGlyph name="close"/></button>
   <header className="configured-agent-header"><div className="configured-agent-avatar"><Portrait kind={agent.portrait}/>{agent.status==="Active"&&<span title="Active saved configuration"/>}</div><div><h2 id="configured-agent-title">{agent.name} <span>{agent.version}</span></h2><p><Icon name="sound" size={28}/> Configured Sarvam agent</p></div></header>
   <div className="configured-agent-summary"><div><DetailGlyph name="headset"/><span>{agent.description}</span></div><button type="button" className="configured-agent-primary" onClick={()=>void copy(all,"all")}><DetailGlyph name={copied==="all"?"check":"copy"}/>{copied==="all"?"Copied":"Copy All"}</button></div>
   {grouped.map((group,i)=><div className="configured-agent-group" key={JSON.stringify([group[0].agent_id,group[0].connection_id,group[0].caller_number])}>{grouped.length>1&&<h3>Calling configuration {i+1}</h3>}<div className="configured-agent-columns">{[fields(group[0]).slice(0,2),fields(group[0]).slice(2)].map((column,j)=><div className="configured-agent-field-card" key={j}>{column.map(f=>{const key=i+":"+f.label;return <div className="configured-agent-field" key={f.label}><span className="configured-agent-field-icon"><DetailGlyph name={f.icon}/></span><div className="configured-agent-field-text"><span>{f.label}</span><strong>{f.value}</strong></div><button type="button" className="configured-agent-copy" aria-label={"Copy "+f.label} title={"Copy "+f.label} onClick={()=>void copy(f.value,key)}><DetailGlyph name={copied===key?"check":"copy"}/></button></div>})}</div>)}</div><div className="configured-agent-dealers configured-agent-field-card"><h3>Assigned Dealerships</h3><div className="configured-agent-dealer-heading"><span>Dealership</span><span>Committed Agent Version</span></div>{group.map(p=><div className="configured-agent-dealer-row" key={p.dealership_id}><span>{p.name}</span><div><strong className="configured-agent-dealer-version">v{p.app_version}</strong><button type="button" className="configured-agent-copy" aria-label={"Copy committed version for "+p.name} onClick={()=>void copy(String(p.app_version),"version:"+p.dealership_id)}><DetailGlyph name={copied==="version:"+p.dealership_id?"check":"copy"}/></button></div></div>)}</div></div>)}
   <footer className="configured-agent-footer"><span className="configured-agent-footnote" title="Saved CRM configuration; live provider status and connection name not independently verified">{copyError|| (copied?"Copied to clipboard": "Saved configuration · "+profiles.map(p=>p.name).join(", "))}</span><button type="button" className="configured-agent-primary" onClick={onClose}>Close</button></footer>
   <span className="configured-agent-sr" role="status">{copyError|| (copied?"Copied to clipboard":"")}</span>
  </section>
 </dialog>;
}
function AgentArtwork({kind}:{kind:string}){
 const id=useId().replace(/:/g,"");
 const g=(n:string)=>"url(#"+id+n+")";
 const robot=kind==="robot"||kind==="hero";
 return <svg className="agent-artwork" viewBox="0 0 160 130" aria-hidden="true">
 <defs>
 <linearGradient id={id+"shell"} x2=".8" y2="1"><stop stopColor="#fff"/><stop offset=".45" stopColor="#e8e5ff"/><stop offset="1" stopColor="#8b82cf"/></linearGradient>
 <linearGradient id={id+"purple"} x2=".8" y2="1"><stop stopColor="#d6b9ff"/><stop offset=".45" stopColor="#9261f4"/><stop offset="1" stopColor="#4231b8"/></linearGradient>
 <linearGradient id={id+"blue"} x2=".8" y2="1"><stop stopColor="#b3e3ff"/><stop offset=".45" stopColor="#5598e9"/><stop offset="1" stopColor="#244a9a"/></linearGradient>
 <linearGradient id={id+"gold"} x2=".8" y2="1"><stop stopColor="#fff3a5"/><stop offset=".5" stopColor="#ffbf32"/><stop offset="1" stopColor="#e87912"/></linearGradient>
 <radialGradient id={id+"skin"} cx=".34" cy=".25" r=".8"><stop stopColor="#ffe6cf"/><stop offset=".7" stopColor="#f1b68b"/><stop offset="1" stopColor="#cc805d"/></radialGradient>
 <linearGradient id={id+"hair"} x2=".8" y2="1"><stop stopColor="#9b6650"/><stop offset=".5" stopColor="#50302f"/><stop offset="1" stopColor="#251d35"/></linearGradient>
 <linearGradient id={id+"face"} x2=".8" y2="1"><stop stopColor="#344575"/><stop offset="1" stopColor="#121a3a"/></linearGradient>
 </defs>
 <ellipse cx="80" cy="117" rx="55" ry="7" fill="#6651ad" opacity=".13"/>
 {robot?<><ellipse cx="80" cy="108" rx="55" ry="13" fill={g("purple")}/><ellipse cx="80" cy="103" rx="55" ry="10" fill="#dcd4ff"/><rect x="54" y="80" width="52" height="27" rx="15" fill={g("shell")}/><rect x="27" y="19" width="106" height="72" rx="34" fill={g("shell")}/><rect x="38" y="29" width="84" height="51" rx="23" fill={g("face")}/><rect x="21" y="39" width="15" height="31" rx="7" fill={g("purple")}/><rect x="124" y="39" width="15" height="31" rx="7" fill={g("blue")}/><path d="M53 53q7-12 14 0m26 0q7-12 14 0M73 65q7 7 14 0" stroke="#6ff0ff" strokeWidth="4" fill="none" strokeLinecap="round"/><circle cx="80" cy="95" r="8" fill={g("blue")}/><path d="M80 91v7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><rect x="112" y="4" width="43" height="23" rx="11" fill={g("purple")}/><path d="M122 13v6m7-10v12m7-8v6m7-10v12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></>:kind==="reminder"?<><rect x="23" y="27" width="105" height="82" rx="13" fill={g("purple")}/><rect x="29" y="43" width="93" height="59" rx="9" fill="#f8f6ff"/>{[44,72,100].map(x=><g key={x}><rect x={x-7} y="16" width="10" height="24" rx="5" fill={g("shell")}/><rect x={x-8} y="53" width="17" height="14" rx="4" fill={g("blue")}/><rect x={x-8} y="75" width="17" height="14" rx="4" fill={g("purple")}/></g>)}<path d="M99 98q9-7 9-19a16 16 0 0 1 32 0q0 12 9 19z" fill={g("gold")}/><ellipse cx="124" cy="99" rx="25" ry="6" fill="#f49b19"/><circle cx="124" cy="105" r="6" fill={g("gold")}/></>:kind==="promotion"?<><path d="M24 51h37l53-28v70L61 74H24z" fill={g("purple")}/><ellipse cx="113" cy="58" rx="20" ry="35" fill={g("purple")}/><ellipse cx="113" cy="58" rx="13" ry="26" fill="#44319d"/><rect x="21" y="48" width="25" height="29" rx="9" fill={g("blue")}/><path d="m45 74 12 32h16L63 74" fill={g("purple")}/><rect x="88" y="79" width="47" height="37" rx="9" fill="#e94979" transform="rotate(-12 111 97)"/><text x="111" y="105" textAnchor="middle" fill="white" fontSize="26" fontWeight="bold">%</text></>:<><path d="M25 116q4-35 52-35t52 35" fill={g("blue")}/>{kind==="woman"&&<path d="M31 94Q9 12 75 10q56 0 49 86z" fill={g("hair")}/>}<ellipse cx="77" cy="55" rx="32" ry="35" fill={g("skin")}/><path d="M44 48Q35 14 77 13q38-2 34 36Q89 35 84 29q-16 20-40 19" fill={g("hair")}/><ellipse cx="65" cy="55" rx="3.5" ry="5" fill="#332635"/><ellipse cx="89" cy="55" rx="3.5" ry="5" fill="#332635"/><path d="M67 70q10 12 20 0" fill="#9d4b52"/><path d="m61 84 16 18 17-18" fill="#fff"/>{kind!=="sales"&&<><path d="M39 52a38 38 0 0 1 76 0" stroke="#7969ca" strokeWidth="7" fill="none"/><rect x="34" y="48" width="15" height="25" rx="7" fill={g("shell")}/><rect x="106" y="48" width="15" height="25" rx="7" fill={g("blue")}/><path d="M113 72q0 12-20 12" fill="none" stroke="#4c5e9f" strokeWidth="3"/></>}{kind==="support"&&<><path d="M83 86h55l-8 30H73z" fill={g("shell")}/><circle cx="108" cy="101" r="4" fill="#fff"/></>}{kind==="sales"&&<><path d="M106 62h15l26-15v43l-26-12h-15z" fill={g("gold")}/><ellipse cx="147" cy="68" rx="9" ry="22" fill="#e78b19"/></>}</>}
 </svg>;
}
function AgentCard({agent,onDetails}:{agent:Agent;onDetails:(a:Agent)=>void}){
 const inUse=!!agent.profiles&&agent.status==="Active";
 return <article className={"agent-preview-card"+(inUse?" agent-current-card":"")}>
  {inUse?<span className="agent-ribbon agent-current-ribbon">✓ Currently Used</span>:agent.recommended&&<span className="agent-ribbon">★ Recommended</span>}
  <div className="agent-card-status"><span className={agent.status==="Active"?"agent-state-active":"agent-state-inactive"}>● {agent.profiles?"Configured":"Preview"} · {agent.status}</span><span className="agent-version">{agent.version}</span></div>
  <div className="agent-card-content"><div className={"agent-card-portrait tone-"+agent.tone}><ArtworkImage key={agent.id} name={"agents-"+(agent.profiles?"kajal":agent.id)} fallback={<AgentArtwork kind={agent.profiles?"woman":agent.id==="feedback"?"robot":agent.id}/>}/></div><div className="agent-card-copy"><h3>{agent.name}</h3><p>{agent.description}</p></div></div>
  <div className="agent-card-actions"><button type="button" className="agent-sample-disabled" disabled title="Sample playback requires Sarvam integration"><span className="agent-sample-icon"><Icon name="play" size={11}/></span> Play Sample</button><button type="button" className="agent-detail-button" onClick={()=>onDetails(agent)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>View Details</button><button type="button" className="agent-use-disabled" disabled title={agent.profiles?"Use the saved voice configuration when creating a campaign":"Preview agent cannot be used"}><Icon name="play" size={14}/>Use Agent</button></div>
 </article>;
}
function EmptyAgentArtwork(){
 return <svg className="agent-empty-illustration" viewBox="0 0 290 176" fill="none" aria-hidden="true">
  <defs><linearGradient id="ae-paper" x1="90" y1="16" x2="201" y2="165" gradientUnits="userSpaceOnUse"><stop stopColor="#fff"/><stop offset="1" stopColor="#e3efff"/></linearGradient><linearGradient id="ae-accent" x1="75" y1="70" x2="212" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor="#16c9c3"/><stop offset="1" stopColor="#2461c3"/></linearGradient></defs>
  <ellipse cx="146" cy="160" rx="97" ry="9" fill="#e5f1fd"/>
  <circle cx="145" cy="77" r="64" fill="#edf6ff"/><circle cx="66" cy="93" r="26" fill="#f1f8ff"/><circle cx="230" cy="87" r="30" fill="#eef5ff"/>
  <rect x="96" y="19" width="105" height="129" rx="13" fill="url(#ae-paper)" stroke="#bfd7f4" strokeWidth="2"/>
  <rect x="124" y="13" width="49" height="14" rx="6" fill="#5895df"/><rect x="137" y="17" width="23" height="5" rx="2" fill="#aee2ff"/>
  <circle cx="148" cy="66" r="27" fill="#e0f8fc" stroke="#7cc9de" strokeWidth="2"/>
  <path d="M136 65v-5a12 12 0 0 1 24 0v5M132 66h8v15h-5a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4Zm24 0h8v15h-5a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4Zm0 15v2c0 5-4 7-10 7h-3" stroke="#1394b7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M123 104h50M123 117h40M123 130h30" stroke="#c2d9ef" strokeWidth="5" strokeLinecap="round"/>
  <path d="m75 80 5 5 10-12" stroke="#19bcb2" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
  <circle cx="220" cy="101" r="23" fill="#fff" stroke="#4597e8" strokeWidth="5"/><path d="m237 118 18 18" stroke="#246bc1" strokeWidth="6" strokeLinecap="round"/>
  <path d="M49 52v-13M42 46h14M222 36v-11M216 31h12M75 133l4-7 4 7 7 4-7 4-4 7-4-7-7-4 7-4Z" stroke="#9bcaf7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>;
}
export function AgentsDirectory({profiles,loadError,headerAction}:{profiles:Profile[];loadError:boolean;headerAction:ReactNode}){
 const actual=useMemo(()=>{const groups=new Map<string,Profile[]>();for(const p of profiles){if(!p.agent_id)continue;const list=groups.get(p.agent_id)??[];list.push(p);groups.set(p.agent_id,list);}return Array.from(groups,([id,list]):Agent=>{const active=list.some(p=>p.active);const versions=Array.from(new Set(list.map(p=>p.app_version))).sort((a,b)=>b-a);return {id:"configured:"+id,name:id==="Conversatio-95f7d6e8-61a2"?"Kajal":id,version:versions.map(v=>"v"+v).join(", "),category:"Service",status:active?"Active":"Inactive",recommended:false,description:id==="Conversatio-95f7d6e8-61a2"?"AI voice agent for dealership service calls.":"Saved Sarvam voice configuration",portrait:"woman",tone:"blue",profiles:list};});},[profiles]);
 const agents=useMemo(()=>[...actual,...previews],[actual]);
 const [search,setSearch]=useState(""),[kpiFilter,setKpiFilter]=useState<"all"|"total"|"active"|"inactive"|"recommended">("all"),[category,setCategory]=useState("all"),[version,setVersion]=useState("all"),[selected,setSelected]=useState<Agent|null>(null);
 const filtered=useMemo(()=>agents.filter(a=>{
  const matchesKpi=kpiFilter==="all"||(!!a.profiles&&(kpiFilter==="total"||(kpiFilter==="active"&&a.status==="Active")||(kpiFilter==="inactive"&&a.status==="Inactive")||(kpiFilter==="recommended"&&a.recommended)));
  return matchesKpi&&(a.name+" "+a.description+" "+a.version+" "+(a.profiles?.map(p=>p.name+" "+p.agent_id+" "+p.caller_number).join(" ")??"")).toLowerCase().includes(search.trim().toLowerCase())&&(category==="all"||a.category===category)&&(version==="all"||a.version===version);
 }),[agents,search,kpiFilter,category,version]);
 const clear=()=>{setSearch("");setKpiFilter("all");setCategory("all");setVersion("all");};
 const selectKpi=(filter:"total"|"active"|"inactive"|"recommended")=>setKpiFilter(current=>current===filter?"all":filter);
 return <div className="agent-directory">
  <div className="agent-page-hero"><div className="agent-hero-heading"><div className="agent-hero-icon"><Icon name="sound" size={26}/></div><div><h1>AI Voice Agents</h1><p className="agent-hero-subtitle">Create, manage and deploy intelligent voice agents for customer interactions.</p></div></div><div className="agent-hero-art"><ArtworkImage name="agents-hero" fallback={<AgentArtwork kind="hero"/>}/></div>
   {headerAction}
  </div>
  {loadError&&<p role="alert">Saved agent configurations could not be loaded.</p>}
  <div className="agent-stats-grid">{[
   {label:"Total Agents",filter:"total" as const,number:loadError?"—":String(actual.length),note:"Configured agents",icon:"users",tone:"blue"},
   {label:"Active Agents",filter:"active" as const,number:loadError?"—":String(actual.filter(a=>a.status==="Active").length),note:"Active configuration",icon:"check",tone:"green"},
   {label:"Inactive Agents",filter:"inactive" as const,number:loadError?"—":String(actual.filter(a=>a.status==="Inactive").length),note:"Inactive configuration",icon:"pause",tone:"purple"},
   {label:"Recommended",filter:"recommended" as const,number:loadError?"—":String(actual.filter(a=>a.recommended).length),note:"Configured agents only",icon:"star",tone:"orange"}
  ].map(m=><button type="button" className={"agent-stat-card agent-tone-"+m.tone+(kpiFilter===m.filter?" agent-stat-selected":"")} key={m.label} aria-pressed={kpiFilter===m.filter} aria-label={"Show "+m.label.toLowerCase()+" ("+m.number+")"} onClick={()=>selectKpi(m.filter)}><span className="agent-stat-icon"><ArtworkImage name={"agents-"+(m.filter)} fallback={<Icon name={m.icon} size={23}/>}/></span><div><span>{m.label}</span><strong>{m.number}</strong><small>{m.note}</small></div><svg viewBox="0 0 85 35" aria-hidden="true"><path d="M1 25Q12 4 24 19T46 13T68 19T84 6" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M1 25Q12 4 24 19T46 13T68 19T84 6V35H1Z" fill="currentColor" opacity=".06"/></svg></button>)}</div>
  <div className="agent-page-controls"><label className="agent-list-search"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search agents..." aria-label="Search agents"/></label>
   <select value={category} onChange={e=>setCategory(e.target.value)} aria-label="Filter category"><option value="all">All Categories</option>{["Support","Sales","Service","Marketing","Feedback"].map(x=><option key={x}>{x}</option>)}</select>
   <select value={version} onChange={e=>setVersion(e.target.value)} aria-label="Filter version"><option value="all">All Versions</option>{Array.from(new Set(agents.map(a=>a.version))).map(x=><option key={x}>{x}</option>)}</select>
   <button type="button" className="agent-create-disabled" disabled title="Agent creation will become available after Sarvam connection"><Icon name="plus"/> Create Agent</button>
  </div>

  {filtered.length>0?
   <div className="agent-card-grid">{filtered.map(a=><AgentCard agent={a} key={a.id} onDetails={setSelected}/>)}</div>:
   <section className="agent-empty-panel" aria-label={agents.length===0?"No AI voice agents yet":"No matching AI voice agents"}>
    <EmptyState kind="agents" title={agents.length===0?"No agents yet":"No matching agents"} description={loadError?"Saved configurations could not be loaded.": "No agents match your current search, category or version filters."} action={agents.length>0?<button type="button" onClick={clear}>Clear filters</button>:undefined}/></section>}
  {selected?.profiles&&<ConfiguredAgentDetails key={selected.id} agent={selected} onClose={()=>setSelected(null)}/>}
  {selected&&!selected.profiles&&<div className="agent-preview-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null);}}><section role="dialog" aria-modal="true" aria-label={selected.name+" details"} className="agent-preview-modal"><button type="button" aria-label="Close agent details" className="agent-modal-close" onClick={()=>setSelected(null)}>×</button><div className="agent-modal-title"><span className={"agent-card-portrait tone-"+selected.tone}><Portrait kind={selected.portrait}/></span><div><h2>{selected.name}</h2><span>{selected.profiles?"Configured Sarvam agent":"Illustrative agent"} · {selected.version}</span></div></div><p>{selected.description}</p><dl><div><dt>Category</dt><dd>{selected.category}</dd></div><div><dt>Reference status</dt><dd>{selected.status} (sample only)</dd></div><div><dt>Sarvam connection</dt><dd>Not connected</dd></div></dl><div className="agent-preview-warning">Agent versions, sample playback and campaign selection will be enabled only after the Sarvam API is connected.</div><button type="button" onClick={()=>setSelected(null)} className="agent-modal-done">Close</button></section></div>}
 </div>;
}
