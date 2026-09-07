import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTaskMemberRecommendations } from "../src/lib/taskMemberRecommendations.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const members = [
  { id: "content", name: "林洁", email: "content@example.com", role: "内容策划", dynamicResponsibility: "卖点提炼、脚本与素材交付" },
  { id: "data", name: "韩序", email: "data@example.com", role: "数据分析", dynamicResponsibility: "指标与看板" },
];
const recommendations = createTaskMemberRecommendations({ members, taskText: "完成卖点脚本与素材" });

test("依据与当前负责人同步，换人或取消后不残留前一位理由", async () => {
  const { TaskMemberMatchBasis } = await import("../src/components/TaskMemberMatchBasis.tsx");
  const render = (ownerId: string) => renderToStaticMarkup(createElement(TaskMemberMatchBasis, { label: "主任务匹配依据", members, recommendations, task: { ownerId, participantIds: [] } }));
  assert.match(render("content"), /匹配依据.*林洁.*直接匹配/s);
  const switched = render("data");
  assert.match(switched, /韩序.*缺少直接命中/s);
  assert.doesNotMatch(switched, /林洁|直接匹配/);
  assert.match(render(""), /暂未分配/);
  assert.doesNotMatch(render(""), /林洁|韩序|直接匹配/);
});

test("参与人的依据随名单变化，去重且负责人不重复展示", async () => {
  const { TaskMemberMatchBasis } = await import("../src/components/TaskMemberMatchBasis.tsx");
  const render = (participantIds: string[]) => renderToStaticMarkup(createElement(TaskMemberMatchBasis, { members, recommendations, task: { ownerId: "content", participantIds } }));
  const html = render(["content", "data", "data"]);
  assert.equal((html.match(/<p/g) ?? []).length, 1);
  assert.equal((html.match(/林洁/g) ?? []).length, 1);
  assert.equal((html.match(/韩序/g) ?? []).length, 1);
  assert.doesNotMatch(html, /负责人候选|参与人候选/);
  assert.doesNotMatch(render([]), /韩序/);
});

test("匹配依据合并为简短总结，不再逐人罗列候选说明", async () => {
  const { TaskMemberMatchBasis } = await import("../src/components/TaskMemberMatchBasis.tsx");
  const html = renderToStaticMarkup(createElement(TaskMemberMatchBasis, {
    label: "主任务匹配依据",
    members,
    recommendations,
    task: { ownerId: "content", participantIds: ["data"] },
  }));
  assert.equal((html.match(/<p/g) ?? []).length, 1);
  assert.match(html, /林洁.*卖点.*韩序.*数据.*实际排期/s);
  assert.doesNotMatch(html, /负责人候选|参与人候选/);
});

test("任务或成员责任变更后采用最新依据；不可用成员不泄露 ID 或沿用旧推荐", async () => {
  const { TaskMemberMatchBasis } = await import("../src/components/TaskMemberMatchBasis.tsx");
  const html = renderToStaticMarkup(createElement(TaskMemberMatchBasis, {
    members, recommendations: createTaskMemberRecommendations({ members, taskText: "交付数据指标与看板" }), task: { ownerId: "data", participantIds: [] },
  }));
  assert.match(html, /韩序.*直接匹配/s);
  const missing = renderToStaticMarkup(createElement(TaskMemberMatchBasis, { members: [], recommendations, task: { ownerId: "private-id", participantIds: ["content"] } }));
  assert.match(missing, /成员不可用.*待核对/s);
  assert.doesNotMatch(missing, /private-id|林洁|直接匹配/);
});
