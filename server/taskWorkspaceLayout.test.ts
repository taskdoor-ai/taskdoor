import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("任务列表与详情挂载在同一个常驻工作区，切任务不重建列表", () => {
  const workspaceStart = appSource.indexOf("<TaskWorkspace\n");
  const workspaceEnd = appSource.indexOf("</TaskWorkspace>", workspaceStart);
  assert.ok(workspaceStart > -1 && workspaceEnd > workspaceStart, "应由两栏工作区同时承载列表与详情");
  const workspace = appSource.slice(workspaceStart, workspaceEnd);
  assert.match(workspace, /hidden=\{activeSection !== "home" && activeSection !== "tasks" && activeSection !== "conversation"\}/, "我的工作、详情和新建共用常驻列表，其他页面暂时隐藏工作区");
  assert.match(workspace, /<TaskDetail\b/);
  assert.match(workspace, /selectedTaskId=\{selectedTaskId\}/);
  assert.match(workspace, /filters=\{taskFilters\}/);
  assert.match(workspace, /query=\{taskQuery\}/);
  assert.match(workspace, /workbench=\{<PersonalWorkbench/);
  assert.match(workspace, /creation=\{creationSessionOpen \? <TaskCreationExperience/);
  assert.match(workspace, /showingCreation=\{activeSection === "conversation"\}/);
  assert.doesNotMatch(workspace.slice(0, workspace.indexOf(">") + 1), /\bkey=/);
  assert.doesNotMatch(appSource, /<WorkspaceList\b/, "不再并列挂载旧全页列表");
});

test("从列表、通知和创建结果打开任务都回到详情视图，不清除筛选", () => {
  const openTask = appSource.match(/const openTask = \(taskId: string\) => \{([\s\S]*?)\n  \};/)?.[1];
  assert.ok(openTask, "跨入口共用任务选择操作");
  assert.match(openTask, /setSelectedTaskId\(taskId\)/);
  assert.match(openTask, /setActiveSection\("tasks"\)/);
  assert.match(openTask, /focusPrimaryHeadingAfterNavigation\("detail"\)/);
  assert.doesNotMatch(openTask, /setTaskFilters|setTaskQuery/);
  assert.match(appSource, /onOpenTask=\{openTask\}/);
  assert.match(appSource, /onOpenRelatedTask=\{openTask\}/);
  assert.match(appSource, /onTaskSelect=\{\(task\) => openTask\(task\.id\)\}/);
});

test("标签管理更新任务标签，不清空搜索或扩大负责人和状态范围", () => {
  const tagManagement = appSource.match(/<TagManagementPage\b[\s\S]*?\n\s*\/>/)?.[0];
  assert.ok(tagManagement);
  assert.match(tagManagement, /onDeleteTag=/);
  assert.match(tagManagement, /onRenameTag=/);
  assert.match(tagManagement, /changeTaskTags/);
  assert.doesNotMatch(tagManagement, /setTaskQuery|owner:\s*"all"|status:\s*"all"/);
});

test("导航只聚焦可见区域的标题，不把焦点交给隐藏列表或拉动列表滚动", () => {
  const focus = appSource.match(/const focusPrimaryHeadingAfterNavigation = ([\s\S]*?)\n\};/)?.[1];
  assert.ok(focus);
  assert.match(focus, /task-workspace-list-heading/);
  assert.match(focus, /\.task-workspace-detail h1/);
  assert.match(focus, /personal-workbench-heading/);
  assert.match(focus, /getClientRects\(\)\.length/);
  assert.match(focus, /focus\(\{ preventScroll: true \}\)/);
});

test("任务工作区移除看板状态和渲染分支，原详情仍常驻", () => {
  const source = readFileSync(new URL("../src/components/TaskWorkspace.tsx", import.meta.url), "utf8");
  assert.ok(!/TaskWorkspaceView|taskWorkspaceView|setTaskWorkspaceView|onViewChange/.test(appSource), "App 不应保留看板切换状态");
  assert.ok(!/WorkspaceTaskBoard|showingBoard|onShowBoard|onViewChange|TaskWorkspaceView/.test(source), "工作区不应提供看板分支");
  assert.match(source, /className="task-workspace-detail" hidden=\{showingWorkbench \|\| showingCreation\}/);
  const content = source.slice(source.indexOf('className="task-workspace-detail-content"'));
  assert.match(content, /\{children\}/);
  const css = readFileSync(new URL("../src/styles/task-workspace.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /task-workspace-board/);
});

test("常驻详情跟随外部状态变更，但不重置讨论或其他字段草稿", () => {
  const detail = readFileSync(new URL("../src/components/TaskDetail.tsx", import.meta.url), "utf8");
  assert.ok(/useEffect\(\(\) => \{\s*setCurrentStatus\(task.status\);\s*\}, \[task.status\]\)/.test(detail), "同一 Task 更新后详情状态应随权威值更新");
});
