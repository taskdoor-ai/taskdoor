import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");

test("创建主子任务允许编辑预计投入，总量只汇总叶子", () => {
  const plan = read("components/TaskCreationPlanEditor.tsx");
  const child = read("components/TaskCreationSubtaskEditor.tsx");
  assert.match(plan, /<TaskEffortEditor/);
  assert.match(plan, /getCreationEffortLeaves\(form\)/);
  assert.match(plan, /applyCreationEffortEdits/);
  assert.match(child, /<TaskEffortField/);
  assert.match(child, /effortDirty/);
  assert.match(child, /onDirtyChange/);
});

test("创建子任务使用最右侧唯一展开入口，不保留三点菜单与嵌套标准展开", () => {
  assert.ok(existsSync(new URL("../src/components/TaskCreationSubtaskEditor.tsx", import.meta.url)));
  const editor = read("components/TaskCreationSubtaskEditor.tsx");
  assert.match(editor, /creation-row-expand/);
  assert.match(editor, /<AccordionTrigger/);
  assert.doesNotMatch(editor, /MoreHorizontal|<TaskCriteriaEditor/);
  const plan = read("components/TaskCreationPlanEditor.tsx");
  assert.match(plan, /<TaskCreationSubtaskEditor/);
  assert.doesNotMatch(plan, /MoreHorizontal|更多选项|<TaskCriteriaEditor/);
});

test("展开呈现完整对象字段，修改即时同步且保留AI帮助入口", () => {
  assert.ok(existsSync(new URL("../src/components/TaskCreationSubtaskEditor.tsx", import.meta.url)));
  const editor = read("components/TaskCreationSubtaskEditor.tsx");
  for (const field of ["名称", "目标", "完成标准", "负责人", "截止时间", "前置依赖", "标签"]) assert.ok(editor.includes(field), field);
  assert.match(editor, /creation-subtask-participants/, "各级子任务均可设置自身参与人");
  assert.match(editor, /selected=\{draft\.participantIds\}/);
  assert.match(editor, /members\.filter\(member => member\.id !== draft\.ownerId\)/, "参与人不重复包含负责人");
  assert.match(editor, /creation-property-label">标签/, "标签添加入口有明确字段标题");
  assert.doesNotMatch(editor, /继承主任务目标|creation-subtask-inherited|const inheritedGoal/);
  assert.doesNotMatch(editor, /保存子任务|>取消<|const save =|const close =/);
  assert.match(editor, /const accepted = onChange\(next, baseline\)/);
  assert.match(editor, /setBaseline\(structuredClone\(accepted\)\)/);
  assert.match(editor, /AI 帮你改/);
  assert.match(editor, /TaskAiAdjustButton/);
  assert.match(editor, /stale/);
  assert.match(editor, /onDirtyChange/);
  assert.match(editor, /移除前置依赖：/);
  assert.doesNotMatch(editor, /className="creation-subtask-planning-separator"/, "前置依赖已上移，不再与预计投入同排");
  assert.doesNotMatch(editor, /<small>无<\/small>|编辑\$\{label\}前置依赖/, "空依赖不显示无或编辑");
  assert.match(editor, /aria-label=\{`添加\$\{label\}前置依赖`\}/, "使用添加入口选择依赖");
  assert.doesNotMatch(editor, /无前置依赖，可独立开始/);
});

test("最终创建阻止未保存的工时或未同步的输入", () => {
  const page = read("components/TaskCreationPage.tsx");
  assert.match(page, /hasUnsavedSubtasks/);
  assert.match(page, /onSubtaskDirtyChange/);
  assert.match(page, /有尚未保存的修改，请先保存或取消后再创建。/);
  assert.doesNotMatch(page, /请先保存或取消子任务修改/);
  assert.doesNotMatch(page, /hasUnsavedCriteria|onCriteriaDirtyChange/);
});

test("子任务卡片常态就有完整边框，最后一项及hover不切换卡片结构", () => {
  const base = read("styles/task-creation-page.css");
  const cards = read("styles/task-creation-subtask.css");
  assert.match(cards, /\.creation-task-row\s*\{[^}]*border: 1px solid var\(--ad-border\)/);
  assert.doesNotMatch(base, /\.creation-task-row[^{}]*\{[^}]*border(?:-bottom-color)?:[^;}]*transparent/);
  assert.doesNotMatch(base + cards, /\.creation-task-row:hover[^{}]*\{[^}]*linear-gradient/);
  assert.match(cards, /\.creation-task-list\s*\{[^}]*gap: var\(--ad-space-3\)/);
});

test("创建卡片沿用最新共享渐变背景，图标保持纯色", () => {
  const css = read("styles.css");
  assert.match(css, /--task-card-background: linear-gradient/);
  assert.match(read("styles/task-creation-subtask.css"), /background: var\(--task-card-background, var\(--ad-surface\)\)/);
  assert.doesNotMatch(css + read("styles/task-creation-subtask.css"), /\.task-icon[^{}]*\{[^}]*background-image:\s*linear-gradient/);
  assert.match(read("components/TaskCreationSubtaskEditor.tsx"), /data-tone=\{tone\}/);
});

test("摘要负责人与紧凑展开控件同排居中，不缩小正文编辑控件", () => {
  const cards = read("styles/task-creation-subtask.css");
  assert.match(cards, /\.creation-task-summary\s*\{[^}]*align-items: center/);
  assert.ok(cards.includes("--creation-summary-height: var(--ad-control-height-sm)"), "摘要使用32px紧凑高度");
  assert.ok(cards.includes("--creation-control-height: var(--ad-control-touch-min)"), "正文控件保持44px");
  for (const selector of ["\\.creation-row-owner", "\\.creation-task-summary \\.creation-row-expand"]) {
    assert.ok(new RegExp(`${selector}\\s*\\{[^}]*height: var\\(--creation-summary-height\\)`).test(cards), "摘要控件使用独立高度");
  }
  const mobile = cards.slice(cards.indexOf("@media (max-width: 720px)"));
  assert.ok(mobile.includes("--creation-summary-height: var(--ad-control-touch-min)"), "窄屏保留触摸高度");
  assert.match(mobile, /\.creation-task-summary > \.creation-subtask-header-actions\s*\{[^}]*grid-row: 2/);
  assert.match(mobile, /\.creation-task-summary \.creation-row-owner\s*\{[^}]*grid-row: 2/);
});

test("卡片摘要的负责人只读，展开区仍可编辑负责人", () => {
  const editor = read("components/TaskCreationSubtaskEditor.tsx");
  const summary = editor.slice(editor.indexOf('<div className="creation-task-summary">'), editor.indexOf('<AccordionContent className="creation-subtask-details">'));
  assert.ok(!summary.includes("PersonPicker"), "摘要不能保留负责人选择器");
  assert.ok(summary.includes("<PersonAvatar"), "摘要保留负责人头像");
  assert.ok(summary.includes("showProfilePreview={false}") && summary.includes("profilePreviewFocusable={false}"), "只读头像没有预览或无效焦点");
  assert.ok(editor.slice(editor.indexOf('<AccordionContent className="creation-subtask-details">')).includes('label={`${label}负责人`}'), "负责人仍可在展开区修改");
  assert.ok(!(editor + read("components/TaskCreationPlanEditor.tsx")).includes("onOwnerChange"), "移除摘要即时修改的快捷回调");
});

test("创建属性复用详情的人员和标签控件，以字段间分隔线区分", () => {
  for (const file of ["components/TaskCreationPlanEditor.tsx", "components/TaskCreationSubtaskEditor.tsx"]) {
    const source = read(file);
    assert.match(source, /<span aria-hidden="true" className="task-detail-property-separator" \/>/);
    assert.match(source, /<TagBadge/);
    assert.match(source, /task-detail-title-tags/);
    assert.match(source, /<MemberSelector[^>]+hideSelectedName/);
  }
});

test("子任务完成标准复用单行起步、随内容和宽度自动增高的编辑器", () => {
  const editor = read("components/TaskCreationSubtaskEditor.tsx");
  assert.match(editor, /<TaskDetailFields/);
  assert.match(read("components/TaskDetailFields.tsx"), /<TaskCriteriaFields/);
  assert.match(read("components/TaskCriteriaFields.tsx"), /<TaskCreationEditableText/);
  const input = read("components/TaskCreationEditableText.tsx");
  assert.match(input, /rows=\{1\}/);
  assert.match(input, /scrollHeight/);
  assert.match(input, /ResizeObserver/);
  assert.match(input, /observedWidth/);
  assert.doesNotMatch(read("styles/task-creation-subtask.css"), /creation-subtask-criterion[^{}]*textarea[^{}]*\{[^}]*min-height: 64px/);
});

test("展开属性的日期标签覆盖共享控件默认行高，与人员标签对齐", () => {
  const cards = read("styles/task-creation-subtask.css");
  assert.match(cards, /\.creation-subtask-metadata \.task-due-date-picker > \.task-due-date-label[^{}]*\{[^}]*line-height: 20px/);
});

test("移除子任务按钮与属性列左对齐，不叠加按钮自身的水平内边距", () => {
  const cards = read("styles/task-creation-subtask.css");
  assert.match(cards, /\.creation-subtask-actions\s*\{[^}]*padding: 0 var\(--creation-row-padding\)/);
  assert.match(cards, /\.creation-subtask-actions > button\s*\{[^}]*padding-inline: 0/);
  assert.match(cards, /\.creation-subtask-actions > button\s*\{[^}]*justify-content: flex-start/);
  assert.match(cards, /\.creation-subtask-actions > button\s*\{[^}]*min-height: var\(--ad-control-height-sm\)/);
  assert.match(cards.slice(cards.indexOf("@media (max-width: 720px)")), /\.creation-subtask-actions > button\s*\{[^}]*min-height: var\(--ad-control-touch-min\)/);
  const editor = read("components/TaskCreationSubtaskEditor.tsx");
  assert.match(editor, /className="creation-subtask-actions"><Button disabled=\{disabled \|\| dirty\} onClick=\{onRemove\}/);
});

test("未分配负责人把图标与文案放在同一行，并沿用属性正文的字号", () => {
  const editor = read("components/TaskCreationSubtaskEditor.tsx");
  assert.match(editor, /className="task-detail-property creation-subtask-owner"/);
  const cards = read("styles/task-creation-subtask.css");
  assert.match(cards, /\.creation-subtask-owner \.person-picker-trigger-member\s*\{[^}]*flex-direction:\s*row;[^}]*align-items:\s*center;/s);
  assert.match(cards, /\.creation-subtask-owner \.person-picker-trigger-member > strong\s*\{[^}]*font-size:\s*var\(--ad-text-body-sm\);[^}]*font-weight:\s*400;/s);
});
