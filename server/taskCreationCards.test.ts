import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CreationForm, CreationTask } from "../src/lib/taskCreationForm";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const read = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
const task = (title: string): CreationTask => ({ clientId: "child-1", title, goal: "共享主目标", completionCriteria: ["交付已核对的名单", "名单有联系方式"], executionTips: [], ownerId: "", participantIds: [], labels: [], startDate: "", endDate: "", dependsOnClientIds: [] });

test("创建子任务摘要只显示名称、负责人和展开入口，标准、预计投入与匹配依据不重复展示", async () => {
  const componentPath = "../src/components/TaskCreationSubtaskEditor.tsx";
  const { TaskCreationSubtaskEditor } = await import(componentPath);
  for (const title of ["整理嘉宾名单", ""]) {
    const child = task(title);
    const form: CreationForm = { request: "邀请嘉宾", mainTask: { ...task("活动筹备"), clientId: "main" }, subtasks: [child], decision: "independent" };
    const html = renderToStaticMarkup(createElement(TaskCreationSubtaskEditor, {
      task: child, form, index: 0, members: [], tags: [], iconName: "briefcase", tone: "pink",
      onChange: (edited: CreationTask) => edited, onRemove: () => undefined, onDirtyChange: () => undefined,
    }));
    assert.ok(html.includes('aria-expanded="false"'), "新建和已有子任务都应先显示摘要");
    assert.ok(html.includes('aria-label="展开子任务 1完整信息"'));
    assert.ok(html.includes(title || "未命名子任务"));
    for (const criterion of child.completionCriteria) assert.ok(!html.includes(criterion), "收起卡片不重复展示完成标准");
    assert.doesNotMatch(html, /完成标准|预计投入|演示估算|匹配依据/);
    assert.ok(html.includes("暂不分配"), "负责人未确定时明确保留未分配状态");
    assert.ok(!html.includes("<textarea"), "默认收起不能显示编辑字段");
  }
});

test("子任务列表工具栏在独立卡片之外，不保留外围大框与表格列头", () => {
  const plan = read("components/TaskCreationPlanEditor.tsx");
  assert.ok(plan.includes('className="creation-subtasks creation-subtasks-cards"'));
  assert.ok(!plan.includes("creation-list-head") && !plan.includes("任务与完成标准"));
  assert.ok(plan.indexOf('className="creation-subtasks-heading"') < plan.indexOf('className="creation-task-list"'));
  assert.ok(existsSync(new URL("../src/styles/task-creation-cards.css", import.meta.url)));
  const css = read("styles/task-creation-cards.css");
  assert.ok(/\.creation-subtasks\.creation-subtasks-cards\s*\{[^}]*border: 0;[^}]*background: transparent;/.test(css));
  assert.ok(plan.includes('import "../styles/task-creation-cards.css"'));
});

test("展开复用主任务heading布局且仅一份名称，底部复用紧凑属性行", () => {
  const source = read("components/TaskCreationSubtaskEditor.tsx");
  const heading = source.slice(source.indexOf("<TaskDetailFields"), source.indexOf("{stale &&"));
  assert.ok(heading.includes('variant="heading"'));
  assert.ok(heading.includes("icon={taskIcon}"));
  assert.ok(heading.includes('description={{ label: "目标"') && heading.includes("value: draft.goal"), "子任务展示自身目标，允许与主任务相同");
  assert.ok(heading.includes("onChange: goal => change({ ...draft, goal })"), "目标编辑同步到当前子任务");
  assert.ok(!heading.includes("titleAction={") && !heading.includes("properties={") && !heading.includes("attributes={"), "标题操作与底部属性复用主卡片外层布局");
  assert.ok(source.includes('{!open && <>'), "收起摘要的图标名称不能在展开时重复出现");
  assert.ok(source.includes('className="task-detail-heading-main"'));
  assert.ok(source.includes('className="task-detail-properties creation-subtask-metadata"'));
  const planning = heading.slice(heading.indexOf('className="creation-subtask-planning"'));
  assert.ok(!heading.includes("effort={"), "预计投入不再占据heading中的单独一行");
  assert.ok(planning.includes("<TaskEffortField") && !planning.includes("creation-subtask-dependency-property"), "前置依赖移到标准下方，预计投入留在属性区");
  assert.ok(heading.indexOf("dependencies={") < heading.indexOf('aria-label={`${label}属性`}'), "前置依赖属于正文而非属性条");
  assert.ok(!source.includes("creation-subtask-field"), "不再使用竖向表单格子");
});

test("创建方案的主任务与子任务均不展示匹配依据行", () => {
  const plan = read("components/TaskCreationPlanEditor.tsx");
  const child = read("components/TaskCreationSubtaskEditor.tsx");
  assert.doesNotMatch(plan, /TaskMemberMatchBasis|匹配依据/);
  assert.doesNotMatch(child, /TaskMemberMatchBasis|匹配依据/);
});

test("右侧展开触发器保持稳定，已同步输入可直接收起，异常输入仍受保护", () => {
  const source = read("components/TaskCreationSubtaskEditor.tsx");
  assert.equal((source.match(/<AccordionTrigger/g) ?? []).length, 1);
  assert.ok(source.includes('className="creation-subtask-header-actions"'));
  assert.ok(source.includes("onAiAdjust(trigger.current)"));
  assert.ok(source.includes("disabled={disabled || dirty || stale}"));
  assert.ok(!source.includes("if (!value && dirty)"));
  assert.ok(source.includes("if (value && !dirty) reload()"));
  assert.ok(source.includes("const accepted = onChange(next, baseline)"));
  assert.ok(source.includes("dirtyCallback.current(dirty || effortDirty)"), "收起不能绕过未同步输入和工时编辑保护");
  assert.ok(!source.includes("onSave="));
  assert.ok(source.includes("dependsOnClientIds.filter(item => item !== id)"));
  const css = read("styles/task-creation-subtask.css");
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
});
