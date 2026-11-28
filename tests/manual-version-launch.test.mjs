import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync("src/app/api/sarvam/launch/route.ts","utf8");
test("unknown manual versions use the already validated approved mapping",()=>{
 assert.match(source,/const cohortUsers=schema\?prepared\.users\.map/);
 assert.match(source,/\}\):prepared\.users;/);
 assert.doesNotMatch(source,/if\(!schema\)return/);
 assert.match(source,/app_version:version/);
});
test("known schemas retain field checks and launch retains authorization and duplicate guards",()=>{
 for(const guard of ["requireItSuperUser()","callingEnabled(\"campaign\")","input.confirmedLaunch!==true","sha256(csv)!==batch.csv_sha256","prepared.excluded!==0","if(incompatible.size)","frontvox_reserve_direct_launch","cohort_submitting","needs_reconciliation","global.app_version!==version"])assert.ok(source.includes(guard),guard);
 assert.ok(source.indexOf("prepareRecipients(csv")<source.indexOf("const cohortUsers="));
 assert.ok(source.indexOf("frontvox_reserve_direct_launch")<source.indexOf('sarvamPost(sarvamPath("campaigns")'));
});
