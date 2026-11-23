import {NextRequest,NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
type Deployment={deployment_id?:unknown;app_id?:unknown;app_version?:unknown;name?:unknown;status?:unknown;channel_direction?:unknown;connection_configs?:unknown};
const cleanId=(v:string)=>v.length>0&&v.length<=256&&!/[\\/\u0000-\u001F\u007F]/.test(v)&&!/^https?:/i.test(v);
const safeString=(v:unknown)=>typeof v==="string"?v.trim():"";
const phonePattern=/^\+[1-9]\d{7,14}$/;
const tokenPattern=/^[A-Za-z0-9_.-]{3,200}$/;

export async function GET(request:NextRequest){
 try{await requireItSuperUser();}catch{return NextResponse.json({error:"IT Super User access required."},{status:403,headers});}
 const key=process.env.SARVAM_API_KEY?.trim()??"";
 const org=process.env.SARVAM_ORG_ID?.trim()??"";
 const workspace=process.env.SARVAM_WORKSPACE_ID?.trim()??"";
 if(!key||!cleanId(org)||!cleanId(workspace))
  return NextResponse.json({error:"Configure valid Sarvam API key, organization ID and workspace ID in Vercel Production."},{status:503,headers});
 const base="https://apps.sarvam.ai/api/app-authoring/v1/orgs/"+encodeURIComponent(org)+"/workspaces/"+encodeURIComponent(workspace)+"/deployments";
 const deploymentId=request.nextUrl.searchParams.get("deploymentId")?.trim()??"";
 if(deploymentId&&!tokenPattern.test(deploymentId))
  return NextResponse.json({error:"Invalid Sarvam deployment ID."},{status:400,headers});
 try{
  const url=deploymentId?base+"/"+encodeURIComponent(deploymentId):base+"?limit=50";
  const response=await fetch(url,{method:"GET",headers:{"X-API-Key":key,"Accept":"application/json"},cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!response.ok)return NextResponse.json({error:"Sarvam inventory unavailable (HTTP "+response.status+"). Verify API key and workspace access."},{status:502,headers});
  const body:unknown=await response.json();
  if(deploymentId){
   if(!body||typeof body!=="object")return NextResponse.json({error:"Sarvam returned invalid deployment details."},{status:502,headers});
   const deployment=body as Deployment;
   if(safeString(deployment.deployment_id)!==deploymentId)return NextResponse.json({error:"Deployment identity did not match Sarvam response."},{status:502,headers});
   const appId=safeString(deployment.app_id);
   const version=deployment.app_version;
   const configs=Array.isArray(deployment.connection_configs)?deployment.connection_configs:[];
   const candidates=configs.flatMap(c=>{
    if(!c||typeof c!=="object")return [];
    const connection=safeString((c as {connection_id?:unknown}).connection_id);
    const numbers=(c as {phone_numbers?:unknown}).phone_numbers;
    return connection&&tokenPattern.test(connection)&&Array.isArray(numbers)?
     numbers.filter((n):n is string=>typeof n==="string"&&phonePattern.test(n)).map(n=>({connectionId:connection,callerNumber:n})):[];
   });
   const direction=safeString(deployment.channel_direction);
   const status=safeString(deployment.status);
   const eligible=tokenPattern.test(appId)&&Number.isInteger(version)&&Number(version)>=1&&
    (direction==="outbound"||direction==="inbound_outbound")&&status==="active"&&candidates.length>0;
   return NextResponse.json({deploymentId,agentId:appId,version,channelDirection:direction,status,
    connections:eligible?candidates:[],eligible,
    reason:eligible?null:"Requires an active outbound deployment, committed agent version and verified telephony connection/number."},{headers});
  }
  if(!body||typeof body!=="object")return NextResponse.json({error:"Invalid Sarvam deployment list."},{status:502,headers});
  const items=(body as {items?:unknown}).items;
  if(!Array.isArray(items))return NextResponse.json({error:"Unexpected Sarvam deployment list format."},{status:502,headers});
  const deployments=items.filter((d):d is Deployment=>!!d&&typeof d==="object").map(d=>({
   id:safeString(d.deployment_id),name:safeString(d.name)||safeString(d.app_id)||"Unnamed agent",
   direction:safeString(d.channel_direction),status:safeString(d.status),version:d.app_version
  })).filter(d=>tokenPattern.test(d.id)&&(d.direction==="outbound"||d.direction==="inbound_outbound"));
  return NextResponse.json({deployments},{headers});
 }catch{return NextResponse.json({error:"Could not read Sarvam deployments. Check connection and try again."},{status:502,headers});}
}
