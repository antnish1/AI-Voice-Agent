import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import ts from "typescript";
const base="src/app/(portal)/settings/voice-profiles/";
const source=readFileSync(base+"actions.ts","utf8");
const emitted=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const dealershipId="11111111-1111-4111-8111-111111111111";
function setup(authorized=true){
 const writes=[],exports={};
 const supabase={from(table){assert.equal(table,"global_voice_defaults");return {upsert:async (row,options)=>{assert.equal(options.onConflict,"singleton");writes.push(row);return {error:null}}}}};
 runInNewContext(emitted,{exports,require(name){if(name==="next/cache")return {revalidatePath(){}};if(name==="@/lib/it-access")return {requireItSuperUser:async()=>{if(!authorized)throw Error("Forbidden");return {supabase,user:{id:"test-user"}}}};throw Error("Unexpected dependency "+name)}});
 return {writes,save:exports.saveVoiceProfile};
}
function form(overrides={}){const f=new FormData();for(const [k,v] of Object.entries({dealershipId,agentId:"manual-agent-test",version:"57",connectionId:"manual-connection",callerNumber:"+919000000000",active:"yes",...overrides}))f.set(k,v);return f;}
test("manual version 57 saves without a catalogue lookup",async()=>{const {save,writes}=setup();assert.equal((await save(form())).ok,true);assert.equal(writes[0].app_version,57);assert.equal(writes[0].active,true);assert.equal(writes[0].agent_id,"manual-agent-test");assert.equal(writes[0].singleton,true);assert.equal(writes[0].updated_by,"test-user");assert.equal(writes.length,1);});
test("invalid version and unauthorized user never write",async()=>{for(const version of ["0","-1","1.5","2147483648"]){const {save,writes}=setup();assert.ok((await save(form({version}))).error);assert.equal(writes.length,0);}const {save,writes}=setup(false);assert.ok((await save(form())).error);assert.equal(writes.length,0);});
test("all four fields allow manual entry and no catalogue gate",()=>{const editor=readFileSync(base+"profile-editor.tsx","utf8");for(const name of ["agentId","version","connectionId","callerNumber"])assert.ok(editor.includes('<input name="'+name+'"'));assert.ok(!editor.includes("last verified catalogue"));assert.ok(!source.includes("agentSnapshot"));});
