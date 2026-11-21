import type {ReactNode} from "react";

export type SidebarIconName = "home"|"megaphone"|"wave"|"user-square"|"check-square"|"phone"|"calendar"|"callback"|"truck"|"documents"|"chart"|"settings"|"headset"|"chevron-down"|"chevrons-left"|"chevrons-right"|"arrow-right";
export function SidebarIcon({name,size=20}:{name:SidebarIconName;size?:number}){
 const drawings:Record<SidebarIconName,ReactNode>={
 home:<><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>,
 megaphone:<><path d="M3 10h5l12-6v16L8 14H3z"/><path d="m8 14 2 6h4M20 9a3 3 0 0 1 0 6"/></>,
 wave:<><path d="M2 10v4M6 7v10M10 3v18M14 8v8M18 5v14M22 10v4"/></>,
 "user-square":<><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="10" r="3"/><path d="M6.5 19v-1.5c0-3 2-4.5 5.5-4.5s5.5 1.5 5.5 4.5V19"/></>,
 "check-square":<><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7.5 12 3 3 6-6"/></>,
 phone:<><path d="M6 3h3l2 5-2.5 2c1.6 2.8 3.7 4.9 6.5 6.5l2-2.5 4 2v3c0 1.6-1.6 2.3-3.2 2C9.7 20 4 14.3 3.5 6.2 3.2 4.5 4.4 3z"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18M8 14h3M14 14h2M8 18h3"/></>,
 callback:<><path d="M20 8a8 8 0 1 0 1 6"/><path d="M20 3v5h-5"/></>,
 truck:<><rect x="2" y="6" width="13" height="11" rx="1"/><path d="M15 10h4l3 4v3h-7M2 17h2m7 0h6"/><circle cx="7" cy="18" r="2"/><circle cx="19" cy="18" r="2"/></>,
 documents:<><rect x="4" y="3" width="13" height="15" rx="2"/><rect x="8" y="7" width="13" height="14" rx="2"/><path d="M11 12h7M11 15h7"/></>,
 chart:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 17v-5M11 17V8M15 17v-7M19 17V6"/></>,
 settings:<><circle cx="12" cy="12" r="3"/><path d="m10 2-.7 3-2.2 1.2-3-.8-2 3.4 2.2 2.2v2l-2.2 2.2 2 3.4 3-.8 2.2 1.2.7 3h4l.7-3 2.2-1.2 3 .8 2-3.4-2.2-2.2v-2l2.2-2.2-2-3.4-3 .8-2.2-1.2-.7-3z"/></>,
 headset:<><path d="M3 13v-1a9 9 0 0 1 18 0v1M3 13h4v7H5a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3M21 13h-4v7h2a3 3 0 0 0 3-3v-1a3 3 0 0 0-3-3M17 20a5 5 0 0 1-5 2"/></>,
 "chevron-down":<path d="m5 9 7 7 7-7"/>,
 "chevrons-left":<path d="m11 6-6 6 6 6m8-12-6 6 6 6"/>,
 "chevrons-right":<path d="m5 6 6 6-6 6m2-12 6 6-6 6"/>,
 "arrow-right":<path d="m5 12h14m-6-6 6 6-6 6"/>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[name]}</svg>;
}