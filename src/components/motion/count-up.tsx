"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export function CountUp({value,className}:{value:string;className?:string}){
  const ref=useRef<HTMLElement>(null);
  const inView=useInView(ref,{once:true,amount:.3});
  const reduce=useReducedMotion();
  const numeric=/^\d+(?:,\d{3})*$/.test(value);
  const target=numeric?Number(value.replaceAll(",","")):0;
  const [display,setDisplay]=useState(value);
  useEffect(()=>{
    if(!numeric||!inView||reduce){setDisplay(value);return;}
    const ctrl=animate(0,target,{duration:.86,ease:[.2,.7,.2,1],onUpdate(v){setDisplay(Math.round(v).toLocaleString("en-IN"));}});
    return ()=>ctrl.stop();
  },[inView,numeric,reduce,target,value]);
  return <strong ref={ref} className={className} aria-label={value} style={{fontVariantNumeric:"tabular-nums"}}>{display}</strong>;
}
