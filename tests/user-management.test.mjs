import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const access=file("../src/lib/auth.ts"),serverPage=file("../src/app/(portal)/users/page.tsx"),edge=file("../supabase/functions/it-user-management/index.ts"),sql=file("../db/dealership-readonly.sql"),shell=file("../src/components/shell.tsx");
test("dealership roles have no client-side preparation or approval grants",()=>{
 assert.match(access,/canPrepare\(role: Role\) \{ return role === "super_admin"/);
 assert.match(access,/canApprove\(role: Role\) \{ return role === "super_admin"/);
});
test("new user page is server-gated and excluded from dealership sidebar",()=>{
 assert.match(serverPage,/isItSuperUser/);assert.match(serverPage,/notFound\(\)/);
 assert.match(shell,/isItAdmin\?\[/);
});
test("no-email provisioning and IT-controlled default account credentials are server-side",()=>{
 assert.match(edge,/admin\.auth\.admin\.createUser/);
 assert.match(edge,/email_confirm:true/);
 assert.match(edge,/action==="create-dealership"/);
 assert.match(edge,/action==="create-user"/);
 assert.doesNotMatch(edge,/inviteUserByEmail|resetPasswordForEmail/);
 assert.match(edge,/const makePassword=/);
 assert.match(edge,/crypto\.getRandomValues/);
 assert.match(edge,/Deno\.env\.get\("DEALERSHIP_DEFAULT_PASSWORD"\)/);
 assert.match(edge,/if\(!issuedPassword\)/);
 assert.doesNotMatch(edge,/DEFAULT_TEMP_PASSWORD|password:"12345678"/);
 assert.match(edge,/must_change_password:false/);
 assert.match(edge,/user\.id!==IT_ID/);
 assert.match(edge,/membership.*super_admin/);
 assert.match(edge,/action==="set-own-password"/);
 assert.match(edge,/Only the IT Super User can manage dealership passwords/);
 assert.doesNotMatch(file("../src/app/(portal)/users/user-management.tsx"),/SUPABASE_SERVICE_ROLE_KEY/);
});
test("RLS migration restricts write access and retains dealership read scopes",()=>{
 for(const policy of ["campaign_draft_insert","campaign_update_workflow","customers_staff_import_insert","frontier_crm_documents_add","frontier_crm_documents_delete"]){
  assert.match(sql,new RegExp("alter policy "+policy,"i"));
 }
 assert.match(sql,/m\.role='super_admin'/);
 assert.doesNotMatch(sql,/role in \('super_admin','dealership_manager'/);
});
test("new users cannot bypass first-login password setup using direct database reads",()=>{
 assert.match(sql,/frontier_password_setup_complete/);
 for(const policy of ["memberships_self_read","customers_membership_read","campaigns_membership_read","frontier_crm_documents_read"])assert.match(sql,new RegExp("alter policy "+policy,"i"));
 assert.match(access,/must_change_password === true/);
});

test("new dealership and user are separate, and user creation cannot create a dealership implicitly",()=>{
 const ui=file("../src/app/(portal)/users/user-management.tsx");
 assert.match(ui,/Create Dealership/);
 assert.match(ui,/Create Dealership User/);
 assert.match(ui,/create-dealership/);
 assert.match(ui,/create-user/);
 assert.doesNotMatch(ui,/Create new dealership/);
 assert.match(edge,/Dealership does not exist\. Create it first\./);
 assert.match(edge,/role:"management"/);
 assert.match(edge,/employee_id:employeeId/);
 assert.match(edge,/must_change_password:false/);
});
test("contact fields are additive and old dealership records remain",()=>{
 const migration=file("../db/20261124_dealership_contact_details.sql");
 for(const col of ["contact","mobile","contact_person","email"])assert.match(migration,new RegExp("add column if not exists "+col+" text"));
 assert.doesNotMatch(migration,/drop table|truncate|delete from|alter column.*not null/i);
});

test("only the verified IT Super User can reset a dealership viewer password",()=>{
 const ui=file("../src/app/(portal)/users/user-management.tsx");
 assert.match(serverPage,/isItSuperUser/);
 assert.match(edge,/user\.id!==IT_ID/);
 assert.match(edge,/membership.*super_admin/);
 assert.match(edge,/body\.confirm!=="RESET"/);
 assert.match(edge,/!canManageMemberships\(row\.data\)/);
 assert.match(ui,/confirm:resetConfirm/);
 assert.match(edge,/must_change_password:false/);
 assert.doesNotMatch(edge,/inviteUserByEmail|resetPasswordForEmail/);
});

test("IT can manage dealership_manager and management accounts, never privileged or mixed roles",()=>{
 const ui=file("../src/app/(portal)/users/user-management.tsx");
 assert.match(ui,/isManageableDealershipRole\(u\.role\)/);
 assert.match(ui,/role==="management"\|\|role==="dealership_manager"/);
 assert.match(edge,/const isManageableDealershipRole=\(role:string\)=>role==="management"\|\|role==="dealership_manager"/);
 assert.match(edge,/rows\.every\(row=>isManageableDealershipRole\(row\.role\)\)/);
 assert.match(edge,/!canManageMemberships\(membershipRows\.data\)/);
 assert.match(edge,/!canManageMemberships\(row\.data\)/);
 assert.doesNotMatch(edge,/\.some\(m=>m\.role!=="management"\)/);
 assert.match(edge,/user\.id!==IT_ID/);
 assert.match(edge,/body\.confirm!==phrases/);
 assert.match(edge,/if\(dependencies\.data\.length\)return json/);
});

test("dealer users do not have a portal password change or self-reset flow",()=>{
 const screen=file("../src/app/change-password/page.tsx");
 const ui=file("../src/app/(portal)/users/user-management.tsx");
 assert.match(screen,/Password managed by IT/);
 assert.match(screen,/if\(!isIt\)/);
 assert.match(edge,/Only the IT Super User can manage dealership passwords/);
 assert.doesNotMatch(edge,/inviteUserByEmail|resetPasswordForEmail/);
 assert.match(ui,/issuedPassword/);
 assert.match(ui,/visible once/);
 assert.doesNotMatch(ui,/IT-controlled login password/);
});

test("disable dealership uses dedicated compact confirmation and retains exact phrase guard",()=>{
 const ui=file("../src/app/(portal)/users/user-management.tsx");
 const css=file("../src/app/(portal)/users/unified-directory.css");
 assert.match(ui,/dealerMode==="disable"\?" it-dealer-disable-dialog":""/);
 assert.match(ui,/dealerMode==="disable"\?<section className="it-dealer-disable-panel"/);
 assert.match(ui,/Confirm your action/);
 assert.match(ui,/DEALERSHIP NAME/);
 assert.match(ui,/Linked users, records or documents prevent disabling\./);
 assert.match(ui,/dealerConfirm!=="DISABLE DEALERSHIP"/);
 assert.match(ui,/className="it-dealer-disable-cancel"/);
 assert.match(css,/dialog\.it-dealer-disable-dialog\{width:min\(540px/);
 assert.match(css,/\.it-dealer-disable-actions\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("one-time newly created password opens a centered modal and clears on dismiss",()=>{
 const ui=file("../src/app/(portal)/users/user-management.tsx");
 const css=file("../src/app/(portal)/users/unified-directory.css");
 assert.match(ui,/ref=\{issuedDialogRef\} className="it-password-success-dialog"/);
 assert.match(ui,/issuedDialogRef\.current\?\.showModal\(\)/);
 assert.match(ui,/Password Created Successfully/);
 assert.match(ui,/New password created for \{issuedFor/);
 assert.match(ui,/Visible only once/);
 assert.match(ui,/Copy Password/);
 assert.match(ui,/setIssuedPassword\(""\)/);
 assert.match(ui,/setIssuedFor\(""\)/);
 assert.match(ui,/passwordVisible\?"text":"password"/);
 assert.doesNotMatch(ui,/New password for \{issuedFor\} — visible once/);
 assert.match(css,/dialog\.it-password-success-dialog\{position:fixed;inset:0;margin:auto/);
});

test("password reset requires opening account details and explicit in-dialog action",()=>{
 const ui=file("../src/app/(portal)/users/user-management.tsx");
 assert.match(ui,/onClick=\{\(\)=>openReset\(u\)\}/);
 assert.match(ui,/ref=\{resetDialogRef\}/);
 assert.match(ui,/onSubmit=\{e=>\{e\.preventDefault\(\);reset\(selectedAccount\);\}\}/);
 assert.match(ui,/onClose=\{clearReset\}/);
 assert.doesNotMatch(ui,/window\.confirm/);
});

test("account lifecycle operations are IT-only, explicit, and fail closed on missing protection checks",()=>{
 const ui=file("../src/app/(portal)/users/user-management.tsx"),migration=file("../db/20261124_account_lifecycle.sql");
 assert.match(edge,/!canManageMemberships\(membershipRows\.data\)/);
 assert.match(edge,/id===IT_ID/);
 assert.match(edge,/admin\.rpc\("frontvox_account_dependencies"/);
 assert.match(edge,/dependencies\.error\|\|!Array\.isArray\(dependencies\.data\)/);
 assert.match(edge,/body\.confirm!==phrases/);
 assert.match(edge,/if\(dependencies\.data\.length\)return json/);
 assert.match(edge,/admin\.auth\.admin\.deleteUser\(id,false\)/);
 assert.match(edge,/ban_duration:state==="active"\?"none":"876000h"/);
 assert.match(edge,/frontvox_account_state:state/);
 assert.match(edge,/frontvox_original_login_email/);
 assert.match(edge,/Enable the account before resetting its password/);
 assert.match(access,/frontvox_account_state==="disabled"/);
 assert.match(migration,/as restrictive for all to authenticated/i);
 assert.match(migration,/raw_app_meta_data->>'frontvox_account_state'/);
 assert.match(migration,/u\.banned_until/);
 assert.match(migration,/revoke all on function public\.frontvox_account_dependencies\(uuid\) from public, anon, authenticated/i);
 assert.match(migration,/grant execute on function public\.frontvox_account_dependencies\(uuid\) to service_role/i);
 assert.match(migration,/confrelid='public\.memberships'::regclass/);
 assert.match(migration,/storage\.objects/);
 assert.match(migration,/internal\.staff_invitation_requests/);
 assert.match(ui,/Archive user \/ Retire identity/);
 assert.match(ui,/archive-release-email/);
 assert.match(ui,/Resolve Dependencies/);
 assert.match(ui,/lifecycleConfirm!==lifecyclePhrases\[lifecycleAction\]/);
 assert.match(ui,/lifecycleAction==="delete-user"&&\(!dependencies\|\|dependencies\.length/);
});

test("temporary password form supports optional custom password and email correction only after RESET",()=>{
 const ui=file("../src/app/(portal)/users/user-management.tsx");
 assert.match(ui,/resetExpanded&&!resetPassword/);
 assert.match(ui,/resetConfirm!=="RESET"/);
 assert.match(ui,/password:customPassword,email:correctEmail\.trim\(\)/);
 assert.match(ui,/Issue temporary password/);
 assert.match(edge,/requestedPassword\|\|makePassword\(\)/);
 assert.match(edge,/correctedEmail&&!validEmail\(correctedEmail\)/);
 assert.match(edge,/password:issuedPassword,email_confirm:true/);
 assert.match(edge,/correctedEmail\?\{email:correctedEmail\}/);
});

 test("user management keeps KPIs and separates user and dealership tables",()=>{
 const ui=file("../src/app/(portal)/users/user-management.tsx");
 assert.doesNotMatch(ui,/it-user-permission|Create User \(No Email\)|>Refresh<|it-user-search|it-register-tabs|directoryView/);
 assert.match(ui,/>Dealerships<.*>Dealer users<.*>Active accounts<.*>System permission</);
 assert.match(ui,/role="tablist" aria-label="User management tables"/);
 assert.match(ui,/aria-selected=\{activeTable==="users"\}/);
 assert.match(ui,/aria-selected=\{activeTable==="dealerships"\}/);
 assert.match(ui,/activeTable==="users"&&<section/);
 assert.match(ui,/activeTable==="dealerships"&&<section/);
 assert.match(ui,/filteredDealers\.map\(d=><tr/);
 assert.match(ui,/filteredUsers\.map\(u=><tr/);
 assert.match(ui,/d\.address\|\|"—"/);
 assert.match(ui,/d\.contact_person\|\|d\.contact\|\|"—"/);
 assert.doesNotMatch(ui,/View dealership details|dealers\.filter\(d=>!users\.some/);
 });

 test("edit user dialog has two side-by-side actions with safe cancel",()=>{
 const ui=file("../src/app/(portal)/users/user-management.tsx");
 const css=file("../src/app/(portal)/users/unified-directory.css");
 assert.doesNotMatch(ui,/Login email changes remain in Password Set\. Dealership assignment and system permissions are unchanged\./);
 assert.match(ui,/className="it-edit-form-actions"/);
 assert.match(ui,/className="it-edit-cancel" disabled=\{pending\} onClick=\{\(\)=>resetDialogRef\.current\?\.close\(\)\}>Cancel<\/button>/);
 assert.match(ui,/<button type="submit" disabled=\{pending\}>\{pending\?"Saving…":"Save changes"\}<\/button>/);
 assert.match(css,/\.it-edit-form \.it-edit-form-actions\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("user management exposes separate password and accessible action icons",()=>{
 const ui=file("../src/app/(portal)/users/user-management.tsx");
 assert.match(ui,/<th>Password Set<\/th><th>Action<\/th>/);
 for(const label of ["Edit User","Disable User","Enable User","Delete User"])assert.ok(ui.includes(label));
 assert.match(ui,/action:"edit-user"/);
 assert.match(edge,/body.action==="edit-user"/);
 assert.match(edge,/user_metadata:\{\.\.\.account.data.user.user_metadata/);
 });

test("dealership lifecycle requires IT authorization and protects linked data",()=>{
 const ui=file("../src/app/(portal)/users/user-management.tsx");
 const edge=file("../supabase/functions/it-user-management/index.ts");
 const sql=file("../db/20261126_dealership_lifecycle.sql");
 assert.match(ui,/filteredDealers=dealers\.filter/);
 assert.match(ui,/filteredUsers=users\.filter/);
 assert.match(ui,/openDealerAction\(d,"delete"\)/);
 assert.match(edge,/body\.confirm!==operation\.toUpperCase\(\)\+" DEALERSHIP"/);
 assert.match(sql,/for update/);
 assert.match(sql,/confrelid='public\.dealerships'::regclass/);
 assert.match(sql,/Linked records prevent this operation/);
 assert.match(sql,/revoke all on function public\.frontvox_dealership_lifecycle\(uuid,text\) from public,anon,authenticated/);
});
