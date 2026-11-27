"use client";

import {useEffect,useState} from "react";

const slides=[
 {file:"kushaq.webp",alt:"Škoda Kushaq"},
 {file:"seltos.webp",alt:"Kia Seltos"},
 {file:"city.webp",alt:"Honda City"},
 {file:"wolksbegn.webp",alt:"Volkswagen"},
 {file:"siyara.webp",alt:"Tata Sierra EV"},
 {file:"tata.webp",alt:"Tata Motors"},
 {file:"jcb.webp",alt:"JCB"}
];

export function VehicleCarousel(){
 const [active,setActive]=useState(0);
 const [paused,setPaused]=useState(false);
 const [hovered,setHovered]=useState(false);
 const [focused,setFocused]=useState(false);
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync=()=>setReduced(media.matches);
  sync();media.addEventListener("change",sync);
  return ()=>media.removeEventListener("change",sync);
 },[]);
 useEffect(()=>{
  if(paused||hovered||focused||reduced)return;
  const timer=window.setTimeout(()=>setActive(i=>(i+1)%slides.length),4000);
  return ()=>window.clearTimeout(timer);
 },[active,paused,hovered,focused,reduced]);
 const move=(delta:number)=>setActive(i=>(i+delta+slides.length)%slides.length);
 return <div className="fv-vehicle-carousel" role="region" aria-label="Frontier Group vehicle banners" aria-roledescription="carousel" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocus={()=>setFocused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false)}}>
  <div className="fv-vehicle-viewport">
   <div className="fv-vehicle-track" style={{transform:`translateX(-${active*100}%)`}}>
    {slides.map((slide,i)=><div key={slide.file} className="fv-vehicle-slide" aria-hidden={i!==active}>
     <img src={`/banners/${slide.file}`} alt={slide.alt} draggable={false} decoding="async"/>
    </div>)}
   </div>
   <button type="button" className="fv-vehicle-arrow fv-vehicle-prev" aria-label="Previous banner" onClick={()=>move(-1)}>‹</button>
   <button type="button" className="fv-vehicle-arrow fv-vehicle-next" aria-label="Next banner" onClick={()=>move(1)}>›</button>
  </div>
  <div className="fv-vehicle-controls">
   {slides.map((slide,i)=><button key={slide.file} type="button" className="fv-vehicle-dot" aria-label={`Show ${slide.alt}`} aria-current={i===active?"true":undefined} onClick={()=>setActive(i)}/>)}
   {!reduced&&<button type="button" className="fv-vehicle-pause" aria-label={paused?"Resume slideshow":"Pause slideshow"} onClick={()=>setPaused(v=>!v)}>{paused?"▶":"Ⅱ"}</button>}
  </div>
 </div>;
}
