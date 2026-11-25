"use client";
import {useRouter} from "next/navigation";
import {useState} from "react";

export function CampaignPeriodFilter({period,from,to,today}:{period:string;from:string;to:string;today:string}){
 const router=useRouter();
 const [selected,setSelected]=useState(period);
 const [start,setStart]=useState(from);
 const [end,setEnd]=useState(to);
 const valid=start!==""&&end!==""&&start<=end&&end<=today;
 function navigate(value:string){
  const params=new URLSearchParams({period:value});
  if(value==="custom"){params.set("from",start);params.set("to",end);}
  router.push("/dashboard?"+params.toString(),{scroll:false});
 }
 return <form className="ref-date-filters campaign-period-filter" onSubmit={e=>{e.preventDefault();if(selected==="custom"&&valid)navigate(selected);}}>
  <select aria-label="Campaign performance period" value={selected} onChange={e=>{const value=e.target.value;setSelected(value);if(value!=="custom")navigate(value);}}>
   <option value="all">All Time</option><option value="today">Today</option><option value="7">Last 7 Days</option><option value="mtd">MTD</option><option value="custom">Custom</option>
  </select>
  {selected==="custom"&&<><input type="date" aria-label="From date (IST)" value={start} max={end||today} onChange={e=>setStart(e.target.value)} required/><input type="date" aria-label="To date (IST)" value={end} min={start} max={today} onChange={e=>setEnd(e.target.value)} required/><button type="submit" className="btn-outline small" disabled={!valid}>Apply</button></>}
 </form>;
}
