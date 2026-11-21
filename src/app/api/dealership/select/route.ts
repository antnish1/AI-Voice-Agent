import {NextRequest,NextResponse} from "next/server";
import {cookies} from "next/headers";
import {requireMembership} from "@/lib/auth";
import {isItSuperUser} from "@/lib/it-access";
export async function POST(request:NextRequest){
 const {supabase,user,memberships}=await requireMembership();
 if(!memberships.some(m=>isItSuperUser(user.id,user.email??"",m.role)))return NextResponse.json({error:"IT Super User only"},{status:403});
 const origin=request.headers.get("origin");
 if(origin&&origin!==request.nextUrl.origin)return NextResponse.json({error:"Invalid origin"},{status:403});
 let id:string;try{const body=await request.json();id=String(body.dealershipId??"");}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Invalid dealership"},{status:400});
 const {data,error}=await supabase.from("dealerships").select("id").eq("id",id).maybeSingle();
 if(error||!data)return NextResponse.json({error:"Dealership not found"},{status:404});
 (await cookies()).set("frontier_active_dealership",id,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
