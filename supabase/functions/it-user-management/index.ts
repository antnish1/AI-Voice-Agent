// Deno Supabase Edge Function; deploy with JWT verification at the gateway.
// The gateway uses service credentials internally; never put them in a browser bundle.
import {createClient} from "npm:@supabase/supabase-js@2.58.0";

const ALLOWED_ORIGINS=new Set(["https://frontier-ai-voice-crm.vercel.app","https://frontier-ai-voice-crm-six.vercel.app","https://ai.insureit.tech"]);
const IT_ID="5bd78ada-44f5-4045-a9fb-75c9dad69893";
// Generate a separate credential for each account; shared passwords are not safe
// when dealership users cannot change their own passwords.
const makePassword=()=>{
 const bytes=crypto.getRandomValues(new Uint8Array(24));
 const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
 return Array.from(bytes,v=>alphabet[v%alphabet.length]).join("");
};
const validEmail=(v:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254;
const validMobile=(v:string)=>/^(?:\+91|91)?[6-9]\d{9}$/.test(v.replace(/[\s()-]/g,""));
const validContact=(v:string)=>/^[+\d\s().-]{7,22}$/.test(v);
const json=(value:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin",...headers}});
const authUrl=Deno.env.get("SUPABASE_URL")??"";
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const publicKey=Deno.env.get("SUPABASE_ANON_KEY")??"";
const admin=createClient(authUrl,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
const auth=createClient(authUrl,publicKey,{auth:{autoRefreshToken:false,persistSession:false}});
type Input={action?:string;email?:string;name?:string;dealershipId?:string;password?:string;userId?:string;confirm?:string;
 address?:string;contact?:string;mobile?:string;contactPerson?:string;employeeId?:string;post?:string};
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
 // No self-service password management for dealership users.
 if(body.action==="set-own-password")return json({error:"Only the IT Super User can manage dealership passwords."},403,headers);
 // This is an exact identity check AND a database membership check (not a UI-only guard).
 if(user.id!==IT_ID||user.email?.toLowerCase()!=="it@insureit.in")return json({error:"IT Super User only"},403,headers);
 const {data:membership,error:memError}=await admin.from("memberships").select("id").eq("user_id",user.id).eq("role","super_admin").limit(1);
 if(memError||!membership?.length)return json({error:"IT Super User membership required"},403,headers);
 if(body.action==="list"){
  const {data:dealers,error:dealersError}=await admin.from("dealerships").select("id,name,address,contact,mobile,contact_person,email").order("name").limit(500);
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
 passwordChangePending:byId.get(m.user_id)?.app_metadata?.must_change_password===true,
 accountState:byId.get(m.user_id)?.app_metadata?.frontvox_account_state==="archived"?"archived":byId.get(m.user_id)?.app_metadata?.frontvox_account_state==="disabled"||Boolean(byId.get(m.user_id)?.banned_until&&Date.parse(byId.get(m.user_id)?.banned_until??"")>Date.now())?"disabled":"active",
 originalEmail:String(byId.get(m.user_id)?.app_metadata?.frontvox_original_login_email??"")}));
  return json({dealerships:dealers??[],users:result},200,headers);
 }
 if(body.action==="create-dealership"){
  const name=(body.name??"").trim().replace(/\s+/g," ");
  const address=(body.address??"").trim(),contact=(body.contact??"").trim(),mobile=(body.mobile??"").trim().replace(/[\s()-]/g,"");
  const contactPerson=(body.contactPerson??"").trim().replace(/\s+/g," ");
  const email=(body.email??"").trim().toLowerCase();
  if(name.length<3||name.length>100)return json({error:"Dealership name must be 3–100 characters."},400,headers);
  if(address.length<3||address.length>500){if(body.address!==undefined||!validContact(contact))return json({error:"Enter a dealership address (3–500 characters)."},400,headers);}
  if(!validMobile(mobile))return json({error:"Enter a valid dealership mobile number."},400,headers);
  if(contactPerson.length<2||contactPerson.length>100)return json({error:"Contact person must be 2–100 characters."},400,headers);
  if(!validEmail(email))return json({error:"Enter a valid dealership email address."},400,headers);
  const existing=await admin.from("dealerships").select("id").ilike("name",name).limit(1);
  if(existing.error)return json({error:"Could not verify dealership name."},503,headers);
  if(existing.data?.length)return json({error:"A dealership with this name already exists."},409,headers);
  const created=await admin.from("dealerships").insert({
   name,address:address||null,contact:contact||null,mobile:mobile.startsWith("+")?mobile:mobile.startsWith("91")?"+"+mobile:"+91"+mobile,
   contact_person:contactPerson,email
  }).select("id").single();
  if(created.error)return json({error:"Unable to create dealership. Check the dealership address migration."},500,headers);
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
  // Initial dealership password is configured privately by IT; never commit it.
  const issuedPassword=Deno.env.get("DEALERSHIP_DEFAULT_PASSWORD");
  if(!issuedPassword)return json({error:"IT must configure the dealership default password."},503,headers);
  const created=await admin.auth.admin.createUser({
   email,password:issuedPassword,email_confirm:true,
   user_metadata:{display_name:name,mobile:mobile.startsWith("+")?mobile:mobile.startsWith("91")?"+"+mobile:"+91"+mobile,employee_id:employeeId,post},
   app_metadata:{must_change_password:false,account_kind:"dealership"}
  });
  if(created.error||!created.data.user)return json({error:created.error?.message??"Unable to create account."},400,headers);
  const id=created.data.user.id;
  const added=await admin.from("memberships").insert({user_id:id,dealership_id:dealerId,role:"management"});
  if(added.error){
   await admin.auth.admin.deleteUser(id);
   return json({error:"Dealership membership failed; account creation was rolled back."},500,headers);
  }
  return json({ok:true,message:"Dealership user created. No email was sent. Share the issued password securely.",issuedPassword},201,headers);
 }
 if(body.action==="edit-user"){
  const id=body.userId??"";
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||id===IT_ID)return json({error:"Invalid dealership user."},400,headers);
  const membershipRows=await admin.from("memberships").select("role").eq("user_id",id);
  if(membershipRows.error||!membershipRows.data?.length||membershipRows.data.some(m=>m.role!=="management"))return json({error:"Only dealership viewer accounts may be managed."},403,headers);
  const account=await admin.auth.admin.getUserById(id);
  if(account.error||!account.data.user||account.data.user.app_metadata?.frontvox_account_state==="archived")return json({error:"Editable account not found."},404,headers);
  if([body.name,body.mobile,body.employeeId,body.post].some(v=>typeof v!=="string"))return json({error:"Invalid user details."},400,headers);
  const name=body.name!.trim().replace(/\s+/g," "),mobile=body.mobile!.trim().replace(/[\s()-]/g,""),employeeId=body.employeeId!.trim(),post=body.post!.trim();
  if(name.length<2||name.length>100||(mobile&&!validMobile(mobile))||(employeeId&&!/^[A-Za-z0-9_./-]{2,40}$/.test(employeeId))||(post&&(post.length<2||post.length>100)))return json({error:"Check name, mobile, employee ID and role / post."},400,headers);
  const saved=await admin.auth.admin.updateUserById(id,{user_metadata:{...account.data.user.user_metadata,display_name:name,mobile:mobile?(mobile.startsWith("+")?mobile:mobile.startsWith("91")?"+"+mobile:"+91"+mobile):"",employee_id:employeeId,post}});
  if(saved.error||!saved.data.user)return json({error:"Unable to update user details."},400,headers);
  return json({ok:true,message:"User details updated."},200,headers);
 }
 if(["account-dependencies","archive-user","archive-release-email","disable-login","enable-login","delete-user"].includes(body.action??"")){
  const id=body.userId??"";
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||id===IT_ID)return json({error:"Invalid dealership user."},400,headers);
  const membershipRows=await admin.from("memberships").select("role").eq("user_id",id);
  if(membershipRows.error||!membershipRows.data?.length||membershipRows.data.some(m=>m.role!=="management"))return json({error:"Only dealership viewer accounts may be managed."},403,headers);
  const account=await admin.auth.admin.getUserById(id);
  if(account.error||!account.data.user)return json({error:"Account not found."},404,headers);
  const target=account.data.user;
  const dependencies=await admin.rpc("frontvox_account_dependencies",{target_user:id});
  if(dependencies.error||!Array.isArray(dependencies.data))return json({error:"Account protection checks unavailable. No changes were made."},503,headers);
  if(body.action==="account-dependencies")return json({ok:true,dependencies:dependencies.data},200,headers);
  const phrases:Record<string,string>={"archive-user":"ARCHIVE USER","archive-release-email":"RELEASE EMAIL","disable-login":"DISABLE LOGIN","enable-login":"ENABLE LOGIN","delete-user":"DELETE USER"};
  if(body.confirm!==phrases[body.action??""])return json({error:"Exact account-action confirmation required."},400,headers);
  if(body.action==="delete-user"){
   if(dependencies.data.length)return json({error:"Protected records prevent permanent deletion. Archive or disable login instead.",dependencies:dependencies.data},409,headers);
   const removed=await admin.auth.admin.deleteUser(id,false);
   if(removed.error)return json({error:"Deletion refused by the database or Auth service. Recheck dependencies."},409,headers);
   return json({ok:true,message:"Account identity deleted; no dealership or business record was removed."},200,headers);
  }
  const state=body.action==="enable-login"?"active":body.action==="disable-login"?(target.app_metadata?.frontvox_account_state==="archived"?"archived":"disabled"):"archived";
  if(body.action==="enable-login"&&target.app_metadata?.frontvox_original_login_email)return json({error:"This archived account's login email was released. It cannot be re-enabled with that email."},409,headers);
  if(body.action==="archive-release-email"&&(!target.email||target.app_metadata?.frontvox_original_login_email))return json({error:"No original login email remains to release."},409,headers);
  const release=body.action==="archive-release-email";
  const updates=await admin.auth.admin.updateUserById(id,{
   ban_duration:state==="active"?"none":"876000h",
   app_metadata:{...target.app_metadata,frontvox_account_state:state,frontvox_account_state_changed_at:new Date().toISOString(),...(release?{frontvox_original_login_email:target.email}:{})},
   ...(release?{email:"retired-"+id+"@example.invalid",email_confirm:true}:{})
  });
  if(updates.error||!updates.data.user)return json({error:"Account status could not be changed."},500,headers);
  const message=release?"Account archived and original login email released. History retained.":state==="archived"?"Account archived. History retained.":state==="disabled"?"Login disabled. Profile and history retained.":"Login enabled.";
  return json({ok:true,message,accountState:state},200,headers);
 }
 if(body.action==="reset"){
  // IT Super User authorization is enforced above for every account-management action.
  // This operation cannot be called by dealership users, even directly via HTTP.
  if(body.confirm!=="RESET")return json({error:"Explicit IT password reset confirmation required."},400,headers);
  const id=body.userId??"";
  if(!/^[0-9a-f-]{36}$/i.test(id)||id===IT_ID)return json({error:"Invalid dealership user"},400,headers);
  const row=await admin.from("memberships").select("role").eq("user_id",id);
  if(row.error||!row.data?.length||row.data.some(m=>m.role!=="management"))return json({error:"Only assigned dealership viewer accounts can be reset."},403,headers);
  const target=await admin.auth.admin.getUserById(id);
  if(target.error||!target.data.user||target.data.user.app_metadata?.frontvox_account_state==="archived"||target.data.user.app_metadata?.frontvox_account_state==="disabled"||(target.data.user.banned_until&&Date.parse(target.data.user.banned_until)>Date.now()))return json({error:"Enable the account before resetting its password."},409,headers);
  // IT-only password reset; no email and no dealership self-service.
  // Clear the legacy first-login flag to avoid trapping existing accounts.
  if(body.password!==undefined&&typeof body.password!=="string")return json({error:"Invalid password."},400,headers);
  if(body.email!==undefined&&typeof body.email!=="string")return json({error:"Invalid login email."},400,headers);
  const requestedPassword=body.password??"";
  if(requestedPassword&&(requestedPassword.length<8||new TextEncoder().encode(requestedPassword).length>72||!requestedPassword.trim()))return json({error:"Password must contain at least 8 characters and at most 72 UTF-8 bytes."},400,headers);
  const correctedEmail=(body.email??"").trim().toLowerCase();
  if(correctedEmail&&!validEmail(correctedEmail))return json({error:"Enter a valid login email."},400,headers);
  const issuedPassword=requestedPassword||makePassword();
  const reset=await admin.auth.admin.updateUserById(id,{
   password:issuedPassword,email_confirm:true,app_metadata:{...target.data.user.app_metadata,must_change_password:false},
   ...(correctedEmail?{email:correctedEmail}:{})
  });
  if(reset.error||!reset.data.user)return json({error:"Could not issue password. Check the email is not already in use and the password meets Auth requirements."},400,headers);
  return json({ok:true,message:"Temporary password issued and login email confirmed. No email sent. Share securely.",issuedPassword,email:reset.data.user.email},200,headers);
 }
 return json({error:"Unsupported operation"},400,headers);
});
