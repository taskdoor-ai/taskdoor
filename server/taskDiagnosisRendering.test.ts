import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskDiagnosisReport } from "../src/components/TaskDiagnosisReport.tsx";
import { createWorkspaceTaskDetail } from "../src/data/taskDetailMocks.ts";
import { teamWorkspaceScenarios } from "../src/data/teamWorkspaceScenarios.ts";
import { getTaskDefinitionGoal } from "../src/lib/taskAiAdjustmentAdapters.ts";
import { getTaskDiagnosisReport } from "../src/lib/taskDiagnosis.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("诊断报告把完整结论直接作为标题且只保留两类诊断、依据和建议", () => {
  const report = getTaskDiagnosisReport({
    task: { id: "release", title: "发布移动端版本", status: "进行中" },
    dependencyTaskIds: ["legal"],
    dependencyTasks: [{ id: "legal", title: "完成法务审核", status: "进行中" }],
  });
  const html = renderToStaticMarkup(createElement(TaskDiagnosisReport, { report }));

  assert.match(html, /任务诊断报告/);
  assert.doesNotMatch(html, /发现 \d+ 项执行阻塞|涉及 \d+ 个任务/);
  assert.match(html, /<h3>前置「完成法务审核」尚未完成，建议核对<\/h3>/);
  assert.match(html, /<span>执行阻塞<\/span>/);
  assert.doesNotMatch(html, /<span>前置依赖<\/span>/);
  assert.doesNotMatch(html, /当前任务不能继续/);
  assert.doesNotMatch(html, /<dt>结论<\/dt>/);
  assert.match(html, /依据/);
  assert.doesNotMatch(html, /<dt>影响<\/dt>/);
  assert.ok(!html.includes(report.findings[0].impact), "不再展示与总结重复的影响正文");
  assert.match(html, /建议/);
  assert.equal((html.match(/查看依据/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<li><span>/);
  assert.match(html, /<dt>任务：<\/dt>/);
  assert.match(html, /<p>「发布移动端版本」依赖「完成法务审核」。<\/p>/);
  assert.doesNotMatch(html, /阻塞原因：|task-diagnosis-evidence-comparison/);
  assert.doesNotMatch(html, /<dt>讨论：|<dt>文件：|冲突点：/);
  assert.doesNotMatch(html, /来源：|<small>/);
  assert.equal((html.match(/<(?:button|a)\b/g) ?? []).length, 0);
  assert.doesNotMatch(html, /调整期限|修改依赖|发起讨论|一键修复|标记已处理|忽略/);
});

test("诊断图标颜色按类型固定为执行阻塞红色、决策冲突黄色", () => {
  const report = getTaskDiagnosisReport({
    task: { id: "release", title: "发布移动端版本", status: "进行中" },
    dependencyTaskIds: ["legal"],
    dependencyTasks: [{ id: "legal", title: "完成法务审核", status: "进行中" }],
    decisionConflicts: [{
      id: "release-channel",
      title: "发布渠道记录不一致",
      conclusion: "发布决定与执行配置使用了不同渠道。",
      impact: "成员无法确认实际发布范围。",
      recommendation: "统一发布渠道后再继续执行。",
      evidence: [
        { kind: "file", id: "decision", source: "发布决定.md", fact: "本次仅发布正式渠道。" },
        { kind: "file", id: "config", source: "执行配置.json", fact: "当前配置同时发布正式与测试渠道。" },
      ],
    }],
  });
  const html = renderToStaticMarkup(createElement(TaskDiagnosisReport, { report }));
  const css = readFileSync(new URL("../src/styles/task-diagnosis.css", import.meta.url), "utf8");

  assert.equal(report.findings.every((finding) => finding.severity === "review"), true, "颜色不能依赖 severity 区分");
  assert.match(html, /data-type="execution-blocker"/);
  assert.match(html, /data-type="decision-conflict"/);
  assert.match(css, /\[data-type="execution-blocker"\][^{]*\.task-diagnosis-finding-marker\s*\{[^}]*var\(--ad-danger\)/);
  assert.match(css, /\[data-type="decision-conflict"\][^{]*\.task-diagnosis-finding-marker\s*\{[^}]*var\(--ad-tag-amber-bg\)[^}]*var\(--ad-tag-amber-ink\)/);
  assert.doesNotMatch(css, /task-diagnosis-finding\[data-severity=/);
});

test("任务详情把诊断放在讨论之后、子任务之前并作为同级可键盘切换页签", () => {
  const source = readFileSync(new URL("../src/components/TaskDetail.tsx", import.meta.url), "utf8");

  assert.match(source, /type TaskDetailTab = "discussion" \| "subtasks" \| "diagnosis" \| "files" \| "activity"/);
  assert.match(source, /id: "discussion", label: "讨论"[^]*?id: "diagnosis", label: "诊断"[^]*?id: "subtasks", label: "子任务"[^]*?id: "files", label: "文件"/);
  assert.match(source, /aria-labelledby="task-detail-tab-diagnosis"[^]*?<TaskDiagnosisReport[^]*?report=\{diagnosisReport\}/);
  assert.match(source, /<TaskDiagnosisReport[^]*?analysisError=\{diagnosisAnalysisError\}[^]*?analyzing=\{diagnosisAnalyzing\}[^]*?onReanalyze=\{\(\) => void reanalyzeDiagnosis\(\)\}[^]*?report=\{diagnosisReport\}/);
  assert.match(source, /setActiveTab\(nextTab\.id\)/);
});

test("更新时间使用可信记录，无时间或无效时间时不补造", () => {
  const base = getTaskDiagnosisReport({ task: { id: "task", title: "核对任务", status: "进行中" } });
  const withTime = renderToStaticMarkup(createElement(TaskDiagnosisReport, { report: { ...base, checkedAt: "2026-09-01T10:30:00+08:00" } }));
  const withUtcTime = renderToStaticMarkup(createElement(TaskDiagnosisReport, { report: { ...base, checkedAt: "2026-09-01T02:30:00Z" } }));
  const withoutTime = renderToStaticMarkup(createElement(TaskDiagnosisReport, { report: base }));
  const invalidTime = renderToStaticMarkup(createElement(TaskDiagnosisReport, { report: { ...base, checkedAt: "invalid" } }));

  assert.match(withTime, /更新时间：<time[^>]*>2026-09-01 10:30<\/time>/);
  assert.match(withUtcTime, /更新时间：<time[^>]*>2026-09-01 10:30<\/time>/);
  for (const html of [withoutTime, invalidTime]) {
    assert.match(html, /更新时间：未记录/);
    assert.doesNotMatch(html, /<time|依据截至|刚刚分析/);
  }
});

test("诊断报告提供当前任务独立的重新分析状态", () => {
  const report = getTaskDiagnosisReport({ task: { id: "task", title: "核对任务", status: "进行中" } });
  const normal = renderToStaticMarkup(createElement(TaskDiagnosisReport, { onReanalyze: () => {}, report }));
  assert.match(normal, /aria-label="重新分析任务诊断"/);
  assert.match(normal, /aria-label="重新分析任务诊断"[\s\S]*?重新分析<\/button>/);
  assert.doesNotMatch(normal, /aria-busy="true"|role="alert"/);

  const loading = renderToStaticMarkup(createElement(TaskDiagnosisReport, { analyzing: true, onReanalyze: () => {}, report }));
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /<button(?=[^>]*aria-label="正在重新分析任务诊断")(?=[^>]*\sdisabled="")[^>]*>/);
  assert.match(loading, /分析中/);
  assert.match(loading, /animate-spin/);

  const failed = renderToStaticMarkup(createElement(TaskDiagnosisReport, {
    analysisError: "重新分析失败，当前结果未更新，请重试。", onReanalyze: () => {}, report,
  }));
  assert.match(failed, /role="alert"[^>]*>重新分析失败，当前结果未更新，请重试。/);
});

test("子任务诊断移除受影响任务标题和路径，保留诊断与依据", () => {
  const report = getTaskDiagnosisReport({
    task: { id: "campaign", title: "项目收尾", status: "进行中" },
    descendantTasks: [
      { id: "content", parentTaskId: "campaign", title: "内容准备", status: "进行中" },
      { id: "rehearsal", parentTaskId: "content", title: "完成直播彩排", status: "待开始", dependsOnTaskIds: ["content"] },
    ],
  });
  const html = renderToStaticMarkup(createElement(TaskDiagnosisReport, { report }));

  assert.match(html, /检索范围：当前任务及 2 个子任务/);
  assert.doesNotMatch(html, /子任务诊断/);
  assert.doesNotMatch(html, /受影响任务|内容准备 \/ 完成直播彩排/);
  assert.match(html, /task-diagnosis-evidence-source[^>]*>「完成直播彩排」<\/p>/, "展开依据时标明具体子任务，不恢复独立的受影响任务标题");
  assert.match(html, /<span>执行阻塞<\/span>/);
  assert.match(html, /查看依据/);
  assert.doesNotMatch(html, /直接子任务/);
});

test("文件与完成标准冲突只展示相关依据，不强行凑出讨论和目标", () => {
  const nodes = teamWorkspaceScenarios.flatMap((team) => team.nodes).filter((node) => node.kind === "task");
  const node = nodes.find((item) => item.id === "ccx-serum-asset-batch")!;
  const detail = createWorkspaceTaskDetail(node);
  const report = getTaskDiagnosisReport({ task: { id: node.id, title: node.name, status: node.status, context: {
    goal: getTaskDefinitionGoal(nodes, node), completionCriteria: node.completionCriteria ?? [],
    activities: detail.activities, commits: detail.commits, files: detail.files,
  } } });
  assert.equal(report.findings.length, 1);
  const finding = report.findings[0];
  const html = renderToStaticMarkup(createElement(TaskDiagnosisReport, { report }));
  const expanded = html.slice(html.indexOf('<details class="task-diagnosis-evidence">'), html.indexOf("</details>"));
  assert.doesNotMatch(expanded, /冲突点：|task-diagnosis-evidence-comparison/);
  assert.ok(!expanded.includes(finding.conclusion), "展开依据不再重复诊断结论");
  assert.ok(html.includes(`<h3>${finding.title}</h3>`), "保留上方诊断标题");
  assert.ok(html.includes(finding.recommendation), "保留建议");
  assert.match(expanded, /<dt>文件：<\/dt>[\s\S]*<dt>任务：<\/dt>/);
  assert.doesNotMatch(expanded, /<dt>讨论：|任务目标/);
  for (const evidence of finding.evidence) {
    assert.ok(expanded.includes(evidence.fact), "保留实际参与判断的原文");
    assert.ok(expanded.includes(evidence.source), "显示原始作者、文件名或任务字段");
  }
  assert.ok(expanded.includes(`「${node.name}」 · 完成标准`));
  assert.equal((expanded.match(/<dt>任务：/g) ?? []).length, 1);
  assert.doesNotMatch(expanded, /来源：|会议|增长会/);
});

test("文件活动不冒充讨论，且来源和原文按文本安全展示", () => {
  const report = getTaskDiagnosisReport({ task: { id: "task", title: "核对任务", status: "进行中" }, decisionConflicts: [{
    id: "conflict", title: "执行记录不一致", conclusion: "规则文件要求暂停，但执行文件仍配置继续。", impact: "需核对", recommendation: "统一后再执行",
    evidence: [
      { kind: "file", id: "rule", source: "规则.pdf", fact: "达到预算上限后暂停。" },
      { kind: "file", id: "plan", source: "执行配置.xlsx", fact: "达到预算上限后继续。" },
      { kind: "activity", id: "post", source: "陈默", fact: "先暂停执行。" },
      { kind: "commit", id: "commit", source: "文件活动", fact: "更新了<script>alert(1)</script>交付包。" },
    ],
  }] });
  const html = renderToStaticMarkup(createElement(TaskDiagnosisReport, { report }));
  assert.match(html, /<dt>讨论：<\/dt>[\s\S]*陈默[\s\S]*<dt>文件：<\/dt>[\s\S]*文件活动/);
  assert.doesNotMatch(html, /<dt>任务：|<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("任务详情诊断接入完整可见任务树和每个子任务自己的诊断快照", () => {
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const detailSource = readFileSync(new URL("../src/components/TaskDetail.tsx", import.meta.url), "utf8");

  assert.match(appSource, /diagnosisTasks=\{selectedDiagnosisTasks\}/);
  assert.match(appSource, /parentTaskId:\s*node\.parentTaskId/);
  assert.match(appSource, /decisionConflicts:\s*taskDetailMocks\[[^\]]+\]\?\.diagnosis\?\.decisionConflicts/);
  assert.match(appSource, /getTeamTaskDiagnosisSnapshot\(node\)\?\.decisionConflicts/);
  assert.match(detailSource, /getTaskDiagnosisDescendants\(diagnosisTasks, taskId\)/);
  assert.match(detailSource, /descendantTasks:\s*diagnosisDescendantTasks/);
  assert.match(appSource, /context:\s*buildTaskDiagnosisContext/);
  assert.match(appSource, /activities:\s*\[[^]*?taskActivityStore\[node.id\]/);
  assert.match(detailSource, /context:\s*\{[^]*?goal:\s*currentGoal[^]*?completionCriteria[^]*?activities[^]*?commits:\s*task.commits/);
  assert.match(detailSource, /onFilesChange=\{setDiagnosisFileSnapshot\}/);
  assert.match(detailSource, /key=\{`due-\$\{taskId\}`\}/, "同一属性行的控件不能复用任务 ID 作为 key");
  assert.match(detailSource, /key=\{`tags-\$\{taskId\}`\}/);
  assert.match(detailSource, /diagnosisAnalysisSnapshot\?\.signature === diagnosisSignature/, "分析时间只适用于实际核对的那一版上下文");
});

test("说明条只展示检索范围和更新时间，有读取缺口时保持同一中性样式", () => {
  const report = getTaskDiagnosisReport({ task: { id: "task", title: "核对任务", status: "进行中", context: {
    goal: "完成核对", completionCriteria: [], activities: [], commits: [], files: [], unavailableFileCount: 2,
  } } });
  const html = renderToStaticMarkup(createElement(TaskDiagnosisReport, { report }));
  const coverage = html.match(/<p class="task-diagnosis-coverage"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
  assert.match(coverage, /检索范围：当前任务的目标、完成标准、可读文件、讨论、活动与可见依赖/);
  assert.match(coverage, /更新时间：未记录/);
  assert.doesNotMatch(coverage, /已检查|本地示例规则|未能读取|已完成核对|未用于判断/);
  assert.doesNotMatch(html, /data-incomplete/);
  const css = readFileSync(new URL("../src/styles/task-diagnosis.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.task-diagnosis-coverage\[data-incomplete/);
  assert.match(css, /\.task-diagnosis-coverage\s*\{[^}]*color: var\(--ad-ink-tertiary\)/);
});
