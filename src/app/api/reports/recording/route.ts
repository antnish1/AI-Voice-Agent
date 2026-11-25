import {NextResponse} from "next/server";
import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
import {requireProviderConfig} from "@/lib/sarvam/outbound-provider";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
const fail=(status:number,error:string)=>NextResponse.json({error},{status,headers});
export async function GET(request:Request){
 const {supabase,membership,user,memberships}=await requireMembership();if(!membership)return fail(403,"Not authorized");
 const id=new URL(request.url).searchParams.get("id")??"";
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return fail(400,"Invalid record");
 let query=supabase.from("voice_call_records").select("agent_id,sarvam_interaction_id").eq("id",id);
 if(!isItSuperUser(user.id,user.email??"",memberships.some(m=>m.role==="super_admin")?"super_admin":""))query=query.eq("dealership_id",membership.dealership_id);
 const {data,error}=await query.maybeSingle();if(error||!data)return fail(404,"Record unavailable");
 if(!data.agent_id||!data.sarvam_interaction_id||!/^\d{8}\/[A-Za-z0-9._:-]{1,180}$/.test(data.sarvam_interaction_id))return fail(404,"No recording linked");
 try{const {key,base,org,workspace}=requireProviderConfig();const r=await fetch(base+"/api/analytics/v1/"+org+"/"+workspace+"/"+encodeURIComponent(data.agent_id)+"/recordings/"+encodeURIComponent(data.sarvam_interaction_id),{headers:{"X-API-Key":key,Accept:"audio/wav"},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(45000)});if(!r.ok||!r.body||!/^audio\/(wav|x-wav|wave)(;|$)/i.test(r.headers.get("content-type")??""))return fail(r.status===404?404:502,"Recording unavailable from Sarvam");return new Response(r.body,{headers:{...headers,"Content-Type":"audio/wav","Content-Disposition":"inline; filename=call.wav"}});}catch{return fail(502,"Recording service unavailable");}
}
