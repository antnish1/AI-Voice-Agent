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
test("no-email provisioning and IT-controlled unique account credentials are server-side",()=>{
 assert.match(edge,/admin\.auth\.admin\.createUser/);
 assert.match(edge,/email_confirm:true/);
 assert.match(edge,/action==="create-dealership"/);
 assert.match(edge,/action==="create-user"/);
 assert.doesNotMatch(edge,/inviteUserByEmail|resetPasswordForEmail/);
 assert.match(edge,/makePassword\(\)/);
 assert.match(edge,/crypto\.getRandomValues/);
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
 assert.match(edge,/body\.confirm!=="RESET DEALERSHIP PASSWORD"/);
 assert.match(edge,/row\.data\.role!=="management"/);
 assert.match(ui,/confirm:"RESET DEALERSHIP PASSWORD"/);
 assert.match(edge,/must_change_password:false/);
 assert.doesNotMatch(edge,/inviteUserByEmail|resetPasswordForEmail/);
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
 assert.match(ui,/IT-controlled login password/);
});
