import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { type LabState, type LabTeam, type LabCase } from '../../src/test-lab/types.ts';
import { editableSchema, validateRelations } from './schema.ts';
import { defaultActiveTeamIds } from './team-selection.ts';

function migrateTeam(team:any){
  let changed=false;
  for(const task of team?.tasks??[])if(!Object.prototype.hasOwnProperty.call(task,'createdById')){task.createdById=null;changed=true;}
  for(const item of team?.evidence??[]){
    if(!Object.prototype.hasOwnProperty.call(item,'title')){item.title=`${item.kind||'资料'}记录`;changed=true;}
    if(!Object.prototype.hasOwnProperty.call(item,'createdAt')){item.createdAt='';changed=true;}
  }
  return changed;
}
function migrateState(raw:any,seed:LabState):{state:LabState;changed:boolean}{
  const state=structuredClone(raw);let changed=false;
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
  for(const item of state?.cases??[])for(const step of item?.steps??[])for(const event of step?.events??[])if(event?.type==='evidence')changed=migrateTeam({tasks:[],evidence:[event.evidence]})||changed;
  for(const run of state?.runs??[]){
    changed=migrateTeam(run.teamSnapshot)||changed;
    for(const step of run?.steps??[]){changed=migrateTeam(step.before)||changed;changed=migrateTeam(step.after)||changed;}
  }
  return {state,changed};
}
export function createLabStore(path:string, seed:LabState){
  const hasFile=existsSync(path);const migrated=migrateState(hasFile?JSON.parse(readFileSync(path,'utf8')):structuredClone(seed),seed);
  let state:LabState=migrated.state;
  if(state.version!==1||!Array.isArray(state.runs))throw new Error('测试数据版本不支持，请保留文件并检查数据');
  editableSchema.parse({expectedRevision:state.revision,teams:state.teams,cases:state.cases});validateRelations(state.teams,state.cases);
  const persist=(next:LabState)=>{mkdirSync(dirname(path),{recursive:true});const temp=`${path}.${process.pid}.tmp`;writeFileSync(temp,JSON.stringify(next,null,2),{mode:0o600});renameSync(temp,path);state=next;};
  if(!hasFile)persist(state);else if(migrated.changed)persist({...state,revision:state.revision+1});
  return {
    get:()=>structuredClone(state),
    save(expectedRevision:number,teams:LabTeam[],cases:LabCase[]){
      if(expectedRevision!==state.revision)throw new Error('数据版本已更新，请刷新后重新保存，当前草稿仍保留');
      const parsed=editableSchema.parse({expectedRevision,teams,cases});validateRelations(parsed.teams,parsed.cases as LabCase[]);
      const versioned=<T extends {id:string;version:number}>(next:T[],old:T[])=>next.map(item=>{const before=old.find(o=>o.id===item.id);const unchanged=before&&isDeepStrictEqual({...item,version:0},{...before,version:0});return {...item,version:before?(unchanged?before.version:before.version+1):1};});
      for(const team of parsed.teams){const before=state.teams.find(t=>t.id===team.id);if(before){team.members=versioned(team.members,before.members);team.tasks=versioned(team.tasks,before.tasks);team.evidence=versioned(team.evidence,before.evidence);}}
      parsed.cases=versioned(parsed.cases,state.cases);
      persist({...state,revision:state.revision+1,teams:structuredClone(parsed.teams),cases:structuredClone(parsed.cases) as LabCase[]});return structuredClone(state);
    },
    updateRuns(change:(runs:LabState['runs'])=>void){const next=structuredClone(state);change(next.runs);next.revision++;persist(next);return structuredClone(state);},
  };
}
export type LabStore=ReturnType<typeof createLabStore>;
