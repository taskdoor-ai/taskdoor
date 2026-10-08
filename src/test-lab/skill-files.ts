import {serializePackage,validatePackage,type PackageFile} from './skill-package';
export async function importSkillDirectory(files:File[],skillId:string){
 if(!files.length||files.length>100)throw new Error('请选择包含 SKILL.md 的目录，最多 100 个文件');
 if(files.reduce((n,f)=>n+f.size,0)>900000)throw new Error('Skill 文件包过大，请控制在 900 KB 内');
 const packaged:PackageFile[]=[];
 const relativePaths=files.map(f=>(f.webkitRelativePath||f.name).split("/").slice(f.webkitRelativePath?.includes("/")?1:0).join("/"));
 const bundlePrefix=relativePaths.includes(`skills/${skillId}/SKILL.md`)?"":relativePaths.includes(`${skillId}/SKILL.md`)?"skills/":`skills/${skillId}/`;
 for(const file of files){
  const relative=file.webkitRelativePath||file.name;
  const path=relative.includes('/')?relative.split('/').slice(1).join('/'):relative;
  if(!path||path.split('/').some(p=>p.startsWith('.')))throw new Error('请移除隐藏文件后导入');
  const bytes=new Uint8Array(await file.arrayBuffer());
  let content:string;try{content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error(`${path} 不是 UTF-8 文本；当前评测支持文档、JSON 和脚本源码文件`);}
  if(content.includes('\0'))throw new Error(`${path} 是二进制文件，当前不支持导入`);
  packaged.push({path:`${bundlePrefix}${path}`,content});
 }
 const snapshot=serializePackage(packaged.sort((a,b)=>a.path.localeCompare(b.path)));
 validatePackage(snapshot,skillId);if(snapshot.length>300000)throw new Error('Skill 内容超过 300,000 字符');return snapshot;
}
// Standards-compliant ZIP (stored entries). Paths validated before export; no executable runs.
export function skillZip(files:PackageFile[]):Uint8Array{
 const encoder=new TextEncoder();const local:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;
 const header=(size:number)=>new Uint8Array(size);
 const crc=(bytes:Uint8Array)=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
 for(const f of files){if(f.path.startsWith('/')||f.path.split('/').some(p=>!p||p==='..'||p==='.'))throw new Error('不安全的文件路径');const name=encoder.encode(f.path),data=encoder.encode(f.content),checksum=crc(data);const h=header(30+name.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,checksum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);h.set(name,30);local.push(h,data);
 const c=header(46+name.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,checksum,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=h.length+data.length;}
 const size=central.reduce((n,b)=>n+b.length,0),end=header(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);const result=header(offset+size+22);let cursor=0;for(const part of [...local,...central,end]){result.set(part,cursor);cursor+=part.length;}return result;
}
export function downloadSkillZip(files:PackageFile[],name:string){const bytes=skillZip(files);const url=URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer],{type:'application/zip'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
