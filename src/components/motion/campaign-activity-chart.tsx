"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { motionTokens } from "./motion-tokens";

type Day={key:string;label:string;count:number};
export function CampaignActivityChart({daily,days}:{daily:Day[];days:number}){
 const [active,setActive]=useState<string|null>(null);
 const reduced=useReducedMotion();
 const max=Math.max(1,...daily.map(d=>d.count));
 return <div className="ref-chart-area" role="group" aria-label={"Campaigns created by day over "+days+" days"}>
  <div className="ref-chart-grid" aria-hidden="true"><span/><span/><span/><span/></div>
  <div className="ref-chart-bars">{daily.map((d,i)=><div key={d.key} className="ref-chart-column frontier-chart-column"
    tabIndex={0} aria-label={d.label+": "+d.count+" campaigns"}
    onMouseEnter={()=>setActive(d.key)} onMouseLeave={()=>setActive(null)}
    onFocus={()=>setActive(d.key)} onBlur={()=>setActive(null)}>
    <motion.div className="ref-chart-bar" style={{height:d.count?Math.max(4,(d.count/max)*100)+"%":"0%",transformOrigin:"bottom"}}
      initial={reduced?false:{scaleY:.02,opacity:.35}}
      animate={{scaleY:1,opacity:1}}
      whileHover={reduced?undefined:{scaleX:1.06}}
      transition={{duration:reduced?0:.56,delay:reduced?0:Math.min(i*.024,.35),ease:motionTokens.ease}}/>
    <AnimatePresence>{active===d.key&&<motion.div className="frontier-chart-tooltip" style={{left:i===0?"0":i===daily.length-1?"100%":"50%",x:i===0?"0%":i===daily.length-1?"-100%":"-50%"}}
      initial={reduced?false:{opacity:0,y:6,scale:.95}} animate={{opacity:1,y:0,scale:1}}
      exit={{opacity:0,y:3,scale:.97}} transition={{duration:reduced?0:.16}}
      role="status"><strong>{d.count}</strong><span>{d.label}</span></motion.div>}</AnimatePresence>
    <small>{days===30?(i%5===0?d.label:""):days===14?(i%2===0?d.label:""):d.label}</small>
  </div>)}</div>
 </div>;
}
