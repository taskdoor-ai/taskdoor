import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (name: string) => readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");

test("创建和详情共享上下文AI浮层，不保留居中弹窗或底部继续调整", () => {
  const page = read("components/TaskCreationPage.tsx");
  const detail = read("components/TaskDetail.tsx");
  assert.match(page, /<TaskAiAdjustmentPopover/);
  assert.match(detail, /<TaskAiAdjustmentPopover/);
  assert.doesNotMatch(page + detail, /<TaskAiAdjustmentDialog/);
  assert.doesNotMatch(page, /creation-revision-panel|继续调整/);
  assert.match(page, /applyDraftTaskAiAdjustment/);
  assert.match(detail, /onAiAdjustmentApply/);
});

test("创建保留逐项调整，已有任务的子任务列表去掉 AI 调整入口", () => {
  const editor = read("components/TaskCreationPlanEditor.tsx");
  const detail = read("components/TaskDetail.tsx");
  assert.match(editor, /kind: "subtasks"/);
  assert.match(editor, /kind: "task"/);
  assert.doesNotMatch(detail, /TaskAiAdjustButton|AI 调整子任务安排|kind: "subtasks"/);
  assert.match(detail, /openTaskAiConnection/);
  assert.match(editor, /kind: "subtask", taskId: task.clientId/);
  assert.doesNotMatch(read("components/TaskSubtaskList.tsx"), /onAiAdjust|TaskAiAdjustButton/);
});

test("创建页只挂一个 AI 入口并使用没有顶部范围栏的简洁浮层", () => {
  const page = read("components/TaskCreationPage.tsx");
  assert.equal((page.match(/<TaskAiAdjustButton\b/g) ?? []).length, 1);
  assert.match(page, /<TaskAiAdjustmentPopover\b[^>]*compactCreation/);
  assert.doesNotMatch(page, /onScopeChange=/);
  const planEditor = page.match(/<TaskCreationPlanEditor\b[^>]*\/>/)?.[0];
  assert.ok(planEditor);
  assert.doesNotMatch(planEditor, /onAiAdjust=/);
  assert.doesNotMatch(read("components/TaskDetail.tsx"), /onScopeChange=/);
});

test("弹窗预览不写任务，应用有同步防重复、过期检测和错误保留", () => {
  assert.ok(existsSync(new URL("../src/components/TaskAiAdjustmentPopover.tsx", import.meta.url)), "应有共享AI浮层");
  const dialog = read("components/TaskAiAdjustmentPopover.tsx");
  assert.match(dialog, /buildTaskAiAdjustment/);
  assert.match(dialog, /baseSignature/);
  assert.match(dialog, /applying.current/);
  assert.match(dialog, /await onApply\(proposal\)/);
  assert.match(dialog, /catch \(caught\)/);
  assert.match(dialog, /应用到草稿/);
  assert.match(dialog, /保存修改/);
  assert.doesNotMatch(dialog, /task-ai-adjust-mock|Mock 支持范围|task-ai-adjust-help/);
  assert.doesNotMatch(dialog, /fetch\(|role="log"/);
});

test("AI调整只保留填写提示，移除预设提问、支持范围及失效的输入描述关联", () => {
  const popover = read("components/TaskAiAdjustmentPopover.tsx");
  assert.doesNotMatch(popover, /aria-label="快捷调整"|task-ai-adjust-presets|task-ai-adjust-examples/);
  assert.doesNotMatch(popover, /调整任务名称|补充完成标准|补充一个子任务|调整某项预计投入/);
  assert.doesNotMatch(popover, /aria-label="调整示例"|\$\{composerId\}-boundary|task-ai-adjust-mock|Mock 支持范围/);
  assert.match(popover, /例如：增加完成标准/);
  assert.match(popover, /先预览，确认后应用/);
  assert.match(popover, /role="alert"/);
});

test("AI浮层保持非模态，创建态固定右侧而详情态继续使用锚点", () => {
  assert.ok(existsSync(new URL("../src/components/TaskAiAdjustmentPopover.tsx", import.meta.url)), "应有共享AI浮层");
  const source = read("components/TaskAiAdjustmentPopover.tsx");
  assert.match(source, /<Popover[\s\S]*modal=\{false\}/);
  assert.match(source, /anchor=\{anchor\}/);
  assert.match(source, /positionerClassName=\{compact \? "task-ai-adjust-fixed-positioner" : undefined\}/);
  assert.match(source, /positionMethod="fixed"/);
  assert.match(source, /taskAiAdjustmentDraftReducer/);
  assert.match(source, /getTaskAiAdjustmentDraftKey/);
  assert.match(source, /收起 AI 帮你改/);
  assert.match(source, /type: "discard"/);
  assert.doesNotMatch(source, /<Dialog|<.*Backdrop|aria-modal="true"/);
  for (const file of ["components/TaskCreationPage.tsx", "components/TaskDetail.tsx"]) {
    const page = read(file);
    assert.match(page, file.includes("TaskCreationPage") ? /open=\{aiOpen && active\}/ : /open=\{aiOpen\}/);
    assert.match(page, /onOpenChange=\{setAiOpen\}/);
  }
});

test("浮层复用基础Popover，支持焦点恢复、可见范围和移动滚动", () => {
  assert.ok(existsSync(new URL("../src/components/TaskAiAdjustmentPopover.tsx", import.meta.url)));
  const dialog = read("components/TaskAiAdjustmentPopover.tsx");
  assert.match(dialog, /from "\.\/ui\/popover"/);
  assert.match(dialog, /initialFocus=/);
  assert.match(dialog, /finalFocus=/);
  assert.match(dialog, /调整范围/);
  const css = read("styles/task-ai-adjustment.css");
  assert.match(css, /overflow-y: auto/);
  assert.match(css, /prefers-reduced-motion/);
});

test("AI草稿由页面持有，切换示例暂时卸载浮层不清空同一任务的输入", () => {
  for (const file of ["components/TaskCreationPage.tsx", "components/TaskDetail.tsx"]) {
    const page = read(file);
    assert.match(page, /const aiDraftSession = useTaskAiAdjustmentDrafts\(\)/);
    assert.match(page, /draftSession=\{aiDraftSession\}/);
  }
  const popover = read("components/TaskAiAdjustmentPopover.tsx");
  assert.match(popover, /const \[drafts, dispatch\] = draftSession/);
});

test("详情锚点浮层保留 Tab 边界收起，创建固定面板允许自然离开且不关闭", () => {
  const popover = read("components/TaskAiAdjustmentPopover.tsx");
  assert.match(popover, /onKeyDownCapture=\{handleTabBoundary\}/);
  assert.match(popover, /const handleTabBoundary[\s\S]*?if \(compact\) return;/);
  assert.match(popover, /element.tabIndex >= 0/);
  assert.match(popover, /element.matches\(":disabled"\)/);
  assert.match(popover, /event.shiftKey \? controls\[0\] : controls.at\(-1\)/);
});

test("详情保存更新同一任务而不调用创建流程，记录日志并同步显示", () => {
  const app = read("App.tsx");
  const start = app.indexOf("const applyTaskAiAdjustment =");
  assert.ok(start > -1);
  const handler = app.slice(start, app.indexOf("return (", start));
  assert.match(handler, /applySavedTaskAiAdjustment/);
  assert.match(handler, /commitTaskAiStorage/);
  assert.ok(handler.indexOf("commitTaskAiStorage") < handler.indexOf("setWorkspaceNodes("));
  assert.doesNotMatch(handler, /createTaskPlanFromConversation|createWorkspaceTasksFromDraft/);
  const detail = read("components/TaskDetail.tsx");
  assert.match(detail, /setCurrentTitle\(task.title\)/);
  assert.match(detail, /setCurrentGoal\(task.goal\)/);
  assert.match(detail, /setPendingOwnerId\(initialProposedOwnerId\)/);
});

test("详情负责人提议不替换正式负责人展示，撤回只取消提议", () => {
  const detail = read("components/TaskDetail.tsx");
  assert.match(detail, /selected=\{confirmedOwnerId \? \[confirmedOwnerId\] : \[\]\}/);
  assert.match(detail, /待接受/);
  assert.match(detail, /aria-label="撤回负责人提议"/);
  assert.match(detail, /onOwnerProposalChange\?\.\(undefined\)/);
  assert.doesNotMatch(detail, /displayedOwnerId/);
  const app = read("App.tsx");
  const ownerHandler = app.slice(app.indexOf("const changeOwnerProposal ="), app.indexOf("const changeParticipants ="));
  assert.doesNotMatch(ownerHandler, /task.createdFrom === "task-planner"/);
});
