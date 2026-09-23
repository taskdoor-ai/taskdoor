import type {LabState} from '../../src/test-lab/types.ts';
export function migrateFreshCreation(state:LabState):boolean{
 if(state.freshCreationVersion===1)return false;
 for(const c of state.cases){
  if(!c.steps.every(s=>s.skillId==='agentdoor-task-planner'))continue;
  const basic=c.origin==='decomposition/2026-09'||['benchmark-single','benchmark-decompose','benchmark-unassigned'].includes(c.id);
  if(!basic){c.archived=true;continue;}
  c.creationContext='fresh';c.version++;
  c.description='基础创建测试：只提供本次需求和当前团队成员责任，不加载历史任务、讨论、文件或活动。\n'+c.description;
  if(c.verification){c.verification.fixtureChecks=c.verification.fixtureChecks.filter(r=>r.subject==='member');c.verification.preconditions=['在空任务沙箱中创建，仅使用本次需求及当前团队成员责任。'];}
  for(const s of c.steps){s.taskId=null;s.events=[];s.prompt=s.prompt.replace(/这是“([^”]+)”的新一期内部交接演练，尚无对应演练任务；已有项目成果只作参考，不能当成本期演练已完成。/,'这是“$1”的新建交接演练需求，本次从空任务沙箱开始。');}
 }
 state.freshCreationVersion=1;return true;
}
