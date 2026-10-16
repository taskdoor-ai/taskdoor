import {addComplexSkillCases} from './complex-skill-cases.ts';
import {addSubtaskCases} from './subtask-cases.ts';
import {addExpandedSkillCases} from './expanded-skill-cases.ts';
import {addAnalysisTimingCases} from './analysis-timing-cases.ts';
import {updatePeopleAnalysisReferences} from './people-analysis-reference.ts';
import {updateTaskAnalysisExpectations} from './task-analysis-expectations.ts';
import {buildAnalysisDataFixtures} from './analysis-data-fixtures.ts';
import {addPeopleAnalysisCases} from './people-analysis-cases.ts';
import {addTaskAnalysisCases} from './task-analysis-cases.ts';
import {updatePreviewCaseLibrary,updatePreviewAssignmentCriteria} from './preview-case-library.ts';
import {applyCreationOutcomeCriteria,updateCreationOutcomeCriteria} from './creation-outcome-criteria.ts';
import {readPersistedLabState} from './run-state.mjs';
import {addPlanningCoreCases} from './planning-core-cases.ts';
import {curateWorkflowFocusCases} from './workflow-focus-cases.ts';
import {updateContentTeamRoster} from './content-team-roster.ts';
import {updateContentTeamJageCases} from './content-team-jage.ts';
import {addLiveMcpCases} from './mcp-cases.ts';
import {migrateCreationExpectations} from './creation-expectations.ts';
import {initialCaseTags} from '../../src/test-lab/case-tags.ts';
import {migratePlanningCriteria} from './planning-criteria.ts';
import { migrateFreshCreation } from "./fresh-creation.ts";
import { validatePackage } from "../../src/test-lab/skill-package.ts";
import { addDecompositionCases } from "./decomposition-seeds.ts";
import { addCoverageCases } from "./coverage-seeds.ts";
import { addBenchmarkCases } from "./benchmark-seeds.ts";
import { industrySeed, cleanLabLabel } from './industry-seeds.ts';
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { skillIds, type SkillId } from '../../src/test-lab/types.ts';
import { hash } from './skills.ts';
import { type LabState, type LabTeam, type LabCase, type LabRun } from '../../src/test-lab/types.ts';
import { editableSchema, validateRelations, skillVersionInputSchema, skillVersionNotesInputSchema, modelIdSchema } from './schema.ts';
import { defaultActiveTeamIds } from './team-selection.ts';
import { migrateLibraryNames } from './library-names.ts';
import { enrichScenarioCatalog } from './scenario-catalog.ts';

function migrateTeam(team:any){
  let changed=false;
  for(const task of team?.tasks??[])if(!Object.prototype.hasOwnProperty.call(task,'createdById')){task.createdById=null;changed=true;}
  for(const item of team?.evidence??[]){
    if(!Object.prototype.hasOwnProperty.call(item,'title')){item.title=`${item.kind||'资料'}记录`;changed=true;}
    if(!Object.prototype.hasOwnProperty.call(item,'createdAt')){item.createdAt='';changed=true;}
  }
  return changed;
}
function migrateState(raw:any,seed:LabState,hasFile:boolean):{state:LabState;changed:boolean}{
  const state=structuredClone(raw);let changed=false;
  const counts=new Map<string,number>();
  for(const version of [...(state.skillVersions??[])].sort((a:any,b:any)=>a.createdAt.localeCompare(b.createdAt))){
    if(!version.versionNumber){version.versionNumber=(counts.get(version.skillId)??0)+1;changed=true;}
    counts.set(version.skillId,Math.max(counts.get(version.skillId)??0,version.versionNumber));
  }
  for(const team of state?.teams??[])changed=migrateTeam(team)||changed;
  if(state?.teamCurationVersion===1){
    for(const team of seed.teams)if(!state.teams.some((item:any)=>item.id===team.id)){state.teams.push(structuredClone(team));changed=true;}
    for(const item of seed.cases)if(!state.cases.some((candidate:any)=>candidate.id===item.id)){state.cases.push(structuredClone(item));changed=true;}
  }
  if(state?.teamCurationVersion!==2){
    const activeIds=defaultActiveTeamIds(state?.teams??[]);
    for(const team of state?.teams??[]){
      const archived=!activeIds.has(team.id);
      if(team.archived!==archived){team.archived=archived;changed=true;}
    }
    state.teamCurationVersion=2;changed=true;
  }
  if(state.managementVersion!==1){
    if(hasFile&&raw.teamCurationVersion===2){
      const additions=industrySeed();
      for(const team of additions.teams)if(!state.teams.some((t:any)=>t.id===team.id)){
        team.archived=state.teams.filter((t:any)=>!t.archived).length>=10;state.teams.push(team);
        state.cases.push(...additions.cases.filter(c=>c.teamId===team.id&&!state.cases.some((old:any)=>old.id===c.id)));
      }
    }
    for(const team of state.teams){team.name=cleanLabLabel(team.name);team.description=cleanLabLabel(team.description);}
    state.managementVersion=1;changed=true;
  }
  if(state.libraryNamesVersion!==1){
    migrateLibraryNames(state.teams,state.cases);
    state.libraryNamesVersion=1;changed=true;
  }
  changed=enrichScenarioCatalog(state.teams,state.cases)||changed;
  changed=addBenchmarkCases(state)||changed;
  changed=addCoverageCases(state)||changed;
  changed=addDecompositionCases(state)||changed;
  changed=migrateFreshCreation(state)||changed;
  changed=migratePlanningCriteria(state)||changed;
  changed=migrateCreationExpectations(state)||changed;
  changed=addLiveMcpCases(state)||changed;
  changed=updateContentTeamRoster(state)||changed;
  changed=addPlanningCoreCases(state)||changed;
  const contentTeam=state.teams.find((t:any)=>t.id==='lab-content');
  for(const [memberId,oldName,newName] of [['zhou','周岚','卜佳菲'],['xu','许悦','tiger huang']]){
    const renamedMember=contentTeam?.members.find((m:any)=>m.id===memberId&&m.name===oldName);
    if(!renamedMember)continue;
    const rename=(value:any):any=>typeof value==='string'?value.replaceAll(oldName,newName):Array.isArray(value)?value.map(rename):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rename(v)])):value;
    Object.assign(contentTeam,rename(contentTeam));
    contentTeam.members.find((m:any)=>m.id===memberId).version++;
    state.cases=state.cases.map((c:any)=>c.teamId==='lab-content'?{...rename(c),version:c.version+1}:c);
    changed=true;
  }
  changed=curateWorkflowFocusCases(state)||changed;
  changed=updateContentTeamJageCases(state)||changed;
  changed=updatePreviewCaseLibrary(state)||changed;
  changed=updatePreviewAssignmentCriteria(state)||changed;
  for(const item of state?.cases??[])for(const step of item?.steps??[])for(const event of step?.events??[])if(event?.type==='evidence')changed=migrateTeam({tasks:[],evidence:[event.evidence]})||changed;
  for(const run of state?.runs??[]){
    changed=migrateTeam(run.teamSnapshot)||changed;
    for(const step of run?.steps??[]){changed=migrateTeam(step.before)||changed;changed=migrateTeam(step.after)||changed;}
  }
  changed=addTaskAnalysisCases(state)||changed;
  changed=addPeopleAnalysisCases(state)||changed;
  changed=buildAnalysisDataFixtures(state)||changed;
  for(const team of state.teams){
    const syntheticIds=new Set(team.members.filter((m:any)=>m.id.startsWith('people-test-')).map((m:any)=>m.id));
    if(!syntheticIds.size)continue;
    // 迁移旧库：先保留依赖这些成员的用例快照，再清理公共团队。
    for(const c of state.cases.filter((c:LabCase)=>c.teamId===team.id&&!c.dataSnapshot)){
      if(syntheticIds.has(c.actorId)||c.steps.some((step:any)=>step.taskId?.startsWith('people-test-'))){c.dataSnapshot=structuredClone(team);c.version++;}
    }
    const taskIds=new Set(team.tasks.filter((t:any)=>t.id.startsWith('people-test-')||syntheticIds.has(t.ownerId)||t.participantIds.some((id:string)=>syntheticIds.has(id))).map((t:any)=>t.id));
    team.evidence=team.evidence.filter((e:any)=>!taskIds.has(e.taskId)&&!syntheticIds.has(e.authorId));
    team.tasks=team.tasks.filter((t:any)=>!taskIds.has(t.id));
    team.members=team.members.filter((m:any)=>!syntheticIds.has(m.id));changed=true;
  }

  // 已下线的独立评测不再出现在用例库；历史运行快照仍可查阅。
  const retiredSkills=new Set(['agentdoor-personal-priority','agentdoor-task-diagnostician','agentdoor-ewd-progress']);
  const activeCases=state.cases.filter((c:LabCase)=>!c.steps.some(step=>retiredSkills.has(step.skillId)));
  if(activeCases.length!==state.cases.length){state.cases=activeCases;changed=true;}
  changed=addAnalysisTimingCases(state)||changed;
  changed=addExpandedSkillCases(state)||changed;
  changed=addComplexSkillCases(state)||changed;
  for(const c of state.cases)if(c.tags===undefined){c.tags=initialCaseTags(c);changed=true;}
  changed=updateTaskAnalysisExpectations(state)||changed;
  changed=updatePeopleAnalysisReferences(state)||changed;
  changed=updateCreationOutcomeCriteria(state)||changed;
  changed=addSubtaskCases(state)||changed;
  return {state,changed};
}
export function createLabStore(path:string, seed:LabState){
  const hasFile=existsSync(path);const raw=hasFile?readPersistedLabState(path):structuredClone(seed);
  const journal=path+'.runs';
  const migrated=migrateState(raw,seed,hasFile);
  let state:LabState=migrated.state;
  if(state.version!==1||!Array.isArray(state.runs))throw new Error('测试数据版本不支持，请保留文件并检查数据');
  editableSchema.parse({expectedRevision:state.revision,teams:state.teams,cases:state.cases});validateRelations(state.teams,state.cases);
  const persist=(next:LabState)=>{mkdirSync(dirname(path),{recursive:true});const temp=`${path}.${process.pid}.tmp`;writeFileSync(temp,JSON.stringify(next),{mode:0o600});renameSync(temp,path);state=next;};
  const persistRuns=(runs:LabRun[],append=false)=>{
    const revision=state.revision+1;mkdirSync(journal,{recursive:true});
    for(const run of runs){
      const file=`${journal}/${createHash('sha256').update(run.id).digest('hex')}.json`;
      const temp=`${file}.${process.pid}.tmp`;writeFileSync(temp,JSON.stringify({revision,run}),{mode:0o600});renameSync(temp,file);
    }
    const changed=new Map(runs.map(run=>[run.id,run]));
    state={...state,revision,runs:append?[...state.runs,...runs]:state.runs.map(run=>changed.get(run.id)??run)};
  };
  const checkRevision=(revision:number)=>{if(revision!==state.revision)throw new Error('数据版本已更新，请刷新后重新保存，当前草稿仍保留');};
  const getBootstrapState=(batchId?:string,runId?:string)=>{
    const tinyTeam=(team:LabTeam)=>({...team,tasks:[],evidence:[]});
    const runs=state.runs.map(run=>run.id===runId||run.batchId===batchId?run:{...run,
      caseSnapshot:{...run.caseSnapshot,dataSnapshot:undefined,legacyInput:undefined,legacyExpected:undefined,
        steps:run.caseSnapshot.steps.map(step=>({...step,events:[]})),
        assertions:run.caseSnapshot.assertions.map(assertion=>({...assertion,expected:null})),
        expectedOutput:run.caseSnapshot.expectedOutput?{...run.caseSnapshot.expectedOutput,checks:run.caseSnapshot.expectedOutput.checks.map(check=>({...check,expected:null}))}:undefined,
        verification:run.caseSnapshot.verification?{...run.caseSnapshot.verification,fixtureChecks:run.caseSnapshot.verification.fixtureChecks.map(check=>({...check,expected:null}))}:undefined},
      teamSnapshot:tinyTeam(run.teamSnapshot),
      steps:run.steps.map(step=>({...step,input:null,output:null,rawOutput:'',skillSnapshot:undefined,mcp:undefined,
        previewAttempts:step.previewAttempts?.map(attempt=>({...attempt,rawOutput:''})),
        assertions:step.assertions.map(assertion=>({...assertion,actual:null,expected:null})),
        before:tinyTeam(step.before),after:tinyTeam(step.after)}))});
    return structuredClone({...state,runs});
  };
  const responseState=(options?:{summary?:boolean})=>options?.summary?getBootstrapState():structuredClone(state);
  if(!hasFile)persist(state);else if(migrated.changed)persist({...state,revision:state.revision+1});
  return {
    get:()=>structuredClone(state),
    getLibrary:()=>structuredClone({...state,runs:[]}),
    getRun:(id:string)=>{const run=state.runs.find(r=>r.id===id);return run?structuredClone(run):undefined;},
    getRuns:(filter:(run:LabRun)=>boolean)=>structuredClone(state.runs.filter(filter)),
    getBootstrapState,
    updateRun(id:string,change:(run:LabRun)=>void){
      const before=state.runs.find(r=>r.id===id);if(!before)throw Error('运行记录不存在');
      const run=structuredClone(before);change(run);
      persistRuns([run]);
      return structuredClone(run);
    },
    updateBatch(batchId:string,change:(run:LabRun)=>void){
      const runs=state.runs.filter(r=>r.batchId===batchId).map(r=>{const run=structuredClone(r);change(run);return run;});
      if(runs.length)persistRuns(runs);
    },
    appendRuns(runs:LabRun[]){if(runs.length)persistRuns(structuredClone(runs),true);},
    addSkillVersion(expectedRevision:number,input:z.input<typeof skillVersionInputSchema>,options?:{summary?:boolean}){
      checkRevision(expectedRevision);const value=skillVersionInputSchema.parse(input);
      const files=validatePackage(value.snapshot,value.skillId).map(f=>({...f,hash:hash(f.content)}));
      const versions=state.skillVersions??[];
      if(value.baseVersionId&&!versions.some(v=>v.id===value.baseVersionId&&v.skillId===value.skillId))throw new Error('基于的版本不属于当前 Skill');
      if(versions.length>=100)throw new Error('最多保留 100 个 Skill 版本');
      if(versions.some(v=>v.skillId===value.skillId&&v.label===value.label))throw new Error('该 Skill 已有同名版本，请使用新的版本名称');
      const version={...value,versionNumber:Math.max(0,...versions.filter(v=>v.skillId===value.skillId).map(v=>v.versionNumber??0))+1,files,id:randomUUID(),hash:hash(value.snapshot),createdAt:new Date().toISOString()};
      persist({...state,revision:state.revision+1,skillVersions:[...versions,version]});return responseState(options);
    },
    updateSkillVersionNotes(expectedRevision:number,versionId:string,input:z.input<typeof skillVersionNotesInputSchema>,options?:{summary?:boolean}){
      checkRevision(expectedRevision);const {notes}=skillVersionNotesInputSchema.parse(input);
      const version=state.skillVersions?.find(version=>version.id===versionId);
      if(!version)throw new Error('Skill 版本不存在，请刷新后重试');
      if(version.notes===notes)return responseState(options);
      // Descriptive metadata only. Frozen files, hashes and run snapshots stay intact.
      persist({...state,revision:state.revision+1,skillVersions:state.skillVersions!.map(item=>item.id===versionId?{...item,notes}:item)});
      return responseState(options);
    },
    setSkillDefault(expectedRevision:number,skillId:SkillId,versionId:string|null,options?:{summary?:boolean}){
      checkRevision(expectedRevision);z.enum(skillIds).parse(skillId);
      if(versionId&&!state.skillVersions?.some(v=>v.id===versionId&&v.skillId===skillId))throw new Error('默认版本必须属于当前 Skill');
      const defaults={...state.skillDefaults};if(versionId)defaults[skillId]=versionId;else delete defaults[skillId];
      persist({...state,revision:state.revision+1,skillDefaults:defaults});return responseState(options);
    },
    saveCategory(expectedRevision:number,input:{name:string;description:string;previousName?:string}){
      checkRevision(expectedRevision);
      const value=z.object({name:z.string().trim().min(1).max(80),description:z.string().trim().max(1000),previousName:z.string().min(1).max(20000).optional()}).strict().parse(input);
      const names=new Set([...(state.categories??[]).map(c=>c.name),...state.cases.map(c=>c.category)]);
      if(value.previousName&&!names.has(value.previousName))throw new Error('原分类不存在，请刷新后重试');
      if(value.name!==value.previousName&&names.has(value.name))throw new Error('该分类已存在，请选择编辑');
      if(!value.previousName&&(state.categories?.length??0)>=100)throw new Error('最多保存 100 个自定义分类');
      const categories=(state.categories??[]).filter(c=>c.name!==value.previousName);
      categories.push({name:value.name,description:value.description});
      const cases=state.cases.map(c=>value.previousName&&c.category===value.previousName&&value.name!==value.previousName?{...c,category:value.name,version:c.version+1}:c);
      persist({...state,revision:state.revision+1,categories,cases});return structuredClone(state);
    },
    saveModels(expectedRevision:number,models:string[],judgeEnabled?:boolean){
      checkRevision(expectedRevision);const parsed=z.array(modelIdSchema).max(500).parse(models);
      if(state.modelCatalogSyncedAt&&parsed.some(model=>!state.modelCatalog?.includes(model)))throw new Error('型号不在已同步的可用目录中，请先同步模型目录再启用');
      persist({...state,revision:state.revision+1,models:[...new Set(parsed)],modelCatalog:[...new Set([...(state.modelCatalog??[]),...(state.models??[]),...parsed])],...(judgeEnabled===undefined?{}:{judgeEnabled})});return structuredClone(state);
    },
    syncModelCatalog(expectedRevision:number,models:string[]){
      checkRevision(expectedRevision);const catalog=[...new Set(z.array(modelIdSchema).min(1).max(5000).parse(models))].sort();
      const removedModels=(state.models??[]).filter(model=>!catalog.includes(model));
      persist({...state,revision:state.revision+1,modelCatalog:catalog,modelCatalogSyncedAt:new Date().toISOString(),models:(state.models??[]).filter(model=>catalog.includes(model))});
      return {models:catalog,removedModels};
    },
    save(expectedRevision:number,teams:LabTeam[],cases:LabCase[],options?:{summary?:boolean}){
      if(expectedRevision!==state.revision)throw new Error('数据版本已更新，请刷新后重新保存，当前草稿仍保留');
      if(cases.some(c=>c.steps.some(s=>['agentdoor-personal-priority','agentdoor-task-diagnostician','agentdoor-ewd-progress'].includes(s.skillId))))throw new Error('该独立 Skill 已下线，请使用任务分析、人员责任分析或人员匹配分析');
      const parsed=editableSchema.parse({expectedRevision,teams,cases});validateRelations(parsed.teams,parsed.cases as LabCase[]);
      parsed.cases=applyCreationOutcomeCriteria(parsed.teams,parsed.cases as LabCase[]);
      for(const item of parsed.cases)for(const step of item.steps)if(step.skillVersionId&&!state.skillVersions?.some(v=>v.id===step.skillVersionId&&v.skillId===step.skillId))throw new Error('用例引用的 Skill 版本不存在或不匹配');
      const versioned=<T extends {id:string;version:number}>(next:T[],old:T[])=>next.map(item=>{const before=old.find(o=>o.id===item.id);const unchanged=before&&isDeepStrictEqual({...item,version:0},{...before,version:0});return {...item,version:before?(unchanged?before.version:before.version+1):1};});
      for(const team of parsed.teams){const before=state.teams.find(t=>t.id===team.id);if(before){team.members=versioned(team.members,before.members);team.tasks=versioned(team.tasks,before.tasks);team.evidence=versioned(team.evidence,before.evidence);}}
      for(const item of parsed.cases){const before=state.cases.find(c=>c.id===item.id)?.dataSnapshot;if(item.dataSnapshot&&before){
        item.dataSnapshot.members=versioned(item.dataSnapshot.members,before.members);item.dataSnapshot.evidence=versioned(item.dataSnapshot.evidence,before.evidence);
        for(const task of item.dataSnapshot.tasks){const previous=before.tasks.find(t=>t.id===task.id)?.criteria;if(task.criteria&&previous&&!isDeepStrictEqual(task.criteria.items,previous.items))task.criteria.version=previous.version+1;}
        item.dataSnapshot.tasks=versioned(item.dataSnapshot.tasks,before.tasks);
      }}
      parsed.cases=versioned(parsed.cases,state.cases);
      persist({...state,revision:state.revision+1,teams:structuredClone(parsed.teams),cases:structuredClone(parsed.cases) as LabCase[]});return responseState(options);
    },
    updateRuns(change:(runs:LabState['runs'])=>void){const next=structuredClone(state);change(next.runs);next.revision++;persist(next);return structuredClone(state);},
  };
}
export type LabStore=ReturnType<typeof createLabStore>;
