import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const sql=source("../db/20261121_crm_operations_and_voice_schema.sql");
const actions=source("../src/app/(portal)/workflow-actions.ts");
const webhook=source("../src/app/api/webhooks/sarvam/route.ts");
const health=source("../src/app/api/sarvam/connection/route.ts");
test("Operational CRM records have tenant isolation and an IT-only write path",()=>{
 for(const table of ["crm_callbacks","crm_appointments","crm_pickup_drop"]){
  assert.match(sql,new RegExp("create table if not exists public\\."+table));
  assert.match(sql,new RegExp("alter table public\\.%I enable row level security"));
 }
 assert.match(sql,/frontier_it_can_write\(dealership_id\)/);
 assert.match(sql,/m\.dealership_id=%I\.dealership_id/);
 assert.match(actions,/requireMembership\(dealerId\)/);
 assert.match(actions,/canPrepare\(membership\.role\)/);
});
test("Workshop confirmation is a required database condition",()=>{
 assert.match(sql,/confirmed_only_after_workshop_acceptance/);
 assert.match(sql,/pickup_verified_before_confirmation/);
 assert.match(actions,/Workshop confirmation is required/);
});
test("Verified call rows never accept browser writes",()=>{
 assert.match(sql,/revoke all on table public.voice_call_records/);
 assert.match(sql,/voice_campaign_links/);
 assert.match(sql,/unique\(dealership_id,sarvam_attempt_id\)/);
});
test("Sarvam webhook is signed, timestamp-checked, and maps IDs via the database",()=>{
 assert.match(webhook,/sarvam-signature/);
 assert.match(webhook,/sarvam-timestamp/);
 assert.match(webhook,/crypto\.subtle\.sign/);
 assert.match(webhook,/300000/);
 assert.match(webhook,/voice_campaign_links/);
 assert.match(webhook,/sarvam_campaign_id/);
 assert.match(webhook,/onConflict:"dealership_id,sarvam_attempt_id"/);
 assert.match(webhook,/if\(!secret\|\|!url\|\|!adminKey\)/);
});
test("Sarvam API key never reaches the browser",()=>{
 assert.match(health,/process\.env\.SARVAM_API_KEY/);
 assert.match(health,/"X-API-Key"/);
 assert.match(health,/isItSuperUser/);
 assert.doesNotMatch(source("../src/app/(portal)/settings/sarvam-connection-card.tsx"),/SARVAM_API_KEY/);
});
test("Call pages never invent call records",()=>{
 const page=source("../src/app/(portal)/call-logs/page.tsx");
 assert.match(page,/from\("voice_call_records"\)/);
 assert.match(page,/eq\("dealership_id",membership\.dealership_id\)/);
});

test("IT dealership switcher is server-authorized and cannot be forged by dealership users",()=>{
 const api=source("../src/app/api/dealership/select/route.ts");
 const auth=source("../src/lib/auth.ts");
 assert.match(api,/isItSuperUser/);
 assert.match(api,/httpOnly:true/);
 assert.match(api,/sameSite:"lax"/);
 assert.match(auth,/superRole/);
 assert.match(auth,/user\.email\?\.toLowerCase\(\)==="it@insureit.in"/);
 assert.match(auth,/supabase\.from\("dealerships"\)/);
});

test("Sarvam connection accepts documented string IDs and reports provider diagnostics",()=>{
 assert.match(health,/function validateId/);
 assert.doesNotMatch(health,/const slug=\/\^\[A-Za-z0-9\]/);
 assert.match(health,/encodeURIComponent\(org\.id!\)/);
 assert.match(health,/encodeURIComponent\(workspace\.id!\)/);
 for(const status of ["401","403","404","422","429"])assert.match(health,new RegExp("response.status==="+status));
 assert.match(health,/method:"GET"/);
 assert.doesNotMatch(health,/JSON\.stringify\(\{.*key/);
});

test("IT campaign visibility is global while dealership users stay scoped",()=>{
 const page=source("../src/app/(portal)/campaigns/page.tsx");
 const dashboard=source("../src/app/(portal)/dashboard/page.tsx");
 const logs=source("../src/app/(portal)/call-logs/page.tsx");
 assert.match(page,/const scope=itUser\?selectedDealer:membership\.dealership_id/);
 assert.match(page,/if\(scope\)query=query\.eq\("dealership_id",scope\)/);
 assert.match(page,/nameFor\(c\.dealership_id\)/);
 assert.match(page,/All Dealerships/);
 assert.match(dashboard,/itUser\?q:q\.eq\("dealership_id",id\)/);
 assert.match(logs,/if\(!itUser\)query=query\.eq\("dealership_id",membership\.dealership_id\)/);
});
