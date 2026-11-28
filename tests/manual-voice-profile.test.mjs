import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import ts from "typescript";
const base="src/app/(portal)/settings/voice-profiles/";
const source=readFileSync(base+"actions.ts","utf8");
const emitted=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup({authorized=true,writeError=null}={}){
 const writes=[],exports={},revalidated=[];
 const supabase={from(table){assert.equal(table,"global_voice_defaults");return {upsert:async(row,options)=>{writes.push({row,options});return {error:writeError}}}}};
 runInNewContext(emitted,{exports,require(name){if(name==="next/cache")return {revalidatePath(...args){revalidated.push(args)}};if(name==="@/lib/it-access")return {requireItSuperUser:async()=>{if(!authorized)throw Error("IT Super User access required.");return {supabase,user:{id:"test-user"}}}};throw Error("Unexpected dependency "+name)}});
 return {writes,save:exports.saveVoiceProfile,revalidated};
}
function form(overrides={}){const f=new FormData();for(const [k,v] of Object.entries({agentId:"manual-agent-test",version:"57",connectionId:"manual-connection",callerNumber:"+919000000000",active:"yes",...overrides}))f.set(k,v);return f;}
test("manual version 57 saves global defaults without a catalogue lookup",async()=>{const {save,writes,revalidated}=setup();const result=await save(form());assert.equal(result.ok,true,result.error);assert.equal(writes.length,1);const {row,options}=writes[0];assert.equal(row.singleton,true);assert.equal(options.onConflict,"singleton");assert.equal(row.app_version,57);assert.equal(row.active,true);assert.equal(row.agent_id,"manual-agent-test");assert.equal(row.connection_id,"manual-connection");assert.equal(row.caller_number,"+919000000000");assert.equal(row.updated_by,"test-user");assert.equal(row.dealership_id,undefined);assert.equal(revalidated.length,2);});
test("invalid version and unauthorized users never write",async()=>{for(const version of ["0","-1","1.5","2147483648"]){const {save,writes}=setup();assert.ok((await save(form({version}))).error);assert.equal(writes.length,0);}const {save,writes}=setup({authorized:false});assert.ok((await save(form())).error);assert.equal(writes.length,0);});
test("active defaults reject display-name connections; inactive drafts allow them",async()=>{const {save,writes}=setup();assert.ok((await save(form({connectionId:"Sarvam Managed (Vobiz)"}))).error);assert.equal(writes.length,0);assert.equal((await save(form({connectionId:"Sarvam Managed (Vobiz)",active:"no"}))).ok,true);assert.equal(writes[0].row.active,false);});
test("database rejection does not report success or revalidate",async()=>{const {save,writes,revalidated}=setup({writeError:{message:"RLS rejected write"}});const result=await save(form());assert.ok(result.error);assert.notEqual(result.ok,true);assert.equal(writes.length,1);assert.equal(revalidated.length,0);});
test("all four fields allow manual entry and no catalogue gate",()=>{const editor=readFileSync(base+"profile-editor.tsx","utf8");for(const name of ["agentId","version","connectionId","callerNumber"])assert.ok(editor.includes('<input name="'+name+'"'));assert.ok(!editor.includes("last verified catalogue"));assert.ok(!source.includes("agentSnapshot"));});
