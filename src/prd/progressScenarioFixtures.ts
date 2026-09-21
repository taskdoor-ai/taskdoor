import type { ComponentProps } from "react";
import type { TaskProgressOverview } from "../components/TaskProgressOverview";
import { taskProgressComparisonExamples } from "../data/taskProgressComparisonExamples";
import { getTaskProgressDisplay, type TaskProgressContext } from "../lib/taskProgressDisplay";
import { getEffortScopeKey } from "../lib/taskEffort";
import type { TaskEffortDistributionInput } from "../lib/taskEffortDistribution";
import type { TaskProgressComparisonSeries } from "../lib/taskProgressComparison";

// PRD fixtures and copy are isolated from the Demo's actual data and default presentation.
export function scenarioPresentation(fixture: string) {
  const baseId = ["on-track","ahead","behind","catching-up","rework","not-started"].includes(fixture) ? fixture
    : fixture === "blocked" ? "stalled" : fixture === "ahead-delayed" ? "ahead" : "on-track";
  const series = structuredClone(taskProgressComparisonExamples.find(item=>item.id === baseId)!);
  if (fixture === "ahead-delayed") {
    series.timing.forecastOn="2026-09-20";
    series.forecastTrend={asOf:series.asOf,scopeVersion:"scope-100",startMinutes:1728,points:[
      {at:"2026-09-15",completedMinutes:2160,note:"演示预测节点：主要交付核对完成，等待外部确认。"},
      {at:"2026-09-18",completedMinutes:2160,note:"演示预测节点：等待外部反馈，完成量保持不变。"},
      {at:"2026-09-20",completedMinutes:2400,note:"演示预测节点：取得反馈后收口剩余核对。"},
    ]};
  }
  const status = fixture === "done" || fixture === "done-no-date" ? "已完成" : fixture === "cancelled" ? "已取消" : fixture === "not-started" || fixture === "status-conflict" ? "待开始" : fixture === "blocked" ? "已阻塞" : "进行中";
  if (fixture === "ai-complete") {
    series.workload.at(-1)!.completedMinutes = series.workload.at(-1)!.scopeMinutes;
    series.workload.at(-1)!.note = "AI 预测覆盖全部交付，等待用户确认";
  }
  if (fixture === "scope-changed") {
    Object.assign(series.workload.at(-1)!, {scopeMinutes:3000,scopeVersion:"scope-new",note:"新增 600 分钟工作范围；已记录完成量保留，评估与计划待更新"});
  }
  const task: TaskProgressContext = {status,...(fixture === "done" ? {completedAt:"2026-09-13T12:00:00+08:00"} : {}),
    ...(fixture === "reopened" ? {progressReopenedAt:"2026-09-14T10:00:00+08:00"} : {}),
    ...(fixture === "plan-changed" ? {plannedEndOn:"2026-09-20"} : {})};
  let model = getTaskProgressDisplay({series,task});
  let emptyExpectedLabel: string | null = null;
  let observationLabel = "当前";
  const clearExpected = (copy: string | null = null) => {
    model={...model,expectedRatio:null,expectedMinutes:null,deltaMinutes:null,relation:"unknown"};
    emptyExpectedLabel=copy;
  };
  const clearForecast = (copy: string) => {
    model={...model,forecastOn:null,finishOn:null,deltaDays:null,timeTone:"unknown",timeStatus:copy};
  };
  const clearCurrent = (copy: string) => { model={...model,ratio:null,currentMinutes:null,deltaMinutes:null,relation:"unknown",sourceLabel:copy}; };
  switch(fixture) {
    case "overdue": clearForecast("已逾期 2 天"); model={...model,dueOn:"2026-09-11",timeTone:"behind"}; break;
    case "ahead-delayed": model={...model,forecastOn:"2026-09-20",finishOn:"2026-09-20",deltaDays:2,timeTone:"behind",timeStatus:"预计延期 2 天"}; break;
    case "blocked": clearForecast("恢复时间未明确"); break;
    case "done-no-date": model={...model,completedOn:null}; clearForecast("完成日期未记录"); break;
    case "cancelled": clearExpected(); clearForecast("已取消"); break;
    case "reopened": clearExpected(); break;
    case "no-current": clearCurrent("尚无进度预测"); clearForecast(""); break;
    case "no-baseline": clearExpected(); clearForecast(""); model={...model,startOn:null}; break;
    case "no-forecast": clearForecast(""); break;
    case "no-due": model={...model,dueOn:null,deltaDays:null,timeTone:"unknown",timeStatus:"未设计划结束时间"}; break;
    case "plan-changed": clearExpected(); break;
    case "scope-changed": clearCurrent("范围已变化"); clearExpected(); clearForecast("范围已变化，需重新预测"); model={...model,total:3000}; break;
    case "stale": model={...model,sourceLabel:"上次 AI 预测"}; clearExpected(); clearForecast("上次预测已过期"); observationLabel="截至"; break;
    case "partial": clearCurrent("部分数据不可用"); clearExpected(); clearForecast("信息不足，暂无法预测"); model={...model,total:null}; break;
    case "updating": case "failed-stale": model={...model,sourceLabel:"上次 AI 预测",deltaMinutes:null,timeStatus:fixture === "updating" ? "上次预计按期" : "上次预测未更新"}; observationLabel="截至"; break;
    case "ai-complete": model={...model,ratio:1,currentMinutes:model.total,deltaMinutes:model.total! - model.expectedMinutes!,relation:"ahead",sourceLabel:"AI 预测"}; clearForecast("等待完成确认"); break;
    case "empty": clearCurrent("尚无进度数据"); clearExpected(); clearForecast("信息不足，暂无法预测"); model={...model,total:null}; break;
    case "failed": clearCurrent("进度获取失败"); clearExpected(); clearForecast("暂无法获取预测"); break;
  }
  if (["empty", "no-current", "failed"].includes(fixture)) {
    delete series.aiAssessment;
    model={...model,aiAssessment:null};
  }
  clearExpected();
  // The overview and burn-up use the same saved observation; unknown current values
  // may retain historical records, but never add an invented completion snapshot.
  const historyEmpty = fixture === "empty" || fixture === "no-current" ? "尚无工作量记录"
    : fixture === "failed" ? "工作量记录获取失败，请重试"
    : fixture === "partial" ? "部分数据不可用，暂无法汇总工作量历史" : undefined;
  const historyLabel = ["scope-changed", "stale", "updating", "failed-stale"].includes(fixture) ? "上次记录" : fixture === "cancelled" ? "取消时" : fixture === "done-no-date" ? "上次 AI 预测" : undefined;
  return {model,series,task,emptyExpectedLabel,observationLabel,historyEmpty,historyLabel};
}


const shiftDay = (date: string, days: number) => new Date(Date.parse(date) + days * 86400000).toISOString().slice(0,10);

/** Each visible leaf owns its status, assessment, plan and dates. The allocated
 * minute snapshots add up to the parent, including scope increases and rework. */
export function scenarioChildren(fixture: string, parent = scenarioPresentation(fixture)) {
  const shares = [.5,.3,.2];
  const titles = ["整理内容与交付初稿", "核对资料与补充修订", "确认结果与完成交付"];
  const tasks: TaskEffortDistributionInput[] = [];
  const comparisons: Record<string, TaskProgressComparisonSeries> = {};
  const presentations: Record<string, ComponentProps<typeof TaskProgressOverview>> = {};
  const partial = fixture === "partial";
  const reference = partial || ["done", "done-no-date"].includes(fixture) ? scenarioPresentation("on-track") : parent;
  const total = reference.series.workload.at(-1)!.scopeMinutes;
  const current = reference.model.currentMinutes;
  const expected = null;
  const allocated = (amount: number, scope: number, index: number) => Math.max(0,Math.min(Math.round(scope * shares[index]), amount - Math.round(scope * shares.slice(0,index).reduce((sum,value)=>sum+value,0))));
  for (let index=0; index<(partial ? 1 : 3); index++) {
    const id=`scene-child-${index}`;
    const minutes=Math.round(total*shares[index]);
    const amount=current === null ? null : partial ? Math.round(minutes*.6) : allocated(current,total,index);
    const expectedAmount=expected === null ? null : partial ? Math.round(minutes*.6) : allocated(expected,total,index);
    const aiComplete=fixture === "ai-complete";
    const status = fixture === "cancelled" ? "已取消" : fixture === "status-conflict" ? "待开始"
      : amount === minutes && !aiComplete ? "已完成" : amount === 0 ? "待开始" : fixture === "blocked" ? "已阻塞" : "进行中";
    const completedAt=status === "已完成" && fixture !== "done-no-date" ? `${parent.model.asOf}T12:00:00+08:00` : undefined;
    const offset=[-4,-1,0][index];
    const series: TaskProgressComparisonSeries = {
      ...structuredClone(reference.series),
      creation:reference.series.creation ? {...reference.series.creation,scopeMinutes:Math.round(reference.series.creation.scopeMinutes*shares[index])} : undefined,
      // Compact child timelines have independent dates, not the parent's workload trend.
      forecastTrend:undefined,
      workload: reference.series.workload.map(row=>({...row,scopeMinutes:Math.round(row.scopeMinutes*shares[index]),completedMinutes:partial ? Math.round(row.completedMinutes*shares[index]) : allocated(row.completedMinutes,row.scopeMinutes,index)})),
      expected:{...reference.series.expected,points:reference.series.expected.points.map(row=>({...row,completedMinutes:partial ? Math.round(row.completedMinutes*shares[index]) : allocated(row.completedMinutes,total,index)}))},
      timing:{...reference.series.timing,completedOn:undefined,dueOn:reference.model.dueOn ? shiftDay(reference.model.dueOn,offset) : null,
        forecastOn:reference.model.forecastOn ? [shiftDay(reference.model.forecastOn,offset),shiftDay(reference.model.asOf,1)].sort().at(-1)! : null},
    };
    series.aiAssessment = reference.series.aiAssessment ? {
      ...reference.series.aiAssessment, scopeMinutes:minutes,
      completedMinutes:status === "已完成" ? Math.round(minutes * .8) : series.workload.at(-1)!.completedMinutes,
      basis:`示例：${titles[index]}${status === "已完成" ? "已形成初稿，最终核对尚未完成" : "依据本项交付内容核对完成标准"}。`,
    } : undefined;
    const task: TaskProgressContext = {status,completedAt};
    let model=getTaskProgressDisplay({series,task});
    const scopeUnknown=parent.model.total === null && !partial;
    const childTotal=scopeUnknown ? null : fixture === "scope-changed" ? Math.round(parent.model.total!*shares[index]) : minutes;
    const delta=amount === null || expectedAmount === null || reference.model.deltaMinutes === null ? null : amount-expectedAmount;
    model={...model,total:childTotal,currentMinutes:amount,ratio:amount === null || !childTotal ? null : amount/childTotal,
      expectedMinutes:expectedAmount,expectedRatio:expectedAmount === null || !childTotal ? null : expectedAmount/childTotal,
      deltaMinutes:delta,relation:delta === null ? "unknown" : delta > 0 ? "ahead" : delta < 0 ? "behind" : "on-track"};
    if (!partial && status !== "已完成" && (amount === null || ["stale","updating","failed-stale","status-conflict","ai-complete"].includes(fixture))) model={...model,sourceLabel:parent.model.sourceLabel};
    if (!partial && !parent.model.finishOn && !model.completedOn) model={...model,forecastOn:null,finishOn:model.completedOn,deltaDays:null,timeTone:"unknown",timeStatus:parent.model.timeStatus};
    if (fixture === "done-no-date") model={...model,completedOn:null,finishOn:null};
    if (fixture === "cancelled") model={...model,cancelled:true};
    const scope={goal:titles[index],completionCriteria:["交付结果通过核对"],executionTips:[]};
    const workMethod="AI 整理，人工核对";
    tasks.push({id,title:titles[index],...scope,...task,...(childTotal === null ? {} : {effortEstimate:{minutes:childTotal,workMethod,basis:"mock",reason:"PRD 场景固定数据",confirmed:false,scopeKey:getEffortScopeKey(scope,workMethod),version:1}})});
    comparisons[id]=series;
    presentations[id]={model,compact:true,emptyComparisonLabel:null,emptyExpectedLabel:partial ? null : parent.emptyExpectedLabel,observationLabel:parent.observationLabel};
  }
  return {tasks,comparisons,presentations};
}
