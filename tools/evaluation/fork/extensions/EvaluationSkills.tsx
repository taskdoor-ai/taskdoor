import type {LabRun} from '@taskdoor/types';
import {useBusiness} from './shared';
export default function EvaluationSkills({runs}:{runs:LabRun[]}){
 const {data}=useBusiness();const entries=new Map<string,{id:string;versionId?:string|null;number?:number;snapshot?:string;hash?:string;label?:string}>();
 for(const run of runs)for(const step of run.caseSnapshot.steps){
  const actual=run.steps.find(result=>result.stepId===step.id);const versionId=actual?.skillVersionId??step.skillVersionId;const version=data?.state.skillVersions?.find(v=>v.id===versionId&&v.skillId===step.skillId);
  const key=JSON.stringify([step.skillId,versionId??actual?.skillHash??'workspace']);const previous=entries.get(key);
  if(!previous?.snapshot||actual?.skillSnapshot)entries.set(key,{id:step.skillId,versionId,number:version?.versionNumber??run.skillVersionNumber,snapshot:actual?.skillSnapshot??version?.snapshot,hash:actual?.skillHash??version?.hash,label:actual?.skillVersionLabel??version?.label});
 }
 return <section className="evaluation-skills" aria-label="本次测试 Skill"><h2>本次测试 Skill</h2>{[...entries.entries()].map(([key,entry])=><div className="evaluation-skill" key={key}><div className="evaluation-skill-title"><strong>{data?.skills.find(s=>s.id===entry.id)?.title??entry.id}</strong><span>{entry.number?`v${entry.number}`:entry.label??'工作区版本'}</span></div><code>{entry.id}</code><details><summary>查看本次 Skill 内容</summary>{entry.hash&&<p className="business-muted break-all">快照哈希：{entry.hash}</p>}{entry.snapshot?<pre>{entry.snapshot}</pre>:<p className="business-muted">本次记录尚未保存 Skill 内容，执行后会显示；不会用当前工作区内容替代。</p>}</details></div>)}</section>;
}
