import type {LabTeam,LabCase} from './types';
export function memberReferences(team:LabTeam,cases:LabCase[],memberId:string){
 const refs:string[]=[];
 for(const t of team.tasks)if(t.ownerId===memberId||t.createdById===memberId||t.participantIds.includes(memberId))refs.push(`任务：${t.title}`);
 for(const e of team.evidence)if(e.authorId===memberId||e.visibleToIds.includes(memberId))refs.push(`证据：${e.title}`);
 for(const c of cases.filter(c=>c.teamId===team.id))if(c.workload?.members.some(m=>m.memberId===memberId)||c.actorId===memberId||c.verification?.fixtureChecks.some(f=>f.subject==='member'&&f.subjectId===memberId)||c.steps.some(s=>s.events.some(e=>e.type==='responsibility'?e.memberId===memberId:e.type==='evidence'&&(e.evidence.authorId===memberId||e.evidence.visibleToIds.includes(memberId)))))refs.push(`用例：${c.name}`);
 return refs;
}
