"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export function DashboardPeriodFilter({period,from,to,days}:{period:string;from:string;to:string;days:number}){
 const router=useRouter();
 const [choice,setChoice]=useState(period),[start,setStart]=useState(from),[end,setEnd]=useState(to);
 const navigate=(p:string,a="",b="")=>{const q=new URLSearchParams({period:p,days:String(days)});if(p==="custom"){q.set("from",a);q.set("to",b);}router.replace("/dashboard?"+q.toString(),{scroll:false});};
 return <div className="dashboard-period-filter"><label className="dashboard-period-select"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 10h18"/></svg><select aria-label="Dashboard reporting period" value={choice} onChange={e=>{const p=e.target.value;setChoice(p);if(p!=="custom")navigate(p);}}><option value="all">All Time</option><option value="mtd">MTD</option><option value="today">Today</option><option value="90">Last 90 Days</option><option value="custom">Custom</option></select></label>{choice==="custom"&&<form className="dashboard-period-custom" onSubmit={e=>{e.preventDefault();if(start&&end&&start<=end)navigate("custom",start,end);}}><label>From<input type="date" required value={start} max={end||undefined} onChange={e=>setStart(e.target.value)}/></label><label>To<input type="date" required value={end} min={start||undefined} onChange={e=>setEnd(e.target.value)}/></label><button type="submit" disabled={!start||!end||start>end}>Apply</button></form>}</div>;
}
