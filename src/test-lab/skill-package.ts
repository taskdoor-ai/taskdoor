import { splitSkillDocuments } from './markdown-files';
export type PackageFile = {path:string;content:string};
export function serializePackage(files:PackageFile[]) {
  return files.map(f=>`--- FILE: ${f.path} ---\n${f.content.replace(/\n+$/,'')}\n`).join('\n');
}
export function validatePackage(snapshot:string,skillId:string):PackageFile[] {
  const files=splitSkillDocuments(snapshot).map(({path,content})=>({path,content}));
  // Legacy single-document versions remain readable and saveable.
  const bundled=/^--- FILE: /m.test(snapshot);
  if(files.length>100)throw new Error('一个 Skill 包最多 100 个文件');
  const paths=new Set<string>();
  for(const f of files){
    if(!/^(?:skills\/)?[a-zA-Z0-9_.\/-]+$/.test(f.path)||f.path.split('/').some(p=>!p||p==='.'||p==='..')||f.path.startsWith('/'))throw new Error('文件路径必须为安全的相对路径');
    if(paths.has(f.path))throw new Error(`文件路径重复：${f.path}`);paths.add(f.path);
    if(f.path.endsWith('.json'))try{JSON.parse(f.content);}catch{throw new Error(`JSON 文件格式错误：${f.path}`);}
  }
  if(bundled&&!paths.has(`skills/${skillId}/SKILL.md`))throw new Error('Skill 包必须保留当前 Skill 的 SKILL.md 入口');
  return files;
}
export function packageDiff(before:string,after:string) {
  const old=new Map(splitSkillDocuments(before).map(f=>[f.path,f.content.trimEnd()]));
  const current=new Map(splitSkillDocuments(after).map(f=>[f.path,f.content.trimEnd()]));
  return {added:[...current.keys()].filter(p=>!old.has(p)),removed:[...old.keys()].filter(p=>!current.has(p)),modified:[...current.keys()].filter(p=>old.has(p)&&old.get(p)!==current.get(p))};
}
