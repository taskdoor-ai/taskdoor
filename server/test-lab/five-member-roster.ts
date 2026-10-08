import type {LabState,LabMember} from '../../src/test-lab/types.ts';

// Consolidates test fixtures only. Real accounts and immutable run snapshots are untouched.
export function limitTestTeamMembers(state:LabState){
 let changed=false;
 for(const team of state.teams){
  if(team.testMemberLimit===5)continue;
  if(team.members.length<=5){team.testMemberLimit=5;changed=true;continue;}
  const original=structuredClone(team.members),kept=original.slice(0,5);
  const mapping=new Map<string,LabMember>();
  const keywords=['统筹|负责人|经理|商务|财务|协调','文案|文字|脚本|文档|培训|策划|内容','工程|技术|系统|设备|构建|硬件|固件|集成','质量|核查|审核|审校|合规|安全|隐私|验证','运营|渠道|交付|库存|仓|客户|供应|采购'];
  for(const extra of original.slice(5)){
   const groups=keywords.map(k=>new RegExp(k));
   const text=extra.role+' '+extra.responsibilities.join(' ');
   let best=kept[0],score=-1;
   for(const candidate of kept){const dest=candidate.role+' '+candidate.responsibilities.join(' ');const value=groups.reduce((sum,r)=>sum+(r.test(text)&&r.test(dest)?1:0),0);if(value>score){best=candidate;score=value;}}
   mapping.set(extra.id,best);
   best.responsibilities=[...new Set([...best.responsibilities,...extra.responsibilities])];
   if(!best.role.split(' / ').includes(extra.role))best.role+=' / '+extra.role;
   best.version++;
  }
  consolidateTestTeam(state,team.id,mapping);
  team.members=kept;
  team.testMemberLimit=5;changed=true;
 }
 return changed;
}

export function consolidateTestTeam(state:LabState,teamId:string,mapping:Map<string,LabMember>){
 const team=state.teams.find(t=>t.id===teamId);if(!team)return;
 const original=structuredClone(team.members);
  const replacements=[...mapping].flatMap(([id,m])=>[[id,m.id],[original.find(x=>x.id===id)!.name,m.name]] as [string,string][]).sort((a,b)=>b[0].length-a[0].length);
  const replace=(value:unknown):any=>{
   if(typeof value==='string'){let text=value;for(const [from,to] of replacements)text=text.split(from).join(to);return text;}
   if(Array.isArray(value))return value.map(replace);
   if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[mapping.get(k)?.id??k,replace(v)]));
   return value;
  };
  team.members=original.filter(m=>!mapping.has(m.id));
  team.tasks=replace(team.tasks);team.evidence=replace(team.evidence);
  for(const task of team.tasks)task.participantIds=[...new Set(task.participantIds)].filter(id=>id!==task.ownerId);
  for(const evidence of team.evidence)evidence.visibleToIds=[...new Set(evidence.visibleToIds)];
  state.cases=state.cases.map(c=>{
   if(c.teamId!==team.id)return c;
   const next=replace(c) as typeof c;
   if(next.workload){const members=new Map<string,typeof next.workload.members[number]>();for(const m of next.workload.members){const before=members.get(m.memberId);if(!before){members.set(m.memberId,m);continue;}before.currentWork+='/'+m.currentWork;before.remainingMinutes=before.remainingMinutes===null||m.remainingMinutes===null?null:before.remainingMinutes+m.remainingMinutes;before.availableMinutes=before.availableMinutes===null||m.availableMinutes===null?null:Math.min(before.availableMinutes,m.availableMinutes);}next.workload.members=[...members.values()];}
   for(const step of next.steps)for(const event of step.events)if(event.type==='evidence')event.evidence.visibleToIds=[...new Set(event.evidence.visibleToIds)];
   next.version++;return next;
  });

}
