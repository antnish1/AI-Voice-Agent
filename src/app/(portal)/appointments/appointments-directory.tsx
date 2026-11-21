"use client";
import {useMemo,useState} from "react";

type IconName="calendar"|"check"|"clock"|"cancel"|"eye"|"edit"|"trash"|"arrow";
function Icon({name,size=20}:{name:IconName;size?:number}){
 const paths:Record<IconName,React.ReactNode>={
 calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18M8 14h3M14 14h3M8 18h3"/></>,
 check:<><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
 cancel:<><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></>,
 eye:<><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
 edit:<><path d="m4 16 12-12 4 4-12 12-5 1zM14 6l4 4"/></>,
 trash:<><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 10v7M14 10v7"/></>,
 arrow:<path d="m5 12h14m-6-6 6 6-6 6"/>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function AppointmentBanner(){return <svg viewBox="0 0 310 126" aria-hidden="true" className="appointments-banner-art"><defs><linearGradient id="calBlue" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e4f9ff"/><stop offset="1" stopColor="#238ddc"/></linearGradient></defs><path d="M8 93Q90 5 159 76T304 32" fill="none" stroke="#61cae0" strokeWidth="14" opacity=".25"/><ellipse cx="221" cy="111" rx="80" ry="9" fill="#6bbaf4" opacity=".28"/><rect x="122" y="15" width="123" height="99" rx="11" fill="#fbfeff" stroke="#8bbfe8" strokeWidth="3"/><path d="M122 28q0-13 12-13h99q12 0 12 13v18H122Z" fill="#269bd8"/><path d="M149 8v19M214 8v19" stroke="#327dc5" strokeWidth="8" strokeLinecap="round"/>{Array.from({length:12},(_,i)=><rect key={i} x={137+(i%4)*25} y={53+Math.floor(i/4)*19} width="17" height="12" rx="3" fill={i===6?"#2ac6c6":"#b7dcf4"}/>)}<circle cx="253" cy="87" r="29" fill="#f5feff" stroke="#128eac" strokeWidth="5"/><path d="M253 68v19l13 8" stroke="#1578b6" strokeWidth="5" strokeLinecap="round" fill="none"/><path d="M285 45q20-14 22 0" fill="none" stroke="#38c8d2" strokeWidth="6" opacity=".45"/></svg>;}
const stats=[{label:"Total Appointments",icon:"calendar" as const,tone:"blue"},{label:"Confirmed",icon:"check" as const,tone:"green"},{label:"Pending",icon:"clock" as const,tone:"amber"},{label:"Cancelled",icon:"cancel" as const,tone:"purple"}];
const week=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export function AppointmentsDirectory(){
 const today=useMemo(()=>new Date(new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Kolkata"}).format(new Date())+"T12:00:00"),[]);
 const [month,setMonth]=useState(()=>new Date(today.getFullYear(),today.getMonth(),1,12));
 const [day,setDay]=useState(()=>today.getDate());
 const year=month.getFullYear(),monthIndex=month.getMonth();
 const offset=new Date(year,monthIndex,1).getDay();
 const cells=Array.from({length:42},(_,index)=>new Date(year,monthIndex,1-offset+index,12));
 const changeMonth=(delta:number)=>{setMonth(new Date(year,monthIndex+delta,1,12));setDay(0);};
 const currentMonth=month.toLocaleDateString("en-IN",{month:"long",year:"numeric"});
 return <div className="appointments-reference">
  <header className="appointments-ref-hero"><div className="appointments-ref-heading"><span className="appointments-hero-icon"><Icon name="calendar" size={30}/></span><div><h1>Appointments</h1><p>View and manage customer appointments</p></div></div><div className="appointments-hero-banner"><div><strong>Turn Calls into Customers</strong><p>Track your scheduled appointments<br/>and never miss a meeting.</p></div><AppointmentBanner/></div></header>
  <div className="appointments-metrics">{stats.map(x=><article key={x.label} className={"appointments-metric tone-"+x.tone}><span className="appointments-metric-icon"><Icon name={x.icon} size={24}/></span><div><span>{x.label}</span><strong>—</strong><small>Workflow not connected</small></div><svg viewBox="0 0 90 36" aria-hidden="true"><path d="M1 28Q12 10 25 23T45 14T67 20T89 7" stroke="currentColor" fill="none" strokeWidth="2"/><path d="M1 28Q12 10 25 23T45 14T67 20T89 7V36H1Z" fill="currentColor" opacity=".06"/></svg></article>)}</div>
  <div className="appointments-two-column">
   <section className="appointments-calendar-card"><h2><Icon name="calendar" size={19}/> Calendar View</h2><div className="appointments-calendar-nav"><button type="button" onClick={()=>changeMonth(-1)} aria-label="Previous month">‹</button><strong>{currentMonth}</strong><button type="button" onClick={()=>changeMonth(1)} aria-label="Next month">›</button><button type="button" className="appointments-today" onClick={()=>{setMonth(new Date(today.getFullYear(),today.getMonth(),1,12));setDay(today.getDate());}}>Today</button></div>
   <div className="appointments-calendar-grid">{week.map(x=><div className="appointments-weekday" key={x}>{x}</div>)}{cells.map((date,index)=>{const own=date.getMonth()===monthIndex;const isToday=own&&date.getDate()===today.getDate()&&monthIndex===today.getMonth()&&year===today.getFullYear();const active=own&&date.getDate()===day;return <button type="button" key={index} className={["appointments-calendar-day",own?"":"outside",isToday?"today":"",active?"selected":""].join(" ")} onClick={()=>{setMonth(new Date(date.getFullYear(),date.getMonth(),1,12));setDay(date.getDate());}} aria-label={date.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})} aria-pressed={active}>{date.getDate()}</button>;})}</div>
   <div className="appointments-calendar-legend"><span><i className="confirmed"/>Confirmed</span><span><i className="pending"/>Pending</span><span><i className="completed"/>Completed</span></div><p className="appointments-no-event-note">No appointments are connected to this calendar yet.</p></section>
   <section className="appointments-upcoming-card"><div className="appointments-upcoming-head"><h2><Icon name="clock" size={20}/> Upcoming Appointments</h2><span className="appointments-view-all" title="Will show all appointments once the booking workflow is connected">View All <Icon name="arrow" size={14}/></span></div><div className="appointments-upcoming-empty"><span className="appointments-empty-icon"><Icon name="calendar" size={24}/></span><strong>No appointment records available</strong><p>Once the dealership appointment workflow is connected, confirmed and pending bookings will appear here with customer, date, time, campaign and management actions.</p><div className="appointments-empty-table-head"><span>Customer</span><span>Appointment Time</span><span>Status</span><span>Actions</span></div><div className="appointments-empty-table-body"><span>—</span><span>—</span><span>—</span><span className="appointments-disabled-actions"><Icon name="eye" size={15}/><Icon name="edit" size={15}/><Icon name="trash" size={15}/></span></div></div></section>
  </div>
  <p className="appointments-data-note">UI preparation only: no appointment table or verified bookings exist in the connected CRM database. A customer request must not be marked Confirmed until workshop acceptance is verified.</p>
 </div>;
}
