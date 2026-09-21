import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createManualEffortEstimate, formatEffortMinutes, parseEffortHours } from "../src/lib/taskEffort.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const scope = { goal: "形成结论", completionCriteria: ["核对结论"], executionTips: ["AI起草，人工复核"] };
const estimate = createManualEffortEstimate(scope, { minutes: 90, workMethod: "AI起草，人工复核", reason: "含准备、审核及协作的人类投入" });
const task = { ...scope, effortEstimate: estimate };
const visible = (html: string) => html.replace(/<[^>]+>/g, "");

async function components() {
  assert.ok(existsSync(new URL("../src/components/TaskEffortField.tsx", import.meta.url)), "需要共享的 EWD 编辑与读数控件");
  return import("../src/components/TaskEffortField.tsx");
}

test("展示工时保留分钟精度，不输出冗长循环小数", () => {
  assert.equal(formatEffortMinutes(90), "1.5 h");
  assert.equal(formatEffortMinutes(75), "1.25 h");
  assert.equal(formatEffortMinutes(10), "10 min");
  assert.equal(formatEffortMinutes(70), "1 h 10 min");
  assert.equal(formatEffortMinutes(1), "1 min");
  assert.equal(formatEffortMinutes(2), "2 min");
  assert.equal(formatEffortMinutes(0), "0 h");
  assert.equal(formatEffortMinutes(null), "待估算");
});

test("合法大分钟值的显示仍无损，不因浮点小时进位丢失精度", () => {
  for (let minutes = Number.MAX_SAFE_INTEGER - 60; minutes <= Number.MAX_SAFE_INTEGER; minutes += 1) {
    if (minutes % 3 === 0) {
      assert.equal(parseEffortHours(formatEffortMinutes(minutes).replace(/ h$/u, "")), minutes);
    } else {
      assert.equal(formatEffortMinutes(minutes), `${BigInt(minutes) / 60n} h ${BigInt(minutes) % 60n} min`);
    }
  }
});

test("预估读数用中文近似值，区分手工、AI与普通预估", async () => {
  const { TaskEffortValue } = await components();
  const confirmed = visible(renderToStaticMarkup(createElement(TaskEffortValue, { task })));
  assert.match(confirmed, /约 0\.19 人天.*已确认.*手工预估.*仅供参考/);
  assert.doesNotMatch(confirmed, /AI 预估|EWD/);
  const proposed = visible(renderToStaticMarkup(createElement(TaskEffortValue, { task: { ...task, effortEstimate: { ...estimate, confirmed: false, basis: "model" } } })));
  assert.match(proposed, /约 0\.19 人天.*待确认.*AI 预估 · 仅供参考/);
  assert.doesNotMatch(proposed, /示例/);
  const mock = visible(renderToStaticMarkup(createElement(TaskEffortValue, { task: { ...task, effortEstimate: { ...estimate, confirmed: false, basis: "mock" } } })));
  assert.match(mock, /约 0\.19 人天.*待确认.*预估 · 仅供参考/);
  const minute = visible(renderToStaticMarkup(createElement(TaskEffortValue, { task: { ...task, effortEstimate: { ...estimate, minutes: 1 } } })));
  assert.match(minute, /约 &lt;0.01 人天/);
  assert.doesNotMatch(minute, /0\.0166|\bmin\b/);
});

test("所有预估入口统一移除演示注释，保留来源与确认状态", async () => {
  const { TaskEffortValue, TaskEffortField, TaskEffortSummary } = await components();
  const mockTask = { ...task, effortEstimate: { ...estimate, basis: "mock" as const, confirmed: false } };
  const before = structuredClone(mockTask);
  const value = visible(renderToStaticMarkup(createElement(TaskEffortValue, { task: mockTask })));
  const field = visible(renderToStaticMarkup(createElement(TaskEffortField, { task: mockTask, label: "创建任务" })));
  const summary = visible(renderToStaticMarkup(createElement(TaskEffortSummary, { tasks: [task, mockTask] })));
  for (const text of [value, field, summary]) {
    assert.match(text, /待确认.*预估 · 仅供参考/);
    assert.doesNotMatch(text, /Mock|示例|AI 预估/);
  }
  const manual = visible(renderToStaticMarkup(createElement(TaskEffortValue, { task })));
  assert.match(manual, /已确认.*手工预估/);
  assert.deepEqual(mockTask, before, "隐藏注释不得修改工时、来源、版本或确认状态");
  const source = readFileSync(new URL("../src/components/TaskEffortField.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /showDemoAnnotations|示例数据/);
});

test("未知不显示裸数字为有效EWD，过期读数明确标为旧估算", async () => {
  const { TaskEffortValue } = await components();
  const unknown = visible(renderToStaticMarkup(createElement(TaskEffortValue, { task: { ...task, effortEstimate: { ...estimate, reason: "" } } })));
  assert.match(unknown, /待估算/);
  assert.doesNotMatch(unknown, /1\.5|已确认|AI 预估/);
  const stale = visible(renderToStaticMarkup(createElement(TaskEffortValue, { task: { ...task, goal: "新增交付" }, compact: true })));
  assert.match(stale, /旧估约 0\.19 人天.*需复核/);
});

test("叶子汇总主行标明已估部分，覆盖数字与口径按需查看", async () => {
  const { TaskEffortSummary } = await components();
  const partialHtml = renderToStaticMarkup(createElement(TaskEffortSummary, { tasks: [task, scope] }));
  const partial = visible(partialHtml);
  assert.match(partial, /预估投入.*已估部分约 0\.19 人天.*待补全/);
  assert.doesNotMatch(partial, /EWD|1\/2|日历工期|项已确认/);
  assert.match(partialHtml, /aria-label="查看预估投入说明"/);
  assert.match(partialHtml, /aria-haspopup="dialog"/);
  const unknown = visible(renderToStaticMarkup(createElement(TaskEffortSummary, { tasks: [scope] })));
  assert.match(unknown, /待估算/);
  assert.doesNotMatch(unknown, /约 0 人天/);
  const zero = visible(renderToStaticMarkup(createElement(TaskEffortSummary, { tasks: [{ ...task, effortEstimate: { ...estimate, minutes: 0 } }] })));
  assert.match(zero, /预估投入.*约 0 人天.*已确认.*仅供参考/);
  assert.doesNotMatch(zero, /待补全|待估算/);
  const stale = visible(renderToStaticMarkup(createElement(TaskEffortSummary, { tasks: [task, { ...task, goal: "范围已变" }] })));
  assert.match(stale, /已估部分约 0\.19 人天.*需复核/);
  assert.doesNotMatch(stale, /约 0.38 人天/);
});

test("汇总保留参考性质，混合来源不全部归为AI", async () => {
  const { TaskEffortSummary } = await components();
  const mockTask = { ...task, effortEstimate: { ...estimate, confirmed: false, basis: "mock" as const } };
  const mock = visible(renderToStaticMarkup(createElement(TaskEffortSummary, { tasks: [mockTask, mockTask] })));
  assert.match(mock, /预估投入.*约 0.38 人天.*待确认.*预估 · 仅供参考/);
  assert.doesNotMatch(mock, /EWD|2\/2|0\/2/);
  const proposed = visible(renderToStaticMarkup(createElement(TaskEffortSummary, { tasks: [task, { ...mockTask, effortEstimate: { ...mockTask.effortEstimate, basis: "model" } }] })));
  assert.match(proposed, /约 0.38 人天.*待确认.*含 AI 预估 · 仅供参考/);
  assert.doesNotMatch(proposed, /示例/);
});

test("人工确认后仍是参考估计，空列表与未知不伪装成0", async () => {
  const { TaskEffortSummary } = await components();
  const confirmed = visible(renderToStaticMarkup(createElement(TaskEffortSummary, { tasks: [task, task] })));
  assert.match(confirmed, /预估投入.*约 0.38 人天.*已确认.*手工预估 · 仅供参考/);
  assert.doesNotMatch(confirmed, /AI 预估|示例|待估算|EWD/);
  for (const tasks of [[], [scope]]) {
    const unknown = visible(renderToStaticMarkup(createElement(TaskEffortSummary, { tasks })));
    assert.match(unknown, /待估算/);
    assert.doesNotMatch(unknown, /约 0 人天|已确认/);
  }
});

test("字段显示紧凑EWD入口，无修改权限仍可查看依据", async () => {
  const { TaskEffortField } = await components();
  const html = renderToStaticMarkup(createElement(TaskEffortField, { task, label: "子任务 1" }));
  assert.match(visible(html), /预计投入.*约 0\.19 人天/);
  assert.doesNotMatch(visible(html), /子任务 1|EWD|预计总投入/);
  assert.equal((visible(html).match(/预计投入/g) ?? []).length, 1);
  assert.match(html, /aria-label="查看子任务 1预估投入"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.doesNotMatch(html, /disabled=""/);
  const editable = renderToStaticMarkup(createElement(TaskEffortField, { task, label: "子任务 2", onChange: () => undefined }));
  assert.match(editable, /aria-label="子任务 2预计人天"/);
  assert.match(editable, /role="spinbutton"/);
  assert.match(editable, /value="0.1875"/);
  assert.doesNotMatch(editable, /aria-haspopup="dialog"|确认估算|仅供参考|待确认/);
});

test("人天计数器保留未知与零的区别，禁用时不能加减", async () => {
  const { TaskEffortField } = await components();
  const unknown = renderToStaticMarkup(createElement(TaskEffortField, { task: scope, label: "未知任务", onChange: () => undefined }));
  assert.match(unknown, /placeholder="待估算"/);
  assert.match(unknown, /value=""/);
  const zero = renderToStaticMarkup(createElement(TaskEffortField, { task: { ...task, effortEstimate: { ...estimate, minutes: 0 } }, label: "零投入", onChange: () => undefined }));
  assert.match(zero, /value="0"/);
  const locked = renderToStaticMarkup(createElement(TaskEffortField, { task, label: "锁定任务", disabled: true, onChange: () => undefined }));
  assert.equal((locked.match(/<(?:input|button)\b[^>]*\sdisabled=""/g) ?? []).length, 3);
});

test("有子任务的总投入只读，只有一个子任务也不能编辑", async () => {
  const { TaskEffortEditor } = await import("../src/components/TaskEffortEditor.tsx");
  const tasks = [{ ...task, id: "one" }, { ...task, id: "two" }];
  for (const items of [tasks, tasks.slice(0, 1)]) {
    const html = renderToStaticMarkup(createElement(TaskEffortEditor, { tasks: items, hasSubtasks: true, label: "主任务", onChange: () => assert.fail("合计不能触发修改") }));
    assert.match(visible(html), /子任务合计/);
    assert.match(visible(html), items.length === 2 ? /0\.38 人天/ : /0\.19 人天/);
    assert.doesNotMatch(html, /<input|<button|spinbutton|aria-haspopup="dialog"/);
  }
});

test("无子任务时保留计数器，合计缺少估算时不伪装成零", async () => {
  const { TaskEffortEditor } = await import("../src/components/TaskEffortEditor.tsx");
  const html = renderToStaticMarkup(createElement(TaskEffortEditor, { tasks: [{ ...task, id: "one" }], hasSubtasks: false, onChange: () => undefined }));
  assert.match(html, /role="spinbutton"/);
  assert.doesNotMatch(html, /子任务合计/);
  const partial = visible(renderToStaticMarkup(createElement(TaskEffortEditor, { tasks: [{ ...task, id: "one" }, { ...scope, id: "unknown" }], hasSubtasks: true })));
  assert.match(partial, /已估部分 0\.19 人天.*子任务合计 · 待补全/);
  const unknown = visible(renderToStaticMarkup(createElement(TaskEffortEditor, { tasks: [{ ...scope, id: "unknown" }], hasSubtasks: true })));
  assert.match(unknown, /待估算.*子任务合计 · 待补全/);
  assert.doesNotMatch(unknown, /0 人天/);
});
