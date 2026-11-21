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
test("activation, IT authorization and temporary password setup are server-side",()=>{
 assert.match(edge,/inviteUserByEmail/);
 assert.match(edge,/DEFAULT_TEMP_PASSWORD="12345678"/);
 assert.match(edge,/must_change_password:true/);
 assert.match(edge,/user\.id!==IT_ID/);
 assert.match(edge,/membership.*super_admin/);
 assert.match(edge,/action==="set-own-password"/);
 assert.doesNotMatch(file("../src/app/(portal)/users/user-management.tsx"),/SUPABASE_SERVICE_ROLE_KEY/);
});
test("RLS migration restricts write access and retains dealership read scopes",()=>{
 for(const policy of ["campaign_draft_insert","campaign_update_workflow","customers_staff_import_insert","frontier_crm_documents_add","frontier_crm_documents_delete"]){
  assert.match(sql,new RegExp("alter policy "+policy,"i"));
 }
 assert.match(sql,/m\.role='super_admin'/);
 assert.doesNotMatch(sql,/role in \('super_admin','dealership_manager'/);
});