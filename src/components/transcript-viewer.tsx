"use client";
import {useState} from "react";
import {normalizeTranscript} from "@/lib/sarvam/transcript";
export function TranscriptViewer({turns,recipient="Customer"}:{turns:unknown;recipient?:string}){
 const [language,setLanguage]=useState<"original"|"english">("original");
 const data=normalizeTranscript(turns),original=data.some(t=>!!t.indic_text),english=data.some(t=>!!t.en_text);
 return <div className="call-details-transcript"><div className="panel-title"><h3>Conversation transcript</h3><div role="group" aria-label="Transcript language" style={{display:"flex",gap:6}}><button type="button" className="btn-outline" aria-pressed={language==="original"} onClick={()=>setLanguage("original")}>Original</button><button type="button" className="btn-outline" aria-pressed={language==="english"} disabled={!english} onClick={()=>setLanguage("english")}>English</button></div></div>
 {!data.length?<p className="muted">Transcript not available.</p>:<>{language==="original"&&!original&&<p className="muted">Original transcript unavailable. Showing stored English translation.</p>}{data.map((t,i)=><p key={i} style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}><strong>{t.role==="agent"?"AI Agent":recipient}: </strong>{language==="original"?(t.indic_text||t.en_text||"Not available"):(t.en_text||"English translation unavailable")}{language==="original"&&original&&!t.indic_text&&t.en_text&&<small> (English fallback)</small>}</p>)}</>}
 </div>;
}
