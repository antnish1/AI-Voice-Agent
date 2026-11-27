import "server-only";
import {requireProviderConfig,sarvamGet} from "./outbound-provider";
export type ProviderAgent={id:string;name:string;version:number;status:string;channel:string;deployed:boolean};
const lastVerified=[{"id":"Conversatio-95f7d6e8-61a2","name":"Kajal","version":57,"status":"draft","channel":"v2v","deployed":false},{"id":"Kajal-Backu-b3654b77-9e77","name":"Kajal Backup Before CRM Simplification 27 Nov 2026","version":1,"status":"draft","channel":"v2v","deployed":false},{"id":"Kajal-Isola-91d0ebec-bb21","name":"Kajal Isolated Test","version":1,"status":"draft","channel":"v2v","deployed":false},{"id":"Kajal-Minim-13cf3465-0d13","name":"Kajal Minimal Test","version":1,"status":"draft","channel":"v2v","deployed":false},{"id":"Kajal---Neh-d2a156f6-d548","name":"Kajal – Neha Readiness Test","version":23,"status":"draft","channel":"v2v","deployed":false},{"id":"INSUREIT-Re-d369ce6e-1bcd","name":"Frontier TATA Motor Renewal Assistant","version":17,"status":"draft","channel":"v2v","deployed":false}];
function parse(raw:unknown):ProviderAgent{
 if(!raw||typeof raw!=="object")throw Error("Invalid agent");
 const x=raw as Record<string,unknown>;
 if(typeof x.app_id!=="string"||typeof x.app_name!=="string"||typeof x.app_version!=="number"||typeof x.status!=="string"||typeof x.is_deployed!=="boolean")throw Error("Invalid agent fields");
 return {id:x.app_id,name:x.app_name,version:x.app_version,status:x.status,channel:typeof x.channel_type==="string"?x.channel_type:"Unknown",deployed:x.is_deployed};
}
export async function loadProviderAgents():Promise<{agents:ProviderAgent[];live:boolean;message:string}>{
 try{
  const {org,workspace}=requireProviderConfig();
  const root="/api/app-authoring/v1/orgs/"+org+"/workspaces/"+workspace;
  for(const resource of ["apps","agents"]){
   try{
    const agents:ProviderAgent[]=[];
    for(let offset=0;offset<5000;offset+=100){
     const page=await sarvamGet(root+"/"+resource+"?limit=100&offset="+offset);
     if(!Array.isArray(page.items))throw Error("Unexpected list");
     agents.push(...page.items.map(parse));
     const total=typeof page.total==="number"?page.total:undefined;
     if((total!==undefined&&agents.length>=total)||page.items.length<100){
      if(total!==undefined&&agents.length<total)throw Error("Incomplete list");
      return {agents:Array.from(new Map(agents.map(a=>[a.id,a])).values()),live:true,message:"Live Sarvam workspace"};
     }
    }
   }catch{/* Try the alternate authoring resource; never treat errors as an empty directory. */}
  }
 }catch{/* Missing provider config. */}
 return {agents:lastVerified,live:false,message:"Live Sarvam directory unavailable. Showing last verified workspace snapshot (27 Nov 2026); refresh to retry."};
}
