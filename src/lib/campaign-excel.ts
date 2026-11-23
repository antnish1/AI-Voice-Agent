// Browser-only XLSX template and first-sheet reader. No external Excel service or customer-data upload.
export const RECIPIENT_TEMPLATE_HEADERS=[
 "Mobile","Customer Name","Model","Reg. Number","Service Type","Service DueDate",
 "Last ServiceDate","Original CallDate","Last Reported Mileage","Last Follow up date",
 "Last Follow up Remarks","consent","do_not_call"
] as const;
const encode=(s:string)=>new TextEncoder().encode(s);
const escapeXml=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
function crc32(data:Uint8Array):number {
 let c=0xffffffff;
 for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}
 return (c^0xffffffff)>>>0;
}
function templateZip(files:Array<[string,string]>):Blob{
 const chunks:Uint8Array[]=[];const central:Uint8Array[]=[];let offset=0;
 const u16=(v:DataView,p:number,n:number)=>v.setUint16(p,n,true);
 const u32=(v:DataView,p:number,n:number)=>v.setUint32(p,n>>>0,true);
 for(const [name,text] of files){
  const filename=encode(name),data=encode(text),crc=crc32(data);
  const local=new Uint8Array(30+filename.length),lv=new DataView(local.buffer);
  u32(lv,0,0x04034b50);u16(lv,4,20);u16(lv,6,0x800);u32(lv,14,crc);u32(lv,18,data.length);u32(lv,22,data.length);u16(lv,26,filename.length);local.set(filename,30);
  chunks.push(local,data);
  const header=new Uint8Array(46+filename.length),hv=new DataView(header.buffer);
  u32(hv,0,0x02014b50);u16(hv,4,20);u16(hv,6,20);u16(hv,8,0x800);u32(hv,16,crc);u32(hv,20,data.length);u32(hv,24,data.length);u16(hv,28,filename.length);u32(hv,42,offset);header.set(filename,46);
  central.push(header);offset+=local.length+data.length;
 }
 const centralSize=central.reduce((n,x)=>n+x.length,0);
 const end=new Uint8Array(22),ev=new DataView(end.buffer);
 u32(ev,0,0x06054b50);u16(ev,8,files.length);u16(ev,10,files.length);u32(ev,12,centralSize);u32(ev,16,offset);
 return new Blob([...chunks,...central,end].map(bytes=>Uint8Array.from(bytes).buffer),{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
export function makeRecipientTemplate():Blob {
 const cells=RECIPIENT_TEMPLATE_HEADERS.map((name,i)=>{
  let col="",n=i+1;while(n){n--;col=String.fromCharCode(65+n%26)+col;n=Math.floor(n/26);}
  return '<c r="'+col+'1" t="inlineStr"><is><t>'+escapeXml(name)+'</t></is></c>';
 }).join("");
 const sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetData><row r="1">'+cells+'</row></sheetData></worksheet>';
 return templateZip([
  ["[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
  ["_rels/.rels",'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
  ["xl/workbook.xml",'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Recipients" sheetId="1" r:id="rId1"/></sheets></workbook>'],
  ["xl/_rels/workbook.xml.rels",'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
  ["xl/worksheets/sheet1.xml",sheet]
 ]);
}
function parseXml(text:string):Document {
 const xml=new DOMParser().parseFromString(text,"application/xml");
 if(xml.getElementsByTagName("parsererror").length)throw Error("Excel worksheet XML is invalid.");
 return xml;
}
function nodes(parent:Document|Element,name:string):Element[]{
 return Array.from(parent.getElementsByTagNameNS("*",name));
}
function textOf(parent:Element,name:string):string{
 return nodes(parent,name)[0]?.textContent??"";
}
function columnIndex(address:string):number{
 let n=0;for(const ch of address.toUpperCase().match(/^[A-Z]+/)?.[0]??"")n=n*26+ch.charCodeAt(0)-64;
 return n-1;
}
async function unzipEntries(buffer:ArrayBuffer):Promise<Map<string,string>>{
 const b=new Uint8Array(buffer),view=new DataView(buffer);
 let eocd=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}
 if(eocd<0)throw Error("This is not a valid .xlsx workbook.");
 const count=view.getUint16(eocd+10,true),start=view.getUint32(eocd+16,true);
 if(count>400)throw Error("The workbook has too many embedded files.");
 const decoder=new TextDecoder(),out=new Map<string,string>();let at=start;
 for(let i=0;i<count;i++){
  if(at+46>b.length||view.getUint32(at,true)!==0x02014b50)throw Error("Workbook ZIP directory is invalid.");
  const method=view.getUint16(at+10,true),packed=view.getUint32(at+20,true),unpacked=view.getUint32(at+24,true);
  const nl=view.getUint16(at+28,true),extra=view.getUint16(at+30,true),comment=view.getUint16(at+32,true);
  const local=view.getUint32(at+42,true),name=decoder.decode(b.subarray(at+46,at+46+nl));
  at+=46+nl+extra+comment;
  if(!name.endsWith(".xml")&&!name.endsWith(".rels"))continue;
  if(unpacked>8*1024*1024||packed>8*1024*1024)throw Error("An Excel worksheet is too large.");
  if(local+30>b.length||view.getUint32(local,true)!==0x04034b50)throw Error("Workbook ZIP entry is invalid.");
  const pos=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
  if(pos+packed>b.length)throw Error("Truncated Excel workbook.");
  let data=b.slice(pos,pos+packed);
  if(method===8){
   if(typeof DecompressionStream==="undefined")throw Error("This browser cannot decompress Excel files. Please use the latest Chrome or Edge.");
   const stream=new Blob([Uint8Array.from(data).buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
   const inflated=await new Response(stream).arrayBuffer();
   if(inflated.byteLength>8*1024*1024)throw Error("Excel worksheet exceeds the conversion limit.");
   data=new Uint8Array(inflated);
  }else if(method!==0)throw Error("Unsupported Excel compression method.");
  if(data.length!==unpacked)throw Error("Excel file is incomplete.");
  out.set(name,decoder.decode(data));
 }
 return out;
}
export async function excelToRows(file:File):Promise<string[][]>{
 if(!/\.xlsx$/i.test(file.name)||file.size>5*1024*1024||!file.size)throw Error("Choose an .xlsx Excel workbook up to 5 MB.");
 const entries=await unzipEntries(await file.arrayBuffer());
 if(!entries.has("xl/workbook.xml"))throw Error("The file is not a supported Excel workbook.");
 const wb=parseXml(entries.get("xl/workbook.xml")!);
 const first=nodes(wb,"sheet")[0];if(!first)throw Error("The Excel workbook has no worksheets.");
 const relId=first.getAttribute("r:id")||first.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id");
 const relDoc=parseXml(entries.get("xl/_rels/workbook.xml.rels")??"");
 const rel=nodes(relDoc,"Relationship").find(x=>x.getAttribute("Id")===relId);
 const target=rel?.getAttribute("Target")??"worksheets/sheet1.xml";
 const path=target.startsWith("/")?target.replace(/^\//,""):("xl/"+target).replace(/\/\.\//g,"");
 if(path.includes(".."))throw Error("Invalid worksheet path.");
 const sheetText=entries.get(path);
 if(!sheetText)throw Error("The first worksheet could not be read.");
 const shared=entries.has("xl/sharedStrings.xml")?nodes(parseXml(entries.get("xl/sharedStrings.xml")!),"si").map(x=>nodes(x,"t").map(n=>n.textContent??"").join("")):[];
 const sheet=parseXml(sheetText),output:string[][]=[];
 const sheetRows=nodes(sheet,"sheetData").flatMap(n=>nodes(n,"row"));
 if(sheetRows.length>50001)throw Error("Excel preview supports at most 50,000 data rows.");
 for(const row of sheetRows){
  const values:string[]=[];let cursor=0;
  for(const cell of nodes(row,"c")){
   const address=cell.getAttribute("r")??"",idx=columnIndex(address);
   const col=idx>=0?idx:cursor;cursor=col+1;
   if(col>=80)throw Error("Excel preview supports at most 80 columns.");
   const type=cell.getAttribute("t");
   const raw=textOf(cell,"v");
   values[col]=type==="s"?shared[Number(raw)]??"":type==="inlineStr"?nodes(cell,"is")[0]?nodes(nodes(cell,"is")[0],"t").map(n=>n.textContent??"").join(""):"":type==="b"?(raw==="1"?"TRUE":"FALSE"):raw;
  }
  if(values.some(x=>(x??"").trim()))output.push(Array.from({length:values.length},(_,i)=>values[i]??""));
 }
 return output;
}
export function rowsToCsv(rows:string[][]):string {
 const escape=(s:string)=>/[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
 return rows.map(row=>row.map(x=>escape(x??"")).join(",")).join("\r\n")+"\r\n";
}
