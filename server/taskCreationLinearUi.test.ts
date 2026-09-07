import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("分步结果只呈现任务内容，不把内部思考阶段渲染成任务模块", () => {
  const source = read("components/TaskCreationLinearSections.tsx");
  assert.match(source, /linear-creation-main/);
  assert.match(source, /linear-creation-team/);
  assert.match(source, /linear-creation-subtasks/);
  assert.match(source, /<details/);
  assert.match(source, /完成标准/);
  assert.match(source, /MemberSelector/);
  assert.doesNotMatch(source, /已生成，可继续核对和修改/);
  assert.doesNotMatch(source, /stage\.label/);
  assert.doesNotMatch(source, /String\(index \+ 1\)\.padStart\(2, "0"\)/);
  assert.doesNotMatch(source, /建议拆分为|当前无需拆分|先按可独立验收的交付拆分/);
  assert.doesNotMatch(source, /task-detail-hero-card|TaskCreationPlanEditor|TaskCreationSubtaskEditor/);
});

test("线性样式没有子任务卡片阴影，并覆盖移动端与减弱动画", () => {
  const css = read("styles/task-creation-linear.css");
  assert.match(css, /\.linear-creation-document/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /max-width: 720px/);
  assert.doesNotMatch(css, /box-shadow:[^;]+/);
});

test("分步页复用规划器并在确认前不创建", () => {
  const source = read("components/TaskCreationLinearPage.tsx");
  assert.match(source, /planTaskCreation\(/);
  assert.match(source, /resolveCreationRelationship\(/);
  assert.match(source, /getLinearCreationStages\(/);
  assert.match(source, /停止生成/);
  assert.match(source, /validateCreationForm\(/);
  assert.match(source, /toTaskPlanDraft\(/);
  assert.match(source, /onCreateSubtask\(form\.candidate\.id, plan\) : onCreateTaskPlan\(plan\)/);
  assert.doesNotMatch(source, /taskCreationScenarios\.map|快速开始|TaskCreationProcess/);
});

test("创建体验不再暴露分步类型，只挂载统一对话页", () => {
  const source = read("components/TaskCreationExperience.tsx");
  assert.match(source, /<TaskCreationPage/);
  assert.doesNotMatch(source, /CreationMode|当前方式|分步方式|TaskCreationLinearPage|role="tablist"/);
});

test("App 通过体验外壳创建任务", () => {
  const app = read("App.tsx");
  assert.match(app, /<TaskCreationExperience/);
  assert.doesNotMatch(app, /creation=\{creationSessionOpen \? <TaskCreationPage/);
});
