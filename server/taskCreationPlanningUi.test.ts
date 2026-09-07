import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskAiWorking } from "../src/components/TaskAiWorking.tsx";
import { TaskCreationProcess } from "../src/components/TaskCreationProcess.tsx";
import type { CreationProcess } from "../src/lib/taskCreationProgress.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const read = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("局部AI调整的共享轻反馈只展示当前动作、短说明和停止", () => {
  const html = renderToStaticMarkup(createElement(TaskAiWorking, {
    label: "整理任务方案", detail: "整理分工与前置依赖，生成后由你确认。", onCancel: () => {}, cancelLabel: "停止生成方案",
  }));
  assert.equal((html.match(/role="status"/g) ?? []).length, 1);
  assert.match(html, /整理任务方案/);
  assert.match(html, /整理分工与前置依赖/);
  assert.match(html, /aria-label="停止生成方案"/);
  assert.doesNotMatch(html, /<h1|<ol|\saria-current=|role="dialog"|role="log"|aria-valuenow|已展示|后续步骤|等待|已整理/);
});

test("原轻反馈组件保持单步，新建的展开过程不改变其他调用方", () => {
  const labels = ["分析任务", "目标与计划", "成员推荐", "动态规划"];
  for (const label of labels) {
    const html = renderToStaticMarkup(createElement(TaskAiWorking, {
      label, detail: "整理当前候选，生成后由你确认。", onCancel: () => {}, cancelLabel: "停止生成方案",
    }));
    assert.ok(html.includes(label));
    for (const other of labels.filter(item => item !== label)) assert.ok(!html.includes(other));
    assert.equal((html.match(/role="status"/g) ?? []).length, 1);
    assert.equal((html.match(/<button\b/g) ?? []).length, 1);
    assert.match(html, /整理当前候选，生成后由你确认/);
    assert.doesNotMatch(html, /<ol|\saria-current=|aria-valuenow|data-state=|已展示|后续步骤|task-ai-working-basis|task-ai-staged-working/);
  }
  const component = read("components/TaskAiWorking.tsx");
  assert.doesNotMatch(component, /\b(?:steps|activeStep|basis)\b|<ol|aria-current|已展示|后续步骤/);
});

test("停止按钮在当前状态更新时保持同一个组件位置，不被动态key重建", () => {
  const component = read("components/TaskAiWorking.tsx");
  assert.doesNotMatch(component, /key=\{(?:activeStep|label)\}/);
  assert.match(component, /autoFocus/);
  assert.match(component, /onClick=\{onCancel\}/);
});

test("初始生成呈现受页面播放控制的步骤，并把过程快照保留在当前草稿", () => {
  const page = read("components/TaskCreationPage.tsx");
  assert.match(page, /getCreationDisplayStage\(planning/);
  assert.match(page, /displayStage === "planning"/);
  assert.match(page, /processes: CreationProcess\[\]/);
  assert.match(page, /processes: \[\.\.\.current\.processes/);
  assert.match(page, /answers: \{ \.\.\.effectiveAnswers \}, steps: feedback/);
  assert.match(page, /updateProcess\(run, \{ activeStep: index \}\)/);
  assert.match(page, /status: "stopped"/);
  assert.match(page, /status: "failed"/);
  assert.match(page, /<TaskCreationProcess/);
  assert.match(page, /processes=\{pageProcesses\}/);
  assert.match(page, /stepMs: CREATION_MOCK_STEP_MS/);
  assert.match(page, /const cancelProcess = busy \? stopPlanning : adjustmentRunning \? stopAdjustment : undefined/);
  for (const process of page.match(/<TaskCreationProcess\b[^>]+\/>/g) ?? []) {
    assert.match(process, /onCancel=\{cancelProcess\}/);
    assert.doesNotMatch(process, /actions=/);
  }
  assert.match(page, /const pageProcesses = workspace\.processes\.filter\(process => process\.status === "running" && process\.kind !== "adjustment"\)/);
  assert.match(page, /const aiAdjustmentAction =[^;]+<TaskAiAdjustButton/);
  assert.match(page, /creation-page-actions[\s\S]*?\{aiAdjustmentAction\}/);
  assert.doesNotMatch(page, /AI 辅助创建|creation-workflow-bar|creation-ai-adjust-entry/);
  assert.equal((page.match(/<TaskAiAdjustButton\b/g) ?? []).length, 1, "创建页独立提供一个AI入口");
  assert.doesNotMatch(page, /修改需求/);
  assert.doesNotMatch(page, /<AgentWorkflow|TaskCreationConversation|creation-planning-skeleton/);
  assert.match(page, /快速开始/);
  assert.match(page, /<AnimatedAgentChatInput/);
});

const processFixture: CreationProcess = {
  id: 1, title: "初次生成", request: "整理周报", answers: {}, activeStep: 2, status: "running",
  steps: ["分析任务", "目标与计划", "成员推荐", "动态规划"].map(label => ({ label, detail: `${label}的说明`, basis: `${label}的依据` })),
};

test("生成 loading 标题不展示当前阶段或进度计数，保留展开详情和无障碍播报", () => {
  for (const stepCount of [1, 2, 4]) {
    for (let activeStep = 0; activeStep < stepCount; activeStep += 1) {
      const process = { ...processFixture, steps: processFixture.steps.slice(0, stepCount), activeStep };
      const html = renderToStaticMarkup(createElement(TaskCreationProcess, { processes: [process] }));
      const header = html.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0];
      assert.ok(header);
      assert.match(header, /正在思考/);
      assert.match(header, /aria-expanded="true"/);
      assert.doesNotMatch(header, /creation-process-status|分析任务|目标与计划|成员推荐|动态规划|\d+\/\d+/);
      assert.match(html, new RegExp(`${process.steps[activeStep].label}的说明`));
      assert.match(html, /class="sr-only" role="status"/);
      assert.doesNotMatch(html, /进行中/, "运行中的步骤已有 spinner，不重复显示状态文字");
    }
  }
});

test("生成过程只逐步追加已到达步骤，未到达步骤不提前展示", () => {
  const initialHtml = renderToStaticMarkup(createElement(TaskCreationProcess, { processes: [{ ...processFixture, activeStep: 0 }], onCancel: () => {} }));
  assert.equal((initialHtml.match(/data-state="running"/g) ?? []).length, 1);
  assert.equal((initialHtml.match(/data-state="pending"/g) ?? []).length, 0);
  assert.match(initialHtml, /分析任务/);
  assert.doesNotMatch(initialHtml, /目标与计划|成员推荐|动态规划/);
  assert.match(initialHtml, /分析任务 · 1\/4/);

  const html = renderToStaticMarkup(createElement(TaskCreationProcess, { processes: [processFixture], onCancel: () => {} }));
  assert.equal((html.match(/data-state="completed"/g) ?? []).length, 2);
  assert.equal((html.match(/data-state="running"/g) ?? []).length, 1);
  assert.equal((html.match(/data-state="pending"/g) ?? []).length, 0);
  assert.match(html, /成员推荐的说明/);
  assert.match(html, /成员推荐的依据/);
  assert.doesNotMatch(html, /动态规划/);
  assert.match(html, /成员推荐 · 3\/4/);
  assert.doesNotMatch(html, /原始需求|整理周报/);
  assert.match(html, /aria-label="停止生成方案"/);
  assert.doesNotMatch(html, /本地演示的处理步骤与依据|尚未调用真实 AI/);
  assert.match(html, /aria-expanded="true"/);
  assert.equal((html.match(/role="status"/g) ?? []).length, 1);
});

test("完成、停止和失败后的过程不再留在正文，只进入右侧对话历史", () => {
  for (const status of ["completed", "stopped", "failed"] as const) {
    const html = renderToStaticMarkup(createElement(TaskCreationProcess, { processes: [{ ...processFixture, status }] }));
    assert.equal(html, "");
  }
  assert.match(read("components/TaskCreationProcess.tsx"), /if \(!current \|\| current\.status !== "running"\) return null/);
  assert.match(read("components/TaskCreationProcess.tsx"), /return <TaskCreationProcessView onCancel=\{onCancel\} process=\{current\} \/>/);
});

test("补充信息再生成时正文只展示最新运行轮，保留旧快照且不另开计时或调用AI", () => {
  const original = { ...processFixture, status: "completed" as const, activeStep: 3 };
  const next = { ...processFixture, id: 2, title: "补充信息后规划", request: "补充后的需求", answers: { goal: "可核对目标" } };
  const processes = [original, next];
  const before = structuredClone(processes);
  const html = renderToStaticMarkup(createElement(TaskCreationProcess, { processes }));
  assert.doesNotMatch(html, /初次生成/);
  assert.match(html, /补充信息后规划的步骤/);
  assert.equal((html.match(/class="creation-process-run"/g) ?? []).length, 1);
  assert.equal((html.match(/data-state="completed"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /原始需求|整理周报|补充后的需求/);
  assert.match(html, /可核对目标/);
  assert.deepEqual(processes, before, "只改变呈现，不清除或改写历史过程数据");
  const component = read("components/TaskCreationProcess.tsx");
  assert.doesNotMatch(component, /setTimeout|setInterval|playMockAiSteps|fetch\(|已工作.*秒|Thought for|Thinking/);
  assert.match(component, /agent-workflow-trace-toggle/);
  assert.match(component, /agent-workflow-trace-content/);
});

test("关系选择只进入本次对话历史，不顶掉主页面最新生成过程", () => {
  const generated = { ...processFixture, status: "completed" as const, activeStep: 3, outcome: "候选方案已生成" };
  const relationship: CreationProcess = {
    id: "relationship:2", kind: "relationship", title: "确认任务关系", request: "仍然独立规划",
    answers: {}, steps: [], activeStep: 0, status: "completed", responseSummary: "已按独立任务继续整理。",
  };
  const html = renderToStaticMarkup(createElement(TaskCreationProcess, { processes: [generated, relationship] }));
  assert.equal(html, "");
  assert.match(read("components/TaskCreationProcess.tsx"), /find\(process => process\.kind !== "relationship"\)/);
});

test("调整过程只进入右侧历史，AI入口独立于正文生成过程", () => {
  const page = read("components/TaskCreationPage.tsx");
  const process = read("components/TaskCreationProcess.tsx");
  assert.match(page, /workspace\.processes\.filter\(process => process\.status === "running" && process\.kind !== "adjustment"\)/);
  assert.match(page, /creation-page-actions[\s\S]*?\{aiAdjustmentAction\}/);
  assert.equal((page.match(/<TaskAiAdjustButton\b/g) ?? []).length, 1);
  assert.doesNotMatch(process, /TaskCreationProcess\(\{[^}]*\bactions\b|\bactions\?:/);
});

test("发起后输入区收口为右上角 AI 按钮，方案未完成时保持禁用", () => {
  const page = read("components/TaskCreationPage.tsx");
  assert.match(page, /LayoutGroup/);
  assert.equal((page.match(/layoutId="creation-ai-composer"/g) ?? []).length, 2, "输入区和顶部按钮应共享收口动画标识");
  assert.match(page, /const aiAdjustmentAction = !showDescribe\s*\?\s*<motion\.div[\s\S]*?<TaskAiAdjustButton/);
  assert.match(page, /disabled=\{!form \|\| planning\?\.stage !== "review" \|\| busy \|\| adjustmentRunning \|\| hasUnsavedSubtasks \|\| aiOpen\}/);
  assert.match(page, /transition=\{\{ duration: reducedMotion \? 0/);
});

test("展开过程保留创建专属三秒切换，不缩短当前状态的阅读时间", () => {
  const progress = read("lib/taskCreationProgress.ts");
  assert.match(progress, /export const CREATION_MOCK_STEP_MS = 3000;/);
});

test("轻反馈复用活动指示器与Button，触屏保持可操作", () => {
  const component = read("components/TaskAiWorking.tsx");
  const css = read("styles/task-ai-adjustment.css");
  const creationCss = read("styles/task-creation-page.css");
  assert.match(component, /AgentActivityIndicator/);
  assert.match(component, /Button/);
  assert.match(css, /\.task-ai-working/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /pointer: coarse/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.doesNotMatch(css + creationCss, /task-ai-working-steps|task-ai-working-step-mark|task-ai-staged-working|task-ai-working-basis|creation-planning-state|creation-planning-panel|creation-planning-title|creation-planning-body|creation-planning-disclaimer/);
});
