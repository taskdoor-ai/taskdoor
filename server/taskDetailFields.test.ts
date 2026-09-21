import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const read = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");

test("任务头卡与展开子任务复用完整字段组件，而非另做标准表单", () => {
  assert.ok(existsSync(new URL("../src/components/TaskDetailFields.tsx", import.meta.url)));
  for (const file of ["TaskCreationPlanEditor", "TaskCreationSubtaskEditor"]) {
    const source = read(`components/${file}.tsx`);
    assert.match(source, /<TaskDetailFields/);
    assert.doesNotMatch(source, /function CriteriaEditor|creation-subtask-criterion|padStart\(2/);
  }
  assert.match(read("components/TaskDetailFields.tsx"), /<TaskCriteriaFields/);
});

test("通用详情保留主任务头部结构，目标仅在调用方提供时显示", async () => {
  const { TaskDetailFields } = await import("../src/components/TaskDetailFields.tsx");
  const value = { title: "整理项目纪要", completionCriteria: ["纪要包含行动项", "行动项有负责人"], executionTips: [] };
  const labels = { name: "任务名称", criteria: "主任务完成标准" };
  const heading = renderToStaticMarkup(createElement(TaskDetailFields, {
    value, labels, variant: "heading", onChange: () => undefined,
    description: { label: "目标", inputLabel: "任务目标", value: "确认后续行动", onChange: () => undefined },
  }));
  for (const className of ["task-detail-title-row", "task-detail-title-input", "task-detail-description", "task-detail-goal-field"]) assert.ok(heading.includes(className));
  assert.match(heading, /aria-label="主任务完成标准 1"/);
  assert.match(heading, /aria-label="主任务完成标准 2"/);
  const embedded = renderToStaticMarkup(createElement(TaskDetailFields, { value, labels, onChange: () => undefined }));
  assert.match(embedded, /名称/);
  assert.doesNotMatch(embedded, /任务目标|继承主任务目标|task-detail-goal-field|type="checkbox"/);
});

test("单任务不渲染空子任务面板，但保留主动添加分工入口", () => {
  const source = read("components/TaskCreationPlanEditor.tsx");
  assert.match(source, /form\.subtasks\.length > 0 && <section/);
  assert.match(source, /creation-add-subtask-inline/);
  assert.doesNotMatch(source, /creation-no-subtasks|一个清晰的交付，不必拆分/);
  assert.match(source, /newCreationTask/);
});

test("默认调用方不展示执行建议或空占位", async () => {
  const { TaskDetailFields } = await import("../src/components/TaskDetailFields.tsx");
  const labels = { name: "任务名称", criteria: "任务完成标准" };
  for (const variant of ["heading", "embedded"] as const) {
    for (const executionTips of [[], [""], [" ", "\n\t"], ["先核对原始资料"]]) {
      const html = renderToStaticMarkup(createElement(TaskDetailFields, {
        value: { title: "整理纪要", completionCriteria: ["行动项已核对"], executionTips }, labels, variant, onChange: () => undefined,
      }));
      assert.ok(!html.includes("task-detail-tips-editor"), `${variant} 建议不能渲染折叠占位`);
      assert.ok(!html.includes("执行建议"));
      assert.ok(html.includes("完成标准"), "保留其他任务字段");
    }
  }
});

test("创建任务按需恢复执行建议，位于完成标准与预计投入之间", async () => {
  const { TaskDetailFields } = await import("../src/components/TaskDetailFields.tsx");
  for (const variant of ["heading", "embedded"] as const) {
    const html = renderToStaticMarkup(createElement(TaskDetailFields, {
      value: { title: "整理纪要", completionCriteria: ["行动项已核对"], executionTips: ["先核对原始资料", "再记录未决问题"] },
      labels: { name: "任务名称", criteria: "任务完成标准" }, variant, showExecutionTips: true, onChange: () => undefined,
      effort: createElement("span", null, "预计投入"),
    }));
    assert.match(html, /aria-label="执行建议"/);
    assert.match(html, /先核对原始资料\n再记录未决问题/);
    const addCriteriaIndex = html.indexOf('aria-label="添加任务完成标准"');
    assert.ok(addCriteriaIndex >= 0 && addCriteriaIndex < html.indexOf('aria-label="执行建议"'));
    assert.ok(html.indexOf('aria-label="执行建议"') < html.indexOf("预计投入"));
  }
  for (const file of ["TaskCreationPlanEditor", "TaskCreationSubtaskEditor"]) {
    assert.match(read(`components/${file}.tsx`), /<TaskDetailFields[^]*?showExecutionTips/);
  }
  assert.equal((read("components/TaskCreationLinearSections.tsx").match(/<TaskExecutionTipsField/g) ?? []).length, 2);
});

test("执行建议支持空白补充与禁用，展示不会改写原始任务数据", async () => {
  const { TaskDetailFields } = await import("../src/components/TaskDetailFields.tsx");
  const executionTips = ["", "  核对参会人的后续行动  ", ""];
  const before = [...executionTips];
  const html = renderToStaticMarkup(createElement(TaskDetailFields, {
    value: { title: "整理纪要", completionCriteria: ["行动项已核对"], executionTips },
    labels: { name: "任务名称", criteria: "任务完成标准" }, showExecutionTips: true, onChange: () => undefined,
  }));
  assert.match(html, /执行建议/);
  assert.deepEqual(executionTips, before);
  const empty = renderToStaticMarkup(createElement(TaskDetailFields, {
    value: { title: "整理纪要", completionCriteria: [], executionTips: [] },
    labels: { name: "任务名称", criteria: "任务完成标准" }, showExecutionTips: true, disabled: true, onChange: () => assert.fail("禁用时不能修改"),
  }));
  assert.match(empty, /<textarea[^>]*aria-label="执行建议"[^>]*disabled=""[^>]*placeholder="暂无执行建议"/);
});

test("前置依赖在完成标准和执行建议之后、预计投入之前展示", async () => {
  const { TaskDetailFields } = await import("../src/components/TaskDetailFields.tsx");
  const html = renderToStaticMarkup(createElement(TaskDetailFields, {
    value: { title: "直播彩排", completionCriteria: ["完成完整彩排"], executionTips: ["核对直播设备"] },
    labels: { name: "名称", criteria: "完成标准" }, showExecutionTips: true, onChange: () => undefined,
    dependencies: createElement("section", null, "前置依赖"), effort: createElement("span", null, "预计投入"),
  }));
  assert.ok(html.indexOf("完成完整彩排") < html.indexOf("核对直播设备"));
  assert.ok(html.indexOf("核对直播设备") < html.indexOf("前置依赖"));
  assert.ok(html.indexOf("前置依赖") < html.indexOf("预计投入"));
});

test("执行建议多行编辑与清空写回数组，禁用时不触发修改", async () => {
  const { TaskExecutionTipsField } = await import("../src/components/TaskExecutionTipsField.tsx");
  const changes: string[][] = [];
  const field = TaskExecutionTipsField({ values: ["原建议"], onChange: values => changes.push(values) });
  const editor = field.props.children[1];
  editor.props.onChange("先核对统计口径\n再检查排期与备货");
  editor.props.onChange("");
  assert.deepEqual(changes, [["先核对统计口径", "再检查排期与备货"], []]);
  const disabledField = TaskExecutionTipsField({ values: ["原建议"], disabled: true, onChange: () => assert.fail("禁用时不能修改") });
  disabledField.props.children[1].props.onChange("不应写入");
});
