import test from "node:test";
import assert from "node:assert/strict";
import { allTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { getTaskProgressDemoExample } from "../src/data/taskProgressDemo.ts";
import { recalculateTaskProgressPrediction, progressPredictionInputKey, readProgressPredictions } from "../src/lib/taskProgressPrediction.ts";
import { getTaskProgressDisplay } from "../src/lib/taskProgressDisplay.ts";
import { getTaskProgressComparison, getTaskProgressChart } from "../src/lib/taskProgressComparison.ts";
import { updateWorkspaceTaskStatus } from "../src/lib/workspaceTaskUpdates.ts";
import { getWorkspaceEffortLeaves } from "../src/lib/taskEffortEditing.ts";
import { rollupProgressForecast, rollupProgressHistory } from "../src/data/taskProgressHistory.ts";

const id = "ccx-double11-assortment-gate";
test("完成后重开立即恢复原 AI 预测，手动核对成功且不伪造新交付", () => {
  let nodes = updateWorkspaceTaskStatus(allTeamWorkspaceNodes, id, "已完成");
  const series = getTaskProgressDemoExample(id)!;
  assert.equal(getTaskProgressDisplay({series,task:nodes.find(n=>n.id===id)}).ratio,1);
  nodes = updateWorkspaceTaskStatus(nodes,id,"进行中");
  const display = getTaskProgressDisplay({series,task:nodes.find(n=>n.id===id)});
  assert.equal(display.ratio,0);
  assert.equal(display.forecastOn,series.timing.forecastOn);
  assert.notEqual(display.timeStatus,"需重新预测");
  const result = recalculateTaskProgressPrediction({nodes,taskId:id,getSeries:getTaskProgressDemoExample});
  assert.deepEqual(result.series,series);
  assert.ok(result.checkedAt);
  assert.equal(readProgressPredictions({[id]:result})[id].checkedAt,result.checkedAt);
});
test("重开不能把旧用户确认冒充 AI 100%，独立 AI 记录仍为原比例", () => {
  const series = getTaskProgressDemoExample("weekly-retro-actions")!;
  const original=structuredClone(series);
  const last=series.workload.at(-1)!;
  last.completedMinutes=last.scopeMinutes;
  series.timing.completedOn=series.asOf;
  const display=getTaskProgressDisplay({series,task:{status:"进行中",progressReopenedAt:"2026-09-16T10:00:00+08:00"}});
  assert.equal(display.ratio,.5);
  assert.equal(display.aiAssessment?.observedAt,original.aiAssessment?.observedAt);
  assert.equal(display.forecastOn,original.timing.forecastOn);
});
test("子任务完成后重新汇总父任务，保留未完成项的未来预测", () => {
  const original=recalculateTaskProgressPrediction({nodes:allTeamWorkspaceNodes,taskId:"ccx-serum-launch",getSeries:getTaskProgressDemoExample});
  const leaf=allTeamWorkspaceNodes.find(n=>n.kind==="task"&&n.parentTaskId==="ccx-serum-launch")!;
  const nodes=updateWorkspaceTaskStatus(allTeamWorkspaceNodes,leaf.id,"已完成");
  const result=recalculateTaskProgressPrediction({nodes,taskId:"ccx-serum-launch",getSeries:getTaskProgressDemoExample});
  const model=getTaskProgressComparison(result.series)!;
  assert.ok(model.actualRatio>=getTaskProgressComparison(original.series)!.actualRatio);
  assert.ok(model.forecastOn);
  assert.ok(getTaskProgressChart(model).forecastPath);
  assert.notEqual(result.inputKey,original.inputKey);
});
test("子项今天确认完成，不抹掉其他子项今天到期的预测或父任务未来趋势", () => {
  const parentId = "ccx-serum-launch", leafId = "ccx-serum-contract-close";
  const original = recalculateTaskProgressPrediction({nodes:allTeamWorkspaceNodes,taskId:parentId,getSeries:getTaskProgressDemoExample});
  const before = getTaskProgressComparison(original.series)!;
  const leaf = getTaskProgressComparison(getTaskProgressDemoExample(leafId))!;
  const nodes = allTeamWorkspaceNodes.map(node => node.id === leafId && node.kind === "task"
    ? {...node,status:"已完成",completedAt:"2026-09-16T10:00:00+08:00"} : node);
  const result = recalculateTaskProgressPrediction({nodes,taskId:parentId,getSeries:getTaskProgressDemoExample});
  const after = getTaskProgressComparison(result.series)!;
  assert.equal(after.latest.completedMinutes, before.latest.completedMinutes + leaf.latest.scopeMinutes - leaf.latest.completedMinutes);
  assert.equal(after.forecastOn,"2026-09-21");
  assert.ok(getTaskProgressChart(after).forecastPath);
  assert.ok(after.forecastPoints.every(point => point.at > "2026-09-16"));
  assert.equal(after.forecastPoints.at(-1)?.completedMinutes,after.latest.scopeMinutes);
  const leaves = getWorkspaceEffortLeaves(nodes,parentId).map(task => getTaskProgressDisplay({task,series:getTaskProgressDemoExample(task.id)}).historySeries!);
  const latest = rollupProgressHistory(leaves,"confirmation").at(-1)!;
  const trend = rollupProgressForecast(leaves,latest);
  assert.ok(trend);
  assert.equal(trend.startMinutes,after.latest.completedMinutes);
  assert.equal(trend.points.at(-1)?.completedMinutes,latest.scopeMinutes);
});
test("截止更改不让已有结果失效，状态及证据变更阻止旧结果覆盖",()=>{
  const before=progressPredictionInputKey(allTeamWorkspaceNodes,id);
  assert.equal(progressPredictionInputKey(allTeamWorkspaceNodes.map(n=>n.id===id?{...n,plannedEndOn:"2026-10-10"}:n),id),before);
  assert.notEqual(progressPredictionInputKey(updateWorkspaceTaskStatus(allTeamWorkspaceNodes,id,"已完成"),id),before);
});
test("缺数据和范围变化返回明确失败，不能用点击重试编造预测",()=>{
  assert.throws(()=>recalculateTaskProgressPrediction({nodes:allTeamWorkspaceNodes,taskId:id,getSeries:()=>undefined}),/尚无工作量评估依据/);
  const changed=allTeamWorkspaceNodes.map(n=>n.id===id&&n.kind==="task"?{...n,effortEstimate:{...n.effortEstimate!,minutes:999}}:n);
  assert.throws(()=>recalculateTaskProgressPrediction({nodes:changed,taskId:id,getSeries:getTaskProgressDemoExample}),/工作范围已变化/);
  assert.deepEqual(readProgressPredictions({bad:{inputKey:"x",checkedAt:"2026-09-16",series:{source:"example",workload:[null]}}}),{});
});
