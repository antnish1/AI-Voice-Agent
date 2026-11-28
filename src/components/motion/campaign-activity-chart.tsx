"use client";
import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "./motion-tokens";

type Day={key:string;label:string;count:number};
export function CampaignActivityChart({daily,days}:{daily:Day[];days:number}){
 const reduced=useReducedMotion();
 const max=Math.max(1,...daily.map(d=>d.count));
 return <div className="ref-chart-area" role="group" aria-label={"Campaigns created over "+days+" days"}>
  <div className="ref-chart-grid" aria-hidden="true"><span/><span/><span/><span/></div>
  <div className="ref-chart-bars">{daily.map((d,i)=><div key={d.key} className="ref-chart-column frontier-chart-column"
    role="img" aria-label={d.label+": "+d.count+" campaigns"}>
    <motion.div className="ref-chart-bar" style={{height:d.count?Math.max(4,(d.count/max)*100)+"%":"0%",transformOrigin:"bottom"}}
      initial={reduced?false:{scaleY:.02,opacity:.35}}
      animate={{scaleY:1,opacity:1}}
      transition={{duration:reduced?0:.56,delay:reduced?0:Math.min(i*.024,.35),ease:motionTokens.ease}}/>
    <small>{i%Math.max(1,Math.ceil(daily.length/7))===0?d.label:""}</small>
  </div>)}</div>
 </div>;
}
