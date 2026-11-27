"use client";

import {useEffect,useState} from "react";

const slides=[
 {file:"car.jpeg",alt:"Vehicle banner 1"},
 {file:"carrr.png",alt:"Vehicle banner 2"},
 {file:"carrrr.png",alt:"Vehicle banner 3"},
 {file:"portalbg (1).jpeg",alt:"Vehicle banner 4"},
 {file:"carr.jpeg",alt:"Vehicle banner 5"},
 {file:"carrrrrr.png",alt:"Vehicle banner 6"},
 {file:"carrrrr.png",alt:"Vehicle banner 7"},
 {file:"scoda.png",alt:"Vehicle banner 8"}
];

export function VehicleCarousel(){
 const [active,setActive]=useState(0);
 const [paused,setPaused]=useState(false);
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync=()=>setReduced(media.matches);
  sync();media.addEventListener("change",sync);
  return ()=>media.removeEventListener("change",sync);
 },[]);
 useEffect(()=>{
  if(paused||reduced)return;
  const timer=window.setTimeout(()=>setActive(i=>(i+1)%slides.length),2500);
  return ()=>window.clearTimeout(timer);
 },[active,paused,reduced]);
 return <div className="fv-vehicle-carousel fv-vehicle-background" role="region" aria-label="Frontier Group vehicle banners" aria-roledescription="carousel">
  <div className="fv-vehicle-viewport">
   <div className="fv-vehicle-track fv-vehicle-crossfade">
    {slides.map((slide,i)=><div key={slide.file} className="fv-vehicle-slide" data-active={i===active?"true":"false"} aria-hidden={i!==active}>
     <img src={`/banners/${encodeURIComponent(slide.file)}`} alt={slide.alt} draggable={false} decoding="async"/>
    </div>)}
   </div>
  </div>
  {!reduced&&<button type="button" className="fv-background-keyboard-pause" onClick={()=>setPaused(v=>!v)}>{paused?"Resume background animation":"Pause background animation"}</button>}
 </div>;
}
