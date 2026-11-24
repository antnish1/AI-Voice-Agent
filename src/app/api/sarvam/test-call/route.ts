import {NextResponse} from "next/server";
import {requireItSuperUser} from "@/lib/it-access";
import {normalizePhone} from "@/lib/sarvam/recipient-validation";
import {callingEnabled,sha256,sarvamPost,sarvamPath} from "@/lib/sarvam/outbound-provider";
export const runtime="nodejs";
export async function POST(request:Request){
 try{
  const {supabase,user}=await requireItSuperUser();
  if(!callingEnabled("test"))return NextResponse.json({error:"Real test calls are disabled by the server operator."},{status:403});
  const body=await request.json();
  const number=normalizePhone(String(body.phone??""));
  const allowlist=(process.env.TEST_CALL_ALLOWLIST??"").split(",").map(x=>normalizePhone(x)).filter(Boolean);
  if(!number||!allowlist.includes(number))return NextResponse.json({error:"Test number is not in the server-approved allowlist."},{status:403});
  if(body.confirm!=="PLACE ONE REAL TEST CALL")return NextResponse.json({error:"Explicit one-call confirmation is required."},{status:400});
  const agent=String(body.agentId??"").trim(),connection=String(body.connectionId??"").trim(),outgoing=normalizePhone(String(body.callerNumber??""));
  const version=Number(body.appVersion);
  if(!/^[\w.\-]{3,200}$/.test(agent)||!/^[\w.\-]{3,200}$/.test(connection)||!outgoing||!Number.isInteger(version)||version<1)
   return NextResponse.json({error:"Select a valid committed agent version and verified telephony connection."},{status:400});
  const salt=process.env.TEST_CALL_HASH_SALT;
  if(!salt)return NextResponse.json({error:"Test-call audit salt has not been configured."},{status:503});
  const hash=sha256(number+"|"+salt);
  // Atomic PostgreSQL transaction applies the 3-in-24h limit and 10-minute duplicate restriction.
  const {data:reservationId,error:reservationError}=await supabase.rpc("frontvox_reserve_test_call",{
   p_phone_hash:hash,p_phone_last4:number.slice(-4),p_agent_id:agent,
   p_agent_version:version,p_connection_id:connection,p_caller_number:outgoing
  });
  if(reservationError||typeof reservationId!=="string")return NextResponse.json({error:"Test call blocked by cooldown, daily limit or audit policy."},{status:409});
  try{
   const result=await sarvamPost(sarvamPath("outbounds"),{
    app_config:{app_id:agent,app_version:version,connection_config:{connection_id:connection,agent_phone_number:outgoing}},
    user_config:{user_phone_number:number},
    ...(process.env.SARVAM_STORED_WEBHOOK_ID?{webhook_config:{webhook_id:process.env.SARVAM_STORED_WEBHOOK_ID}}:{})
   });
   if(typeof result.attempt_id!=="string"||!result.attempt_id)throw Error("Provider returned no attempt ID");
   await supabase.from("voice_test_call_requests").update({status:"submitted",sarvam_attempt_id:result.attempt_id}).eq("id",reservationId);
   return NextResponse.json({ok:true,attemptId:result.attempt_id,status:"submitted",message:"Provider accepted the test call. This does not confirm it connected."},{headers:{"Cache-Control":"no-store"}});
  }catch{
   // A network error can leave an unknown provider-side outcome. Never automatically retry.
   await supabase.from("voice_test_call_requests").update({status:"unknown"}).eq("id",reservationId);
   return NextResponse.json({error:"Provider result is unconfirmed. Check Sarvam attempts before trying again."},{status:502});
  }
 }catch{return NextResponse.json({error:"Could not authorize or validate the test call request."},{status:403});}
}
