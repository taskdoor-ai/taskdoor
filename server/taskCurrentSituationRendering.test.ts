import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskCurrentSituation } from "../src/components/TaskCurrentSituation.tsx";
import { TaskBurnUpSparkline } from "../src/components/TaskBurnUpSparkline.tsx";
import type { TaskSituationModel } from "../src/lib/taskSituation.ts";

const model: TaskSituationModel = {
  source: "recorded", freshness: "current", asOf: "2026-08-31T09:00:00+08:00", summary: "交付仍需核对结果证据。",
  groups: [
    { id: "delivery", label: "已完成内容", items: [{ text: "交付文件标记已完成，尚未核对全部标准。", reference: { kind: "file", id: "result", label: "查看交付文件" } }] },
    { id: "attention", label: "需要关注", items: [{ text: "缺少异常情况的验证依据。" }] },
    { id: "next", label: "下一步", items: [{ text: "负责人补充验证记录。" }] },
  ],
};

test("详情先展示当前情况，再展示下一步建议", () => {
  const html = renderToStaticMarkup(createElement(TaskCurrentSituation, { model }));
  for (const content of ["当前情况", "交付文件标记已完成", "缺少异常情况的验证依据", "下一步建议"]) assert.ok(html.includes(content));
  assert.doesNotMatch(html, /已完成内容|需要关注|下一步计划/);
  assert.doesNotMatch(html, /查看交付文件|task-situation-reference|task-situation-source-label/);
  assert.match(html, /data-has-trend="false"/);
  assert.doesNotMatch(html, /燃起图|暂无趋势|task-situation-trend|\d+%|checkbox|Mock|示例|依据当前任务记录/);
});

test("当前情况与下一步建议只展示文字，不渲染 reference 跳转入口", () => {
  const listedModel: TaskSituationModel = {
    ...model,
    groups: model.groups.map(group => ({
      ...group,
      items: group.id === "delivery" ? [
        { text: "确认达人名单标记已完成。", reference: { kind: "task", id: "business", label: "查看任务" } },
        { text: "锁定礼盒库存标记已完成。", reference: { kind: "task", id: "product", label: "查看任务" } },
      ] : group.id === "next" ? [
        { text: "核对未收口子任务的结果与下一步。", reference: { kind: "subtasks", label: "查看子任务" } },
      ] : group.items,
    })),
  };
  const html = renderToStaticMarkup(createElement(TaskCurrentSituation, { model: listedModel, onOpenReference: () => {} }));
  assert.equal((html.match(/<ol\b/g) ?? []).length, 1, "只有建议使用有序列表");
  assert.equal((html.match(/<ul\b/g) ?? []).length, 0, "当前情况使用说明段落");
  assert.equal((html.match(/<li\b/g) ?? []).length, 1);
  assert.match(html, /<p class="task-situation-summary">交付仍需核对结果证据。 确认达人名单标记已完成。 锁定礼盒库存标记已完成。 缺少异常情况的验证依据。<\/p>/);
  assert.match(html, /核对未收口子任务的结果与下一步。/);
  assert.doesNotMatch(html, /已完成内容|需要关注|下一步计划/);
  assert.doesNotMatch(html, /查看任务|查看子任务|task-situation-reference|task-situation-source-label/);
});

test("真实趋势保留辅助位置，不展示固定示例变化", () => {
  const html = renderToStaticMarkup(createElement(TaskCurrentSituation, {
    hasBurnUp: true,
    model,
    trend: createElement(TaskBurnUpSparkline, { series: { source: "recorded", points: [
      { at: "2026-08-30", scopeHours: 10, completedHours: 2, estimatedLeafCount: 2, totalLeafCount: 2 },
      { at: "2026-08-31", scopeHours: 10, completedHours: 4, estimatedLeafCount: 2, totalLeafCount: 2 },
    ] } }),
    onOpenReference: () => {},
  }));
  assert.match(html, /data-has-trend="true"/);
  assert.match(html, /data-has-burn-up="true"/);
  for (const label of ["当前情况", "下一步建议", "完成进度", "燃起图"]) assert.match(html, new RegExp(label));
  assert.ok(html.indexOf("当前情况") < html.indexOf("下一步建议"));
  assert.ok(html.indexOf("下一步建议") < html.indexOf("完成进度"));
  assert.ok(html.indexOf("完成进度") < html.indexOf("燃起图"));
  assert.doesNotMatch(html, /完成状态|预计人类工时/);
  assert.doesNotMatch(html, /示例|Mock|固定演示历史|近期变化/);
  assert.doesNotMatch(html, /查看交付文件|task-situation-reference|task-situation-source-label/);
});

test("无历史的当前任务仍保留右侧完成度与燃起图", () => {
  const html = renderToStaticMarkup(createElement(TaskCurrentSituation, {
    model,
    trend: createElement(TaskBurnUpSparkline, {}),
  }));
  assert.match(html, /data-has-trend="true"/);
  assert.match(html, /task-situation-trend/);
  for (const label of ["完成进度", "燃起图", "暂无趋势"]) assert.match(html, new RegExp(label));
  assert.doesNotMatch(html, /进行中/);
});

test("完成进度与燃起图在同一列上下排列", () => {
  const css = readFileSync(new URL("../src/styles/task-situation.css", import.meta.url), "utf8");
  assert.match(css, /\.task-situation\[data-has-trend="true"\] \.task-situation-layout \{ grid-template-columns: minmax\(0, 2\.15fr\) minmax\(240px, 1fr\); \}/);
  assert.match(css, /\.task-situation-trend \.task-burnup \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.task-situation-trend \.task-burnup-visual \{[^}]*border-top:/);
  assert.doesNotMatch(css, /\.task-situation-trend \{[^}]*grid-column: span 2/);
});

test("旧示例模型不能隐藏来源后冒充当前事实", () => {
  const html = renderToStaticMarkup(createElement(TaskCurrentSituation, {
    model: { ...model, source: "example", summary: "硬编码交付结论" },
    trend: createElement("div", null, "硬编码趋势"),
  }));
  assert.match(html, /暂无可用的进展记录/);
  assert.doesNotMatch(html, /硬编码交付结论|硬编码趋势|已有交付记录|Mock|示例/);
});

test("摘要已说明缺口时，不再叠加重复的技术状态说明", () => {
  const html = renderToStaticMarkup(createElement(TaskCurrentSituation, { model: { ...model, freshness: "missing", notice: "当前资料不足，尚无完整分析；缺少依据不等于没有风险。" } }));
  assert.match(html, /交付仍需核对结果证据/);
  assert.doesNotMatch(html, /进展信息不足|当前资料不足|尚无完整分析/);
});

test("过期与信息不足可见，空分组不会制造正常或已完成结论", () => {
  const stale = renderToStaticMarkup(createElement(TaskCurrentSituation, { model: { ...model, freshness: "stale", notice: "任务记录已变化，请重新核对。" } }));
  assert.match(stale, /摘要待核对/);
  assert.match(stale, /任务记录已变化/);
  const empty = renderToStaticMarkup(createElement(TaskCurrentSituation, { model: { source: "recorded", freshness: "missing", summary: "尚未收到执行进展。", groups: [] } }));
  assert.match(empty, /尚未收到执行进展/);
  assert.doesNotMatch(empty, /下一步建议|暂无可用建议|task-situation-next/);
  assert.doesNotMatch(empty, /需要关注|无风险|已完成|Mock 示例/);
});

test("只有记录日期时也不显示截至时间", () => {
  const html = renderToStaticMarkup(createElement(TaskCurrentSituation, { model: { ...model, asOf: "2026-08-31" } }));
  assert.doesNotMatch(html, /截至|<time\b|8\/31/);
  assert.doesNotMatch(html, /08:00|00:00/);
});

test("当前情况不显示最近讨论时间，也不将其改标为分析截止时间", () => {
  const html = renderToStaticMarkup(createElement(TaskCurrentSituation, { model: { ...model, asOfSource: "discussion" } }));
  assert.doesNotMatch(html, /最近讨论|截至|<time\b/);
});

test("当前情况不显示数据截至日期，正文不变",()=>{
  for(const asOfSource of [undefined,"discussion","progress"] as const){
    const html=renderToStaticMarkup(createElement(TaskCurrentSituation,{model:{...model,asOf:"2026-09-14",asOfSource}}));
    assert.doesNotMatch(html,/截至|<time\b|2026-09-14|9\/14/);
    assert.ok(html.includes(model.summary));
    for(const group of model.groups)for(const item of group.items)assert.ok(html.includes(item.text));
  }
});
