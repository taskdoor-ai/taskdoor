import type {TaskNode} from "./workspaceNodes";
import {getEffortScopeKey} from "../lib/taskEffort";

export const residentDeletionDemoRootId = "demo-autumn-creator-event";
const goal = "完成秋季新品达人专场的合作确认、内容准备和开播检查。";
const createdAt = "2026-09-16T09:00:00+08:00";

/** A separate mock family for reviewing cascading deletion; no live task is repurposed. */
export const residentDeletionDemoTasks: TaskNode[] = [
  {id:residentDeletionDemoRootId,name:"筹备秋季新品达人专场",ownerId:"周岚",status:"进行中" as const,minutes:660,criteria:"达人、内容与开播准备均通过核对。"},
  {id:`${residentDeletionDemoRootId}-creators`,name:"确认达人名单与合作档期",ownerId:"林洁",status:"已完成" as const,minutes:180,criteria:"合作达人名单与档期已确认。"},
  {id:`${residentDeletionDemoRootId}-content`,name:"准备专场脚本与商品素材",ownerId:"陈默",status:"进行中" as const,minutes:300,criteria:"脚本和商品素材核对完成，可用于直播。"},
  {id:`${residentDeletionDemoRootId}-launch`,name:"核对库存与开播安排",ownerId:"周岚",status:"待开始" as const,minutes:180,criteria:"库存、优惠与开播人员安排已确认。"},
].map(({minutes,criteria,...task})=>{
  const scope={goal,completionCriteria:[criteria],executionTips:[]};
  const workMethod="AI 辅助整理资料，成员核对业务安排与交付结果";
  const scopeKey=getEffortScopeKey(scope,workMethod);
  return {...task,...scope,kind:"task",parentId:"workspace-root",teamId:"creator-commerce",
    ...(task.id!==residentDeletionDemoRootId ? {parentTaskId:residentDeletionDemoRootId} : {}),
    participantIds:["周岚"],labels:["直播执行"],iconName:"clipboard-check",iconTone:"blue",
    createdAt,createdBy:"周岚",updatedAt:createdAt,plannedEndOn:"2026-09-22",dueAt:"9 月 22 日",
    ...(task.status==="已完成" ? {completedAt:"2026-09-16T10:00:00+08:00",updatedAt:"2026-09-16T10:00:00+08:00"} : {}),
    effortEstimate:{minutes,workMethod,basis:"mock",reason:"演示专场各项准备工作的人工投入，不含等待回复。",confirmed:false,scopeKey,version:1},
    effortBaseline:{at:createdAt,minutes,scopeKey,version:1},
  };
});
