// Deno Supabase Edge Function; deploy with JWT verification at the gateway.
// The gateway uses service credentials internally; never put them in a browser bundle.
import {createClient} from "npm:@supabase/supabase-js@2.58.0";

const ALLOWED_ORIGINS=new Set(["https://frontier-ai-voice-crm.vercel.app"]);
const IT_ID="5bd78ada-44f5-4045-a9fb-75c9dad69893";
const DEFAULT_TEMP_PASSWORD="12345678";
const json=(value:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin",...headers}});
const authUrl=Deno.env.get("SUPABASE_URL")??"";
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const publicKey=Deno.env.get("SUPABASE_ANON_KEY")??"";
const admin=createClient(authUrl,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
const auth=createClient(authUrl,publicKey,{auth:{autoRefreshToken:false,persistSession:false}});
type Input={action?:string;email?:string;name?:string;dealershipId?:string;newDealership?:string;password?:string;userId?:string};
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin")??"";
 const headers=ALLOWED_ORIGINS.has(origin)?{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"}:{};
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return json({error:"Method not allowed"},405,headers);
 if(origin&&!ALLOWED_ORIGINS.has(origin))return json({error:"Origin not allowed"},403,headers);
 const jwt=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 if(!jwt)return json({error:"Authentication required"},401,headers);
 const {data:{user},error:authError}=await auth.auth.getUser(jwt);
 if(authError||!user)return json({error:"Invalid or expired session"},401,headers);
 let body:Input;try{body=await req.json();}catch{return json({error:"Invalid JSON"},400,headers);}
 // Password reset is the only non-superuser action. Membership is already checked by the portal.
 if(body.action==="set-own-password"){
  if(user.app_metadata?.must_change_password!==true)return json({error:"Password setup is not pending"},403,headers);
  const password=body.password??"";
  if(password.length<12||password.length>128||password===DEFAULT_TEMP_PASSWORD)return json({error:"Choose at least 12 characters and do not reuse the temporary password"},400,headers);
  const {error}=await admin.auth.admin.updateUserById(user.id,{password,app_metadata:{must_change_password:false}});
  if(error)return json({error:"Could not update password"},500,headers);
  return json({ok:true},200,headers);
 }
 // This is an exact identity check AND a database membership check (not a UI-only guard).
 if(user.id!==IT_ID||user.email?.toLowerCase()!=="it@insureit.in")return json({error:"IT Super User only"},403,headers);
 const {data:membership,error:memError}=await admin.from("memberships").select("id").eq("user_id",user.id).eq("role","super_admin").limit(1);
 if(memError||!membership?.length)return json({error:"IT Super User membership required"},403,headers);
 if(body.action==="list"){
  const {data:dealers,error:dealersError}=await admin.from("dealerships").select("id,name").order("name").limit(500);
  if(dealersError)return json({error:"Unable to load dealerships"},500,headers);
  const {data:rows,error:rowsError}=await admin.from("memberships").select("user_id,dealership_id,role,dealerships(name)").order("dealership_id").limit(500);
  if(rowsError)return json({error:"Unable to load memberships"},500,headers);
  const users=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(users.error)return json({error:"Unable to load user directory"},500,headers);
  const byId=new Map(users.data.users.map(u=>[u.id,u]));
  const result=(rows??[]).filter(m=>m.role!=="super_admin").map(m=>({id:m.user_id,email:byId.get(m.user_id)?.email??"Unknown",name:String(byId.get(m.user_id)?.user_metadata?.display_name??""),dealershipId:m.dealership_id,dealership:(m.dealerships as unknown as {name:string}|null)?.name??"Dealership",role:m.role,activated:Boolean(byId.get(m.user_id)?.email_confirmed_at)}));
  return json({dealerships:dealers??[],users:result},200,headers);
 }
 if(body.action==="create"){
  const email=(body.email??"").trim().toLowerCase(),name=(body.name??"").trim(),newDealership=(body.newDealership??"").trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||name.length<2||name.length>100)return json({error:"Enter a valid name and email"},400,headers);
  if(newDealership&&(newDealership.length<3||newDealership.length>100))return json({error:"Dealership name must be 3–100 characters"},400,headers);
  if(!newDealership&&!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(body.dealershipId??""))return json({error:"Choose a dealership"},400,headers);
  let dealerId=body.dealershipId??"",createdDealer=false;
  if(newDealership){
   const existing=await admin.from("dealerships").select("id").ilike("name",newDealership).limit(1);
   if(existing.error)return json({error:"Cannot validate dealership"},500,headers);
   if(existing.data?.length)return json({error:"This dealership already exists. Select it from the list."},409,headers);
   const created=await admin.from("dealerships").insert({name:newDealership}).select("id").single();
   if(created.error)return json({error:"Unable to create dealership"},500,headers);
   dealerId=created.data.id;createdDealer=true;
  }else{
   const dealer=await admin.from("dealerships").select("id").eq("id",dealerId).maybeSingle();
   if(dealer.error||!dealer.data)return json({error:"Dealership not found"},404,headers);
  }
  const invited=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:"https://frontier-ai-voice-crm.vercel.app/auth/callback?next=/change-password",data:{display_name:name}});
  if(invited.error||!invited.data.user){
   if(createdDealer)await admin.from("dealerships").delete().eq("id",dealerId);
   return json({error:invited.error?.message??"Unable to send activation invitation"},400,headers);
  }
  const id=invited.data.user.id;
  const credential=await admin.auth.admin.updateUserById(id,{password:DEFAULT_TEMP_PASSWORD,app_metadata:{must_change_password:true,account_kind:"dealership"}});
  const membershipInsert=credential.error?null:await admin.from("memberships").insert({user_id:id,dealership_id:dealerId,role:"management"});
  if(credential.error||membershipInsert?.error){
   await admin.auth.admin.deleteUser(id);
   if(createdDealer)await admin.from("dealerships").delete().eq("id",dealerId);
   return json({error:"Activation could not be completed; no account was provisioned. Retry."},500,headers);
  }
  return json({ok:true,message:"Activation email requested. The dealership user must activate and change the temporary password before accessing data."},201,headers);
 }
 if(body.action==="reset"){
  const id=body.userId??"";
  if(!/^[0-9a-f-]{36}$/i.test(id)||id===IT_ID)return json({error:"Invalid dealership user"},400,headers);
  const row=await admin.from("memberships").select("role").eq("user_id",id).maybeSingle();
  if(row.error||!row.data||row.data.role==="super_admin")return json({error:"Only dealership users can be reset"},403,headers);
  const userResult=await admin.auth.admin.getUserById(id);
  if(userResult.error||!userResult.data.user?.email)return json({error:"User not found"},404,headers);
  // Recovery email is sent by Supabase Auth; admin cannot read or share a new password.
  const reset=await auth.auth.resetPasswordForEmail(userResult.data.user.email,{redirectTo:"https://frontier-ai-voice-crm.vercel.app/auth/callback?next=/change-password"});
  if(reset.error)return json({error:"Unable to send password reset email"},500,headers);
  return json({ok:true,message:"Password reset email requested."},200,headers);
 }
 return json({error:"Unsupported operation"},400,headers);
});
