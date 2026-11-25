"use client";
import {useRouter,useSearchParams} from "next/navigation";
import {useEffect,useState} from "react";

export function CampaignPeriodFilter({period,from,to,today}:{period:string;from:string;to:string;today:string}){
 const router=useRouter();const searchParams=useSearchParams();
 const [selected,setSelected]=useState(period);
 const [start,setStart]=useState(from);
 const [end,setEnd]=useState(to);
 useEffect(()=>{setSelected(period);setStart(from);setEnd(to);},[period,from,to]);
 const options=[{value:"all",label:"All Time"},{value:"today",label:"Today"},{value:"7",label:"Last 7 Days"},{value:"mtd",label:"MTD"},{value:"custom",label:"Custom"}];
 const selectedLabel=options.find(option=>option.value===selected)?.label??"All Time";
 const valid=start!==""&&end!==""&&start<=end&&end<=today;
 function navigate(value:string){
  const params=new URLSearchParams(searchParams.toString());params.set("chartPeriod",value);params.delete("chartFrom");params.delete("chartTo");
  if(value==="custom"){params.set("chartFrom",start);params.set("chartTo",end);}
  router.push("/dashboard?"+params.toString(),{scroll:false});
 }
 return <form className="ref-date-filters campaign-period-filter" onSubmit={e=>{e.preventDefault();if(selected==="custom"&&valid)navigate(selected);}}>
  <span className="campaign-period-select-wrap">
   <span className="campaign-period-select-measure" aria-hidden="true">{selectedLabel}</span>
   <select aria-label="Campaign performance period" value={selected} onChange={e=>{const value=e.target.value;setSelected(value);if(value!=="custom")navigate(value);}}>
    {options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
   </select>
   <svg className="campaign-period-select-arrow" aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4"/></svg>
  </span>
  {selected==="custom"&&<><input type="date" aria-label="From date (IST)" value={start} max={end||today} onChange={e=>setStart(e.target.value)} required/><input type="date" aria-label="To date (IST)" value={end} min={start} max={today} onChange={e=>setEnd(e.target.value)} required/><button type="submit" className="btn-outline small" disabled={!valid}>Apply</button></>}
 </form>;
}
