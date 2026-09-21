import React from "react";
import { Info, RefreshCw } from "lucide-react";
import cases from "../../docs/product-v2/progress-scenarios.json";
import { TaskProgressComparison } from "../components/TaskProgressComparison";
import { TaskEffortCost } from "../components/TaskEffortCost";
import { scenarioPresentation, scenarioChildren } from "./progressScenarioFixtures";
import { TaskBurnUpSparkline } from "../components/TaskBurnUpSparkline";
import { TaskProgressOverview } from "../components/TaskProgressOverview";
import { getTaskEffortBaselineSeries } from "../lib/taskEffortBaseline";
import { getTaskProgressAssessment } from "../lib/taskProgressAssessment";

type Scenario = (typeof cases)[number];

export function ProgressComponentSample({scenario, onSimulate}: {scenario:Scenario; onSimulate:(id:string)=>void}) {
  const preview=scenarioPresentation(scenario.fixture);
  const children=scenarioChildren(scenario.fixture, preview);
  const error=scenario.fixture === "failed" || scenario.fixture === "failed-stale";
  const headingAction = !["已完成", "已取消"].includes(preview.task.status ?? "") ? <button className="task-progress-refresh" type="button" title="演示重新预测过程" onClick={()=>onSimulate("P24")}><RefreshCw size={13} aria-hidden="true"/>重新预测</button> : undefined;
  const breakdown = <TaskEffortCost tasks={children.tasks} progressComparisonsByTaskId={children.comparisons} progressPresentationByTaskId={children.presentations} comparisonAsOf={preview.model.asOf} mode="example" presentation="summary" showDistribution defaultExpanded={false}/>;
  const baseline = scenario.fixture === "no-current"
    ? getTaskEffortBaselineSeries(children.tasks.map(task => ({...task,createdAt:preview.model.startOn ?? preview.model.asOf})),preview.model.asOf) : undefined;
  return <section className="prd-state-sample task-situation-trend" aria-label="完整任务进度组件预览">
    {scenario.fixture === "no-access" ? <p className="prd-state-permission">无权查看进度</p>
      : scenario.fixture === "loading" ? <div className="prd-state-loading" role="status" aria-busy="true"><span>正在获取进度</span><i/><i/><span>子任务进度</span><i/><span>燃起图</span><i className="prd-chart-skeleton"/></div>
      : baseline ? <TaskBurnUpSparkline assessment={getTaskProgressAssessment(baseline,children.tasks)} timing={preview.model}
          progress={<><div className="task-burnup-heading"><span>完成进度</span><details className="task-progress-help"><summary aria-label="完成进度说明"><Info aria-hidden="true" size={14}/></summary><p>完成进度＝AI 预测完成量 ÷ 总工作量 × 100%。标记「已完成」后显示 100% · 用户确认。</p></details>{headingAction}</div><TaskProgressOverview model={preview.model} showSchedule={false}/>{breakdown}</>}/>
      : <TaskProgressComparison series={preview.series} progressTask={preview.task}
          headingAction={headingAction}
          presentation={{display:preview.model,overview:{emptyExpectedLabel:preview.emptyExpectedLabel,emptyComparisonLabel:null,observationLabel:preview.observationLabel},historyEmpty:preview.historyEmpty,historyLabel:preview.historyLabel}}
          breakdown={breakdown}
        />}
    {scenario.notice && <div className="prd-state-notice" data-tone={error ? "error" : "neutral"} role={error ? "alert" : "status"}>{scenario.notice}{error && <button type="button" onClick={()=>onSimulate(scenario.fixture === "failed-stale" ? "P24" : "P23")}>重试</button>}</div>}
  </section>;
}
