"use client";
import {useEffect,useRef,type ReactNode,type FormEvent,type ChangeEvent,type FocusEvent} from "react";
import {useRouter,useSearchParams} from "next/navigation";
export function AutoCampaignFilters({children}:{children:ReactNode}){
 const router=useRouter(),params=useSearchParams(),formRef=useRef<HTMLFormElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const query=params.toString();
 useEffect(()=>{const form=formRef.current;if(!form)return;const current=new URLSearchParams(query);for(const name of ["q","status","from","to","dealership"]){const field=form.elements.namedItem(name);if(field instanceof HTMLInputElement||field instanceof HTMLSelectElement){if(document.activeElement!==field)field.value=current.get(name)??"";}}},[query]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 // The native selects already dismiss each other. Keep the date-range disclosure
 // in the same mutually exclusive group, including outside-click and Escape behavior.
 useEffect(()=>{
  const form=formRef.current;if(!form)return;
  const date=form.querySelector<HTMLDetailsElement>(".fc-date-details");
  if(!date)return;
  const dismiss=(event:PointerEvent)=>{if(event.target instanceof Node&&!date.contains(event.target))date.open=false;};
  const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape"&&date.open){date.open=false;date.querySelector<HTMLElement>("summary")?.focus();}};
  document.addEventListener("pointerdown",dismiss);
  document.addEventListener("keydown",onKey);
  return ()=>{document.removeEventListener("pointerdown",dismiss);document.removeEventListener("keydown",onKey);};
 },[]);
 function focusFilter(event:FocusEvent<HTMLFormElement>){
  const date=formRef.current?.querySelector<HTMLDetailsElement>(".fc-date-details");
  if(date&&event.target instanceof HTMLElement&&!date.contains(event.target))date.open=false;
 }

 function apply(form:HTMLFormElement){if(timer.current)clearTimeout(timer.current);const next=new URLSearchParams();for(const [key,value] of new FormData(form)){if(typeof value==="string"&&value.trim())next.set(key,value.trim());}const target=next.toString();if(target!==query)router.replace("/campaigns"+(target?"?"+target:""),{scroll:false});}
 function changed(event:ChangeEvent<HTMLFormElement>){const form=event.currentTarget;if(timer.current)clearTimeout(timer.current);if(event.target instanceof HTMLInputElement&&event.target.name==="q")timer.current=setTimeout(()=>apply(form),350);else apply(form);}
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();apply(event.currentTarget);}
 return <form ref={formRef} className="fc-filters" method="get" action="/campaigns" onChange={changed} onSubmit={submit} onFocusCapture={focusFilter}>{children}</form>;
}
