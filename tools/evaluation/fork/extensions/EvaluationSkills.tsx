import type {LabRun} from '@taskdoor/types';
import {useBusiness} from './shared';
export default function EvaluationSkills({runs}:{runs:LabRun[]}){
 const {data}=useBusiness();const entries=new Map<string,{id:string;versionId?:string|null;number?:number;snapshot?:string;hash?:string;label?:string;notes?:string}>();
 for(const run of runs)for(const step of run.caseSnapshot.steps){
  const actual=run.steps.find(result=>result.stepId===step.id);const versionId=actual?.skillVersionId??step.skillVersionId;const version=data?.state.skillVersions?.find(v=>v.id===versionId&&v.skillId===step.skillId);
  const key=JSON.stringify([step.skillId,versionId??actual?.skillHash??'workspace']);const previous=entries.get(key);
  if(!previous?.snapshot||actual?.skillSnapshot)entries.set(key,{id:step.skillId,versionId,number:version?.versionNumber??run.skillVersionNumber,snapshot:actual?.skillSnapshot??version?.snapshot,hash:actual?.skillHash??version?.hash,label:actual?.skillVersionLabel??version?.label,notes:version?.notes});
 }
 return <section className="evaluation-skills" aria-label="本次测试 Skill"><h2>本次测试 Skill</h2>{[...entries.entries()].map(([key,entry])=><div className="evaluation-skill" key={key}><div className="evaluation-skill-title"><strong>{data?.skills.find(s=>s.id===entry.id)?.title??entry.id}</strong><span>{entry.number?`v${entry.number}`:entry.label??'工作区版本'}</span></div><code>{entry.id}</code><div className="my-3 space-y-1 text-sm"><p className="font-medium">当前版本优化说明（元数据）</p><p className="whitespace-pre-wrap break-words text-muted-foreground">{entry.notes!==undefined?entry.notes.trim()||'尚未记录本版优化内容':entry.versionId?'当前已保存版本的说明不可用。':'本次使用工作区版本，没有已保存版本的优化说明。'}</p><p className="text-xs text-muted-foreground">这里展示该版本当前保存的说明；本次运行冻结的 Skill 内容与哈希保持原记录。</p></div><details><summary>查看本次 Skill 内容</summary>{entry.hash&&<p className="business-muted break-all">快照哈希：{entry.hash}</p>}{entry.snapshot?<pre>{entry.snapshot}</pre>:<p className="business-muted">本次记录尚未保存 Skill 内容，执行后会显示；不会用当前工作区内容替代。</p>}</details></div>)}</section>;
}
