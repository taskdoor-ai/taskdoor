# 连接 AI 带入信息摘要 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让讨论入口的连接 AI 弹窗只用“当前任务”和“当前讨论”两行说明实际带入对象，同时保持导出的 AI 上下文不变。

**Architecture:** 在共享 `AiConnectionRequest` 上增加可选的对象级预览数据，讨论请求构建器负责按真实任务与回复关系生成两行摘要，通用弹窗只负责渲染。没有提供对象级预览的任务、“我的工作”等入口继续走现有摘要路径，避免无关回归。

**Tech Stack:** React 19、TypeScript、Base UI Dialog、Node test runner、React server rendering

---

### Task 1: 定义并生成讨论对象级摘要

**Files:**
- Modify: `src/components/AiConnectionDialog.tsx:6-18`
- Modify: `src/lib/taskDiscussionAi.ts:23-97`
- Test: `server/taskDiscussionAi.test.ts`

- [ ] **Step 1: 写失败测试**

在 `server/taskDiscussionAi.test.ts` 增加断言，主讨论、单条回复和回复草稿分别返回两行预览：

```ts
assert.deepEqual(result.contextPreview?.items.map(item => item.label), ["当前任务", "当前讨论"]);
assert.equal(result.contextPreview?.items[0].title, task.title);
assert.match(result.contextPreview?.items[0].detail ?? "", /名称、目标、状态、发起人、完成标准/);
assert.equal(result.contextPreview?.items[1].title, "陈默发起的讨论");
assert.match(result.contextPreview?.items[1].detail ?? "", /包含当前讨论及 2 条回复/);
```

回复测试断言“包含当前回复及 1 条上文”，草稿测试断言“包含被回复原文与未发送草稿”。

- [ ] **Step 2: 运行测试并确认失败**

Run: `./node_modules/.bin/tsx --test server/taskDiscussionAi.test.ts`

Expected: FAIL，`contextPreview` 尚不存在。

- [ ] **Step 3: 增加可选预览类型并由讨论构建器生成真实摘要**

在 `AiConnectionRequest` 中增加：

```ts
contextPreview?: {
  description: string;
  items: Array<{ detail: string; id: string; label: string; title: string }>;
};
```

在 `buildDiscussionAiRequest` 中根据已有 `criteria`、`ancestors`、`threadReplies`、`target.kind` 与来源缺口生成：

```ts
contextPreview: {
  description: "连接后，AI 将基于以下信息继续处理。",
  items: [
    { id: "task", label: "当前任务", title: task.title, detail: `任务${taskFieldNames.join("、")}` },
    { id: "discussion", label: "当前讨论", title: discussionTitle, detail: discussionDetail },
  ],
},
```

预览数据不得加入 `buildContextPrompt` 导出的 JSON；来源缺失时 `discussionDetail` 追加“部分上文不可用”。

- [ ] **Step 4: 运行构建器测试并确认通过**

Run: `./node_modules/.bin/tsx --test server/taskDiscussionAi.test.ts`

Expected: PASS。

### Task 2: 在共享弹窗渲染两行对象摘要

**Files:**
- Modify: `src/components/AiConnectionDialog.tsx:251-280`
- Modify: `src/styles.css:6784-6810`
- Test: `server/aiConnectionDialog.test.ts`

- [ ] **Step 1: 写失败测试**

为测试请求加入 `contextPreview`，断言两行对象摘要可见，且首层不出现旧对象卡、分类汇总、具体任务字段值、讨论正文或展开入口：

```ts
assert.match(html, /当前任务/);
assert.match(html, /当前讨论/);
assert.match(html, /发布结论核对/);
assert.match(html, /周岚发起的讨论/);
assert.doesNotMatch(html, /任务信息|协作记录|文件引用|查看具体内容/);
assert.ok(!html.includes(request.workObject.content!));
assert.ok(!html.includes(request.context[0].value));
```

保留一个无 `contextPreview` 的请求，断言原有通用摘要仍可渲染。

- [ ] **Step 2: 运行测试并确认失败**

Run: `./node_modules/.bin/tsx --test server/aiConnectionDialog.test.ts`

Expected: FAIL，弹窗尚未使用对象级预览。

- [ ] **Step 3: 条件渲染对象级摘要并补充响应式样式**

在 `AiConnectionContextPreview` 中优先渲染：

```tsx
<dl className="ai-connect-context-objects">
  {request.contextPreview.items.map(item => <div key={item.id}>
    <dt>{item.label}</dt>
    <dd><strong>{item.title}</strong><span>{item.detail}</span></dd>
  </div>)}
</dl>
```

若 `contextPreview` 不存在，保留当前对象卡、分类摘要与按需明细。样式使用 92px 标签列和单一分隔线；窄屏切换为单列，不增加卡片嵌套。

- [ ] **Step 4: 运行两项针对性测试**

Run: `./node_modules/.bin/tsx --test server/aiConnectionDialog.test.ts server/taskDiscussionAi.test.ts`

Expected: 全部 PASS。

- [ ] **Step 5: 运行 TypeScript 构建检查**

Run: `./node_modules/.bin/tsc -b`

Expected: exit 0；不运行全量测试。
