import {isDeepStrictEqual as equal} from 'node:util';
// Remove only views whose full value matches a deterministic reconstruction.
export function canonicalJudgeInput(value:any){
 if(!value||!Array.isArray(value.tasks)||!Array.isArray(value.members)||!Array.isArray(value.evidence))return value;
 const i=structuredClone(value),t=i.tasks,e=i.evidence,time=i.evaluatedAt,teamId=i.teamId;
 const m=i.members.map((member:any)=>{const {boundaries,evidence,...raw}=member;return equal(boundaries,[])&&equal(evidence,[{id:member.id,title:`${member.name}责任说明`,text:member.responsibilities?.join('；')}])?raw:member;});
 const history=e.filter((e:any)=>e.kind==='活动').map((e:any)=>({id:e.id,taskId:e.taskId,occurredAt:e.createdAt,type:'task_activity',summary:e.content,sourceRefs:e.relatedEvidenceIds??[]}));
 const derived:string[]=[];
 const remove=(obj:any,key:string,expected:any,meaning:string)=>{if(equal(obj[key],expected)){delete obj[key];derived.push(meaning);}};
 remove(i,'sources',[...t.map((t:any)=>({ref:t.id,version:t.version,subjectId:t.id,teamId,content:t,effectiveAt:null,validity:'current'})),...m.map((m:any)=>({ref:m.id,version:m.version,subjectId:m.id,teamId,content:m,effectiveAt:null,validity:'current'})),...e.map((e:any)=>({ref:e.id,version:e.version,subjectId:e.taskId,teamId,content:e.content,effectiveAt:null,validity:'current'}))],'sources: canonical tasks/members/evidence records; ref=id, evidence subjectId=taskId, other subjectId=id; all belong to teamId, effectiveAt=null, validity=current');
 remove(i,'history',history,'history: 活动 evidence, preserving id/taskId/createdAt/content/relatedEvidenceIds as id/taskId/occurredAt/summary/sourceRefs; type=task_activity');
 remove(i,'inputVersions',{team:teamId,tasks:Object.fromEntries(t.map((t:any)=>[t.id,t.version])),responsibilities:Object.fromEntries(m.map((m:any)=>[m.id,m.version])),evidence:Object.fromEntries(e.map((e:any)=>[e.id,e.version]))},'inputVersions: teamId and each canonical record id/version');
 const c=i.context;
 if(c){
 const statuses:Record<string,string>={'待开始':'open','进行中':'in_progress','已阻塞':'blocked','已完成':'completed','已取消':'cancelled'};
 remove(c,'tasks',t.map((t:any)=>({...t,status:statuses[t.status],updatedAt:time,dueOn:t.dueAt,sourceRefs:[t.id]})),'context.tasks: canonical tasks with translated status, updatedAt=evaluatedAt, dueOn=dueAt, sourceRefs=[id]');
 remove(c,'history',history,'context.history: same activity evidence mapping as history');
 remove(c,'discussions',e.filter((e:any)=>e.kind==='讨论'||e.kind==='确认').map((e:any)=>({id:e.id,taskId:e.taskId,authorId:e.authorId,createdAt:e.createdAt||time,kind:e.kind==='确认'?'decision':'report',text:e.content,replyTo:e.replyToId,sourceRefs:e.relatedEvidenceIds??[]})),'context.discussions: 讨论/确认 evidence; text=content, replyTo=replyToId, sourceRefs=relatedEvidenceIds or [], createdAt defaults evaluatedAt, kind=report/decision');
 remove(c,'files',e.filter((e:any)=>e.kind==='文件').map((e:any)=>({id:e.id,taskId:e.taskId,title:e.title,fileName:e.title,version:e.version,linkedTaskIds:[e.taskId],content:e.content,authorId:e.authorId,createdAt:e.createdAt||null,supersedesId:e.supersedesId})),'context.files: 文件 evidence; fileName=title, linkedTaskIds=[taskId], createdAt defaults null; remaining file fields unchanged');
 remove(c,'sourceRefs',[...t.map((t:any)=>({id:t.id,title:t.title,text:`目标：${t.goal}；完成标准：${t.acceptanceCriteria.join('；')}`})),...e.map((e:any)=>({id:e.id,title:e.title,text:e.content}))],'context.sourceRefs: each task id/title with goal and acceptanceCriteria; each evidence id/title/content');
 }
 if(i.duplicateSearch)remove(i.duplicateSearch,'matches',t.map((t:any)=>({taskId:t.id,title:t.title,reason:'当前授权沙箱任务候选，请按实际交付结果核对'})),'duplicateSearch.matches: all canonical task id/title pairs; reason=当前授权沙箱任务候选，请按实际交付结果核对');
 return {...i,derivedViews:derived};
}
