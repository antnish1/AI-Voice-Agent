import {NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";
import {fetchCommittedVersions,validAgentId} from "@/lib/sarvam/agent-versions";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function GET(request:Request){
 try{await requireItSuperUser();}catch{return NextResponse.json({ok:false,message:"IT Super User access required."},{status:403,headers});}
 const agentId=new URL(request.url).searchParams.get("agentId")??"";
 if(!validAgentId(agentId))return NextResponse.json({ok:false,message:"Select a valid agent."},{status:400,headers});
 try{
  const versions=await fetchCommittedVersions(agentId);
  return NextResponse.json({ok:true,agentId,versions,latestCommittedVersion:versions[0]??null,source:"sarvam_live",fetchedAt:new Date().toISOString()},{headers});
 }catch(e){
  const message=e instanceof Error&&e.message.startsWith("Sarvam ")?e.message:"Unable to verify live Sarvam versions. Existing selections are unchanged.";
  return NextResponse.json({ok:false,message},{status:502,headers});
 }
}
