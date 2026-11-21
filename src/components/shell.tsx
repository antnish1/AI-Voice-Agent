"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useState} from "react";
import type {Membership} from "@/lib/auth";
import {ProfileMenu} from "@/components/profile-menu";
import {PortalBreadcrumbs} from "@/components/portal-breadcrumbs";

const sections: Array<{title:string;items:Array<[string,string,string]>}>=[
 {title:"",items:[["⌂","Dashboard","/dashboard"],["◫","Campaigns","/campaigns"],["◎","AI Voice Agents","/agents"],["♙","Customers","/customers"],["☑","Approvals","/approvals"]]},
 {title:"",items:[["◷","Call Logs","/call-logs"],["▣","Appointments","/appointments"],["↺","Callbacks","/callbacks"],["⇄","Pickup & Drop","/pickup-drop"],["▤","Documents","/documents"],["▥","Reports","/reports"],["⚙","Settings","/settings"]]}
];

export function Shell({children,membership,userEmail,userId,displayName,avatarPath}:{children:React.ReactNode,membership:Membership,userEmail:string;userId:string;displayName:string;avatarPath:string}){
 const path=usePathname();
 const [collapsed,setCollapsed]=useState(false),[mobile,setMobile]=useState(false);
 return <div className={`app crm-app reference-app ${collapsed?"nav-collapsed":""} ${mobile?"nav-open":""}`}>
  <aside className="sidebar crm-sidebar ref-sidebar">
   <div className="brand crm-brand ref-brand"><div className="brand-icon">F</div><span className="brand-words">FRONTIER<small>AI VOICE CRM</small></span><button type="button" className="collapse-control" onClick={()=>setCollapsed(!collapsed)} title={collapsed?"Expand sidebar":"Collapse sidebar"} aria-label="Toggle sidebar">{collapsed?"›":"‹"}</button></div>
   <nav aria-label="Main navigation">{sections.map((section,i)=><div className="nav-section" key={i}>{section.title&&<p className="nav-section-title">{section.title}</p>}{section.items.map(([glyph,label,href])=><Link key={href} href={href} onClick={()=>setMobile(false)} aria-current={path===href||(href==="/campaigns"&&path.startsWith("/campaigns/"))?"page":undefined} title={label} className={path===href||(href==="/campaigns"&&path.startsWith("/campaigns/"))?"active":""}><span className="nav-icon">{glyph}</span><span className="nav-label">{label}</span></Link>)}</div>)}</nav>
   <div className="ref-sidebar-bottom"><div className="ref-sidebar-wave" aria-hidden="true"/><button type="button" onClick={()=>setCollapsed(!collapsed)} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"}><span>«</span><span className="nav-label">{collapsed?"":"Collapse sidebar"}</span></button><p className="nav-label">Live calling disabled</p></div>
  </aside>
  {mobile&&<button className="mobile-backdrop" aria-label="Close menu" onClick={()=>setMobile(false)}/>}
  <div className="workspace crm-workspace">
   <header className="topbar crm-topbar ref-topbar">
    <button type="button" className="ref-menu-toggle" onClick={()=>{if(window.innerWidth<=760)setMobile(!mobile);else setCollapsed(!collapsed);}} aria-label="Toggle navigation">☰</button>
    <div className="ref-header-breadcrumbs"><PortalBreadcrumbs/></div>
    <div className="ref-topbar-right">
     <span className="ref-notification" title="Notifications will be enabled when event ingestion is ready" aria-label="Notifications not connected">♧</span>
     <ProfileMenu userId={userId} email={userEmail} role={membership.role} dealershipName={membership.dealerships?.name??"Dealership"} initialName={displayName} initialAvatarPath={avatarPath}/>
    </div>
   </header>
   <main className="main crm-main ref-main">{children}</main>
  </div>
 </div>;
}