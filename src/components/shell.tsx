"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState} from "react";
import type {Membership} from "@/lib/auth";
import {signOut} from "@/app/login/actions";
const sections=[
  {title:"WORKSPACE",items:[["▦","Dashboard","/dashboard"],["◫","Campaigns","/campaigns"],["◎","AI Voice Agents","/agents"],["♙","Customers","/customers"],["✓","Approvals","/approvals"]]},
  {title:"OPERATIONS",items:[["◷","Call Logs","/call-logs"],["▣","Appointments","/appointments"],["↺","Callbacks","/callbacks"],["⇄","Pickup & Drop","/pickup-drop"],["▤","Documents","/documents"]]},
  {title:"INSIGHTS",items:[["▥","Reports","/reports"],["⚙","Settings","/settings"]]}
];
export function Shell({children,membership,userEmail}:{children:React.ReactNode,membership:Membership,userEmail:string}){
 const path=usePathname();const [collapsed,setCollapsed]=useState(false);const [mobile,setMobile]=useState(false);
 return <div className={`app crm-app ${collapsed?"nav-collapsed":""} ${mobile?"nav-open":""}`}>
  <aside className="sidebar crm-sidebar">
   <div className="brand crm-brand"><div className="brand-icon">F</div><span className="brand-words">FRONTIER<small>AI VOICE CRM</small></span><button className="collapse-control" onClick={()=>setCollapsed(!collapsed)} title={collapsed?"Expand sidebar":"Collapse sidebar"} aria-label="Toggle sidebar">{collapsed?"›":"‹"}</button></div>
   <div className="dealer-identity"><span className="dealer-avatar">◆</span><span className="nav-label"><strong>{membership.dealerships?.name??"Your dealership"}</strong><small>{membership.role.replaceAll("_"," ")}</small></span></div>
   <nav aria-label="Main navigation">{sections.map(section=><div className="nav-section" key={section.title}><p className="nav-section-title">{section.title}</p>{section.items.map(([icon,label,href])=><Link key={href} href={href} onClick={()=>setMobile(false)} aria-current={path===href?"page":undefined} title={label} className={path===href?"active":""}><span className="nav-icon">{icon}</span><span className="nav-label">{label}</span></Link>)}</div>)}</nav>
   <div className="sidebar-bottom"><span className="safe-dot"/> <span className="nav-label">Safe setup mode<small>Live calls are disabled</small></span></div>
  </aside>
  {mobile&&<button aria-label="Close menu" className="mobile-backdrop" onClick={()=>setMobile(false)}/>}
  <div className="workspace crm-workspace"><header className="topbar crm-topbar"><div className="topbar-start"><button className="mobile-menu" onClick={()=>setMobile(!mobile)} aria-label="Open menu">☰</button><div><span className="topbar-kicker">FRONTIER GROUP / DEALERSHIP PORTAL</span><strong>{membership.dealerships?.name??"Dealership workspace"}</strong></div></div><div className="topbar-actions"><span className="environment-tag"><span className="safe-dot"/> Integration pending</span><div className="profile-avatar">{userEmail[0]?.toUpperCase()??"U"}</div><div className="profile-name"><strong>{userEmail}</strong><small>{membership.role.replaceAll("_"," ")}</small></div><form action={signOut}><button className="signout" title="Sign out">Sign out</button></form></div></header><main className="main crm-main">{children}</main></div>
 </div>;
}