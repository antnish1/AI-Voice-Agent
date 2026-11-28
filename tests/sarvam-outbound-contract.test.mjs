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
 assert.match(launch,/requireItSuperUser\(\)/);
 assert.match(launch,/frontvox_reserve_direct_launch/);
 assert.match(launch,/confirmedLaunch!==true/);
 assert.doesNotMatch(launch,/voice_test_call_requests|reviewedTestResult/);
 assert.ok(launch.indexOf('frontvox_reserve_direct_launch')<launch.indexOf('await sarvamPost'));
 const migration=readFileSync("db/20261125_direct_campaign.sql","utf8");
 assert.match(migration,/for update/i);
 assert.match(migration,/Configuration changed/);
 assert.match(migration,/insert into public\.voice_campaign_launches/);
 assert.match(migration,/auth\.uid\(\) is distinct from/);
 assert.match(launch,/csv_sha256/);
 assert.match(launch,/needs_reconciliation/);
 assert.match(launch,/setup.agent_version_label!==String\(version\)/);
 assert.match(launch,/setup.telephony_label!==connection/);
 assert.match(launch,/normalizePhone\(setup.outgoing_number_label/);
});

function loadTs(path,deps={}){
 const out=ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};runInNewContext(out,{exports,require:name=>{if(!(name in deps))throw Error("Unexpected dependency "+name);return deps[name];}});return exports;
}
test("registration reaches Kajal from current, legacy and aliased service templates",()=>{
 const template=loadTs("src/lib/sarvam/recipient-template.ts");
 const {enrichServiceRecipients}=loadTs("src/lib/sarvam/service-recipients.ts",{"./recipient-validation":moduleExports,"./recipient-template":template});
 const {agentCohortSchemas}=loadTs("src/lib/sarvam/agent-cohort-schemas.ts");
 const headers=template.RECIPIENT_TEMPLATE_HEADERS;
 assert.equal(headers.length,28);
 for(const columns of [headers,[...template.LEGACY_RECIPIENT_HEADERS,"Reg. Number"],[...headers.filter(h=>h!=="vehicle_registration_number"),"registration_number"]]){
  const row=columns.map(h=>["user_phone_number","phone_number"].includes(h)?"9876543210":h==="customer_name"?"Test Customer":h==="vehicle_model"?"Hector":/registration|Reg. Number/.test(h)?"DL 8C AF 0123":"");
  const result=enrichServiceRecipients([columns,row],"Frontier MG Noida",new Set());
  const prepared=prepareRecipients(result.csv,{phoneColumn:"phone_number",consentColumn:"consent",dncColumn:"do_not_call",variableMapping:result.mapping});
  assert.equal(prepared.users[0].app_variables.vehicle_registration_number,"DL8CAF0123");
  assert.equal(prepared.users[0].app_variables.customer_name,"Test Customer");
 }
 const old=template.LEGACY_RECIPIENT_HEADERS;
 const blank=old.map(h=>h==="phone_number"?"9876543210":h==="customer_name"?"Test Customer":"");
 const legacy=enrichServiceRecipients([old,blank],"Frontier MG Noida",new Set());
 assert.equal(prepareRecipients(legacy.csv,{phoneColumn:"phone_number",consentColumn:"consent",dncColumn:"do_not_call",variableMapping:legacy.mapping}).users[0].app_variables.vehicle_registration_number,"");
 assert.throws(()=>enrichServiceRecipients([[...old,"Reg. Number","registration_number"],[...blank,"DL8CAF0123","DL8CAF9999"]],"Frontier MG Noida",new Set()),/Conflicting/);
 const versions=agentCohortSchemas["Conversatio-95f7d6e8-61a2"];
 assert.equal(versions[57].length,40);assert.equal(versions[58].length,41);
 assert.ok(versions[58].includes("vehicle_registration_number"));assert.ok(!versions[57].includes("vehicle_registration_number"));
 assert.deepEqual(Array.from(versions[58].filter(k=>k!=="vehicle_registration_number")),Array.from(versions[57]));
});
