import {existsSync,readFileSync,readdirSync} from 'node:fs';
// Shared by the store and the read-only history exporter; no migrations or writes here.
export function readPersistedLabState(path){
 const raw=JSON.parse(readFileSync(path,'utf8'));const journal=path+'.runs';
 if(!existsSync(journal))return raw;
 const baseRevision=raw.revision;const runs=new Map(raw.runs.map((run)=>[run.id,run]));
 for(const file of readdirSync(journal).filter(name=>name.endsWith('.json'))){
  const entry=JSON.parse(readFileSync(`${journal}/${file}`,'utf8'));
  if(!Number.isSafeInteger(entry.revision)||!entry.run?.id)throw Error('运行日志损坏，请保留文件并检查数据');
  if(entry.revision>baseRevision){runs.set(entry.run.id,entry.run);raw.revision=Math.max(raw.revision,entry.revision);}
 }
 raw.runs=[...runs.values()];return raw;
}
