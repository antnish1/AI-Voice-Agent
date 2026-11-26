export type TranscriptTurn={role:"agent"|"user";en_text:string;indic_text?:string};
const obj=(v:unknown)=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:null;
const str=(v:unknown)=>typeof v==="string"?v.slice(0,4000):"";
const role=(v:unknown)=>v==="agent"||v==="assistant"?"agent":v==="user"?"user":null;
export function normalizeTranscript(value:unknown):TranscriptTurn[]{
 if(!Array.isArray(value))return [];
 return value.slice(0,500).flatMap(v=>{const t=obj(v);if(!t)return [];const r=role(t.role),en=str(t.en_text),original=str(t.indic_text)||str(t.original_text);return r&&(en.trim()||original.trim())?[{role:r,en_text:en,...(original.trim()?{indic_text:original}:{})}]:[];});
}
function messages(value:unknown):{role:"agent"|"user";content:string}[]{
 const data=obj(value),list=Array.isArray(value)?value:data?.messages;
 if(!Array.isArray(list))return [];
 return list.slice(0,500).flatMap(v=>{const t=obj(v);if(!t)return [];const r=role(t.role),content=str(t.content);return r&&content.trim()?[{role:r,content}]:[];});
}
export function originalMessages(value:unknown,english:unknown):TranscriptTurn[]{
 const original=messages(value),translated=messages(english),prior=normalizeTranscript(english);
 const en=translated.length?translated.map(t=>({role:t.role,en_text:t.content})):prior;
 // Never pair unrelated turns: align only if count and speaker sequence agree.
 if(!original.length)return en;
 const aligned=original.length===en.length&&original.every((t,i)=>t.role===en[i].role);
 return original.map((t,i)=>({role:t.role,indic_text:t.content,en_text:aligned?en[i].en_text:""}));
}
export function analyticsTranscript(item:Record<string,unknown>):TranscriptTurn[]{
 const inline=normalizeTranscript(item.interaction_transcript);
 const original=originalMessages(item.original_transcript,item.translate_transcript??inline);
 return original.some(t=>t.indic_text)?original:inline.length?inline:original;
}
export function preferTranscript(previous:unknown,next:unknown):TranscriptTurn[]{
 const old=normalizeTranscript(previous),incoming=normalizeTranscript(next);
 if(!incoming.length)return old;
 if(!old.some(t=>t.indic_text))return incoming;
 if(!incoming.some(t=>t.indic_text))return old;
 // Retain a complete existing original if a subsequent payload is truncated.
 return incoming.filter(t=>t.indic_text).length>=old.filter(t=>t.indic_text).length?incoming:old;
}
