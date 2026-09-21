# 子任务下级数量提示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在任务详情的子任务行中显示直接下一级子任务数量，并扩充默认 Mock，让当前页面可观察到多个不同数量的层级示例。

**Architecture:** 关系数量由任务树投影层计算，作为可选的 `childTaskCount` 写入 `TaskRelationSummary`；列表组件只负责展示。Mock 在现有“新品发布会筹备”任务树下新增完整业务子任务，并通过一次性场景版本迁移进入已有本地数据，不持久化派生数量。

**Tech Stack:** React、TypeScript、Node test runner、服务端静态渲染测试、Markdown PRD 构建脚本。

---

当前工作树中目标文件已有未提交改动，因此本计划不创建中间 Git commit，避免把用户的既有修改混入提交；每个任务仍按 RED → GREEN 独立验证。

### Task 1: 任务树数量投影

**Files:**
- Create: `server/taskRelationProjection.test.ts`
- Modify: `src/lib/taskRelationProjection.ts`
- Modify: `src/components/TaskRelationsSection.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 写直接子任务数量的失败测试**

在 `server/taskRelationProjection.test.ts` 构造 `root → child → grandchild → great-grandchild`，断言 `getDirectChildTaskCounts()` 返回 `root=1`、`child=1`、`grandchild=1`，叶子没有键；同时加入文件节点，证明非任务节点不计数。

- [ ] **Step 2: 运行测试并确认因函数不存在而失败**

Run: `npx tsx --test server/taskRelationProjection.test.ts`

Expected: FAIL，提示 `getDirectChildTaskCounts` 尚未导出。

- [ ] **Step 3: 实现最小关系投影**

在 `src/lib/taskRelationProjection.ts` 增加：

```ts
export const getDirectChildTaskCounts = (nodes: readonly WorkspaceNode[]) => {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    if (node.kind !== "task" || !node.parentTaskId) continue;
    counts.set(node.parentTaskId, (counts.get(node.parentTaskId) ?? 0) + 1);
  }
  return counts;
};
```

给 `TaskRelationSummary` 增加 `childTaskCount?: number`。在 `App.tsx` 对 `teamWorkspaceNodes` 生成数量 Map，并在构造 `selectedChildTasks` 时只对有直接下级的任务写入 `childTaskCount`。

- [ ] **Step 4: 运行投影测试并确认通过**

Run: `npx tsx --test server/taskRelationProjection.test.ts`

Expected: PASS。

### Task 2: 子任务行轻量展示

**Files:**
- Modify: `server/taskSubtaskList.test.ts`
- Modify: `src/components/TaskSubtaskList.tsx`
- Modify: `src/styles/task-criteria-editor.css`

- [ ] **Step 1: 写数量显示的失败测试**

向 `server/taskSubtaskList.test.ts` 增加一个用例：传入 `childTaskCount: 3` 的任务和 `childTaskCount: 0`／未传数量的任务，断言只出现一次“3 个子任务”；按钮总数保持不变，数量没有独立按钮。

- [ ] **Step 2: 运行测试并确认因文案不存在而失败**

Run: `npx tsx --test server/taskSubtaskList.test.ts`

Expected: FAIL，缺少“3 个子任务”。

- [ ] **Step 3: 实现最小展示与样式**

将任务标题按钮内容改为标题和可选计数：

```tsx
<button ...>
  <span>{task.title}</span>
  {Boolean(task.childTaskCount && task.childTaskCount > 0) && (
    <small className="task-subtask-title-count">{task.childTaskCount} 个子任务</small>
  )}
</button>
```

将 `.task-subtask-title` 改为可换行的 `inline-flex`，并为 `.task-subtask-title-count` 使用 caption 字号、三级文字色和等宽数字；不改变按钮和打开行为。

- [ ] **Step 4: 运行子任务列表定向测试**

Run: `npx tsx --test server/taskSubtaskList.test.ts server/subtaskEmptyCompact.test.ts server/subtaskEmptyDivider.test.ts`

Expected: PASS。

### Task 3: 扩充新品发布会 Mock 层级

**Files:**
- Modify: `src/data/workspaceNodes.ts`
- Modify: `src/lib/workspaceScenarioReset.ts`
- Modify: `server/workspaceScenarioReset.test.ts`
- Modify: `server/mockProgressPipeline.test.ts`
- Modify: `server/mockAiAnalysis.test.ts`
- Modify: `server/progressEvidenceGap.test.ts`
- Modify: `docs/task-design-kit/11-task-workspace-detail-interaction-baseline.md`

- [ ] **Step 1: 写 Mock 层级和迁移失败测试**

先在 `server/workspaceScenarioReset.test.ts` 定义四个新 ID：

```ts
const productLaunchDetailSubtaskIds = [
  "product-launch-venue-contract",
  "product-launch-promo-key-visual",
  "product-launch-promo-invitation",
  "product-launch-promo-channel-assets",
];
```

断言 fresh fixture 中“场地确认”有 1 个直接下级、“宣传物料制作”有 3 个直接下级、“发布会流程设计”保持 4 个；从 v21 升级会补齐四项，从新版本删除后不会复活。

- [ ] **Step 2: 运行迁移测试并确认新节点缺失**

Run: `npx tsx --test server/workspaceScenarioReset.test.ts`

Expected: FAIL，新 ID 不存在或版本仍为 v21。

- [ ] **Step 3: 新增四个完整业务 Mock**

在 `src/data/workspaceNodes.ts`：

- 将 `product-launch-venue` 和 `product-launch-promo-assets` 从带独立估算的叶子改为汇总任务；
- 在场地下增加“签署场地与设备服务确认”，继承原 360 分钟范围；
- 在宣传物料下增加“定稿发布会主视觉”“完成嘉宾邀请函”“交付渠道宣传物料”三个叶子，投入分别为 300、180、240 分钟；
- 每项填写负责人、参与人、状态、目标、完成标准、执行提示、日期、图标和标签。

在 `src/lib/workspaceScenarioReset.ts` 将当前场景版本升级为 `multi-team-v22-subtask-child-count-fixtures`。新增一次性迁移：只有父任务存在时才补其新子任务；对仍为未确认 Mock 估算的两个旧父任务移除旧估算，保留用户手工或已确认估算；当前版本再次载入时不补回用户删除项。

- [ ] **Step 4: 运行迁移测试并确认通过**

Run: `npx tsx --test server/workspaceScenarioReset.test.ts`

Expected: PASS。

- [ ] **Step 5: 更新固定 Mock 回归基线**

新任务让内置任务总数从 228 变为 232、可量化任务从 224 变为 228。按实际投影结果更新 `mockProgressPipeline.test.ts`、`mockAiAnalysis.test.ts`、`progressEvidenceGap.test.ts` 的固定断言，并将基线文档同步为“232 个任务，其中 228 个有可量化进度”。范围总量保持不变：新品发布会父任务仍为 2160 分钟，流程设计仍为 1080 分钟。

- [ ] **Step 6: 运行 Mock 定向回归**

Run: `npx tsx --test server/workspaceScenarioReset.test.ts server/mockProgressPipeline.test.ts server/mockAiAnalysis.test.ts server/progressEvidenceGap.test.ts`

Expected: PASS。

### Task 4: 同步 PRD 与完成校验

**Files:**
- Modify: `.worktrees/full-product-prd/docs/prd/modules/08-task-detail-maintenance.md`
- Modify: `.worktrees/full-product-prd/docs/prd/CHANGELOG.md`
- Modify: `.worktrees/full-product-prd/docs/prd/source-map.md`
- Modify: `.worktrees/full-product-prd/docs/prd/current-implementation-matrix.md`
- Regenerate: `.worktrees/full-product-prd/public/prd/`

- [ ] **Step 1: 记录语义变更**

使用 `PRD-0010`：在模块 08 的“子任务”设计与验收中写明直接下一级计数、0 隐藏和非独立操作；更新模块 `last_change`。在日志顶部说明功能和 Mock 数据变化，并把代码与定向测试加入来源映射／实现矩阵。

- [ ] **Step 2: 重新构建 PRD**

Run: `node scripts/build-agentdoor-prd.mjs`

Workdir: `.worktrees/full-product-prd`

Expected: `Built 15 PRD module(s) in public/prd/`。

- [ ] **Step 3: 最小代码验证**

Run: `npx tsx --test server/taskRelationProjection.test.ts server/taskSubtaskList.test.ts server/subtaskEmptyCompact.test.ts server/subtaskEmptyDivider.test.ts server/workspaceScenarioReset.test.ts server/mockProgressPipeline.test.ts server/mockAiAnalysis.test.ts server/progressEvidenceGap.test.ts`

Expected: PASS。不运行全量测试。

- [ ] **Step 4: 格式与构建验证**

Run: `git diff --check -- src/App.tsx src/components/TaskRelationsSection.tsx src/components/TaskSubtaskList.tsx src/styles/task-criteria-editor.css src/lib/taskRelationProjection.ts src/data/workspaceNodes.ts src/lib/workspaceScenarioReset.ts server/taskRelationProjection.test.ts server/taskSubtaskList.test.ts server/workspaceScenarioReset.test.ts server/mockProgressPipeline.test.ts server/mockAiAnalysis.test.ts server/progressEvidenceGap.test.ts docs/task-design-kit/11-task-workspace-detail-interaction-baseline.md docs/superpowers/specs/2026-09-20-subtask-direct-child-count-design.md docs/superpowers/plans/2026-09-20-subtask-direct-child-count.md`

Run: `npm run build`

Expected: 无格式错误，TypeScript 与 Vite 构建成功。
