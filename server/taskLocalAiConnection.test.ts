import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

const readSource = (path: string) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

test("任务头部以纯图标连接 AI，不打开任务信息调整；讨论继续使用同一个连接弹窗", () => {
  const source = readSource("src/components/TaskDetail.tsx");

  assert.match(source, /aria-label="连接 AI：当前任务"/);
  assert.match(source, /onClick=\{[^\n]*openTaskAiConnection\(event.currentTarget\)/);
  const connectionButton = source.match(/<Button\b[^>]*aria-label="连接 AI：当前任务"[\s\S]*?<\/Button>/)?.[0];
  assert.ok(connectionButton);
  assert.match(connectionButton, /variant="ai"><Sparkles[^>]*\/><\/Button>/);
  assert.match(connectionButton, /size=\{connectionButtonSize === "touch" \? "icon-touch" : "icon-sm"\}/);
  assert.match(connectionButton, /title="连接 AI"/);
  assert.doesNotMatch(source, /AI 调整任务信息|openAiAdjustment\(\{ kind: "task" \}/);
  assert.doesNotMatch(source, /aiAdjustmentContext && onAiAdjustmentApply && <div className="task-ai-detail-tools"/);
  assert.match(source, /AiConnectionDialog/);
  assert.match(source, /buildDiscussionAiRequest/);
  assert.match(source, /buildTaskAiConnectionRequest/);
  assert.match(source, /parentTask/);
  assert.match(source, /<TaskDiscussion[^>]*onConnectAi=/);
  assert.equal(source.match(/<AiConnectionDialog\b/g)?.length, 1);
  assert.match(source, /aiConnectionRequest\?\.taskId === taskId/);
  assert.match(source, /returnFocus=\{aiConnectionTrigger.current\}/);
  assert.doesNotMatch(readSource("src/components/WorkspaceTopbar.tsx"), /连接 AI/);
  assert.match(readSource("src/App.tsx"), /parentTask=\{selectedParentTask \? toTaskRelationSummary\(selectedParentTask\) : undefined\}/);
});

// Exercise the real event handlers and context builder without mounting unrelated UI.
function handler(name: string, bindings: Record<string, unknown>): (...args: unknown[]) => unknown {
  const source = readSource("src/components/TaskDetail.tsx");
  const start = source.indexOf(`  const ${name} =`);
  assert.ok(start >= 0, `缺少 ${name} 回调`);
  const end = source.indexOf("\n  };", start);
  assert.ok(end > start);
  const compiled = transformSync(source.slice(start, end + 5), { loader: "ts", target: "es2022" }).code;
  return new Function(...Object.keys(bindings), `${compiled}; return ${name};`)(...Object.values(bindings));
}

test("任务连接读取当前字段与人员状态，只打开预览、不调用调整或写入", async () => {
  const moduleUrl = new URL("../src/lib/taskAiConnection.ts", import.meta.url);
  assert.ok(existsSync(moduleUrl), "任务连接需要独立的上下文构建器");
  const { buildTaskAiConnectionRequest } = await import(moduleUrl.href);
  const task = { title: "旧名称", goal: "旧目标", owner: "旧负责人", participants: ["旧参与人"], status: "待开始", due: "旧截止", summary: "不可导出的旧摘要", activities: [], files: [], commits: [], completionCriteria: ["真实完成标准"] };
  const before = structuredClone(task);
  const activity = { id: "current-record", author: "陈默", type: "member-post", message: "当前讨论原文", time: "今天" };
  const aiConnectionTrigger = { current: null };
  const requests: Array<{ taskId: string; request: unknown }> = [];
  const open = handler("openTaskAiConnection", {
    buildTaskAiConnectionRequest, taskId: "current-task", task, currentUser: "周岚", currentTitle: "最新名称", currentGoal: "最新目标",
    confirmedOwnerId: "正式负责人", pendingOwnerId: "候选负责人", currentParticipants: ["陈默"], participantInvitationStatus: { 陈默: "pending" },
    currentStatus: "进行中", activities: [activity], plannedEndOn: "2026-09-12", tags: ["高优先级"], parentTask: { id: "parent-task", title: "父任务", goal: "父任务目标", status: "进行中" }, pathItems: [{ id: "current-task", label: "最新名称" }],
    childTasks: [], dependencyTasks: [], dependencyTaskIds: [], aiConnectionTrigger,
    setAiConnectionRequest: (value: (typeof requests)[number]) => { requests.push(value); },
    onAiAdjustmentApply: () => assert.fail("连接不执行字段调整"), setAiOpen: () => assert.fail("连接不打开调整浮层"),
  });
  const trigger = {};
  open(trigger);
  assert.equal(aiConnectionTrigger.current, trigger);
  assert.equal(requests.length, 1);
  const [opened] = requests;
  assert.equal(opened.taskId, "current-task");
  const text = JSON.stringify(opened.request);
  for (const value of ["最新名称", "最新目标", "正式负责人", "候选负责人", "待接受", "陈默", "进行中", "2026-09-12", "高优先级", "父任务", "父任务目标", "真实完成标准"]) assert.ok(text.includes(value), value);
  assert.doesNotMatch(text, /当前讨论原文/);
  assert.doesNotMatch(text, /旧名称|旧目标|旧负责人|旧参与人|旧截止|不可导出的旧摘要/);
  assert.deepEqual(task, before);
});

test("关闭共享连接弹窗只清除连接请求，不清除讨论或其他编辑草稿", () => {
  const updates: unknown[] = [];
  const close = handler("closeAiConnection", { setAiConnectionRequest: (value: unknown) => updates.push(value) });
  close();
  assert.deepEqual(updates, [null]);
});

test("连接弹窗复用真实工具 Logo 并保持简约上下文", () => {
  const source = readSource("src/components/AiConnectionDialog.tsx");

  for (const tool of ["ChatGPT", "Claude Code", "CodeBuddy", "Cursor"]) assert.match(source, new RegExp(tool));
  assert.match(source, /agentIconUrls/);
  assert.match(source, /仅带入你当前有权查看的信息，不会获得额外权限/);
  assert.doesNotMatch(source, /Stepper|EvervaultCard|ai-coordination-loop/);
});
