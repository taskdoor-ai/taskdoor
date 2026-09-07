# 连接 AI 上下文合同 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一所有现有连接 AI 入口的真实载荷与对象级概览，允许展开核对同一份 JSON，并删除工具名称下方说明。

**Architecture:** `buildContextPayload` 成为唯一待分析 JSON 生成函数，提示词和弹窗展开区共同序列化它。任务、讨论和“我的工作”构建器各自遵守固定入口合同并提供对象级 `contextPreview`；共享弹窗不再为这些入口猜测分类。

**Tech Stack:** React 19、TypeScript、Base UI Dialog、Node test runner、React server rendering

---

### Task 1: 统一 JSON 与弹窗展示

**Files:**
- Modify: `src/components/AiConnectionDialog.tsx`
- Modify: `src/styles.css`
- Test: `server/aiConnectionDialog.test.ts`

- [ ] **Step 1: 写失败测试**

更新弹窗测试，要求默认层只显示 `contextPreview.items`，展开区包含 `buildContextPayload(request)` 的格式化 JSON，并且提示词中的 JSON 与该函数一致：

```ts
const payload = module.buildContextPayload(conciseRequest);
assert.deepEqual(payload, { workObject: conciseRequest.workObject, context: conciseRequest.context });
assert.match(html, /查看带入的 JSON/);
assert.ok(html.includes(JSON.stringify(payload, null, 2).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")));
assert.doesNotMatch(html.split("<details")[0], /先核对范围|当前方案需要哪些修订/);
```

源码测试同时断言四个旧说明文本和 `{agent.note}` 不再存在。

- [ ] **Step 2: 运行测试并确认失败**

Run: `./node_modules/.bin/tsx --test server/aiConnectionDialog.test.ts`

Expected: FAIL，尚无 `buildContextPayload` 和 JSON 展开区，工具说明仍存在。

- [ ] **Step 3: 实现唯一 JSON 生成函数与只读展开区**

在 `AiConnectionDialog.tsx` 增加：

```ts
export function buildContextPayload(request: AiConnectionRequest) {
  return {
    workObject: request.workObject,
    context: request.context.filter(item => item.value.trim()),
  };
}
```

让 `buildContextPrompt` 调用该函数。`AiConnectionContextPreview` 在概览后渲染默认收起的原生 `details`，内容为：

```tsx
<pre aria-label="实际带入 AI 的 JSON"><code>{JSON.stringify(buildContextPayload(request), null, 2)}</code></pre>
```

删除四个 agent 的 `note` 字段及 `<small>{agent.note}</small>`。样式将工具卡高度收敛到 58px；JSON 区最大高度 260px、独立滚动、保留缩进并允许长字符串换行。

- [ ] **Step 4: 运行弹窗测试并确认通过**

Run: `./node_modules/.bin/tsx --test server/aiConnectionDialog.test.ts`

Expected: PASS。

### Task 2: 收敛当前任务载荷并接入直接父任务

**Files:**
- Modify: `src/lib/taskAiConnection.ts`
- Modify: `src/components/TaskDetail.tsx`
- Modify: `src/App.tsx`
- Test: `server/taskAiConnection.test.ts`
- Test: `server/taskLocalAiConnection.test.ts`

- [ ] **Step 1: 写失败测试**

任务构建器测试断言当前任务只包含核心字段和可选父任务：

```ts
assert.deepEqual(request.contextPreview?.items.map(item => item.label), ["当前任务", "父任务"]);
assert.match(contextValue(request, "父任务"), /parent-task.*父任务标题.*父任务目标.*进行中/s);
for (const label of ["直属子任务", "前置任务", "讨论", "回复", "任务文件元数据", "文件引用"]) {
  assert.equal(contextValue(request, label), "");
}
```

接线测试断言 `App.tsx` 将 `selectedParentTask` 转为 `TaskRelationSummary` 传给 `TaskDetail`，`TaskDetail` 再传给 `buildTaskAiConnectionRequest`。

- [ ] **Step 2: 运行任务测试并确认失败**

Run: `./node_modules/.bin/tsx --test server/taskAiConnection.test.ts server/taskLocalAiConnection.test.ts`

Expected: FAIL，任务载荷仍包含讨论、文件、子任务和前置关系，且没有父任务投影。

- [ ] **Step 3: 实现任务固定合同**

为 `TaskAiConnectionInput` 增加 `parentTask?: TaskRelationSummary`，删除构建器对 `childTasks`、`dependencyTasks`、`dependencyTaskIds`、`pathItems`、`task.activities` 和 `task.files` 的读取。父任务上下文严格使用：

```ts
{
  label: "父任务",
  value: `${parentTask.title}（${parentTask.id}）\n目标：${parentTask.goal}\n状态：${parentTask.status}`,
}
```

请求提供“当前任务”及可选“父任务”的 `contextPreview`。`TaskDetail` 新增 `parentTask` 属性并传入构建器；`App.tsx` 使用 `selectedParentTask ? toTaskRelationSummary(selectedParentTask) : undefined` 提供真实投影。

- [ ] **Step 4: 运行任务测试并确认通过**

Run: `./node_modules/.bin/tsx --test server/taskAiConnection.test.ts server/taskLocalAiConnection.test.ts`

Expected: PASS。

### Task 3: 统一讨论与“我的工作”概览

**Files:**
- Modify: `src/lib/taskDiscussionAi.ts`
- Modify: `src/lib/personalWorkbenchAiConnection.ts`
- Test: `server/taskDiscussionAi.test.ts`
- Test: `server/personalWorkbenchAiConnection.test.ts`

- [ ] **Step 1: 写失败测试**

讨论测试删除“当前用户是任务发起人”的旧假设，并断言当前任务背景仅含 ID、名称、目标、状态、完成标准；“我的工作”测试要求对象级概览：

```ts
assert.equal(contextValue(result, "发起人"), "");
assert.deepEqual(request.contextPreview?.items, [{
  id: "owned-tasks",
  label: "我的任务列表",
  title: "我的任务列表",
  detail: "共 3 项正式负责的任务 · 每项包含 Task ID、名称、状态 · 数据快照 2026-09-01T10:00:00+08:00",
}]);
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `./node_modules/.bin/tsx --test server/taskDiscussionAi.test.ts server/personalWorkbenchAiConnection.test.ts`

Expected: FAIL，讨论仍发送“发起人”，我的工作尚无概览。

- [ ] **Step 3: 实现两个入口合同**

从讨论上下文移除 `{ label: "发起人", value: currentUser }`，对应概览字段范围移除“发起人”。为“我的工作”请求增加单行 `contextPreview`，数量和快照直接来自已有 `ownedTasks` 与 `asOf`，实际任务列表内容保持每项仅 ID、名称、状态。

- [ ] **Step 4: 运行四组针对性测试**

Run: `./node_modules/.bin/tsx --test server/aiConnectionDialog.test.ts server/taskAiConnection.test.ts server/taskLocalAiConnection.test.ts server/taskDiscussionAi.test.ts server/personalWorkbenchAiConnection.test.ts`

Expected: 全部 PASS。

- [ ] **Step 5: 运行应用侧类型检查与差异检查**

Run: `./node_modules/.bin/tsc -p tsconfig.app.json`

Expected: exit 0。

Run: `git diff --check -- src/components/AiConnectionDialog.tsx src/lib/taskAiConnection.ts src/lib/taskDiscussionAi.ts src/lib/personalWorkbenchAiConnection.ts src/components/TaskDetail.tsx src/App.tsx src/styles.css server/aiConnectionDialog.test.ts server/taskAiConnection.test.ts server/taskDiscussionAi.test.ts server/personalWorkbenchAiConnection.test.ts`

Expected: 无输出；不运行全量测试或双重审查。
