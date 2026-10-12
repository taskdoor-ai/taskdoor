import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

// Export only the production files selected by each skill's manifest.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const outputArg=args.find(arg=>arg.startsWith('--output='));
if(!outputArg||args.some(arg=>arg!==outputArg&&arg!=='--check'))throw Error('用法：node scripts/export-taskdoor-skills.mjs --output=<taskdoor-skills目录> [--check]');
const output=resolve(outputArg.slice('--output='.length));
const check=args.includes('--check');
const registry=JSON.parse(readFileSync(resolve(root,'skills/registry.json'),'utf8'));
let count=0;
for(const skill of registry.skills.filter(s=>s.distributionName)){
  const name=skill.distributionName;
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))throw Error('无效发布名称：'+name);
  const prefix=`skills/${skill.id}/`;
  const manifest=JSON.parse(readFileSync(resolve(root,prefix+'references/production-runtime.json'),'utf8'));
  if(manifest.version!==1||!Array.isArray(manifest.files)||!manifest.files.includes(prefix+'SKILL.md')||new Set(manifest.files).size!==manifest.files.length)throw Error('无效生产文件清单：'+skill.id);
  for(const path of manifest.files){
    if(typeof path!=='string'||!path.startsWith(prefix)||path.split('/').some(s=>s==='..'||s==='.'||!s))throw Error('发布文件必须在当前 Skill 目录内：'+path);
    const relative=path.slice(prefix.length);
    let content=readFileSync(resolve(root,path),'utf8');
    if(relative==='SKILL.md'){
      if(!content.startsWith(`---\nname: ${skill.id}\n`))throw Error('入口名称不匹配：'+skill.id);
      content=content.replace(`name: ${skill.id}\n`,`name: ${name}\n`);
    }
    const destination=resolve(output,'skills',name,relative);
    if(!destination.startsWith(resolve(output,'skills',name)+sep))throw Error('发布路径越界');
    if(check){if(!existsSync(destination)||readFileSync(destination,'utf8')!==content)throw Error('发布文件与源文件不同：'+destination);}
    else{mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,content);}
    count++;
  }
}
console.log(`${check?'核对':'导出'} ${count} 个生产文件`);
