import test from "node:test";import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../db/production-foundation.sql",import.meta.url),"utf8");
test("RLS enabled for customer and campaign tables",()=>{for(const table of ["memberships","customers","campaigns"])assert.match(sql,new RegExp("alter table public\\."+table+" enable row level security","i"));});
test("No service role in frontend or source",()=>{for(const path of ["../src/app/(portal)/campaigns/actions.ts","../src/app/(portal)/approvals/actions.ts"])assert.doesNotMatch(readFileSync(new URL(path,import.meta.url),"utf8"),/service_role|SERVICE_ROLE_KEY/);});
test("Approval requires manager and pending status",()=>{const code=readFileSync(new URL("../src/app/(portal)/approvals/actions.ts",import.meta.url),"utf8");assert.match(code,/canApprove\(membership\.role\)/);assert.match(code,/PENDING_MANAGER_APPROVAL/);});
