import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../src/components/TaskCreationPage.tsx", import.meta.url), "utf8");
const conversationSource = readFileSync(new URL("../src/components/TaskCreationConversation.tsx", import.meta.url), "utf8");

test("App 向任务创建页传入真实任务 ID、完整字段与直属子任务名称", () => {
  assert.match(appSource, /teamWorkspaceNodes = useMemo\(\(\) => getTeamWorkspaceNodes\(activeTeamId, workspaceNodes\)/);
  assert.match(appSource, /taskCreationExistingTasks = teamWorkspaceNodes\s*\.filter\(\(node\): node is TaskNode => node\.kind === "task"\)/);
  assert.match(appSource, /existingTasks=\{taskCreationExistingTasks\}/);
  assert.match(appSource, /\.map\(\(\{ id, name, ownerId, status, goal, dueAt, labels, parentTaskId, plannedStartOn, plannedEndOn, iconName, iconTone, updatedAt \}\) => \(\{/);
  for (const field of ["id", "name", "ownerId", "status", "goal", "dueAt", "labels", "parentTaskId", "plannedStartOn", "plannedEndOn", "iconName", "iconTone", "updatedAt", "childTaskNames"]) {
    assert.match(appSource, new RegExp(`\\b${field}\\b`), `缺少 ${field}`);
  }
  assert.doesNotMatch(appSource, /id: `\$\{index\}:\$\{task\.name\}`/);
});

test("子任务入口把固定父任务和完整路径交给统一创建页", () => {
  assert.match(appSource, /creationParentContext/);
  assert.match(appSource, /startNewSubtaskConversation/);
  assert.match(appSource, /parentTaskId: selectedTask\.id/);
  assert.match(appSource, /pathItems: getTaskPathItems\(workspaceNodesRef\.current, selectedTask\)/);
  assert.match(appSource, /creationParent=\{creationParentContext\}/);
  assert.match(appSource, /onCreateSubtask=\{startNewSubtaskConversation\}/);
});

test("固定父任务创建跳过关系类型选择并按父任务写入", () => {
  assert.match(pageSource, /creationParent\?:/);
  assert.match(pageSource, /normalizePlanningForFixedParent/);
  assert.match(pageSource, /candidate: undefined/);
  assert.match(pageSource, /candidateKind: undefined/);
  assert.match(pageSource, /decision: "independent"/);
  assert.match(pageSource, /onCreateSubtask\(creationParent\.parentTaskId, plan\)/);
});

test("固定父任务创建显示路径并允许返回已有任务", () => {
  assert.match(pageSource, /creationParent\.pathItems\.map/);
  assert.match(pageSource, /onPathSelect\?\.\(item\.id\)/);
  assert.match(pageSource, /aria-current="page">新建任务/);
});

test("归档对话查看已有任务仍按真实 ID 导航且不触发创建", () => {
  assert.match(conversationSource, /transition\.type === "open-existing"[\s\S]*onOpenTask\(transition\.task\.id\)/);
  const branchStart = conversationSource.indexOf('if (transition.type === "open-existing")');
  const branchEnd = conversationSource.indexOf("setOutput(null)", branchStart);
  assert.ok(branchStart >= 0 && branchEnd > branchStart);
  const openBranch = conversationSource.slice(branchStart, branchEnd);
  assert.doesNotMatch(openBranch, /setOutput|onCreateTaskPlan/);
  assert.ok(openBranch.indexOf("saveConversation(") < openBranch.indexOf("onOpenTask("));
  assert.match(conversationSource, /persistConversationList\(localStorage,[\s\S]*?setConversations\(nextConversations\)/);
});
