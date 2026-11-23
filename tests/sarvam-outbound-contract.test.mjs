import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import ts from "typescript";
const source=readFileSync("src/lib/sarvam/recipient-validation.ts","utf8");
const emitted=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleExports={};
runInNewContext(emitted,{exports:moduleExports});
const {prepareRecipients,normalizePhone}=moduleExports;

test("normalizes only well-formed E.164 or Indian numbers",()=>{
 assert.equal(normalizePhone("9876543210"),"+919876543210");
 assert.equal(normalizePhone("+919876543210"),"+919876543210");
 assert.equal(normalizePhone("0000000000"),null);
 assert.equal(normalizePhone("abc"),null);
});
test("rejects DNC and no-consent numbers and duplicates",()=>{
 const csv="Mobile,consent,do_not_call,Customer Name\n9876543210,yes,no,Rahul\n9876543211,no,no,No consent\n9876543212,yes,yes,DNC\n+919876543210,yes,no,Duplicate";
 const r=prepareRecipients(csv,{phoneColumn:"Mobile",consentColumn:"consent",dncColumn:"do_not_call",variableMapping:{customer_name:"Customer Name"}});
 assert.equal(r.total,4);
 assert.equal(r.eligible,1);
 assert.equal(r.excluded,3);
 assert.equal(r.users[0].user_phone_number,"+919876543210");
 assert.equal(r.users[0].app_variables.customer_name,"Rahul");
 assert.ok(!r.csv.includes("No consent"));
 assert.ok(!r.csv.includes("DNC"));
});
test("requires explicit consent, DNC and phone mapping headers",()=>{
 const csv="Mobile,Customer Name\n9876543210,Rahul";
 assert.throws(()=>prepareRecipients(csv,{phoneColumn:"Mobile",consentColumn:"consent",dncColumn:"do_not_call"}),/Missing required column/);
});
test("rejects malformed CSV and excessive rows",()=>{
 assert.throws(()=>prepareRecipients('Mobile,consent,do_not_call\n"9876543210,yes,no',{phoneColumn:"Mobile",consentColumn:"consent",dncColumn:"do_not_call"}),/Unclosed/);
 const rows=["Mobile,consent,do_not_call",...Array.from({length:251},(_,i)=>`987654${String(i).padStart(4,"0")},yes,no`)].join("\n");
 assert.throws(()=>prepareRecipients(rows,{phoneColumn:"Mobile",consentColumn:"consent",dncColumn:"do_not_call"}),/250/);
});
test("provider calls are default-off with explicit server-only switches",()=>{
 const testRoute=readFileSync("src/app/api/sarvam/test-call/route.ts","utf8");
 const launch=readFileSync("src/app/api/sarvam/launch/route.ts","utf8");
 assert.match(testRoute,/callingEnabled\("test"\)/);
 assert.match(testRoute,/TEST_CALL_ALLOWLIST/);
 assert.match(testRoute,/frontvox_reserve_test_call/);
 assert.match(testRoute,/p_agent_version:version/);
 assert.match(testRoute,/p_connection_id:connection/);
 assert.match(testRoute,/p_caller_number:outgoing/);
 assert.match(launch,/callingEnabled\("campaign"\)/);
 assert.match(launch,/status!=="APPROVED"/);
 assert.match(launch,/csv_sha256/);
 assert.match(launch,/needs_reconciliation/);
 assert.match(launch,/attempt.agent_version===version/);
 assert.match(launch,/attempt.connection_id===connection/);
 assert.match(launch,/attempt.caller_number===sender/);
});
