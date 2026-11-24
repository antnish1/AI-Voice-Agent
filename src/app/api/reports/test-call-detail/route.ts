import {NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const headers={"Cache-Control":"private, no-store"};
 try{
  const {supabase,user}=await requireItSuperUser();
  const id=new URL(request.url).searchParams.get("id")??"";
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return NextResponse.json({error:"Invalid record"},{status:400,headers});
  const {data:test,error}=await supabase.from("voice_test_call_requests").select("sarvam_attempt_id").eq("id",id).eq("user_id",user.id).maybeSingle();
  if(error||!test)return NextResponse.json({error:"Record unavailable"},{status:404,headers});
  if(!test.sarvam_attempt_id)return NextResponse.json({transcript:[]},{headers});
  const {data:call,error:callError}=await supabase.from("voice_test_call_results").select("transcript").eq("request_id",id).maybeSingle();
  if(callError)return NextResponse.json({error:"Call details unavailable"},{status:404,headers});
  const transcript=Array.isArray(call?.transcript)?call.transcript.filter((t:unknown):t is {role:string;en_text:string}=>!!t&&typeof t==="object"&&"role" in t&&"en_text" in t&&typeof t.en_text==="string"&&(t.role==="agent"||t.role==="user")):[];
  return NextResponse.json({transcript},{headers});
 }catch{return NextResponse.json({error:"Not authorized"},{status:403,headers});}
}
