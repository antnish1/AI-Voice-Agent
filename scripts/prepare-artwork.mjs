import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {inflateRawSync} from 'node:zlib';
import {basename,join} from 'node:path';
import sharp from 'sharp';
const target=join(process.cwd(),'public','assets','artwork');
await mkdir(target,{recursive:true});
async function archive(name){
 const b=await readFile(join(process.cwd(),'web',name));
 let end=b.length-22;while(end>=Math.max(0,b.length-65557)&&b.readUInt32LE(end)!==0x06054b50)end--;
 if(end<0||b.readUInt32LE(end)!==0x06054b50)throw Error('Invalid ZIP: '+name);
 const count=b.readUInt16LE(end+10);let p=b.readUInt32LE(end+16);const files=new Map();
 for(let i=0;i<count;i++){
  if(b.readUInt32LE(p)!==0x02014b50)throw Error('Invalid ZIP directory');
  const flags=b.readUInt16LE(p+8),method=b.readUInt16LE(p+10),size=b.readUInt32LE(p+20),rawSize=b.readUInt32LE(p+24),n=b.readUInt16LE(p+28),x=b.readUInt16LE(p+30),c=b.readUInt16LE(p+32),o=b.readUInt32LE(p+42);
  const path=b.subarray(p+46,p+46+n).toString('utf8');p+=46+n+x+c;
  if(!/\.(png|webp|jpe?g)$/i.test(path)||path.includes('__MACOSX/'))continue;
  if(flags&1||rawSize>30_000_000||b.readUInt32LE(o)!==0x04034b50)throw Error('Unsupported artwork ZIP entry: '+path);
  const start=o+30+b.readUInt16LE(o+26)+b.readUInt16LE(o+28);
  const packed=b.subarray(start,start+size);
  const data=method===0?packed:method===8?inflateRawSync(packed,{maxOutputLength:30_000_000}):null;
  if(!data||data.length!==rawSize)throw Error('Invalid artwork: '+path);
  files.set(basename(path).toLowerCase(),data);
 }
 console.log(name+': '+[...files.keys()].join(', '));return files;
}
const source=await archive('frontier-voice-crm-assets.zip');
const agentSource=await archive('frontier_voice_crm_agents_3d_assets (1).zip');
const reports=await archive('reports-assets.zip');
const get=(map,key)=>{const b=map.get(key);if(!b)throw Error('Missing artwork: '+key);return b};
const available=[];
async function save(name,input,{crop,max=1254,removeBackground=true}={}){
 let image=sharp(input).ensureAlpha();if(crop)image=image.extract(crop);
 const {data,info}=await image.raw().toBuffer({resolveWithObject:true});const {width:w,height:h}=info;
 // Remove only the near-neutral, light background connected to the outer edge.
 // Enclosed white artwork is retained; existing transparent assets keep their alpha.
 let hasAlpha=false;for(let i=3;i<data.length;i+=4)if(data[i]<250){hasAlpha=true;break}
 if(removeBackground&&!hasAlpha){
  const total=w*h,seen=new Uint8Array(total),queue=new Int32Array(total);let head=0,tail=0;
  const bg=(p)=>{const i=p*4,r=data[i],g=data[i+1],b=data[i+2];return Math.min(r,g,b)>=232&&Math.max(r,g,b)-Math.min(r,g,b)<=11};
  const push=(p)=>{if(!seen[p]&&bg(p)){seen[p]=1;queue[tail++]=p}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
  while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);data[p*4+3]=0;if(x)push(p-1);if(x+1<w)push(p+1);if(y)push(p-w);if(y+1<h)push(p+w)}
 }
 let l=w,t=h,r=-1,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>24){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y)}
 if(r<l)throw Error('Blank artwork: '+name);
 const margin=4;l=Math.max(0,l-margin);t=Math.max(0,t-margin);r=Math.min(w-1,r+margin);b=Math.min(h-1,b+margin);
 let out=sharp(data,{raw:{width:w,height:h,channels:4}}).extract({left:l,top:t,width:r-l+1,height:b-t+1}).resize({width:max,height:max,fit:'inside',withoutEnlargement:true}).webp({quality:94,alphaQuality:100,effort:5});
 await out.toFile(join(target,name+'.webp'));available.push(name);console.log('Prepared '+name+' ('+(r-l+1)+' x '+(b-t+1)+' source crop)');
}
for(const name of ['dashboard-hero','total-customers','campaigns-megaphone','active-campaigns-play','scheduled-campaigns-calendar','total-calls-phone','answered-calls-headset','failed-calls-headset','average-call-duration-stopwatch']){
 await save(name,get(source,name+'.png'),{max:name==='dashboard-hero'?1400:768});
}
const sheet=get(source,'reports-icons-collection.png');
// The supplied 1600 x 800 artwork sheet: crop its original illustration cells, never the 60px previews.
const {width:sw,height:sh}=await sharp(sheet).metadata();
const rect=(x,y,w,h)=>({left:Math.floor(x*sw/1600),top:Math.floor(y*sh/800),width:Math.floor(w*sw/1600),height:Math.floor(h*sh/800)});
for(const [name,box] of Object.entries({'reports-icon':[28,27,286,300],'reports-total-calls':[330,33,315,286],'reports-appointment':[668,32,297,288],'reports-callback':[980,47,257,274],'reports-pickup-drop':[1278,63,298,258],'reports-hero':[111,322,519,304]})){
 await save(name,sheet,{crop:rect(...box),max:1024});
}
await save('reports-customer-avatar',get(reports,'customer-avatar.webp'),{max:768});
const normalize=(s)=>s.replace(/\.[^.]+$/,'').replace(/[^a-z0-9]+/g,'-');
const aliases={
 'agents-hero':[/hero/,/banner/,/header/,/robot.*(?:main|welcome)/],
 'agents-kajal':[/kajal/,/configured/,/current.*agent/],
 'agents-support':[/customer.*support/,/support.*agent/,/^support$/],
 'agents-sales':[/sales/,/outreach/],
 'agents-reminder':[/reminder/,/service.*agent/],
 'agents-promotion':[/promotion/,/marketing/],
 'agents-feedback':[/feedback/],
 'agents-total':[/total.*agent/,/agent.*total/,/^total$/],
 'agents-active':[/^(?:kpi-)?active(?:-agents?)?$/, /active.*badge/],
 'agents-inactive':[/inactive/,/pause/],
 'agents-recommended':[/recommend/,/star/],
 'customers-hero':[/customer.*(?:hero|banner|header)/],
 'customers-active':[/active.*customer/,/customer.*active/],
 'customers-empty':[/customer.*empty/,/empty.*customer/]
};
const entries=[...agentSource].map(([name,bytes])=>({name,key:normalize(name),bytes}));const used=new Set();
for(const [name,patterns] of Object.entries(aliases)){
 const found=entries.find(e=>!used.has(e.name)&&patterns.some(re=>re.test(e.key))&&!(name==='agents-hero'&&/customer/.test(e.key)));
 if(found){await save(name,found.bytes,{max:name.endsWith('hero')?1400:768});used.add(found.name)}
 else console.warn('No dedicated source for '+name+'; retain existing fallback');
}
await writeFile(join(target,'manifest.json'),JSON.stringify(available,null,2)+'\n');
