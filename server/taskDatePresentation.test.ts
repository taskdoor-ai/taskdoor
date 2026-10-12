import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../src/shared/i18n/I18nProvider.tsx";
import { TaskDueDatePicker } from "../src/features/tasks/components/TaskDueDatePicker.tsx";
import { TaskDateRangePicker } from "../src/features/tasks/components/TaskDateRangePicker.tsx";
import { TaskFileHistory } from "../src/features/tasks/files/components/TaskFileHistory.tsx";
import { TaskCreationExistingTaskCard } from "../src/features/tasks/components/TaskCreationExistingTaskCard.tsx";
import { TaskBurnUpDateAxis, layoutBurnUpDateAxis } from "../src/features/tasks/components/TaskBurnUpTiming.tsx";
import { activityChangeValue } from "../src/features/tasks/i18n/activity-display.ts";
import { getTaskProgressDisplay } from "../src/features/tasks/lib/task-progress-display.ts";
import { taskProgressComparisonExamples } from "../src/ai/mock/data/taskProgressComparisonExamples.ts";
import type { Locale } from "../src/shared/i18n/core.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const render = (locale: Locale, content: React.ReactNode) => renderToStaticMarkup(React.createElement(I18nProvider, { initialLocale: locale, children: content }));

test("任务日历字段中英文使用相同月份缩写，日期型值不补AMPM且保留ISO属性", () => {
  for (const locale of ["zh-CN", "en"] as const) {
    const due = render(locale, React.createElement(TaskDueDatePicker, { initialValue: "2025-09-20" }));
    assert.match(due, /dateTime="2025-09-20" title="Sep 20, 2025">Sep 20, 2025<\/time>/);
    assert.doesNotMatch(due, /AM|PM|2025\s*\/\s*09/);
    const range = render(locale, React.createElement(TaskDateRangePicker, { initialStart: "2025-09-20", initialEnd: "2025-09-21" }));
    assert.match(range, /dateTime="2025-09-20"/);
    assert.match(range, /Sep 20, 2025/);
    assert.match(range, /Sep 21, 2025/);
  }
});

test("文件版本瞬时时间使用本地AMPM，已有任务的无年份Mock只转换月份写法", () => {
  const at = new Date(2026, 8, 14, 17, 30).toISOString();
  for (const locale of ["zh-CN", "en"] as const) {
    const history = render(locale, React.createElement(TaskFileHistory, { onClose: () => {}, version: 2, revisions: [{ id: "saved", author: "Writer", createdAt: at, baseVersion: 1, version: 2, changes: [] }] }));
    assert.match(history, /title="Sep 14, 2026, 5:30 PM">Sep 14, 5:30 PM<\/time>/);
    assert.ok(history.includes(`dateTime="${at}"`));
    const card = render(locale, React.createElement(TaskCreationExistingTaskCard, { kind: "similar", reason: "Existing task", tags: [], task: { id: "existing", title: "Existing", dueAt: "9 月 14 日" } }));
    assert.match(card, />Sep 14<\/span>/);
    assert.doesNotMatch(card, /Sep 14, \d{4}|AM|PM/);
  }
});

test("活动与AI差异只转换结构化日期字段和确认时刻，用户正文保持原文", () => {
  for (const locale of ["zh-CN", "en"] as const) {
    assert.equal(activityChangeValue(locale, "截止时间", "2025-09-14"), "Sep 14, 2025");
    assert.equal(activityChangeValue(locale, "截止时间", "9月14日 17:30"), "Sep 14, 5:30 PM");
    const at = new Date(2026, 8, 14, 17, 30).toISOString();
    assert.equal(activityChangeValue(locale, "criterion", `Writer · ${at}`), "Writer · Sep 14, 5:30 PM");
    assert.equal(activityChangeValue(locale, "目标", "在2025-09-14交付，引用正文9月14日 17:30"), "在2025-09-14交付，引用正文9月14日 17:30");
  }
});

test("英文月份轴标签变宽后仍按真实日期定位，跨年标签不重叠", () => {
  const model = getTaskProgressDisplay({ series: structuredClone(taskProgressComparisonExamples.find(item => item.id === "behind")!) });
  const layout = layoutBurnUpDateAxis({ model: { ...model, startOn: "2025-12-30", asOf: "2025-12-31", dueOn: "2026-01-01", finishOn: "2026-01-02" }, start: "2025-12-30", end: "2026-01-02", asOf: "2025-12-31", startX: 0, endX: 120, asOfX: 40, dueX: 80, finishX: 120 });
  const at = new Map(layout.labels.map(label => [label.date, label]));
  assert.equal(at.get("2025-12-30")?.labelX, 0);
  assert.equal(at.get("2026-01-01")?.labelX, 80);
  for (const label of layout.labels) assert.ok(layout.labels.every(other => other === label || other.row !== label.row || other.right + 4 <= label.left || label.right + 4 <= other.left));
  const html = render("zh-CN", React.createElement(TaskBurnUpDateAxis, { layout, y: 100 }));
  assert.match(html, />Dec 30, 2025<\/text>/);
  assert.match(html, />Jan 1<\/text>/);
});
