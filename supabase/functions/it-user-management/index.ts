// Deno Supabase Edge Function; deploy with JWT verification at the gateway.
// The gateway uses service credentials internally; never put them in a browser bundle.
import {createClient} from "npm:@supabase/supabase-js@2.58.0";

const ALLOWED_ORIGINS=new Set(["https://frontier-ai-voice-crm.vercel.app","https://frontier-ai-voice-crm-six.vercel.app"]);
const IT_ID="5bd78ada-44f5-4045-a9fb-75c9dad69893";
const DEFAULT_TEMP_PASSWORD="12345678";
const validEmail=(v:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254;
const validMobile=(v:string)=>/^(?:\+91|91)?[6-9]\d{9}$/.test(v.replace(/[\s()-]/g,""));
const validContact=(v:string)=>/^[+\d\s().-]{7,22}$/.test(v);
const json=(value:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin",...headers}});
const authUrl=Deno.env.get("SUPABASE_URL")??"";
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const publicKey=Deno.env.get("SUPABASE_ANON_KEY")??"";
const admin=createClient(authUrl,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
const auth=createClient(authUrl,publicKey,{auth:{autoRefreshToken:false,persistSession:false}});
type Input={action?:string;email?:string;name?:string;dealershipId?:string;password?:string;userId?:string;
 contact?:string;mobile?:string;contactPerson?:string;employeeId?:string;post?:string};
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
  const {data:dealers,error:dealersError}=await admin.from("dealerships").select("id,name,contact,mobile,contact_person,email").order("name").limit(500);
  if(dealersError)return json({error:"Unable to load dealerships"},500,headers);
  const {data:rows,error:rowsError}=await admin.from("memberships").select("user_id,dealership_id,role,dealerships(name)").order("dealership_id").limit(500);
  if(rowsError)return json({error:"Unable to load memberships"},500,headers);
  const users=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(users.error)return json({error:"Unable to load user directory"},500,headers);
  const byId=new Map(users.data.users.map(u=>[u.id,u]));
  const result=(rows??[]).filter(m=>m.role!=="super_admin").map(m=>({id:m.user_id,email:byId.get(m.user_id)?.email??"Unknown",name:String(byId.get(m.user_id)?.user_metadata?.display_name??""),dealershipId:m.dealership_id,dealership:(m.dealerships as unknown as {name:string}|null)?.name??"Dealership",role:m.role,activated:Boolean(byId.get(m.user_id)?.email_confirmed_at),
 mobile:String(byId.get(m.user_id)?.user_metadata?.mobile??""),
 employeeId:String(byId.get(m.user_id)?.user_metadata?.employee_id??""),
 post:String(byId.get(m.user_id)?.user_metadata?.post??""),
 passwordChangePending:byId.get(m.user_id)?.app_metadata?.must_change_password===true}));
  return json({dealerships:dealers??[],users:result},200,headers);
 }
 if(body.action==="create-dealership"){
  const name=(body.name??"").trim().replace(/\s+/g," ");
  const contact=(body.contact??"").trim(),mobile=(body.mobile??"").trim().replace(/[\s()-]/g,"");
  const contactPerson=(body.contactPerson??"").trim().replace(/\s+/g," ");
  const email=(body.email??"").trim().toLowerCase();
  if(name.length<3||name.length>100)return json({error:"Dealership name must be 3–100 characters."},400,headers);
  if(!validContact(contact))return json({error:"Enter a valid dealership contact number."},400,headers);
  if(!validMobile(mobile))return json({error:"Enter a valid dealership mobile number."},400,headers);
  if(contactPerson.length<2||contactPerson.length>100)return json({error:"Contact person must be 2–100 characters."},400,headers);
  if(!validEmail(email))return json({error:"Enter a valid dealership email address."},400,headers);
  const existing=await admin.from("dealerships").select("id").ilike("name",name).limit(1);
  if(existing.error)return json({error:"Could not verify dealership name."},503,headers);
  if(existing.data?.length)return json({error:"A dealership with this name already exists."},409,headers);
  const created=await admin.from("dealerships").insert({
   name,contact,mobile:mobile.startsWith("+")?mobile:mobile.startsWith("91")?"+"+mobile:"+91"+mobile,
   contact_person:contactPerson,email
  }).select("id").single();
  if(created.error)return json({error:"Unable to create dealership. Check the contact-field migration."},500,headers);
  return json({ok:true,message:"Dealership created. You can now create its user account; no email was sent."},201,headers);
 }
 if(body.action==="create-user"){
  const email=(body.email??"").trim().toLowerCase(),name=(body.name??"").trim().replace(/\s+/g," ");
  const mobile=(body.mobile??"").trim().replace(/[\s()-]/g,"");
  const employeeId=(body.employeeId??"").trim(),post=(body.post??"").trim();
  const dealerId=(body.dealershipId??"").trim();
  if(!validEmail(email)||name.length<2||name.length>100)return json({error:"Enter a valid full name and email."},400,headers);
  if(!validMobile(mobile))return json({error:"Enter a valid employee mobile number."},400,headers);
  if(!/^[A-Za-z0-9_./-]{2,40}$/.test(employeeId))return json({error:"Enter a valid employee ID (2–40 letters, numbers or -_/.)"},400,headers);
  if(post.length<2||post.length>100)return json({error:"Role / post must be 2–100 characters."},400,headers);
  if(!/^[0-9a-f-]{36}$/i.test(dealerId))return json({error:"Choose an existing dealership."},400,headers);
  const dealer=await admin.from("dealerships").select("id").eq("id",dealerId).maybeSingle();
  if(dealer.error||!dealer.data)return json({error:"Dealership does not exist. Create it first."},404,headers);
  // createUser does not send an invitation or confirmation email.
  // Email is marked confirmed so the user can sign in with the temporary password.
  // Existing portal auth checks must_change_password before allowing CRM access.
  const created=await admin.auth.admin.createUser({
   email,password:DEFAULT_TEMP_PASSWORD,email_confirm:true,
   user_metadata:{display_name:name,mobile:mobile.startsWith("+")?mobile:mobile.startsWith("91")?"+"+mobile:"+91"+mobile,employee_id:employeeId,post},
   app_metadata:{must_change_password:true,account_kind:"dealership"}
  });
  if(created.error||!created.data.user)return json({error:created.error?.message??"Unable to create account."},400,headers);
  const id=created.data.user.id;
  const added=await admin.from("memberships").insert({user_id:id,dealership_id:dealerId,role:"management"});
  if(added.error){
   await admin.auth.admin.deleteUser(id);
   return json({error:"Dealership membership failed; account creation was rolled back."},500,headers);
  }
  return json({ok:true,message:"Dealership user created. No invitation email was sent. Temporary password: 12345678; user must change it on first login."},201,headers);
 }
 if(body.action==="reset"){
  const id=body.userId??"";
  if(!/^[0-9a-f-]{36}$/i.test(id)||id===IT_ID)return json({error:"Invalid dealership user"},400,headers);
  const row=await admin.from("memberships").select("role").eq("user_id",id).maybeSingle();
  if(row.error||!row.data||row.data.role==="super_admin")return json({error:"Only dealership users can be reset"},403,headers);
  // Reset directly without sending an email. Force another password change
  // before protected CRM routes can be accessed.
  const reset=await admin.auth.admin.updateUserById(id,{
   password:DEFAULT_TEMP_PASSWORD,app_metadata:{must_change_password:true}
  });
  if(reset.error)return json({error:"Could not reset temporary password."},500,headers);
  return json({ok:true,message:"Temporary password reset to 12345678. No email sent. User must change password on next login."},200,headers);
 }
 return json({error:"Unsupported operation"},400,headers);
});
