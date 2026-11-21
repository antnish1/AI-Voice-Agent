"use client";
import {useCallback,useEffect,useState} from "react";
type Status={configured:boolean;connected:boolean;message:string;httpStatus?:number};
export function SarvamConnectionCard({compact=false}:{compact?:boolean}){
 const [state,setState]=useState<Status|null>(null),[loading,setLoading]=useState(false);
 const check=useCallback(async()=>{
  setLoading(true);
  try{
   const response=await fetch("/api/sarvam/connection",{credentials:"same-origin",cache:"no-store"});
   const data=await response.json();
   setState({configured:Boolean(data.configured),connected:response.ok&&Boolean(data.connected),message:String(data.message??data.error??"Connection unavailable"),httpStatus:data.httpStatus});
  }catch{setState({configured:false,connected:false,message:"Could not reach the connection test endpoint."});}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void check();},[check]);
 const testButton=<button type="button" disabled={loading} onClick={()=>void check()} className={compact?"":"btn-outline small"}>{loading?"Checking…":"Test Connection"}</button>;
 const statusLabel=loading?"Checking":state?.connected?"Connected":state?.configured?"Connection failed":"Not connected";
 const liveCalling=<div className="settings-ref-api-status"><strong>Live Calling</strong><span>Disabled</span></div>;
 const details=state&&!state.connected?<p role="alert" className="settings-ref-footnote" style={{color:"#ad5d22"}}>{state.message}{state.httpStatus?" (HTTP "+state.httpStatus+")":""}</p>:state?.connected?<p role="status" className="settings-ref-footnote" style={{color:"#147f63"}}>{state.message}</p>:null;
 const status=<div className="settings-ref-api-status"><strong>Integration Status</strong><span style={state?.connected?{color:"#147f63",background:"#e3f8f0"}:undefined}>{statusLabel}</span></div>;
 if(compact)return <section className="settings-ref-card"><h3>API Integration</h3><p>Manage Sarvam API integration settings</p><div className="settings-ref-api-notice"><div><strong>API keys are managed securely on the server</strong><small>Credentials are never exposed in frontend code.</small></div></div>{status}{liveCalling}<div className="settings-ref-api-actions">{testButton}</div>{details}</section>;
 return <section className="settings-ref-card"><h3>Sarvam Voice Agents — Connection Test</h3><p>Only the IT Super User can test the live Sarvam workspace. The test never initiates calls.</p>{status}{liveCalling}<div className="settings-ref-api-actions">{testButton}</div>{details}<p className="settings-ref-footnote">Only API authentication is checked; agent creation and calling remain disabled until those integrations are implemented and tested.</p></section>;
}
