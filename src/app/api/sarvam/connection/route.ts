import {NextResponse} from "next/server";
import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
// Sarvam documents org_id and workspace_id as string path parameters, without
// limiting them to a particular slug/UUID format. Do not reject valid IDs just
// because they contain dots or are one character long.
function validateId(value:string|undefined,label:string):{id?:string;problem?:string}{
 const id=value?.trim()??"";
 if(!id)return {problem:label+" is missing in Vercel Production environment variables."};
 if(id.length>256)return {problem:label+" is too long. Copy only the ID from Sarvam Settings."};
 if(id.includes("/")||id.includes("\\")||/[\u0000-\u001F\u007F]/.test(id)||/^https?:/i.test(id))
  return {problem:label+" contains a URL, a path, or invalid characters. Copy only the ID (not the page URL) from Sarvam Settings."};
 if(/^["']|["']$/.test(id))
  return {problem:label+" appears to include surrounding quotation marks. Enter the ID without quotes."};
 return {id};
}
export async function GET(){
 const {user,memberships}=await requireMembership();
 if(!memberships.some(m=>isItSuperUser(user.id,user.email??"",m.role)))
  return NextResponse.json({connected:false,error:"IT Super User access required"},{status:403,headers});
 const key=process.env.SARVAM_API_KEY?.trim();
 const org=validateId(process.env.SARVAM_ORG_ID,"Organization ID");
 const workspace=validateId(process.env.SARVAM_WORKSPACE_ID,"Workspace ID");
 if(!key||org.problem||workspace.problem){
  return NextResponse.json({
   configured:Boolean(key&&org.id&&workspace.id),
   connected:false,
   message:org.problem??workspace.problem??"SARVAM_API_KEY is missing in Vercel Production."
  },{status:503,headers});
 }
 // Read-only provider request: no agents, campaigns or calls are modified.
 const url="https://apps.sarvam.ai/api/app-authoring/v1/orgs/"+encodeURIComponent(org.id!)+"/workspaces/"+encodeURIComponent(workspace.id!)+"/deployments?limit=1";
 try{
  const response=await fetch(url,{headers:{"X-API-Key":key,"Accept":"application/json"},method:"GET",cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(response.ok)return NextResponse.json({configured:true,connected:true,httpStatus:response.status,message:"Sarvam API connection verified. Live calling remains disabled."},{headers});
  const message=response.status===401?"Sarvam rejected the API key (401). Check the Voice Agents workspace API key.":
   response.status===403?"Sarvam denied access (403). Check workspace permissions and API key scope.":
   response.status===404?"Sarvam did not find the organization or workspace (404). Check the IDs in Sarvam Settings.":
   response.status===422?"Sarvam rejected the supplied identifiers (422). Verify you copied the raw organization and workspace IDs.":
   response.status===429?"Sarvam rate limit reached (429). Retry after the provider allows requests.":
   "Sarvam API returned HTTP "+response.status+". Verify organization, workspace and API access.";
  return NextResponse.json({configured:true,connected:false,httpStatus:response.status,message},{status:502,headers});
 }catch{
  return NextResponse.json({configured:true,connected:false,message:"Could not reach Sarvam. Check provider availability and network access."},{status:502,headers});
 }
}
