import assert from "node:assert/strict";
import test from "node:test";
import { allTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { normalizeWorkspaceNodes, type TaskNode, type WorkspaceNode } from "../src/data/workspaceNodes.ts";
import { getTaskProgressDemoExample } from "../src/data/taskProgressDemo.ts";
import { getTaskProgressComparisonExample } from "../src/data/taskProgressComparisonExamples.ts";
import { progressDemoRevisions } from "../src/data/taskProgressDemoFixtures.ts";
import { getTaskDefinitionGoal } from "../src/lib/taskGoal.ts";
import { getEffortScopeKey, getTaskEffortState } from "../src/lib/taskEffort.ts";
import { getTaskProgressDisplay } from "../src/lib/taskProgressDisplay.ts";
import { migrateProgressDemoFixtures } from "../src/lib/taskProgressDemoMigration.ts";
import { creatorCommerceScenarioVersion, resolveWorkspaceScenarioReset } from "../src/lib/workspaceScenarioReset.ts";

const tasks = allTeamWorkspaceNodes.filter((node): node is TaskNode => node.kind === "task");
const legacyNodes = () => normalizeWorkspaceNodes(allTeamWorkspaceNodes.map(node => {
  if (node.kind !== "task") return node;
  let parent = node;
  while (parent.parentTaskId) parent = tasks.find(task => task.id === parent.parentTaskId)!;
  const revision = progressDemoRevisions[node.id];
  return { ...node, ...(revision ? {...revision.before, completedAt: undefined} : {}),
    ...(node.effortEstimate ? { effortEstimate: { ...node.effortEstimate, scopeKey: getEffortScopeKey({...node, goal:parent.goal}, node.effortEstimate.workMethod) } } : {}) };
}));
const taskAt = (nodes: WorkspaceNode[], id: string) => nodes.find(node => node.id === id) as TaskNode;

test("fresh mock dates are ordered and estimates match the live task definition", () => {
  let early = 0, late = 0;
  for (const task of tasks) {
    if (task.effortEstimate) assert.notEqual(getTaskEffortState({...task, goal:getTaskDefinitionGoal(allTeamWorkspaceNodes, task)}), "stale", task.id);
    const series = getTaskProgressDemoExample(task.id);
    const created = task.createdAt?.slice(0,10) ?? series?.creation?.at.slice(0,10);
    const due = task.plannedEndOn ?? series?.timing.dueOn;
    if (created && task.plannedStartOn) assert.ok(created <= task.plannedStartOn, task.id);
    if (created && due) assert.ok(created <= due, task.id);
    if (created && task.completedAt) assert.ok(created <= task.completedAt.slice(0,10), task.id);
    if (series?.timing.forecastOn) {
      assert.ok(series.timing.forecastOn >= series.asOf.slice(0,10), task.id);
      if (due && series.timing.forecastOn < due) early++;
      if (due && series.timing.forecastOn > due) late++;
    }
  }
  assert.ok(early > 0 && late > 0, "retain both early and delayed examples");
});

test("v21 old 8/31 deadline plus generic 9/7 creation is repaired through the existing persistence path", () => {
  const old = legacyNodes();
  const id = "weekly-retro-decisions";
  const generic = getTaskProgressComparisonExample(id)!;
  assert.equal(taskAt(old,id).plannedEndOn,"2026-08-31");
  assert.equal(generic.creation?.at.slice(0,10),"2026-09-07");
  assert.ok(generic.creation!.at.slice(0,10) > taskAt(old,id).plannedEndOn!);
  const scenario = resolveWorkspaceScenarioReset({ storedVersion:creatorCommerceScenarioVersion, storedWorkspaceNodes:old, storedTags:[] });
  assert.equal(scenario.didReset,false);
  const migrated = migrateProgressDemoFixtures(scenario.workspaceNodes);
  const task = taskAt(migrated,id);
  const model = getTaskProgressDisplay({task,series:getTaskProgressDemoExample(id)});
  assert.equal(model.startOn,"2026-08-29");
  assert.equal(model.dueOn,"2026-09-14");
  assert.equal(model.completedOn,"2026-09-14");
  assert.ok(model.startOn! <= model.dueOn!);
  for (const child of ["weekly-retro-open-issues","weekly-retro-actions"]) {
    assert.notEqual(getTaskEffortState(taskAt(migrated,child)),"stale");
    assert.equal(getTaskProgressDisplay({task:taskAt(migrated,child),series:getTaskProgressDemoExample(child)}).forecastOn,"2026-09-15");
  }
  assert.equal(migrateProgressDemoFixtures(migrated),migrated);
});

test("saved mock scope repair preserves edited dates, definitions, estimates, activity and custom tasks", () => {
  for (const change of [{plannedEndOn:"2026-08-25"}, {goal:"用户新目标"}, {createdAt:"2026-09-07T09:00:00+08:00"}, {effortEstimate:undefined}, {effortBaseline:{at:"2026-08-29",minutes:999,version:1,scopeKey:"user"}}]) {
    const nodes = legacyNodes();
    Object.assign(taskAt(nodes,"weekly-retro-actions"),change);
    const before = structuredClone(nodes.filter(node=>node.id.startsWith("weekly-retro-")));
    const migrated = migrateProgressDemoFixtures(nodes);
    // Unchanged signatures may be repaired independently, but dates and user edits remain untouched.
    const after = taskAt(migrated,"weekly-retro-actions");
    assert.deepEqual({...after, effortEstimate:before.find(node=>node.id==="weekly-retro-actions")!.effortEstimate},before.find(node=>node.id==="weekly-retro-actions"));
    assert.equal(taskAt(migrated,"weekly-retro-decisions").plannedEndOn,"2026-09-14");
  }
  const withProvenance=legacyNodes();
  Object.assign(taskAt(withProvenance,"weekly-retro-decisions"), {createdAt:"2026-09-07T09:00:00+08:00",createdBy:"周岚",createdFrom:"task-creation"});
  assert.deepEqual(taskAt(migrateProgressDemoFixtures(withProvenance),"weekly-retro-decisions"),taskAt(withProvenance,"weekly-retro-decisions"));
  const nodes=legacyNodes();
  const custom={...taskAt(nodes,"weekly-retro-actions"),id:"user-task"}; nodes.push(custom);
  const removed=nodes.filter(node=>node.id!=="product-launch-venue");
  const result=migrateProgressDemoFixtures(removed,{"weekly-retro-actions":[{id:"saved",type:"member-post",author:"周岚",time:"2026-09-14",message:"用户已编辑"}]});
  assert.equal(taskAt(result,custom.id),custom);
  assert.equal(result.some(node=>node.id==="product-launch-venue"),false);
  assert.equal(taskAt(result,"weekly-retro-actions").plannedEndOn,"2026-09-15");
  assert.equal(taskAt(result,"weekly-retro-decisions").plannedEndOn,"2026-09-14");
});


test("5173 completed action sibling and discussion activity do not block untouched retro siblings", () => {
  const nodes=legacyNodes();
  const action=taskAt(nodes,"weekly-retro-actions");
  action.status="已完成";
  const before=structuredClone(action);
  const activities={
    "weekly-retro-actions":[{id:"user-completed",type:"status-change" as const,author:"周岚",time:"2026-09-14",message:"将任务标记完成"}],
    "weekly-retro-notes":[{id:"root-status",type:"task-definition-change" as const,author:"周岚",time:"2026-09-14",message:"更新父任务预计总投入为11111h"}],
    "weekly-retro-open-issues":[{id:"comment",type:"member-post" as const,author:"林洁",time:"2026-09-14",message:"补充核对讨论"}],
  };
  const originalActivities=structuredClone(activities);
  const result=migrateProgressDemoFixtures(nodes,activities);
  assert.deepEqual({...taskAt(result,action.id),effortEstimate:before.effortEstimate},before);
  assert.notEqual(getTaskEffortState(taskAt(result,action.id)),"stale");
  const decisions=taskAt(result,"weekly-retro-decisions"), issues=taskAt(result,"weekly-retro-open-issues");
  assert.equal(decisions.completedAt,"2026-09-14T12:00:00+08:00");
  assert.equal(decisions.plannedEndOn,"2026-09-14");
  assert.equal(issues.plannedEndOn,"2026-09-15");
  assert.notEqual(getTaskEffortState(issues),"stale");
  assert.deepEqual(activities,originalActivities);
  assert.equal(migrateProgressDemoFixtures(result,activities),result);
});


test("legacy mock explanation text is preserved while scope and seed dates migrate; human estimates stay untouched", () => {
  const nodes=legacyNodes();
  const id="weekly-retro-open-issues", task=taskAt(nodes,id);
  task.effortEstimate!.reason="历史样例中保留的估算说明";
  const reason=task.effortEstimate!.reason;
  const migrated=migrateProgressDemoFixtures(nodes);
  const repaired=taskAt(migrated,id);
  assert.equal(repaired.effortEstimate!.reason,reason);
  assert.notEqual(getTaskEffortState(repaired),"stale");
  assert.equal(repaired.plannedEndOn,"2026-09-15");
  assert.equal(migrateProgressDemoFixtures(migrated),migrated);
  for (const change of [{basis:"manual" as const,confirmed:true,version:2}, {minutes:999}, {workMethod:"用户工作方式"}, {version:2}]) {
    const edited=legacyNodes();
    const input=taskAt(edited,id);
    Object.assign(input.effortEstimate!,change,{reason:"人工保留的估算说明"});
    const before=structuredClone(input);
    assert.deepEqual(taskAt(migrateProgressDemoFixtures(edited),id),before);
  }
});
