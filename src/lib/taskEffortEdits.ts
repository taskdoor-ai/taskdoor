import { createManualEffortEstimate, getTaskEffortState, type TaskEffortEstimate, type TaskEffortTask } from './taskEffort';
import { getTaskEffortEditSignature } from './taskEffortEditing';
import { getCreationEffortLeaves } from './taskCreationEffort';
import type { CreationForm } from './taskCreationForm';

export type TaskEffortEdit = { taskId: string; estimate: TaskEffortEstimate; expectedSignature: string };
export type EditableEffortTask = TaskEffortTask & { id: string; title?: string };

/** Largest remainders preserve the exact requested total at integer-minute precision. */
export function distributeTaskEffortTotal(tasks: readonly EditableEffortTask[], total: number): TaskEffortEdit[] {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('请填写有效的非负工时。');
  if (!tasks.length || new Set(tasks.map(task=>task.id)).size !== tasks.length) throw new Error('任务范围已变化，请重新打开。');
  if (tasks.some(task=>!['proposed','confirmed'].includes(getTaskEffortState(task)))) throw new Error('请先补全或复核子任务估算，再调整总投入。');
  const weights=tasks.map(task=>BigInt(task.effortEstimate!.minutes!));
  let sum=weights.reduce((a,b)=>a+b,0n);
  const wasZero=sum===0n;
  if (wasZero) { weights.fill(1n); sum=BigInt(tasks.length); }
  const shares=weights.map((weight,index)=>({index,minutes:Number(BigInt(total)*weight/sum),remainder:BigInt(total)*weight%sum}));
  const remainder=total-shares.reduce((sum,share)=>sum+share.minutes,0);
  [...shares].sort((a,b)=>a.remainder===b.remainder ? a.index-b.index : a.remainder>b.remainder ? -1 : 1).slice(0,remainder).forEach(share=>share.minutes++);
  return tasks.map((task,index)=>({taskId:task.id,expectedSignature:getTaskEffortEditSignature(task),estimate:createManualEffortEstimate(task,{
    minutes:shares[index].minutes,workMethod:task.effortEstimate!.workMethod,
    reason:`用户调整主任务总投入，按原子任务工时比例分配${wasZero ? '（原总量为零时均分）' : ''}。`,
  },task.effortEstimate)}));
}

export function applyTaskEffortEdits<T extends EditableEffortTask>(tasks: readonly T[], edits: readonly TaskEffortEdit[]): T[] {
  if (new Set(edits.map(edit=>edit.taskId)).size !== edits.length) throw new Error('任务修改重复，请重新打开。');
  for (const edit of edits) {
    const task=tasks.find(task=>task.id===edit.taskId);
    if (!task || getTaskEffortEditSignature(task)!==edit.expectedSignature) throw new Error('任务范围或估算已有变化，请重新打开后修改。');
    const verified=createManualEffortEstimate(task,edit.estimate,task.effortEstimate);
    if (JSON.stringify(verified)!==JSON.stringify(edit.estimate)) throw new Error('估算与当前范围或版本不一致，请重新核对。');
  }
  return tasks.map(task=>{ const edit=edits.find(edit=>edit.taskId===task.id); return edit ? {...task,effortEstimate:edit.estimate} : task; });
}

export function applyCreationEffortEdits(form: CreationForm, edits: readonly TaskEffortEdit[]): CreationForm {
  const leaves=getCreationEffortLeaves(form).map(task=>({...task,id:task.clientId}));
  const updated=new Map(applyTaskEffortEdits(leaves,edits).map(task=>[task.clientId,task.effortEstimate]));
  return {...form,mainTask:form.subtasks.length ? form.mainTask : {...form.mainTask,effortEstimate:updated.get(form.mainTask.clientId)},
    subtasks:form.subtasks.map(task=>updated.has(task.clientId) ? {...task,effortEstimate:updated.get(task.clientId)} : task)};
}
