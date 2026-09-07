import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PersonOption } from "../src/data/sharedTypes.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const load = async () => {
  assert.ok(existsSync(new URL("../src/lib/taskCollaborationSchedule.ts", import.meta.url)), "应提供只读排期依据函数");
  return (await import("../src/lib/taskCollaborationSchedule.ts")).describeTaskCollaborationSchedule;
};
const member = (id: string, overrides: Partial<PersonOption> = {}): PersonOption => ({ id, name: id, email: `${id}@example.test`, role: "内容策划", ...overrides });
const task = { clientId: "current", title: "交付直播脚本", ownerId: "林洁", participantIds: ["苏禾"], startDate: "2026-09-01", endDate: "2026-09-10", dependsOnClientIds: [] as string[] };
const candidate = (clientId: string, overrides = {}) => ({ clientId, title: clientId, ownerId: "林洁", participantIds: [] as string[], startDate: "2026-09-01", endDate: "2026-09-05", ...overrides });

test("排期依据统一采用成员资料文案，保留待确认信息和用户原文", async () => {
  const component = readFileSync(new URL("../src/components/TaskCollaborationSchedule.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(component, /showDemoAnnotations|示例资料/);
  assert.match(component, /report\.sourceLabel/);
  assert.match(component, /实际忙闲未知，排期待成员确认/);
  assert.doesNotMatch(component, /\.replace(?:All)?\(/, "不改写成员填写的资料");
  const describe = await load();
  const profile = member("林洁", { currentWork: ["准备示例文档", "核对 Mock 接口"] });
  const report = describe(task, [profile]);
  assert.equal(report.sourceLabel, "成员资料 · 更新时间未提供", "来源文案统一");
  assert.deepEqual(report.owner?.currentWork, profile.currentWork);
  assert.ok(report.limitations.some(line => line.includes("待接受")));
  assert.ok(report.limitations.some(line => line.includes("未核对真实日历")));
});

test("只分组当前任务的负责人和参与人，去重且不把负责人重复列为参与人", async () => {
  const describe = await load();
  const report = describe({ ...task, participantIds: ["林洁", "苏禾", "苏禾", ""] }, [member("林洁"), member("苏禾"), member("无关成员")]);
  assert.equal(report.owner?.id, "林洁");
  assert.deepEqual(report.participants.map(person => person.id), ["苏禾"]);
  assert.doesNotMatch(JSON.stringify(report), /无关成员/);
  assert.equal(report.status, "pending");
  assert.equal(report.statusLabel, "排期待确认");
});

test("示例职责、可投入描述和当前工作保留原文，不换算人时或人均负荷", async () => {
  const describe = await load();
  const profile = member("林洁", { dynamicResponsibility: "卖点提炼、短视频脚本与素材交付", availability: "任务周期内可投入约 1.5 天，素材初稿需提前评审", currentWork: ["提炼产品核心卖点", "准备短视频素材模板"] });
  const report = describe(task, [profile]);
  assert.equal(report.owner?.responsibility, profile.dynamicResponsibility);
  assert.equal(report.owner?.availability, profile.availability);
  assert.deepEqual(report.owner?.currentWork, profile.currentWork);
  assert.equal(report.sourceLabel, "成员资料 · 更新时间未提供");
  assert.ok(report.limitations.includes("缺少可用工作时段，未核对真实日历。"));
  assert.ok(report.limitations.includes("人选待接受，候选分工不代表已承诺排期。"));
  assert.doesNotMatch(JSON.stringify(report), /12 小时|8h|人均|可用率|负荷率|实时空闲/);
});

test("缺成员或缺资料表示未知，空 currentWork 不表示没有工作", async () => {
  const describe = await load();
  const report = describe(task, [member("苏禾", { role: "", availability: " ", currentWork: [] })]);
  assert.equal(report.owner?.name, "未知成员");
  assert.equal(report.owner?.profileKnown, false);
  assert.equal(report.owner?.availability, null);
  assert.equal(report.owner?.responsibility, null);
  assert.equal(report.owner?.currentWork, null);
  assert.equal(report.participants[0].role, null);
  assert.equal(report.participants[0].currentWork, null);
  assert.equal(report.participants[0].availability, null);
});

test("未选择负责人和参与人不伪造默认人选或空闲容量", async () => {
  const describe = await load();
  const report = describe({ ...task, ownerId: "", participantIds: [] }, [member("林洁")]);
  assert.equal(report.owner, null);
  assert.deepEqual(report.participants, []);
  assert.equal(report.status, "pending");
  assert.doesNotMatch(JSON.stringify(report), /0 小时|空闲|排期可行|已排定/);
});

test("availability 的可用或休假关键词不会改变排期状态", async () => {
  const describe = await load();
  for (const availability of ["本周可安排 100 小时", "已满，没有空档，休假", "完全空闲", "未知"]) {
    const report = describe(task, [member("林洁", { availability })]);
    assert.equal(report.status, "pending");
    assert.equal(report.owner?.availability, availability);
    assert.equal(report.statusLabel, "排期待确认");
  }
});

test("同方案其他负责项按 clientId 排除本任务，不把仅参与项记为负责", async () => {
  const describe = await load();
  const report = describe(task, [member("林洁"), member("苏禾")], [
    candidate("current", { title: "交付直播脚本" }),
    candidate("another", { title: "素材初审" }),
    candidate("participating", { title: "仅参与的任务", ownerId: "其他人", participantIds: ["林洁"] }),
    candidate("compliance", { title: "合规审查", ownerId: "苏禾" }),
    candidate("another", { title: "重复记录" }),
  ]);
  assert.deepEqual(report.owner?.otherTasks, [{ clientId: "another", title: "素材初审" }]);
  assert.deepEqual(report.participants[0].otherTasks, [{ clientId: "compliance", title: "合规审查" }]);
  assert.ok(report.limitations.some(line => line.includes("不代表已承诺排期")));
});

test("没有当前任务稳定 ID 时不按重名猜测其他负责项", async () => {
  const describe = await load();
  const { clientId: _clientId, ...withoutId } = task;
  const report = describe(withoutId, [member("林洁")], [candidate("current", { title: task.title })]);
  assert.equal(report.owner?.otherTasks, null);
});

test("只提示真实前置项的有效截止倒置，不称绝对冲突", async () => {
  const describe = await load();
  const report = describe({ ...task, dependsOnClientIds: ["late", "late", "early"] }, [member("林洁")], [
    candidate("late", { title: "确认脚本方向", endDate: "2026-09-11" }),
    candidate("early", { title: "整理产品资料", endDate: "2026-09-02" }),
    candidate("unrelated", { endDate: "2026-09-30" }),
  ]);
  assert.equal(report.status, "review-dependencies");
  assert.equal(report.statusLabel, "需核对前置时间");
  assert.equal(report.dependencies.length, 2);
  assert.equal(report.dependencies[0].needsReview, true);
  assert.equal(report.dependencies[0].message, "前置任务「确认脚本方向」截止晚于本任务，需核对交付时间。");
  assert.equal(report.dependencies[1].needsReview, false);
  assert.doesNotMatch(JSON.stringify(report.dependencies), /unrelated|冲突|无法完成|必须延期/);
});

test("相同截止不推断已衔接，缺失前置和日期不伪造有效排期", async () => {
  const describe = await load();
  const report = describe({ ...task, dependsOnClientIds: ["same", "no-date", "missing"] }, [], [
    candidate("same", { endDate: task.endDate }),
    candidate("no-date", { endDate: "" }),
  ]);
  assert.equal(report.status, "pending");
  assert.equal(report.dependencies[0].needsReview, false);
  assert.match(report.dependencies[0].message, /衔接仍待确认/);
  assert.match(report.dependencies[1].message, /未设固定截止/);
  assert.equal(report.dependencies[2].title, "前置任务资料未知");
  assert.match(report.dependencies[2].message, /不在当前方案/);
});

test("无固定截止有明确类型，非法日期不参加先后比较", async () => {
  const describe = await load();
  const noDeadline = describe({ ...task, endDate: "", dependsOnClientIds: ["late"] }, [], [candidate("late", { endDate: "2030-12-31" })]);
  assert.equal(noDeadline.dateLabel, "不设固定时间");
  assert.equal(noDeadline.status, "pending");
  const invalid = describe({ ...task, endDate: "2026-02-30", dependsOnClientIds: ["late"] }, [], [candidate("late", { endDate: "2026-03-01" })]);
  assert.equal(invalid.dateLabel, "截止时间待核对");
  assert.equal(invalid.status, "pending");
  assert.ok(invalid.dateNotes.includes("截止日期无效，需核对。"));
  const invalidDependency = describe({ ...task, dependsOnClientIds: ["invalid"] }, [], [candidate("invalid", { endDate: "2026-13-01" })]);
  assert.equal(invalidDependency.status, "pending");
  assert.match(invalidDependency.dependencies[0].message, /截止日期无效/);
});

test("日期跨年正确比较，任务本身日期倒置仅提示核对", async () => {
  const describe = await load();
  const report = describe({ ...task, startDate: "2027-01-03", endDate: "2027-01-01", dependsOnClientIds: ["previous-year"] }, [], [candidate("previous-year", { endDate: "2026-12-31" })]);
  assert.equal(report.status, "pending");
  assert.ok(report.dateNotes.includes("本任务开始日期晚于截止日期，需核对。"));
  assert.equal(report.dependencies[0].needsReview, false);
});

test("计算只读，不改变任务、成员或同方案候选数据", async () => {
  const describe = await load();
  const members = [member("林洁", { currentWork: ["事项 A"] })];
  const tasks = [candidate("other")];
  const before = JSON.stringify({ task, members, tasks });
  describe(task, members, tasks);
  assert.equal(JSON.stringify({ task, members, tasks }), before);
});

test("默认只呈现排期依据入口，禁用态不可触发浮层", async () => {
  assert.ok(existsSync(new URL("../src/components/TaskCollaborationSchedule.tsx", import.meta.url)), "应有按需排期依据浮层");
  const { TaskCollaborationSchedule } = await import("../src/components/TaskCollaborationSchedule.tsx");
  const props = { task, members: [member("林洁")] };
  const html = renderToStaticMarkup(createElement(TaskCollaborationSchedule, props));
  assert.match(html, /排期依据/);
  assert.match(html, /aria-label="查看交付直播脚本的排期依据"/);
  assert.match(html, /data-slot="popover-trigger"/);
  assert.doesNotMatch(html, /<dialog|可投入描述|当前工作/);
  const disabled = renderToStaticMarkup(createElement(TaskCollaborationSchedule, { ...props, disabled: true }));
  assert.match(disabled, /disabled=""/);
});

test("浮层复用既有控件、提供关闭与未知提示，不新增指派或日历请求", () => {
  assert.ok(existsSync(new URL("../src/components/TaskCollaborationSchedule.tsx", import.meta.url)));
  const component = readFileSync(new URL("../src/components/TaskCollaborationSchedule.tsx", import.meta.url), "utf8");
  assert.ok(component.includes("PopoverClose"));
  assert.ok(component.includes("PersonAvatar"));
  assert.ok(component.includes("showProfilePreview={false}"));
  assert.ok(component.includes("describeTaskCollaborationSchedule"));
  assert.ok(!component.includes("示例资料"));
  assert.ok(component.includes("未知，未提供"));
  assert.ok(component.includes("disabled={disabled}"));
  assert.ok(/className="task-schedule-body"[^>]*tabIndex=\{0\}/.test(component), "长浮层的滚动正文可获得键盘焦点");
  assert.ok(!/fetch\(|onAssign|onDateChange|availabilityStatus/.test(component));
  const css = readFileSync(new URL("../src/styles/task-collaboration-schedule.css", import.meta.url), "utf8");
  assert.ok(css.includes("max-height"));
  assert.ok(css.includes("overflow-y: auto"));
  assert.ok(css.includes(":focus-visible"));
  assert.ok(css.includes("--ad-control-touch-min"));
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(!css.includes('.task-schedule-trigger[data-slot="button"]'), "复合触发器的真实 slot 为 popover-trigger，样式不得限定为 button");
  assert.ok(!css.includes('.task-schedule-close[data-slot="button"]'), "关闭按钮复合后使用 popover-close slot");
});
