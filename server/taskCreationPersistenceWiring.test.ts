import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const conversationSource = readFileSync(new URL("../src/components/TaskCreationConversation.tsx", import.meta.url), "utf8");

test("App 持久化真实创建结果且不再映射预览任务 ID", () => {
  assert.match(appSource, /createWorkspaceTasksFromDraft\(workspaceNodesRef\.current, prepared\.draft, \{ parentTaskId, currentUserId, teamId: activeTeamId \}\)/);
  assert.match(appSource, /createdCount: result\.createdNodes\.length/);
  assert.match(appSource, /mainTaskId: result\.mainTaskId/);
  assert.match(appSource, /taskTitles: result\.createdNodes\.map/);
  assert.doesNotMatch(appSource, /getCreationPreviewTaskId/);
});

test("归档对话保留父任务 ID 与专用创建回调的历史实现", () => {
  assert.match(conversationSource, /transition\.type === "create-subtask"[\s\S]*setSelectedParentTaskId\(transition\.parentTask\.id\)[\s\S]*setOutput\(nextOutput\)/);
  assert.match(conversationSource, /selectedParentTaskId\s*\? onCreateSubtask\(selectedParentTaskId, output\.draft\)\s*: onCreateTaskPlan\(output\.draft\)/);
  assert.match(conversationSource, /setSelectedParentTaskId\(null\)[\s\S]*草案已保留；请再次确认以独立创建/);
});

test("归档对话保留同步门禁和真实结果 ID", () => {
  assert.match(conversationSource, /if \(!output \|\| !canCreate \|\| creatingRef\.current\) return;/);
  assert.match(conversationSource, /creatingRef\.current = true/);
  assert.match(conversationSource, /onOpenTask\(createdPlan\.mainTaskId\)/);
});
