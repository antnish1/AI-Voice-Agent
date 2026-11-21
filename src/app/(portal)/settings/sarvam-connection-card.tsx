"use client";
import {useState} from "react";
type Status={configured:boolean;connected:boolean;message:string;httpStatus?:number};
export function SarvamConnectionCard(){
 const [state,setState]=useState<Status|null>(null),[loading,setLoading]=useState(false);
 const check=async()=>{
  setLoading(true);try{
   const response=await fetch("/api/sarvam/connection",{credentials:"same-origin",cache:"no-store"});
   const data=await response.json();
   setState({configured:Boolean(data.configured),connected:Boolean(data.connected),message:String(data.message??data.error??"Connection unavailable"),httpStatus:data.httpStatus});
  }catch{setState({configured:false,connected:false,message:"Could not reach the connection test endpoint."});}finally{setLoading(false);}
 };
 return <section className="settings-ref-card"><h3>Sarvam Voice Agents — Connection Test</h3><p>Only the IT Super User can test the live Sarvam workspace connection. Credentials are never shown in the browser.</p><button type="button" className="btn-outline small" disabled={loading} onClick={()=>void check()}>{loading?"Checking…":"Test Sarvam Connection"}</button>{state&&<p role="status" className={state.connected?"crm-ops-success":"crm-ops-error"}>{state.connected?"Connected: ":"Not connected: "}{state.message}</p>}<p className="settings-ref-footnote">This test checks API access only. It does not enable live dialing, launch campaigns, or incur calling charges.</p></section>;
}
