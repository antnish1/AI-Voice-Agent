import {NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";
import {requireProviderConfig} from "@/lib/sarvam/outbound-provider";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
const fail=(status:number,error:string)=>NextResponse.json({error},{status,headers});
export async function GET(request:Request){
 let ctx;try{ctx=await requireItSuperUser();}catch{return fail(403,"Not authorized");}
 const id=new URL(request.url).searchParams.get("id")??"";
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return fail(400,"Invalid record");
 const {data:test,error}=await ctx.supabase.from("voice_test_call_requests").select("agent_id,sarvam_attempt_id").eq("id",id).eq("user_id",ctx.user.id).maybeSingle();
 if(error||!test?.agent_id||!test.sarvam_attempt_id)return fail(404,"Test unavailable");
 const {data:call,error:resultError}=await ctx.supabase.from("voice_test_call_results").select("interaction_id").eq("request_id",id).maybeSingle();
 if(resultError||!call?.interaction_id||!/^\d{8}\/[A-Za-z0-9._:-]{1,180}$/.test(call.interaction_id))return fail(404,"No verified recording linked");
 try{const {key,base,org,workspace}=requireProviderConfig();const r=await fetch(base+"/api/analytics/v1/"+org+"/"+workspace+"/"+encodeURIComponent(test.agent_id)+"/recordings/"+encodeURIComponent(call.interaction_id),{headers:{"X-API-Key":key,Accept:"audio/wav"},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(45000)});if(!r.ok||!r.body||!/^audio\/(wav|x-wav|wave)(;|$)/i.test(r.headers.get("content-type")??""))return fail(r.status===404?404:502,"Recording unavailable from Sarvam");return new Response(r.body,{headers:{...headers,"Content-Type":"audio/wav","Content-Disposition":"inline; filename=test-call.wav"}});}catch{return fail(502,"Recording service unavailable");}
}
