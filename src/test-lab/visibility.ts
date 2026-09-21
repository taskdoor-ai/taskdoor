import type { LabTeam, LabView } from "./types.ts";

export function buildView(team:LabTeam,actorId:string):LabView{
  if(!team.members.some(m=>m.id===actorId))throw new Error('当前视角成员不存在');
  const tasks=team.tasks.filter(t=>t.visibility==='team'||t.ownerId===actorId||t.participantIds.includes(actorId));
  const ids=new Set(tasks.map(t=>t.id));
  const evidence=team.evidence.filter(e=>ids.has(e.taskId)&&(!e.visibleToIds.length||e.visibleToIds.includes(actorId)));
  const visibleRecords=new Set(evidence.map(e=>e.id));
  return {team:structuredClone({...team,tasks:tasks.map(t=>({...t,parentId:t.parentId&&ids.has(t.parentId)?t.parentId:null,dependsOnTaskIds:t.dependsOnTaskIds.filter(id=>ids.has(id))})),evidence:evidence.map(e=>({...e,...(e.replyToId&&!visibleRecords.has(e.replyToId)?{replyToId:undefined}:{}),...(e.supersedesId&&!visibleRecords.has(e.supersedesId)?{supersedesId:undefined}:{}),...(e.relatedEvidenceIds?{relatedEvidenceIds:e.relatedEvidenceIds.filter(ref=>visibleRecords.has(ref))}:{})}))}),actorId,hiddenTaskCount:team.tasks.length-tasks.length,simulation:true};
}
