"use client";
type Props={page:number;pages:number;onChange:(page:number)=>void;label?:string};
export function Pagination({page,pages,onChange,label="Pages"}:Props){
 const total=Math.max(1,pages),current=Math.min(total,Math.max(1,page));
 return <nav className="frontvox-pagination" aria-label={label}><button type="button" aria-label="Previous page" disabled={current<=1} onClick={()=>onChange(current-1)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button><span className="frontvox-page-count" aria-live="polite">{current} / {total}</span><button type="button" aria-label="Next page" disabled={current>=total} onClick={()=>onChange(current+1)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button></nav>;
}
