import type {LabCase,SkillId} from '@/test-lab/types';

/** Group by the saved operation, never by words such as “拆解” in a prompt. */
export function caseGroupingProblem(item:LabCase):string|null{
  if(!item.steps.length)return '用例没有步骤，请补齐后选择所属 Skill。';
  const skill=item.steps[0].skillId;
  if(item.steps.some(step=>step.skillId!==skill))return '同一用例包含不同 Skill，请拆成独立用例，分别保留输入与验收标准。';
  if(skill==='agentdoor-task-planner'&&item.steps.some(step=>!!step.taskId))return '创建任务用例不能绑定已保存任务；已有任务拆解请使用独立子任务 Skill。';
  if(skill==='taskdoor-decompose-task'&&item.steps.some(step=>!step.taskId))return '子任务拆解用例必须为每一步选择已保存任务。';
  return null;
}

export function caseSkillGroup(item:LabCase):SkillId|null{
  return caseGroupingProblem(item)?null:item.steps[0].skillId;
}

export function caseMatchesSkillGroup(item:LabCase,skillId:string){
  return caseSkillGroup(item)===skillId;
}
