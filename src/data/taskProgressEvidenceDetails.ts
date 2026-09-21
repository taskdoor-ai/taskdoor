import records from "./taskProgressDemoRecords.json";
import type { TaskDetailMock } from "./taskDetailMocks";
import type { TaskNode } from "./workspaceNodes";

/** Attach the same authored evidence used by the Demo prediction to its task detail. */
export function withDemoProgressEvidence(task: TaskNode, detail: TaskDetailMock): TaskDetailMock {
  if (!Object.hasOwn(records,task.id) || task.teamId === undefined) return detail;
  const record=records[task.id as keyof typeof records];
  const id=`${task.id}-progress-evidence-v1`;
  if (detail.activities.some(activity=>activity.id === id)) return detail;
  const time=`${record.observedAt.slice(0,10)} ${record.observedAt.slice(11,16)}`;
  const fileName="进展核对记录.md";
  const timingBasis="timingBasis" in record ? record.timingBasis : undefined;
  const forecastOn="forecastOn" in record ? record.forecastOn : undefined;
  const timingContent=timingBasis ? `\n## 完工时间预测\n\n${forecastOn ? `AI 预测完成：${forecastOn}\n\n` : ""}${timingBasis}\n` : "";
  return {...detail,
    activities:[...detail.activities,{id,author:record.actor,type:"member-post",createdAt:record.observedAt,time,message:record.basis,file:fileName}],
    files:[...detail.files,{id,name:fileName,kind:"file",parentId:null,format:"MD",version:1,updatedAt:time,
      content:`# ${task.name} · 进展核对\n\n记录时间：${time}\n\n${record.basis}\n${timingContent}`}],
  };
}
