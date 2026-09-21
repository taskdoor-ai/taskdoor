import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../src/i18n/I18nProvider";
import { buildPersonalWorkbenchModel } from "../src/lib/personalWorkbench.ts";
import { createWorkspaceTaskDetail, type TaskDetailMock } from "../src/data/taskDetailMocks.ts";
import type { TaskNode } from "../src/data/workspaceNodes.ts";
import { createManualEffortEstimate } from "../src/lib/taskEffort.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "", shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);

const ownedScope = {
  goal: "完成发布前的结果核对。",
  completionCriteria: ["说明验证结果及未解决问题"],
  executionTips: ["先核对交付记录，再确认结论。"],
};
const owned: TaskNode = {
  id: "owned", kind: "task", name: "核对发布结论", parentId: "root", ownerId: "me-id",
  status: "待审核", updatedAt: "今天", ...ownedScope,
  effortEstimate: createManualEffortEstimate(ownedScope, {
    minutes: 45, workMethod: "AI 汇总记录，由负责人核对结论", reason: "按一次完整核对与修订估算",
  }),
};
const workbenchCss = readFileSync(new URL("../src/styles/personal-workbench.css", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const aiConnectionDialogSource = readFileSync(new URL("../src/components/AiConnectionDialog.tsx", import.meta.url), "utf8");
const render = async (
  tasks: TaskNode[],
  detailsByTaskId?: Record<string, TaskDetailMock>,
  asOf = "2026-08-31",
  analysis: { analyzing?: boolean; analysisError?: string } = {},
) => {
  const { PersonalWorkbench } = await import(new URL("../src/components/PersonalWorkbench.tsx", import.meta.url).href);
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: () => "zh-CN" } } });
  try { return renderToStaticMarkup(createElement(I18nProvider, { children: createElement(PersonalWorkbench, {
    ...analysis,
    currentUserName: "新的显示姓名", model: buildPersonalWorkbenchModel({ tasks, currentUserId: "me-id", asOf, detailsByTaskId }),
    onConnectAi: () => {}, onOpenTask: () => {}, onOpenTaskList: () => {}, onReanalyze: () => {},
  }) })); } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
};

function button(html: string, name: RegExp) {
  const match = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].find((item) => {
    const accessibleName = item[1].match(/aria-label="([^"]*)"/)?.[1] ?? item[2].replace(/<[^>]*>/g, "");
    return name.test(accessibleName);
  });
  assert.ok(match, `${name} 对应的按钮应存在`);
  return { attributes: match[1], content: match[2] };
}

function disclosure(html: string, summary: string) {
  const match = [...html.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)].find((item) => {
    const text = item[2].match(/^<summary\b[^>]*>([\s\S]*?)<\/summary>/)?.[1].replace(/<[^>]*>/g, "");
    return text?.includes(summary);
  });
  assert.ok(match, `${summary} 对应的按需展开内容应存在`);
  return { attributes: match[1], content: match[2] };
}

function recommendedTasks(html: string) {
  const match = html.match(/<section\b[^>]*aria-label="推荐关注任务"[^>]*>([\s\S]*?)<\/section>/);
  assert.ok(match, "推荐关注任务对应的可访问分区应存在");
  return match[1];
}

function twoColumnBriefRows(html: string) {
  const list = recommendedTasks(html);
  const rows = [...list.matchAll(/<li\b[^>]*class="personal-workbench-priority-row"[^>]*>([\s\S]*?)<\/li>/g)].map((match) => match[1]);
  assert.ok(rows.length > 0, "有待处理任务时应渲染推荐任务行");
  for (const row of rows) {
    assert.equal((row.match(/class="personal-workbench-task-column"/g) ?? []).length, 1);
    assert.equal((row.match(/class="personal-workbench-insight-column"/g) ?? []).length, 1);
    assert.equal((row.match(/class="personal-workbench-task-title"/g) ?? []).length, 1);
    assert.equal((row.match(/class="task-icon sm"/g) ?? []).length, 1);
    assert.doesNotMatch(row, /personal-workbench-current-status|personal-workbench-current-summary/);
    assert.equal((row.match(/class="personal-workbench-status"/g) ?? []).length, 0);
    assert.equal((row.match(/class="personal-workbench-priority-reason"/g) ?? []).length, 1);
    assert.equal((row.match(/class="personal-workbench-effort"/g) ?? []).length, 0);
    assert.equal((row.match(/<button\b/g) ?? []).length, 1);
    const visibleText = row.replace(/<[^>]*>/g, "");
    assert.doesNotMatch(visibleText, /当前状态|预计投入|预计总投入|优先原因/);
    assert.doesNotMatch(row, /下一步|personal-workbench-next-action|personal-workbench-rank|score|评分|权重|置信度/);
    assert.doesNotMatch(row, /<(?:dl|dt|dd|ul|details|summary)\b/);
    assert.ok(row.indexOf("personal-workbench-task-column") < row.indexOf("personal-workbench-insight-column"));
    assert.ok(row.indexOf("task-icon sm") < row.indexOf("personal-workbench-task-title"));
  }
  return rows;
}

test("我的工作左侧只展示任务图标和名称，并保留任务原有外观", async () => {
  const html = await render([{ ...owned, iconName: "chart", iconTone: "purple" }, { ...owned, id: "other", ownerId: "another", name: "其他人的独立任务" }], undefined, "2026-09-01T09:20:00+08:00");
  assert.match(html, />新的显示姓名，这是今天建议你优先推进的工作<\/h1>/);
  assert.match(html, /aria-label="新的显示姓名的今日建议"/);
  assert.match(html, /class="personal-workbench-updated-at"[^>]*>更新于 9月1日 09:20/);
  assert.match(html, /核对发布结论/);
  assert.doesNotMatch(html, /任务待审核，尚未记录交付进展。/);
  assert.match(html, /class="task-icon sm" data-tone="purple"/);
  assert.match(html, /lucide-chart-no-axes-column-increasing/);
  assert.doesNotMatch(recommendedTasks(html), />当前状态</);
  assert.doesNotMatch(html, /约 45 分钟|预计投入/);
  assert.doesNotMatch(html, /其他人的独立任务|排序与生成规则/);
  assert.doesNotMatch(html, /下一步|判断依据|评分|置信度|权重|建议分|预计你花费/);
  assert.doesNotMatch(html, /注意力地图|燃起图|今日可用|筛选建议优先顺序|全部事项|到期要处理/);
  assert.match(recommendedTasks(html), /aria-label="推荐关注任务：核对发布结论"/);
  const [row] = twoColumnBriefRows(html);
  assert.doesNotMatch(row.replace(/<[^>]*>/g, ""), /^1/);
  assert.match(html, /共 1 项任务/);
  assert.doesNotMatch(html, /优先顺序仅供参考/);
});

test("AI 分析规则默认收起并排在更新时间之前", async () => {
  const html = await render([owned], undefined, "2026-09-01T09:20:00+08:00");
  const rules = disclosure(html, "AI 分析规则");
  assert.doesNotMatch(rules.attributes, /\bopen\b/);
  assert.match(rules.content, /排序/);
  assert.match(rules.content, /任务状态、期限、依赖、完成标准/);
  assert.match(rules.content, /范围/);
  assert.match(rules.content, /正式负责/);
  assert.match(rules.content, /同一任务只出现一次/);
  assert.match(rules.content, /建议不会自动修改任务/);
  assert.doesNotMatch(rules.content, />生成</);
  assert.ok(html.indexOf("AI 分析规则") < html.indexOf("personal-workbench-updated-at"));
});

test("今日建议提供 TaskDoor 重新分析按钮及加载失败状态", async () => {
  const normal = await render([owned]);
  const reanalyze = button(normal, /^重新分析今日建议$/);
  assert.doesNotMatch(reanalyze.attributes, /\sdisabled=""/);
  assert.match(reanalyze.content, /重新分析/);
  assert.doesNotMatch(normal, /aria-busy="true"|重新分析失败/);

  const loading = await render([owned], undefined, "2026-09-01T09:20:00+08:00", { analyzing: true });
  const analyzing = button(loading, /^正在重新分析今日建议$/);
  assert.match(analyzing.attributes, /\sdisabled=""/);
  assert.match(analyzing.content, /分析中/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /animate-spin/);

  const failed = await render([owned], undefined, "2026-09-01T09:20:00+08:00", { analysisError: "重新分析失败，当前结果未更新，请重试。" });
  assert.match(failed, /role="alert"[^>]*>重新分析失败，当前结果未更新，请重试。/);
  assert.match(failed, /更新于 9月1日 09:20/);

  const handler = appSource.match(/const reanalyzePersonalWorkbench = async \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";
  assert.ok(handler);
  assert.match(appSource, /onReanalyze=\{\(\) => void reanalyzePersonalWorkbench\(\)\}/);
  assert.doesNotMatch(handler, /setWorkbenchAiConnectionOpen\(true\)/);
});

test("Agent 算分后的第一项直接成为列表左上角核心任务", async () => {
  const html = await render([
    { ...owned, id: "plain", name: "普通逾期任务", plannedEndOn: "2026-08-30", status: "进行中" },
    { ...owned, id: "core", name: "核心依赖任务", plannedEndOn: "2026-08-30", status: "进行中", dependsOnTaskIds: ["dependency"] },
    { ...owned, id: "dependency", name: "不可展示的前置任务", ownerId: "another", status: "进行中" },
  ]);
  const list = recommendedTasks(html);
  assert.ok(list.indexOf("核心依赖任务") < list.indexOf("普通逾期任务"));
  assert.match(list, /推荐关注任务：核心依赖任务/);
  assert.match(list, /已超过承诺时间[^<]*前置交付/);
  assert.doesNotMatch(list, /不可展示的前置任务|dependency|核心任务|重点任务|第 1 项/);
});

test("推荐项使用一个标准简报列表，不呈现排行序号且行交互一致", async () => {
  const html = await render([
    owned,
    ...[2, 3, 4, 5].map((rank) => ({ ...owned, id: `later-${rank}`, name: `后续交付 ${rank}`, plannedEndOn: "2026-09-04" })),
  ]);
  const list = recommendedTasks(html);
  assert.equal(twoColumnBriefRows(html).length, 5);
  assert.doesNotMatch(list.replace(/<[^>]*>/g, ""), /预计总投入|优先原因/);
  assert.equal((list.match(/class="personal-workbench-action-list"/g) ?? []).length, 1);
  assert.doesNotMatch(list, /personal-workbench-rank|先处理|接着做|<strong>0?[1-5]<\/strong>|ui-spotlight-card|personal-workbench-focus-card/);
  const listStyle = workbenchCss.match(/^\.personal-workbench-action-list\s*\{([^}]*)\}/m)?.[1] ?? "";
  assert.match(listStyle, /border:/);
  assert.match(listStyle, /border-radius:/);
  assert.match(listStyle, /background:/);
  const surfaceStyle = workbenchCss.match(/^\.personal-workbench-priority-surface\s*\{([^}]*)\}/m)?.[1] ?? "";
  assert.doesNotMatch(surfaceStyle, /border-radius|box-shadow|translate/);
  assert.match(workbenchCss, /\.personal-workbench-priority-row \+ \.personal-workbench-priority-row/);
});

test("任务信息与优先说明使用七三分栏，右侧不再展示预计投入", () => {
  const rowGrid = workbenchCss.match(/^\.personal-workbench-row-grid\s*\{([^}]*)\}/m)?.[1] ?? "";
  const taskColumn = workbenchCss.match(/^\.personal-workbench-task-column\s*\{([^}]*)\}/m)?.[1] ?? "";
  const insightColumn = workbenchCss.match(/^\.personal-workbench-insight-column\s*\{([^}]*)\}/m)?.[1] ?? "";
  assert.match(rowGrid, /grid-template-columns:\s*minmax\(0,\s*7fr\)\s+minmax\(240px,\s*3fr\)/);
  assert.match(rowGrid, /min-height:\s*120px/);
  assert.match(taskColumn, /display:\s*flex/);
  assert.match(taskColumn, /align-items:\s*center/);
  assert.match(insightColumn, /border-left:\s*1px solid/);
  assert.doesNotMatch(workbenchCss, /^\.personal-workbench-effort\s*\{/m);
  assert.doesNotMatch(insightColumn, /grid-template-columns:\s*minmax\([^)]*105px/);
});

test("所有合法任务进入同一推荐列表，无截止时间不单独分类", async () => {
  const html = await render([
    { ...owned, id: "overdue", name: "已逾期任务", plannedEndOn: "2026-08-30" },
    { ...owned, id: "today", name: "今日任务", plannedEndOn: "2026-08-31" },
    { ...owned, id: "future", name: "未来任务", plannedEndOn: "2026-09-04" },
    { ...owned, id: "no-date", name: "无明确日期任务", dueAt: "—" },
  ]);
  const list = recommendedTasks(html);
  for (const title of ["已逾期任务", "今日任务", "未来任务", "无明确日期任务"]) assert.match(list, new RegExp(title));
  assert.equal((list.match(/class="personal-workbench-action-list"/g) ?? []).length, 1);
  assert.doesNotMatch(list, /无截止时间|日期待核对|任务期限|<select|<option|data-filter/);
});

test("没有本人责任时给出空状态，待接受提议不进入推荐列表", async () => {
  const html = await render([{ ...owned, ownerId: "another", proposedOwnerId: "me-id" }]);
  assert.match(recommendedTasks(html), /还没有由你负责的任务/);
  assert.doesNotMatch(recommendedTasks(html), /核对发布结论/);
  const proposal = disclosure(html, "1 个负责人提议待你回应");
  assert.doesNotMatch(proposal.attributes, /\bopen\b/);
  assert.match(proposal.content, /尚未计入你的正式责任/);
  assert.match(proposal.content, /核对发布结论/);
});

test("分析更新时间只来自数据快照，不因进入页面而伪造刷新", () => {
  assert.match(appSource, /getTeamWorkspaceScenario\(activeTeamId\)\?\.asOf/);
  assert.match(appSource, /if \(changed\) setWorkbenchAsOf\(new Date\(\)\.toISOString\(\)\)/);
  assert.match(appSource, /recordedActivitiesByTaskId:\s*taskActivityStore/);
  assert.doesNotMatch(appSource, /setInterval\([\s\S]{0,240}setWorkbenchAsOf/);
  const primaryNavigation = appSource.match(/const showPrimarySection = \([\s\S]*?\n  };/)?.[0] ?? "";
  assert.ok(primaryNavigation);
  assert.doesNotMatch(primaryNavigation, /setWorkbenchAsOf/);
});

test("工作台不铺陈协作动态、文件或 Agent 取数过程", async () => {
  const record = createWorkspaceTaskDetail(owned);
  record.activities = [8, 9, 10].map((hour) => ({
    id: `change-${hour}`, author: "当前成员", type: "member-post", time: `${hour}:00`,
    createdAt: `2026-08-31T${String(hour).padStart(2, "0")}:00:00+08:00`, message: `第${hour}时的交付记录`,
  }));
  const html = await render([owned], { [owned.id]: record });
  assert.match(html, /class="personal-workbench-updated-at"/);
  assert.match(html, /AI 分析规则/);
  assert.doesNotMatch(html, /近期协作动态|查看来源记录|第8时的交付记录|第9时的交付记录|第10时的交付记录/);
});

test("我的工作连接 AI 继续复用共享弹层", async () => {
  const html = await render([owned]);
  const connectAi = button(html, /^连接 AI$/);
  assert.match(connectAi.attributes, /aria-haspopup="dialog"/);
  assert.match(appSource, /import \{ AiConnectionDialog \} from "\.\/components\/AiConnectionDialog"/);
  assert.match(appSource, /onConnectAi=\{\(trigger\) => \{ workbenchAiConnectionTrigger\.current = trigger; setWorkbenchAiConnectionOpen\(true\); \}\}/);
  assert.match(appSource, /<AiConnectionDialog[\s\S]*?request=\{workbenchAiConnectionRequest\}[\s\S]*?returnFocus=\{workbenchAiConnectionTrigger\.current\}/);
  for (const product of ["ChatGPT", "Claude Code", "CodeBuddy", "Cursor"]) assert.match(aiConnectionDialogSource, new RegExp(product));
});
