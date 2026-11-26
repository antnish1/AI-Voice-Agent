import {normalizeTranscript} from "@/lib/sarvam/transcript";
import {NextResponse} from "next/server";
import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const headers={"Cache-Control":"private, no-store"};
 const {supabase,membership,user,memberships}=await requireMembership();
 if(!membership)return NextResponse.json({error:"Not authorized"},{status:403,headers});
 const id=new URL(request.url).searchParams.get("id")??"";
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return NextResponse.json({error:"Invalid record"},{status:400,headers});
 const it=isItSuperUser(user.id,user.email??"",memberships.some(m=>m.role==="super_admin")?"super_admin":"");
 let query=supabase.from("voice_call_records").select("transcript").eq("id",id);
 if(!it)query=query.eq("dealership_id",membership.dealership_id);
 const {data,error}=await query.maybeSingle();
 if(error||!data)return NextResponse.json({error:"Record unavailable"},{status:404,headers});
 const transcript=normalizeTranscript(data.transcript);
 return NextResponse.json({transcript},{headers});
}
