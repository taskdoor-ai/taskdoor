import test from "node:test";
import assert from "node:assert/strict";
import { allTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { getTaskProgressDemoExample, getTaskProgressDemoEvidence } from "../src/data/taskProgressDemo.ts";
import { getTaskProgressComparison } from "../src/lib/taskProgressComparison.ts";
import { getTaskProgressDisplay } from "../src/lib/taskProgressDisplay.ts";
import { createWorkspaceTaskDetail } from "../src/data/taskDetailMocks.ts";

const tasks=allTeamWorkspaceNodes.filter(task=>task.kind === "task");
const unknown=["unassigned-live-backup-plan","unassigned-attribution-dictionary","platform-daily-production-triage","supply-daily-shortage-standup"];
test("所有已配置 Demo 快照有效，缺失保留明确边界，不为新增任务套预测",()=>{
  assert.deepEqual(tasks.filter(task=>!getTaskProgressDemoExample(task.id)).map(task=>task.id).sort(),unknown.sort());
  for(const task of tasks){
    const series=getTaskProgressDemoExample(task.id);if(!series)continue;
    const model=getTaskProgressComparison(series);
    assert.ok(model,task.id);assert.equal(model.expectedRatio,null,task.id);
    assert.ok(model.latest.completedMinutes<=model.latest.scopeMinutes,task.id);
    if(model.forecastOn)assert.ok(model.forecastOn>series.asOf,task.id);
  }
  assert.equal(getTaskProgressDemoExample("new-user-task"),undefined);
  assert.equal(getTaskProgressDemoExample("constructor"),undefined);
});
test("叶子预测依据与任务里的核对记录一致，状态不是百分比映射",()=>{
  for(const task of tasks){
    const record=getTaskProgressDemoEvidence(task.id);if(!record)continue;
    const detail=createWorkspaceTaskDetail(task);
    assert.ok(detail.activities.some(activity=>activity.message===record.basis),task.id);
  }
  const task=tasks.find(task=>task.id === "unassigned-short-video-covers")!;
  const series=getTaskProgressDemoExample(task.id)!;
  const before=structuredClone(series);
  assert.equal(getTaskProgressDisplay({series,task}).ratio,.25);
  assert.equal(getTaskProgressDisplay({series,task:{...task,status:"进行中"}}).ratio,.25);
  assert.equal(getTaskProgressDisplay({series,task:{...task,status:"已完成",completedAt:"2026-09-15T10:00:00+08:00"}}).ratio,1);
  assert.equal(getTaskProgressDisplay({series,task:{...task,status:"进行中",progressReopenedAt:"2026-09-15T10:01:00+08:00"}}).ratio,.25);
  assert.deepEqual(series,before);
});
test("多级父任务工作量与叶子快照一致，缺少任一完工依据则不拼父级日期",()=>{
  for(const parent of tasks.filter(task=>tasks.some(child=>child.parentTaskId===task.id))){
    const children=tasks.filter(child=>child.parentTaskId===parent.id);
    const models=children.map(child=>getTaskProgressComparison(getTaskProgressDemoExample(child.id))!);
    const model=getTaskProgressComparison(getTaskProgressDemoExample(parent.id))!;
    assert.equal(model.latest.scopeMinutes,models.reduce((sum,child)=>sum+child.latest.scopeMinutes,0),parent.id);
    assert.equal(model.latest.completedMinutes,models.reduce((sum,child)=>sum+child.latest.completedMinutes,0),parent.id);
  }
  assert.equal(getTaskProgressComparison(getTaskProgressDemoExample("fragrance-creator-wrapup"))?.forecastOn,null);
  assert.equal(getTaskProgressComparison(getTaskProgressDemoExample("product-launch-planning"))?.forecastOn,"2026-09-18");
  const blocked=tasks.find(task=>task.id === "platform-security-gate")!;
  const display=getTaskProgressDisplay({series:getTaskProgressDemoExample(blocked.id),task:blocked});
  assert.equal(display.ratio,.4);assert.equal(display.forecastOn,null);
});
test("待开始父任务仍保留子任务汇总来源，取出的样例不能污染后续显示",()=>{
  const task=tasks.find(task=>task.id === "ccx-double11-presale")!;
  const series=getTaskProgressDemoExample(task.id)!;
  const display=getTaskProgressDisplay({task,series,completedMinutes:0,sourceLabel:"子任务汇总"});
  assert.equal(display.sourceLabel,"子任务汇总");assert.equal(display.ratio,0);
  series.workload[0].completedMinutes=99999;
  assert.equal(getTaskProgressDemoExample(task.id)!.workload[0].completedMinutes,0);
});

test("常规 Demo 补齐独立完工日期，缺失仅限明确场景且不早于前置任务",()=>{
  const unresolved=new Set(["fragrance-live","platform-security-gate","ccx-extreme-claim-incident","supply-incident-lockbody-rust"]);
  for(const task of tasks){
    const record=getTaskProgressDemoEvidence(task.id);
    if(record?.kind === "prediction") {
      if(unresolved.has(task.id) || task.status === "已取消") {
        assert.equal(record.forecastOn,undefined,task.id);
        assert.match(record.timingBasis!,/演示缺失场景|演示取消场景/,task.id);
      } else {
        assert.ok(record.forecastOn && record.forecastOn > record.observedAt.slice(0,10),task.id);
        assert.ok(record.timingBasis?.trim(),task.id);
        const detail=createWorkspaceTaskDetail(task);
        assert.ok(detail.files.some(file=>file.content?.includes(record.timingBasis!)),task.id);
      }
    }
    const display=getTaskProgressDisplay({task,series:getTaskProgressDemoExample(task.id)});
    if(!display.forecastOn)continue;
    for(const dependencyId of task.dependsOnTaskIds ?? []) {
      const dependency=tasks.find(item=>item.id===dependencyId)!;
      if(dependency.status === "已完成")continue;
      const previous=getTaskProgressDisplay({task:dependency,series:getTaskProgressDemoExample(dependencyId)});
      assert.ok(previous.forecastOn && previous.forecastOn <= display.forecastOn,`${task.id} / ${dependencyId}`);
    }
  }
  const stock=tasks.find(task=>task.id==="unassigned-gift-stock-check")!;
  const display=getTaskProgressDisplay({task:stock,series:getTaskProgressDemoExample(stock.id)});
  assert.equal(stock.status,"待开始");assert.equal(stock.ownerId,"");
  assert.equal(display.ratio,.4);assert.equal(display.forecastOn,"2026-09-17");
  assert.equal(getTaskProgressComparison(getTaskProgressDemoExample("ccx-double11-presale"))?.forecastOn,"2026-09-30");
});
