import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import ts from "typescript";
const read=p=>readFileSync(p,"utf8");
const exports={};
runInNewContext(ts.transpileModule(read("src/lib/sarvam/historical-import.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});
const {parseHistoricalCsv}=exports;
const header="interaction_id,campaign_id,app_id,user_contact,is_debug_call,channel_direction,start_datetime,duration_in_seconds,end_reason,transcript_en,end_datetime,agent_variables.call_disposition";
const row='20261121/example-001,campaign-example,agent-example,+919000000001,0,outbound,"Nov 21, 2026, 11:27:48 AM",8.5,USER_ENDS,"Agent: Hello\nUser: Yes","Nov 21, 2026, 11:27:57 AM",CALLBACK_REQUESTED';
test("historical CSV preserves quoted multiline transcripts and IST",()=>{
 const records=parseHistoricalCsv(header+"\n"+row).convert("+05:30");
 assert.equal(records.length,1);assert.equal(records[0].status,"answered");
 assert.equal(records[0].started,"2026-11-21T05:57:48.000Z");
 assert.equal(records[0].duration,9);assert.equal(records[0].transcript.length,2);
 assert.equal(records[0].output.call_disposition,"CALLBACK_REQUESTED");
});
test("duplicate interaction and debug calls rejected",()=>{
 assert.throws(()=>parseHistoricalCsv([header,row,row].join("\n")).convert("+05:30"),/duplicate/);
 assert.throws(()=>parseHistoricalCsv(header+"\n"+row.replace(",0,outbound",",1,outbound")).convert("+05:30"),/debug/);
});
test("authorization and read-only synchronization remain explicit",()=>{
 const importer=read("src/app/api/reports/import-sarvam/route.ts"),recording=read("src/app/api/reports/recording/route.ts"),cron=read("src/app/api/cron/sarvam-sync/route.ts");
 assert.match(importer,/requireItSuperUser/);assert.match(importer,/ctx.membership.dealership_id/);
 assert.match(importer,/ignoreDuplicates:true/);assert.match(recording,/membership.dealership_id/);
 assert.match(recording,/redirect:"error"/);assert.match(cron,/CRON_SECRET/);assert.match(cron,/timingSafeEqual/);
 assert.doesNotMatch(cron,/sarvamPost|sarvamPut|callingEnabled/);
 assert.equal(JSON.parse(read("vercel.json")).crons[0].path,"/api/cron/sarvam-sync");
});
