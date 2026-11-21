"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
import {AnimatePresence,motion,useReducedMotion} from "motion/react";
import {SidebarIcon,type SidebarIconName} from "@/components/sidebar-icons";
import {motionTokens} from "@/components/motion/motion-tokens";

type Item={name:string;url:string;icon:SidebarIconName};
type MenuLink={label:string;description:string;href:string;icon:SidebarIconName};
type Menu={intro:string;featured:MenuLink[];secondary:MenuLink[]};

const link=(label:string,description:string,href:string,icon:SidebarIconName):MenuLink=>({label,description,href,icon});
const menus:Record<string,Menu>={
 "/dashboard":{intro:"An overview of your dealership operations",featured:[
  link("Operations Dashboard","Campaign and dealership activity","/dashboard","home"),
  link("Reports","Explore verified CRM reports","/reports","chart")],secondary:[]},
 "/campaigns":{intro:"Prepare, review and manage campaigns",featured:[
  link("All Campaigns","Browse drafts and campaign statuses","/campaigns","megaphone"),
  link("Create Campaign","Prepare a new campaign draft","/campaigns/new","megaphone")],secondary:[
  link("Approvals","Review submitted campaigns","/approvals","check-square")]},
 "/agents":{intro:"Manage the voice-agent workspace",featured:[
  link("AI Voice Agents","View available voice agents","/agents","wave"),
  link("Campaigns","See campaigns using agents","/campaigns","megaphone")],secondary:[]},
 "/customers":{intro:"Find and manage dealership customers",featured:[
  link("Customers","Browse customer records","/customers","user-square"),
  link("Campaigns","Organize outreach","/campaigns","megaphone")],secondary:[]},
 "/approvals":{intro:"Review and track campaign decisions",featured:[
  link("Approvals","Pending and reviewed requests","/approvals","check-square"),
  link("All Campaigns","Review campaign statuses","/campaigns","megaphone")],secondary:[]},
 "/call-logs":{intro:"Explore call records and outcomes",featured:[
  link("Call Logs","View recorded call activity","/call-logs","phone"),
  link("Reports","Analyze available CRM data","/reports","chart")],secondary:[]},
 "/appointments":{intro:"Coordinate customer service appointments",featured:[
  link("Appointments","View service appointment requests","/appointments","calendar"),
  link("Callbacks","Manage customer follow-ups","/callbacks","callback")],secondary:[
  link("Pickup & Drop","Track pickup and drop requests","/pickup-drop","truck")]},
 "/callbacks":{intro:"Stay on top of customer follow-ups",featured:[
  link("Callbacks","Manage genuine callback requests","/callbacks","callback"),
  link("Appointments","View appointment requests","/appointments","calendar")],secondary:[]},
 "/pickup-drop":{intro:"Coordinate vehicle pickup and drop requests",featured:[
  link("Pickup & Drop","Manage pickup and drop requests","/pickup-drop","truck"),
  link("Appointments","Review service appointments","/appointments","calendar")],secondary:[]},
 "/documents":{intro:"Access dealership document workflows",featured:[
  link("Documents","View uploaded documents","/documents","documents"),
  link("Customers","Find customer records","/customers","user-square")],secondary:[]},
 "/reports":{intro:"Explore business and service reporting",featured:[
  link("Reports","View business summaries","/reports","chart"),
  link("Call Logs","Review actual call records","/call-logs","phone")],secondary:[]},
 "/settings":{intro:"Configure your personal CRM workspace",featured:[
  link("Settings","Profile and appearance preferences","/settings","settings")],secondary:[]},
 "/users":{intro:"Manage authorized staff access",featured:[
  link("User Management","Manage CRM users and access","/users","users"),
  link("Settings","Manage your own preferences","/settings","settings")],secondary:[]}
};

export function TopMenuNavigation({items,pendingApprovals,isItAdmin}:{items:Item[];pendingApprovals:number;isItAdmin:boolean}){
 const pathname=usePathname();
 const [open,setOpen]=useState<string|null>(null);
 const reduce=useReducedMotion();
 useEffect(()=>setOpen(null),[pathname]);
 const active=items.find(x=>x.url===open);
 const menu=open?menus[open]:undefined;
 const secondary=menu?.secondary??[];
 const selected=isItAdmin?secondary:secondary.filter(x=>x.href!=="/users");
 const close=()=>setOpen(null);
 return <nav className="frontier-top-navigation frontier-mega-navigation" aria-label="Main navigation"
  onMouseLeave={close}
  onKeyDown={e=>{if(e.key==="Escape"){close();(e.target as HTMLElement).blur();}}}>
  <div className="frontier-top-navigation-scroll">
   {items.map(item=>{
    const isCurrent=pathname===item.url||(item.url==="/campaigns"&&pathname.startsWith("/campaigns/"));
    return <div className={`frontier-top-nav-entry ${isCurrent?"active":""}`} key={item.url}
       onMouseEnter={()=>setOpen(item.url)}
       onFocusCapture={()=>setOpen(item.url)}>
      <Link href={item.url} className="frontier-top-nav-link" aria-current={isCurrent?"page":undefined}
        aria-expanded={open===item.url} aria-haspopup="true" aria-controls="frontier-top-mega-panel"
        onClick={close}>
       <SidebarIcon name={item.icon} size={17}/><span>{item.name}</span>
       {item.url==="/approvals"&&pendingApprovals>0&&<span className="frontier-top-approval-badge">{pendingApprovals>99?"99+":pendingApprovals}</span>}
       <SidebarIcon name="chevron-down" size={13}/>
      </Link>
     </div>;
   })}
  </div>
  <AnimatePresence mode="wait">
   {active&&menu&&<motion.section id="frontier-top-mega-panel" key={open}
     className="frontier-top-mega-panel" aria-label={active.name+" navigation"}
     initial={reduce?false:{opacity:0,y:-8,scale:.985}}
     animate={{opacity:1,y:0,scale:1}}
     exit={reduce?{opacity:0}:{opacity:0,y:-5,scale:.99}}
     transition={{duration:reduce?0:.18,ease:motionTokens.ease}}
     onMouseEnter={()=>setOpen(active.url)}>
     <header className="frontier-mega-head">
      <div><small>FRONTIER AI VOICE CRM</small><h2>{active.name}</h2><p>{menu.intro}</p></div>
      <Link href={active.url} onClick={close} className="frontier-mega-explore">Explore {active.name} <span aria-hidden="true">↗</span></Link>
     </header>
     <div className="frontier-mega-body">
      <section aria-label="Main destinations"><h3>QUICK ACCESS</h3>
       <div className="frontier-mega-links">{menu.featured.map(item=><Link className="frontier-mega-link" href={item.href} key={item.href} onClick={close}>
        <span className="frontier-mega-link-icon"><SidebarIcon name={item.icon} size={20}/></span>
        <span className="frontier-mega-link-text"><strong>{item.label}</strong><small>{item.description}</small></span>
        <span className="frontier-mega-arrow" aria-hidden="true">→</span>
       </Link>)}</div>
      </section>
      {selected.length>0&&<section className="frontier-mega-secondary" aria-label="Related destinations">
       <h3>RELATED TOOLS</h3>
       {selected.map(item=><Link className="frontier-mega-link" href={item.href} key={item.href} onClick={close}>
        <span className="frontier-mega-link-icon"><SidebarIcon name={item.icon} size={20}/></span>
        <span className="frontier-mega-link-text"><strong>{item.label}</strong><small>{item.description}</small></span>
        <span className="frontier-mega-arrow" aria-hidden="true">→</span>
       </Link>)}
      </section>}
     </div>
    </motion.section>}
  </AnimatePresence>
 </nav>;
}
