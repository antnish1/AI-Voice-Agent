import "server-only";
import {requireProviderConfig} from "./outbound-provider";

export function validAgentId(id:string){return /^[A-Za-z0-9_.-]{3,200}$/.test(id)&&!id.includes("..")&&id!==".";}
export async function fetchCommittedVersions(agentId:string):Promise<number[]>{
 if(!validAgentId(agentId))throw Error("Invalid agent ID.");
 const {key,base,org,workspace}=requireProviderConfig();
 // The dashboard's legacy=true endpoint returned the full version array
 // even with limit=10. Require an array; never infer a committed version from a draft.
 const path="/api/app-authoring/orgs/"+org+"/workspaces/"+workspace+"/apps/"+encodeURIComponent(agentId)+"/versions?legacy=true&limit=10";
 const response=await fetch(base+path,{method:"GET",headers:{"X-API-Key":key,"Accept":"application/json"},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error(response.status===401||response.status===403?"Sarvam rejected workspace API-key authentication for version discovery.": "Sarvam version lookup failed (HTTP "+response.status+").");
 const body:unknown=await response.json();
 if(!Array.isArray(body))throw Error("Unexpected Sarvam version response.");
 const committed=new Set<number>();
 for(const row of body){
  if(!row||typeof row!=="object"||row.app_id!==agentId||row.org_id!==decodeURIComponent(org)||row.workspace_id!==decodeURIComponent(workspace)||!Number.isSafeInteger(row.app_version)||row.app_version<1||typeof row.status!=="string")throw Error("Unexpected Sarvam version record.");
  if(row.status==="committed")committed.add(row.app_version);
 }
 return Array.from(committed).sort((a,b)=>b-a);
}
