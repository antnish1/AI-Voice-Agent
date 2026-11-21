"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";

const routeLabels:Record<string,string>={
 "/dashboard":"Operations Dashboard", "/campaigns":"Campaigns", "/campaigns/new":"Create Campaign",
 "/agents":"AI Voice Agents", "/customers":"Customers", "/approvals":"Approvals",
 "/call-logs":"Call Logs", "/appointments":"Appointments", "/callbacks":"Callbacks",
 "/pickup-drop":"Pickup & Drop", "/documents":"Documents", "/reports":"Reports",
 "/settings":"Settings"
};
export function PortalBreadcrumbs(){
 const pathname=usePathname(),router=useRouter();
 const segments=pathname.split("/").filter(Boolean);
 const parts=segments.map((segment,i)=>{
  const href="/"+segments.slice(0,i+1).join("/");
  return {href,label:routeLabels[href]??segment.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase())};
 });
 const crumbs=pathname==="/dashboard"?[{href:"/dashboard",label:"Dashboard"},{href:"/dashboard",label:"Operations Dashboard"}]:[{href:"/dashboard",label:"Dashboard"},...parts];
 return <nav className="portal-breadcrumbs" aria-label="Breadcrumb">
  <button type="button" className="portal-crumb-back" onClick={()=>{if(window.history.length>1)router.back();else router.push("/dashboard");}} aria-label="Go back" title="Go back">‹</button>
  <span className="portal-crumb-compass" aria-hidden="true">◉</span>
  <ol>{crumbs.map((crumb,i)=><li key={i}>
   {i>0&&<span className="portal-crumb-chevron" aria-hidden="true">›</span>}
   {i===crumbs.length-1?<span className="portal-crumb-pill active" aria-current="page">{crumb.label}</span>:<Link className="portal-crumb-pill" href={crumb.href}>{crumb.label}</Link>}
  </li>)}</ol>
 </nav>;
}
