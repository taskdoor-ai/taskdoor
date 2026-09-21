import { cleanLabLabel } from './industry-seeds.ts';
import { importedCaseName } from './library-names.ts';
import { readFileSync } from 'node:fs';
import { defaultActiveTeamLimit, type LabCase,type LabTeam,type LabTask } from '../../src/test-lab/types.ts';
import type { LabStore } from './store.ts';
import { validateRelations } from './schema.ts';
import { representativeActiveTeamIds } from './team-selection.ts';
import { enrichScenarioCatalog } from './scenario-catalog.ts';
const read=(file:string)=>JSON.parse(readFileSync(new URL(`../../skills/agentdoor-task-planner/evals/${file}`,import.meta.url),'utf8'));
const statusMap:Record<string,LabTask['status']>={open:'待开始',in_progress:'进行中',blocked:'已阻塞',completed:'已完成',cancelled:'已取消'};
export function importedLibrary(){
  const teams:LabTeam[]=[];const cases:LabCase[]=[];
  for(const family of ['industry','edge','complex','realistic']){
    const fixtures=read(`${family}-fixtures.json`),expected=read(`${family}-expectations.json`);
    for(const scenario of fixtures.scenarios){
      const input=scenario.input;const originalTeam=fixtures.teams.find((t:any)=>t.teamId===scenario.teamId);const id=`import-${scenario.id}`;
      const members=originalTeam.members.map((m:any)=>({id:m.id,name:m.name,role:m.role,responsibilities:[...m.responsibilities,...(m.boundaries??[]).map((b:string)=>`责任边界：${b}`)],version:1}));
      const memberIds=new Set(members.map((m:any)=>m.id));const taskIds=new Set(input.context.tasks.map((t:any)=>t.id));
      const unknownStatuses=input.context.tasks.filter((t:any)=>!statusMap[t.status]);
      // Legacy snapshots remain available verbatim for review. Only compatible task fields enter editable fixtures.
      const tasks=input.context.tasks.filter((t:any)=>statusMap[t.status]).map((t:any)=>({id:t.id,title:t.title,goal:typeof t.goal==='string'?t.goal:'',status:statusMap[t.status],createdById:null,ownerId:memberIds.has(t.ownerId)?t.ownerId:null,participantIds:(t.participantIds??[]).filter((p:string)=>memberIds.has(p)&&p!==t.ownerId),parentId:taskIds.has(t.parentId)?t.parentId:null,dependsOnTaskIds:(t.dependsOnTaskIds??[]).filter((d:string)=>taskIds.has(d)),acceptanceCriteria:t.acceptanceCriteria??[],executionTips:[],estimatedMinutes:null,dueAt:t.dueOn??null,tags:[],visibility:'team' as const,version:Number.isInteger(t.version)?Math.max(1,t.version):1}));
      const retained=new Set(tasks.map((t:any)=>t.id));for(const t of tasks){if(t.parentId&&!retained.has(t.parentId))t.parentId=null;t.dependsOnTaskIds=t.dependsOnTaskIds.filter((d:string)=>retained.has(d));}
      const evidence=(input.context.discussions??[]).filter((e:any)=>retained.has(e.taskId)&&memberIds.has(e.authorId)).map((e:any)=>({id:e.id,taskId:e.taskId,authorId:e.authorId,kind:'讨论' as const,title:'历史讨论',content:e.text,createdAt:typeof e.createdAt==='string'?e.createdAt:'',version:1,visibleToIds:[]}));
      const note=`历史资料待迁移复核：仅转换五种状态的任务、成员责任和团队成员讨论。原始来源、文件、历史、约束、固定时钟、确认字段及 ACL 情节保留在原始输入，不自动发送给模型；请按当前规则补充沙箱证据和断言再启用。${unknownStatuses.length?` ${unknownStatuses.length} 项旧状态任务未转换。`:''}`;
      const team:LabTeam={id,name:cleanLabLabel(originalTeam.name),industry:scenario.industry,description:note,archived:false,members,tasks,evidence};
      try{validateRelations([team],[]);}catch{
        team.tasks=team.tasks.map(t=>({...t,parentId:null,dependsOnTaskIds:[]}));
        team.description+=' 原始异常任务图未转换；可在原始输入查看，不代表该异常已修复或已测试。';
      }
      teams.push(team);
      const expectedRows=expected.cases??expected.scenarios??expected.expectations??[];
      cases.push({id,name:importedCaseName(scenario.id,cleanLabLabel(input.message)),category:'历史资料待复核',teamId:id,actorId:memberIds.has(input.currentUserId)?input.currentUserId:members[0].id,description:team.description,archived:false,enabled:false,version:1,
        steps:[{id:'s1',skillId:'agentdoor-task-planner',prompt:input.message,taskId:retained.has(input.currentTaskId)?input.currentTaskId:null,usePreviousOutput:false,events:[]}],assertions:[],reviewChecklist:['对照原始输入补全资料并校对当前规则','将旧期望改为当前协议的断言，业务语义人工复核'],legacyInput:input,legacyExpected:Array.isArray(expectedRows)?expectedRows.find((e:any)=>e.id===scenario.id||e.caseId===scenario.id||e.scenarioId===scenario.id)??null:expectedRows[scenario.id]??null,origin:`${family}-fixtures.json#${scenario.id}`});
    }
  }
  for(const episode of read('multiturn-scenarios.json').episodes){
    const source=cases.find(c=>c.id===`import-${episode.seedCaseId}`);if(!source)continue;
    cases.push({...structuredClone(source),id:`import-multiturn-${episode.id}`,name:`多轮：${episode.name}`,description:'历史多轮迁移待复核：当前仅保留对话步骤，不自动模拟旧版草稿提交、响应丢失或权限撤回。必须补齐对应情节后才可作为回归测试。',
      steps:episode.turns.map((turn:any,i:number)=>({...source.steps[0],id:`s${i+1}`,prompt:turn.message??source.steps[0].prompt,usePreviousOutput:i>0})),legacyInput:{seed:source.legacyInput,episode},legacyExpected:null,origin:`multiturn-scenarios.json#${episode.id}`});
  }
  return {teams,cases};
}
export function importLibrary(store:LabStore){
  const current=store.get(),library=importedLibrary();
  const cases=library.cases.filter(c=>!current.cases.some(old=>old.id===c.id));
  const available=Math.max(0,defaultActiveTeamLimit-current.teams.filter(team=>!team.archived).length);
  const preferred=new Set<string>(representativeActiveTeamIds);
  let activated=0;
  const teams=library.teams.filter(t=>!current.teams.some(old=>old.id===t.id)).map((team)=>{
    const active=preferred.has(team.id)&&activated<available;
    if(active)activated++;
    return {...team,archived:!active};
  });
  const nextTeams=[...current.teams,...teams],nextCases=[...current.cases,...cases];
  const enriched=enrichScenarioCatalog(nextTeams,nextCases);
  return {state:cases.length||teams.length||enriched?store.save(current.revision,nextTeams,nextCases):current,imported:nextCases.length-current.cases.length};
}
