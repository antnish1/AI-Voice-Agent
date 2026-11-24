import {NextResponse} from "next/server";
import {requireMembership} from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const headers={"Cache-Control":"private, no-store"};
 const {supabase,membership}=await requireMembership();
 if(!membership)return NextResponse.json({error:"Not authorized"},{status:403,headers});
 const id=new URL(request.url).searchParams.get("id")??"";
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return NextResponse.json({error:"Invalid record"},{status:400,headers});
 const {data,error}=await supabase.from("voice_call_records").select("transcript").eq("dealership_id",membership.dealership_id).eq("id",id).maybeSingle();
 if(error||!data)return NextResponse.json({error:"Record unavailable"},{status:404,headers});
 const transcript=Array.isArray(data.transcript)?data.transcript.filter((t:unknown):t is {role:string;en_text:string}=>!!t&&typeof t==="object"&&"role" in t&&"en_text" in t&&typeof t.en_text==="string"&&(t.role==="agent"||t.role==="user")):[];
 return NextResponse.json({transcript},{headers});
}
