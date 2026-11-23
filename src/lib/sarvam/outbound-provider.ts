import "server-only";
import {createHash} from "node:crypto";

export function sha256(text:string|Buffer){return createHash("sha256").update(text).digest("hex");}
export function callingEnabled(type:"test"|"campaign"){return process.env[type==="test"?"ENABLE_TEST_CALLS":"ENABLE_LIVE_CALLS"]==="true";}
export function requireProviderConfig(){
 const key=process.env.SARVAM_API_KEY?.trim(),org=process.env.SARVAM_ORG_ID?.trim(),workspace=process.env.SARVAM_WORKSPACE_ID?.trim();
 if(!key||!org||!workspace||[org,workspace].some(x=>!x||x.length>256||/[\\/\u0000-\u001f]/.test(x)))throw Error("Sarvam Production credentials or workspace IDs are unavailable.");
 return {key,base:"https://apps.sarvam.ai",org:encodeURIComponent(org),workspace:encodeURIComponent(workspace)};
}
export async function sarvamPost(path:string,data:unknown){
 const {key,base}=requireProviderConfig();
 if(!path.startsWith("/api/")||path.includes("..")||path.startsWith("//"))throw Error("Unsafe provider path");
 const response=await fetch(base+path,{method:"POST",headers:{"X-API-Key":key,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(data),cache:"no-store",signal:AbortSignal.timeout(20000)});
 let result:Record<string,unknown>={};
 try{const body=await response.json();if(body&&typeof body==="object"&&!Array.isArray(body))result=body;}catch{}
 if(!response.ok)throw Error("Sarvam rejected request (HTTP "+response.status+"). Check validated configuration and provider logs.");
 return result;
}
export async function sarvamGet(path:string){
 const {key,base}=requireProviderConfig();
 if(!path.startsWith("/api/")||path.includes("..")||path.startsWith("//"))throw Error("Unsafe provider path");
 const response=await fetch(base+path,{method:"GET",headers:{"X-API-Key":key,"Accept":"application/json"},cache:"no-store",signal:AbortSignal.timeout(12000)});
 let result:Record<string,unknown>={};
 try{const body=await response.json();if(body&&typeof body==="object"&&!Array.isArray(body))result=body;}catch{}
 if(!response.ok)throw Error("Sarvam returned HTTP "+response.status+" while checking cohort.");
 return result;
}
export function sarvamPath(kind:"outbounds"|"campaigns",suffix=""){
 const {org,workspace}=requireProviderConfig();
 return kind==="outbounds"?`/api/outbounds/v1/orgs/${org}/workspaces/${workspace}/outbounds`:
 `/api/scheduling/v1/orgs/${org}/workspaces/${workspace}/campaigns`+suffix;
}

export async function sarvamPut(path:string,data:unknown){
 const {key,base}=requireProviderConfig();
 if(!path.startsWith("/api/")||path.includes("..")||path.startsWith("//"))throw Error("Unsafe provider path");
 const response=await fetch(base+path,{method:"PUT",headers:{"X-API-Key":key,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(data),cache:"no-store",signal:AbortSignal.timeout(20000)});
 let payload:Record<string,unknown>={};
 try{const body=await response.json();if(body&&typeof body==="object"&&!Array.isArray(body))payload=body;}catch{}
 if(!response.ok)throw Error("Sarvam rejected campaign lifecycle request (HTTP "+response.status+").");
 return payload;
}
