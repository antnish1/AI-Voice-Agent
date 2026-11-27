"use client";
import {useState,type ReactNode} from "react";
/** Retain a meaningful illustration if an optional dedicated artwork is not in the supplied pack. */
export function ArtworkImage({name,fallback,className=""}:{name:string;fallback:ReactNode;className?:string}){
 const [failed,setFailed]=useState(false);
 return failed?<>{fallback}</>:<img className={"original-artwork "+className} src={"/assets/artwork/"+name+".webp"} alt="" onError={()=>setFailed(true)} />;
}
