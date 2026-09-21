import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("创建入口挂载新表单，旧对话仅留作归档", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /<TaskCreationExperience/);
  assert.doesNotMatch(app, /<TaskCreationConversation/);
  assert.doesNotMatch(app, /initialProposedOwnerId|onOwnerProposalChange=/, "当前创建流程不再恢复任务内待接受负责人");
});

test("任务创建体验只挂载统一对话页", () => {
  const source = readFileSync(new URL("../src/components/TaskCreationExperience.tsx", import.meta.url), "utf8");
  assert.match(source, /<TaskCreationPage/);
  assert.doesNotMatch(source, /TaskCreationLinearPage|当前方式|分步方式|role="tablist"/);
});

test("点击新建进入需求工作区，AI 生成前不初始化空白任务编辑器", () => {
  const source = readFileSync(new URL("../src/components/TaskCreationPage.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /createCreationForm\(/, "不得从空白任务开始手工创建");
  assert.match(source, /planning: null/);
  assert.match(source, /creation-request-panel/);
  assert.match(source, /planTaskCreation\(/);
  assert.match(source, /TaskCreationPlanEditor/);
  assert.doesNotMatch(source, /空白任务|role="log"|<Dialog/);
});

test("创建编辑页复用任务详情头部与字段样式，不伪造趋势或讨论", () => {
  const source = creationSource();
  for (const className of ["task-detail-hero-card", "task-detail-title-row", "task-detail-title-input", "task-detail-goal-field", "task-detail-properties"]) assert.ok(source.includes(className), `复用 ${className}`);
  assert.match(source, /autoFocus/);
  assert.doesNotMatch(source, /<TaskBurnUpSparkline|<TaskDiscussion/);
});

test("新表单使用共享 21st 适配控件，完成标准及稳定依赖可编辑", () => {
  const source = creationSource();
  for (const name of ["PersonPicker", "MemberSelector", "TaskDueDatePicker", "Accordion", "completionCriteria", "dependsOnClientIds", "validateCreationForm"]) assert.ok(source.includes(name), name);
  assert.doesNotMatch(source, /role="log"|AgentWorkflow/);
});

test("AI 补问、关系确认与修订均为候选阶段，不在这些环节创建任务", () => {
  const source = readFileSync(new URL("../src/components/TaskCreationPage.tsx", import.meta.url), "utf8");
  for (const name of ["CreationPlanningQuestion", "resolveCreationRelationship", "applyDraftTaskAiAdjustment", "TaskAiAdjustmentPopover"]) assert.ok(source.includes(name), name);
  assert.match(source, /setAiScope\(null\)/);
  assert.match(source, /planning\.stage !== "review"/);
  assert.match(source, /Mock/);
  assert.doesNotMatch(source, /fetch\(|requestMockTaskAssistant\(/, "不扩展真实 AI 服务或恢复旧助手的整树重建");
});

test("阶段切换定位到新内容，原需求不变时重新规划保留已补充答案", () => {
  const source = readFileSync(new URL("../src/components/TaskCreationPage.tsx", import.meta.url), "utf8");
  assert.match(source, /onAnimationComplete=\{focusStage\}/);
  assert.match(source, /scrollIntoView/);
  assert.match(source, /planningRequest === workspace\.request\.trim\(\)/);
  assert.match(source, /answers: effectiveAnswers/);
});

test("补问选项只更新答案，由底部按钮确认前进并支持返回上一步", () => {
  const source = readFileSync(new URL("../src/components/TaskCreationPage.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/styles/task-creation-page.css", import.meta.url), "utf8");
  assert.match(source, /const \[clarificationStep, setClarificationStep\] = useState\(0\)/);
  assert.match(source, /planning\.questions\[clarificationStep\]/, "页面每次只读取当前一题");
  assert.match(source, /（\{clarificationStep \+ 1\}\/\{planning\.questions\.length\}）/);
  assert.match(source, /className="creation-custom-answer"/);
  assert.match(source, /onAnswer=\{value => selectClarificationAnswer\(currentClarificationQuestion, value\)\}/);
  assert.match(source, /onContinue=\{\(\) => submitClarificationAnswer\(currentClarificationQuestion, workspace\.answers\[currentClarificationQuestion\.field\] \?\? ""\)\}/);
  const selectHandler = source.match(/const selectClarificationAnswer = [\s\S]*?\n  \};/)?.[0] ?? "";
  assert.match(selectHandler, /answers: \{ \.\.\.current\.answers, \[question\.field\]: value \}/);
  assert.doesNotMatch(selectHandler, /generatePlan|setClarificationStep/);
  const backHandler = source.match(/const previousClarificationStep = [\s\S]*?\n  \};/)?.[0] ?? "";
  assert.match(backHandler, /setClarificationStep\(current => current - 1\)/);
  assert.match(backHandler, /editingBrief: true/);
  assert.doesNotMatch(backHandler, /answers:|setCustomClarificationAnswer/);
  const customRow = source.match(/<div className="creation-custom-answer">[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.match(customRow, /<Textarea/);
  assert.doesNotMatch(customRow, /<Button|required/);
  const footer = source.match(/<footer className="creation-question-actions">[\s\S]*?<\/footer>/)?.[0] ?? "";
  assert.match(footer, /onClick=\{onPrevious\}/);
  assert.match(footer, /上一步/);
  assert.match(footer, /生成方案/);
  assert.match(footer, /下一步/);
  assert.match(footer, /disabled=\{disabled \|\| !answer\?\.trim\(\)\}/);
  assert.doesNotMatch(source, /选择预设答案会直接进入下一题|setCustomClarificationAnswer/);
  assert.match(source, /setClarificationStep\(current => current \+ 1\)/);
  assert.match(source, /void generatePlan\(nextAnswers\)/, "最后一题完成后直接开始生成方案");
  assert.match(styles, /\.creation-answer-options\s*\{[^}]*display:\s*grid;/s, "预设答案纵向排列");
  assert.match(styles, /\.creation-answer-options > button\s*\{[^}]*width:\s*100%;/s, "每个答案独占一行");
  assert.match(styles, /\.creation-questions\s*\{[^}]*width:\s*100%;/s, "问题区与卡片内容区等宽");
  assert.doesNotMatch(styles.match(/\.creation-questions\s*\{[^}]*\}/)?.[0] ?? "", /max-width:\s*760px/);
  assert.match(styles, /\.creation-question-actions\s*\{[^}]*justify-content:\s*space-between;/s);
});

test("根路径返回新建任务，关系决策按钮同高", () => {
  const source = readFileSync(new URL("../src/components/TaskCreationPage.tsx", import.meta.url), "utf8");
  assert.match(source, /<button aria-label="返回新建任务" onClick=\{startAnother\} type="button">任务<\/button>/);
  const actions = source.match(/<div className="creation-decision-actions">[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.equal((actions.match(/size="lg"/g) ?? []).length, 2, "两个关系决策按钮必须使用同一高度");
});

test("选择作为子任务后只在页面顶部显示完整路径", () => {
  const page = readFileSync(new URL("../src/components/TaskCreationPage.tsx", import.meta.url), "utf8");
  const editor = readFileSync(new URL("../src/components/TaskCreationPlanEditor.tsx", import.meta.url), "utf8");
  assert.match(page, /form\?\.decision === "attach" && form\.candidate[\s\S]*form\.candidate\.name \?\? form\.candidate\.title[\s\S]*<em aria-current="page">新建任务<\/em>/, "顶部路径应为任务、主任务、新建任务");
  assert.doesNotMatch(editor, /creation-parent|取消关联|继承主任务目标/, "任务卡片内不再重复展示关系路径");
});

test("相同内容的调整只提示无需修改，不增加一次空预览确认", () => {
  const source = readFileSync(new URL("../src/components/TaskAiAdjustmentPopover.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(!result\.proposal\.changes\.length\) \{[\s\S]*?await waitForPreviewPaint\(controller\.signal\)[\s\S]*?setNotice\(result\.proposal\.summary\);\s*publishProgress\([\s\S]*?status: "completed"[\s\S]*?applicationStatus: "no_change"[\s\S]*?\);\s*return;\s*\}/);
});

test("创建页把同一页面状态中的全部轮次交给对话浮层，并保存每轮用户可见回复", () => {
  const source = readFileSync(new URL("../src/components/TaskCreationPage.tsx", import.meta.url), "utf8");
  assert.match(source, /<TaskAiAdjustmentPopover[\s\S]*?history=\{workspace\.processes\}[\s\S]*?onProgressChange=\{updateAdjustmentProgress\}[\s\S]*?\/>/);
  assert.match(source, /responseSummary: getCreationResponseSummary\(next\)/);
  assert.match(source, /recordCreationAdjustmentProgress\(current\.processes, progress\)/);
  assert.match(source, /createCreationRelationshipProcess\([\s\S]*?decision,[\s\S]*?next\.summary/);
  assert.match(source, /markLatestCreationDecisionResolved\(current\.processes\)/, "确认关系后主页面不能继续显示待确认");
  assert.match(source, /const pageProcesses = workspace\.processes\.filter\(process => process\.status === "running" && process\.kind !== "adjustment"\)/, "正文只承载初始生成中的临时 loading，完成过程与调整轮均进入右侧历史");
  assert.match(source, /creation-page-actions[\s\S]*?\{aiAdjustmentAction\}/, "AI 入口固定在创建页顶部动作区");
  assert.doesNotMatch(source, /AI 辅助创建|creation-workflow-bar|creation-ai-adjust-entry/, "不再用独立标签或正文行重复表达 AI 创建");
  assert.doesNotMatch(source, /actions=\{processActions\}/);
  assert.match(source, /form\.candidate\?\.name \?\? form\.candidate\?\.title \?\? "已有任务"/, "关系轮次优先记录 App 实际传入的任务名称");
  assert.match(source, /const startAnother = \(\) => \{[\s\S]*?setWorkspace\(emptyWorkspaceDraft\(\)\)/, "继续创建必须开启一段没有旧轮次的新会话");
  assert.match(source, /creationHistoryKey\(currentUserId, teamId\)/, "历史按当前账号及团队区分");
  assert.match(source, /saveSession\(\{ id: sessionId,[\s\S]*?created \}\)/, "实际创建后记录结果，重开时跳转任务而非再次创建");
});

test("候选过期或应用失败只更新应用状态，不把已经完成的预览步骤倒写成失败", () => {
  const source = readFileSync(new URL("../src/components/TaskAiAdjustmentPopover.tsx", import.meta.url), "utf8");
  assert.match(source, /stale && !applying\.current\) finishProgress\("completed",[\s\S]*?applicationStatus: "expired"/);
  assert.match(source, /修改尚未保存[\s\S]*?finishProgress\("completed", message,[\s\S]*?applicationStatus: "pending"/);
});

function creationSource() {
  const page = readFileSync(new URL("../src/components/TaskCreationPage.tsx", import.meta.url), "utf8");
  const editor = new URL("../src/components/TaskCreationPlanEditor.tsx", import.meta.url);
  const subtaskEditor = new URL("../src/components/TaskCreationSubtaskEditor.tsx", import.meta.url);
  const editableText = new URL("../src/components/TaskCreationEditableText.tsx", import.meta.url);
  const fields = new URL("../src/components/TaskDetailFields.tsx", import.meta.url);
  const memberSelector = new URL("../src/components/MemberSelector.tsx", import.meta.url);
  return page + [editor, subtaskEditor, editableText, fields, memberSelector].map(file => existsSync(file) ? readFileSync(file, "utf8") : "").join("");
}

test("新表单创建成功直接打开任务详情，写入失败保留草稿且不伪报成功", () => {
  const source = readFileSync(new URL("../src/components/TaskCreationPage.tsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(creating\.current\) return/);
  assert.match(source, /creating\.current = true/);
  assert.match(source, /creationParent[\s\S]*?onCreateSubtask\(creationParent\.parentTaskId, plan\)[\s\S]*?form\.decision === "attach"[\s\S]*?onCreateSubtask\(form\.candidate\.id, plan\)[\s\S]*?onCreateTaskPlan\(plan\)/);
  assert.match(source, /const created =[\s\S]*?drafts\.current\.delete\([\s\S]*?onOpenTask\(created\.mainTaskId\)/, "写入成功后应直接打开新任务详情");
  assert.doesNotMatch(source, /setResult|creation-plan-summary|任务已创建|继续创建|result \? "查看任务"/, "不保留创建成功中间态");
  assert.match(source, /catch \(caught\)[\s\S]*setError[\s\S]*creating\.current = false/);
  const creation = app.slice(app.indexOf("const createTaskPlanFromConversation"), app.indexOf("const openTask", app.indexOf("const createTaskPlanFromConversation")));
  const storage = creation.indexOf("commitTaskAiStorage(localStorage");
  assert.match(creation, /\[workspaceNodesStorageKey, JSON\.stringify\(result\.nodes\)\]/);
  assert.match(creation, /\[getPersonalTagStorageKey\(currentUserId\), JSON\.stringify\(prepared\.tags\)\]/);
  assert.ok(storage >= 0 && storage < creation.indexOf("setWorkspaceNodes("), "保存成功后才更新工作区，失败时让表单保留草稿");
});
