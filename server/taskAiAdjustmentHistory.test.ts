import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskCreationHistory } from "../src/components/TaskCreationHistory.tsx";
import { TaskCreationProcess, TaskCreationProcessView } from "../src/components/TaskCreationProcess.tsx";
import type { CreationProcess } from "../src/lib/taskCreationProgress.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const history: CreationProcess[] = [
  {
    id: 1, title: "初次生成", request: "为新品防晒衣规划达人带货项目", answers: {},
    steps: [{ label: "分析任务", detail: "梳理目标与交付边界", basis: "当前输入；未检索历史任务。" }],
    activeStep: 0, status: "completed", outcome: "候选方案已生成",
    responseSummary: "已整理为 1 个主任务和 7 个子任务候选。",
  },
  {
    id: "adjustment:1", kind: "adjustment", title: "补充需求", request: "增加完成标准：销售数据已核对", answers: {},
    steps: [{ label: "理解调整要求", detail: "核对本次要求", basis: "本次要求：增加完成标准" }],
    activeStep: 0, status: "completed", outcome: "修改候选已生成，确认后才应用。",
    responseSummary: "建议新增一条完成标准。", applicationStatus: "pending",
    changes: [{ taskId: "main", taskTitle: "新品防晒衣达人带货项目", label: "完成标准", before: "活动 GMV 达到 50 万", after: "活动 GMV 达到 50 万\n销售数据已核对" }],
  },
];

const processCount = (html: string) => (html.match(/<section aria-label="任务生成过程" class="creation-process">/g) ?? []).length;

test("本次创建历史按轮次展示用户输入、思考过程、回复正文与待应用差异", () => {
  const html = renderToStaticMarkup(React.createElement(TaskCreationHistory, { processes: history }));
  const initialInput = html.indexOf("为新品防晒衣规划达人带货项目");
  const initialThinking = html.indexOf("已完成");
  const initialReply = html.indexOf("已整理为 1 个主任务和 7 个子任务候选");
  const adjustment = html.indexOf("增加完成标准：销售数据已核对");
  const adjustmentThinking = html.indexOf("已完成", initialThinking + 1);
  const adjustmentReply = html.indexOf("建议新增一条完成标准");
  assert.ok(initialInput >= 0 && initialInput < initialThinking && initialThinking < initialReply);
  assert.ok(initialReply < adjustment && adjustment < adjustmentThinking && adjustmentThinking < adjustmentReply);
  assert.match(html, /本次创建对话/);
  assert.equal((html.match(/aria-label="AI 回复"/g) ?? []).length, 2, "移除可见标题后仍保留无障碍消息角色");
  assert.doesNotMatch(html, />AI 回复</, "回复气泡不重复显示消息身份");
  assert.doesNotMatch(html, /<em data-tone=/, "回复气泡不显示状态徽标");
  assert.match(html, /creation-process-toggle/);
  assert.doesNotMatch(html, />待应用</);
  assert.match(html, /查看本轮差异/);
  assert.match(html, /活动 GMV 达到 50 万/);
  assert.match(html, /销售数据已核对/);
  assert.doesNotMatch(html, /你 · (?:最初输入|补充要求|补充信息|关系选择|重新发起)/, "用户消息气泡不重复说明消息身份或轮次类型");
  assert.equal((html.match(/aria-label="你的输入"/g) ?? []).length, 2, "移除可见说明后仍保留无障碍消息角色");
  assert.equal(processCount(html), 2);
  assert.doesNotMatch(html, /task-creation-history-thinking/);
  assert.doesNotMatch(html, /内部思维链|Thought for|已调用工具|role="log"/);
});

test("同一对话轮次先展示用户与思考 loading，完成后在过程后追加正式回复", () => {
  const running: CreationProcess = {
    id: "adjustment:loading", kind: "adjustment", title: "补充需求", request: "补充交付检查", answers: {},
    steps: [
      { label: "理解调整要求", detail: "核对补充内容", basis: "本次输入" },
      { label: "整理修改预览", detail: "生成字段差异", basis: "当前草稿" },
    ],
    activeStep: 0, status: "running", responseSummary: "不应提前出现的最终回复",
  };
  const loadingHtml = renderToStaticMarkup(React.createElement(TaskCreationHistory, { processes: [running] }));
  assert.match(loadingHtml, /正在思考/);
  assert.match(loadingHtml, /aria-atomic="true"[^>]*class="sr-only"[^>]*role="status"[^>]*>AI 正在处理：理解调整要求，1\/2/);
  assert.match(loadingHtml, /data-state="running"/);
  assert.doesNotMatch(loadingHtml, /data-state="pending"|整理修改预览|生成字段差异|当前草稿/);
  assert.match(loadingHtml, /<button(?=[^>]*class="creation-process-toggle")(?=[^>]*aria-expanded="true")[^>]*>/);
  assert.match(loadingHtml, /<button(?=[^>]*class="agent-workflow-trace-toggle")(?=[^>]*aria-expanded="true")[^>]*>/);
  assert.match(loadingHtml, /核对补充内容/);
  assert.match(loadingHtml, /本次输入/);
  assert.doesNotMatch(loadingHtml, /不应提前出现的最终回复|>AI 回复</);

  const completedHtml = renderToStaticMarkup(React.createElement(TaskCreationHistory, { processes: [{
    ...running, activeStep: 1, status: "completed", startedAt: 1000, completedAt: 13000, responseSummary: "已整理好修改候选。",
  }] }));
  assert.match(completedHtml, /aria-label="AI 回复"/);
  assert.doesNotMatch(completedHtml, />AI 回复</);
  assert.match(completedHtml, /role="status"[^>]*>AI 思考完成，回复已生成/);
  assert.match(completedHtml, /已整理好修改候选/);
  assert.match(completedHtml, /已完成（12 秒）/);
  assert.match(completedHtml, /<button(?=[^>]*class="creation-process-toggle")(?=[^>]*aria-expanded="false")[^>]*>/);
  assert.ok(completedHtml.indexOf("已完成") < completedHtml.indexOf("已整理好修改候选"));
  assert.doesNotMatch(completedHtml, /核对补充内容|生成字段差异/);
  assert.doesNotMatch(completedHtml, /aria-live|AI 正在思考规划/);
});

test("正文与历史复用同一生成过程组件，历史不再维护第二套思考卡", () => {
  const historySource = readFileSync(new URL("../src/components/TaskCreationHistory.tsx", import.meta.url), "utf8");
  const processSource = readFileSync(new URL("../src/components/TaskCreationProcess.tsx", import.meta.url), "utf8");
  assert.match(historySource, /import \{ TaskCreationProcessView \} from "\.\/TaskCreationProcess"/);
  assert.match(historySource, /<TaskCreationProcessView[^>]*process=\{process\}/);
  assert.doesNotMatch(historySource, /getCreationProcessStepState|TaskCreationThinking|task-creation-history-thinking/);
  assert.match(processSource, /return <TaskCreationProcessView onCancel=\{onCancel\} process=\{current\} \/>/);
  assert.match(processSource, /AgentActivityIndicator active=\{running\}/);
  assert.match(processSource, /agent-workflow-trace-toggle/);
  assert.match(processSource, /const expanded = phaseMatches \? disclosure\.expanded : running/);
  assert.match(historySource, /<li className="task-creation-history-round" key=\{process\.id\}>/);
});

test("正文入口输出的就是历史使用的共享生成过程视图", () => {
  const running = { ...history[0], status: "running" as const };
  const pageHtml = renderToStaticMarkup(React.createElement(TaskCreationProcess, { processes: [running] }));
  const sharedHtml = renderToStaticMarkup(React.createElement(TaskCreationProcessView, { process: running }));
  assert.equal(pageHtml, sharedHtml);
  assert.match(sharedHtml, /正在思考/);
  assert.match(sharedHtml, /agent-workflow-grid-dot/);
  assert.match(sharedHtml, /agent-workflow-trace-toggle/);
});

test("继续对话时保留旧轮，最新轮仍按用户、思考、回复的顺序原位完成", () => {
  const next: CreationProcess = {
    id: "adjustment:next", kind: "adjustment", title: "补充需求", request: "再补充负责人核对", answers: {},
    steps: [{ label: "理解新要求", detail: "核对负责人要求", basis: "本轮新增输入" }],
    activeStep: 0, status: "running", responseSummary: "不应提前出现的第二轮回复",
  };
  const runningHtml = renderToStaticMarkup(React.createElement(TaskCreationHistory, { processes: [history[0], next] }));
  assert.match(runningHtml, /已整理为 1 个主任务和 7 个子任务候选/);
  assert.ok(runningHtml.indexOf("再补充负责人核对") < runningHtml.indexOf("核对负责人要求"));
  assert.doesNotMatch(runningHtml, /不应提前出现的第二轮回复/);

  const completedHtml = renderToStaticMarkup(React.createElement(TaskCreationHistory, { processes: [history[0], {
    ...next, status: "completed", responseSummary: "已补充负责人核对要求。",
  }] }));
  const input = completedHtml.indexOf("再补充负责人核对");
  const thinking = completedHtml.indexOf("已完成", input);
  const reply = completedHtml.indexOf("已补充负责人核对要求。");
  assert.ok(input < thinking && thinking < reply);
  assert.equal((completedHtml.match(/task-creation-history-round/g) ?? []).length, 2);
});

test("补问后的同一需求只展示一次原文，下一轮展示用户补充的回答", () => {
  const processes: CreationProcess[] = [
    {
      ...history[0], responseSummary: "还需要补充：目标；交付内容。补充后会继续整理任务方案。",
    },
    {
      id: 2, title: "补充信息后规划", request: history[0].request,
      answers: { goal: "提升新品曝光", deliverable: "活动方案和执行排期" },
      steps: [], activeStep: 0, status: "completed", responseSummary: "已根据补充信息整理方案。",
    },
  ];
  const html = renderToStaticMarkup(React.createElement(TaskCreationHistory, { processes }));
  assert.equal(html.split(history[0].request).length - 1, 1);
  const input = html.indexOf(history[0].request);
  const question = html.indexOf("还需要补充：目标；交付内容");
  const answer = html.indexOf("提升新品曝光");
  const reply = html.indexOf("已根据补充信息整理方案");
  assert.ok(input < question && question < answer && answer < reply);
  assert.match(html, /提升新品曝光/);
  assert.match(html, /活动方案和执行排期/);
});

test("历史用过程区与回复正文区分应用状态，不在回复气泡显示状态徽标", () => {
  const cases: Array<{ status: CreationProcess["status"]; applicationStatus?: CreationProcess["applicationStatus"]; outcome?: string; responseSummary?: string }> = [
    { status: "completed", applicationStatus: "applied", outcome: "调整已应用到草稿，可以继续提出要求。" },
    { status: "completed", applicationStatus: "not_applied", outcome: "已取消候选，未应用修改；输入已保留。" },
    { status: "completed", applicationStatus: "expired", outcome: "内容已变化，当前预览已过期。请重新预览。" },
    { status: "completed", applicationStatus: "no_change", responseSummary: "当前任务已经符合要求，无需修改。" },
    { status: "running" },
    { status: "stopped" },
    { status: "failed" },
  ];
  const processes = cases.map((item, index): CreationProcess => ({
    id: `case:${index}`, kind: "adjustment", title: "补充需求", request: `状态输入 ${index}`,
    answers: {}, steps: [{ label: "理解调整要求", detail: "核对状态", basis: "本次输入" }], activeStep: 0,
    status: item.status, applicationStatus: item.applicationStatus,
    outcome: item.outcome, responseSummary: item.responseSummary ?? `状态回复 ${index}`,
  }));
  const html = renderToStaticMarkup(React.createElement(TaskCreationHistory, { processes }));
  for (const message of ["调整已应用到草稿", "已取消候选，未应用修改", "当前预览已过期", "当前任务已经符合要求，无需修改"]) assert.match(html, new RegExp(message));
  for (const processState of ["正在思考", "已停止思考", "思考未完成"]) assert.match(html, new RegExp(`>${processState}<`));
  assert.equal((html.match(/aria-label="AI 回复"/g) ?? []).length, cases.length - 1, "运行中的轮次尚无正式回复");
  assert.doesNotMatch(html, /<em data-tone=/);
  assert.doesNotMatch(html, />(?:已应用|未应用|已过期|无需修改|已生成|已回复|待应用)</);
  assert.equal(processCount(html), cases.length);
});

test("补问、关系待确认和不支持输入保留回复正文但不显示状态徽标", () => {
  const processes: CreationProcess[] = [
    { ...history[0], id: "clarify", outcome: "需要补充关键信息", responseSummary: "还需要补充关键信息。" },
    { ...history[0], id: "decision", outcome: "任务关系待确认", responseSummary: "请选择与已有任务的关系。" },
    { ...history[0], id: "unavailable", outcome: "当前输入需要调整", responseSummary: "当前输入需要调整。" },
    { ...history[0], id: "relationship", kind: "relationship", request: "仍然独立规划", responseSummary: "已按独立任务继续整理。" },
  ];
  const html = renderToStaticMarkup(React.createElement(TaskCreationHistory, { processes }));
  for (const reply of ["还需要补充关键信息", "请选择与已有任务的关系", "当前输入需要调整", "已按独立任务继续整理"]) assert.match(html, new RegExp(reply));
  assert.doesNotMatch(html, /<em data-tone=/);
  assert.doesNotMatch(html, /你 · 关系选择/);
});

test("连续调整保留旧轮回复与差异，不把内部字段当作可见思考过程", () => {
  const contaminated = {
    ...history[0], reasoning: "SECRET_REASONING", toolTrace: "SECRET_TOOL_TRACE", messages: ["SECRET_HIDDEN_MESSAGE"],
  } as CreationProcess;
  const first = { ...history[1], applicationStatus: "applied" as const, outcome: "调整已应用到草稿，可以继续提出要求。" };
  const second: CreationProcess = {
    ...history[1], id: "adjustment:2", request: "预计投入改为 12 小时", responseSummary: "建议调整预计投入。",
    applicationStatus: "not_applied", outcome: "已取消候选，未应用修改；输入已保留。",
    changes: [{ taskId: "main", taskTitle: "新品防晒衣达人带货项目", label: "预计投入", before: "10 小时", after: "12 小时" }],
  };
  const html = renderToStaticMarkup(React.createElement(TaskCreationHistory, { processes: [contaminated, first, second] }));
  assert.ok(html.indexOf(first.request) < html.indexOf(second.request));
  assert.match(html, /调整已应用到草稿，可以继续提出要求/);
  assert.match(html, /已取消候选，未应用修改；输入已保留/);
  assert.doesNotMatch(html, /<em data-tone=/);
  assert.match(html, /10 小时/);
  assert.match(html, /12 小时/);
  assert.doesNotMatch(html, /SECRET_REASONING|SECRET_TOOL_TRACE|SECRET_HIDDEN_MESSAGE/);
});

test("紧凑浮层把头部和输入固定在历史滚动区之外", () => {
  const css = readFileSync(new URL("../src/styles/task-ai-adjustment.css", import.meta.url), "utf8");
  assert.match(css, /\.task-ai-adjust-conversation-header \{[^}]*flex-shrink: 0/);
  assert.match(css, /\.task-ai-adjust-popover\.is-compact \.task-ai-adjust-body \{[^}]*flex: 1;[^}]*padding: 0/);
  assert.match(css, /\.task-ai-adjust-body \{[^}]*overflow-y: auto/);
  assert.match(css, /\.task-ai-adjust-conversation-composer \{[^}]*flex-shrink: 0;[^}]*border-top:/);
  assert.match(css, /\.task-ai-adjust-fixed-positioner \{[^}]*position: fixed !important;[^}]*right[^}]*transform: none !important/);
  assert.match(css, /\.task-ai-adjust-popover\.is-compact\[data-slot="popover-content"\] \{[^}]*height: 100%;[^}]*pointer-events: auto/);
  assert.match(css, /\.task-ai-adjust-preview-actions/);
  assert.match(css, /\.task-ai-adjust-preview-actions \[data-slot="button"\][^\n]*min-height: var\(--ad-control-touch-min\)/);
  assert.match(css, /\.task-creation-history \.creation-process \{[^}]*width: min\(100%, 500px\);[^}]*margin: 0/);
  assert.match(css, /\.task-ai-adjust-conversation-composer \.animated-agent-chat-shell/);
  assert.match(css, /\.task-ai-adjust-conversation-composer \{[^}]*background: color-mix\(in srgb, var\(--ad-surface-subtle\) 52%, var\(--ad-surface\)\);[^}]*box-shadow: none/);
  assert.match(css, /\.task-ai-adjust-conversation-composer \.animated-agent-chat-shell \{[^}]*background: transparent;[^}]*box-shadow: none/);
  assert.match(css, /\.task-ai-adjust-conversation-composer \.animated-agent-chat-shell > footer \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /\.task-ai-adjust-conversation-composer \.animated-agent-chat-shell > footer > span \{[^}]*text-align: left/);
  assert.match(css, /\.task-ai-adjust-conversation-composer \.animated-agent-send \{[^}]*width: var\(--ad-control-height-md\);[^}]*height: var\(--ad-control-height-md\)/);
  assert.doesNotMatch(css, /\.task-creation-history-ai > header/);
  assert.match(css, /\.task-creation-history-ai > p \{[^}]*margin: 0;/);
  assert.match(css, /@media \(pointer: coarse\) \{[\s\S]*?\.task-ai-adjust-conversation-composer \.animated-agent-send \{[^}]*width: var\(--ad-control-touch-min\);[^}]*height: var\(--ad-control-touch-min\)/);
  assert.doesNotMatch(css, /task-ai-adjust-presets|task-ai-adjust-examples/);
  assert.doesNotMatch(css, /task-creation-history-thinking|task-creation-history-process/);
});
