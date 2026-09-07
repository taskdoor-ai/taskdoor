# Task Situation Reference Links Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让任务详情的“当前情况”和“下一步建议”只展示文字，不再展示 Mock reference 跳转入口。

**Architecture:** 在 `TaskCurrentSituation` 展示层停止消费 `TaskSituationItem.reference`；底层模型与 Mock 数据保持不变。用服务端渲染测试覆盖“文字保留、入口消失”。

**Tech Stack:** React、TypeScript、Node test runner、React server rendering

---

### Task 1: 移除两个区块的可见 reference 入口

**Files:**
- Modify: `server/taskCurrentSituationRendering.test.ts`
- Modify: `src/components/TaskCurrentSituation.tsx`

- [x] **Step 1: 写入失败的用户可见行为测试**

在带 `onOpenReference` 回调的渲染用例中保留当前情况与下一步建议文本断言，并增加：

```ts
assert.doesNotMatch(html, /task-situation-reference|task-situation-source-label/);
assert.doesNotMatch(html, /查看任务|查看交付文件|查看子任务|核对完成标准/);
```

- [x] **Step 2: 运行单个用例确认 RED**

```bash
./node_modules/.bin/tsx --test --test-name-pattern='当前情况与下一步建议只展示文字' server/taskCurrentSituationRendering.test.ts
```

预期：FAIL，输出仍包含 `task-situation-reference` 或 reference 标签。

- [x] **Step 3: 写入最小实现**

删除 `ArrowUpRight` 和 `referenceButton`；保留 `onOpenReference` 兼容属性但不在展示层消费。任务项只渲染文字：

```tsx
return <li className="task-situation-item" key={`${group}-${index}`}>
  <span id={itemId}>{item.text}</span>
</li>;
```

- [x] **Step 4: 运行定向用例确认 GREEN**

```bash
./node_modules/.bin/tsx --test --test-name-pattern='详情把已有进展|当前情况与下一步建议只展示文字' server/taskCurrentSituationRendering.test.ts
```

预期：两个入口相关用例通过，0 个失败；不运行全量测试或双重审查。

整份文件另有一个既存断言期待“完成状态”，而 `TaskBurnUpSparkline` 当前输出“完成进度”；该不一致位于本次 reference 入口范围之外，不在本任务中顺手修改。
