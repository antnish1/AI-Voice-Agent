import {NextResponse} from "next/server";
import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const {user,memberships}=await requireMembership();
 if(!memberships.some(m=>isItSuperUser(user.id,user.email??"",m.role)))return NextResponse.json({connected:false,error:"IT Super User access required"},{status:403});
 const key=process.env.SARVAM_API_KEY,org=process.env.SARVAM_ORG_ID,workspace=process.env.SARVAM_WORKSPACE_ID;
 const ready=Boolean(key&&org&&workspace);
 if(!ready)return NextResponse.json({configured:false,connected:false,message:"Sarvam workspace credentials are not configured on the server."},{headers:{"Cache-Control":"no-store"}});
 // Sarvam Voice Agents deployments endpoint, X-API-Key authentication.
 const slug=/^[A-Za-z0-9][A-Za-z0-9_-]{1,127}$/;
 if(!slug.test(org!)||!slug.test(workspace!))return NextResponse.json({configured:true,connected:false,message:"Invalid organization or workspace ID configuration."},{status:503});
 try{
  const response=await fetch("https://apps.sarvam.ai/api/app-authoring/v1/orgs/"+encodeURIComponent(org!)+"/workspaces/"+encodeURIComponent(workspace!)+"/deployments",{headers:{"X-API-Key":key!,"Accept":"application/json"},method:"GET",cache:"no-store",signal:AbortSignal.timeout(10000)});
  return NextResponse.json({configured:true,connected:response.ok,httpStatus:response.status,message:response.ok?"Verified Sarvam API access. Live calls remain disabled.":"Sarvam rejected the connection. Verify key permissions and workspace."},{status:response.ok?200:502,headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({configured:true,connected:false,message:"Sarvam connection could not be reached."},{status:502,headers:{"Cache-Control":"no-store"}});}
}
