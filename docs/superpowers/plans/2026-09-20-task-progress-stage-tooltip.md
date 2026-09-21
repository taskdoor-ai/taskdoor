# Task Progress Stage Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将四格任务进度改为 0–4 格五态，并让每一格在悬浮或键盘聚焦时显示对应档位名称。

**Architecture:** 保持 `TaskProgressStage` 为唯一档位映射和渲染入口；使用现有 Base UI Tooltip 为四个格子提供统一的悬浮／聚焦提示。档位只解释现有进度证据，不写回 Task 状态或燃起图数据。

**Tech Stack:** React、TypeScript、Base UI Tooltip、Node test runner、CSS。

---

### Task 1: 锁定 0–4 格语义与可访问提示

**Files:**
- Modify: `server/taskProgressStages.test.ts`
- Modify: `src/components/TaskProgressStage.tsx`

- [x] **Step 1: 写入失败测试**

在 `server/taskProgressStages.test.ts` 中把档位用例改为五态，并新增四格提示断言：

```ts
for (const [amount, name, filled] of [
  [0, "未形成结果", 0],
  [1, "少量完成", 1],
  [599, "少量完成", 1],
  [600, "部分完成", 2],
  [1199, "部分完成", 2],
  [1200, "大部分完成", 3],
  [2159, "大部分完成", 3],
  [2160, "接近完成", 4],
] as const) {
  const html = summary(amount);
  assert.match(html, new RegExp(name));
  assert.equal((html.match(/data-filled="true"/g) ?? []).length, filled);
}

const html = summary(1200);
for (const [step, name] of [[1,"少量完成"],[2,"部分完成"],[3,"大部分完成"],[4,"接近完成"]] as const) {
  assert.match(html, new RegExp(`aria-label="${step} 格 · ${name}"`));
}
```

- [x] **Step 2: 运行测试并确认按预期失败**

Run: `npx tsx --test server/taskProgressStages.test.ts`

Expected: FAIL，旧实现仍把 0 映射为一格“未形成成果”，且没有四个 Tooltip trigger 的无障碍名称。

- [x] **Step 3: 实现五态映射和四格 Tooltip**

在 `src/components/TaskProgressStage.tsx` 中引入 `Tooltip`，定义稳定的四格名称，并把每格渲染为 Tooltip trigger：

```tsx
import { Tooltip } from "@base-ui/react/tooltip";

const stageNames = ["少量完成", "部分完成", "大部分完成", "接近完成"] as const;

const stage = !available ? null : ratio === 0 ? 0 : ratio < .25 ? 1 : ratio < .5 ? 2 : ratio < .9 ? 3 : 4;
const name = confirmed ? "已完成" : stage === null ? "暂无评估" : stage === 0 ? "未形成结果" : stageNames[stage - 1];

<span className="task-progress-stage-track">
  {stageNames.map((stageName, index) => {
    const step = index + 1;
    const tooltip = `${step} 格 · ${stageName}`;
    return <Tooltip.Root key={stageName}>
      <Tooltip.Trigger aria-label={tooltip} className="task-progress-stage-step" closeOnClick={false} data-filled={step <= (stage ?? 0)} delay={150} type="button" />
      <Tooltip.Portal>
        <Tooltip.Positioner className="task-progress-stage-tip-positioner" collisionPadding={12} side="top" sideOffset={8}>
          <Tooltip.Popup className="task-progress-stage-tip" role="tooltip">{tooltip}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>;
  })}
</span>
```

把外层摘要从 `role="img"` 改为 `role="group"`，避免图片角色吞掉内部可聚焦格子的语义；保留当前进度和来源的 `aria-label`。

- [x] **Step 4: 运行测试并确认通过**

Run: `npx tsx --test server/taskProgressStages.test.ts`

Expected: 相关测试全部 PASS。

### Task 2: 完成视觉样式和最小回归验证

**Files:**
- Modify: `src/styles/task-detail-split.css`
- Test: `server/taskProgressStages.test.ts`

- [x] **Step 1: 写入样式契约测试并确认失败**

在 `server/taskProgressStages.test.ts` 中读取 `src/styles/task-detail-split.css`，断言格子、焦点态与 Tooltip 样式存在：

```ts
const css = readFileSync(new URL("../src/styles/task-detail-split.css", import.meta.url), "utf8");
assert.match(css, /\.task-progress-stage-step:focus-visible/);
assert.match(css, /\.task-progress-stage-tip\s*\{/);
```

Run: `npx tsx --test server/taskProgressStages.test.ts`

Expected: FAIL，尚未定义新样式。

- [x] **Step 2: 实现格子和 Tooltip 样式**

在 `src/styles/task-detail-split.css` 中将原 `i` 选择器替换为按钮类，并补充悬浮、聚焦和浮层样式：

```css
.task-progress-stage-step { position: relative; appearance: none; min-width: 0; height: 16px; padding: 0; border: 0; background: transparent; cursor: help; }
.task-progress-stage-step::before { position: absolute; inset: 50% 0 auto; height: 5px; border-radius: 2px; background: var(--ad-border-soft); content: ""; transform: translateY(-50%); }
.task-progress-stage-step[data-filled="true"]::before { background: #4f7df3; }
.task-progress-stage-step:hover::before { box-shadow: 0 0 0 2px color-mix(in srgb, #4f7df3 18%, transparent); }
.task-progress-stage-step:focus-visible { outline: 2px solid var(--ad-focus); outline-offset: 2px; }
.task-progress-stage-tip-positioner { z-index: 120; }
.task-progress-stage-tip { padding: 6px 9px; border-radius: 6px; background: var(--ad-ink); color: var(--ad-surface); box-shadow: var(--ad-shadow-float); font-size: 12px; font-weight: 500; line-height: 18px; white-space: nowrap; }
```

- [x] **Step 3: 运行相关测试和类型检查**

Run: `npx tsx --test server/taskProgressStages.test.ts`

Expected: PASS。

Run: `npx tsc -b --pretty false`

Expected: PASS，无 TypeScript 错误。

- [x] **Step 4: 检查本次差异**

Run: `git diff -- src/components/TaskProgressStage.tsx src/styles/task-detail-split.css server/taskProgressStages.test.ts docs/superpowers/specs/2026-09-20-task-progress-stage-tooltip-design.md docs/superpowers/plans/2026-09-20-task-progress-stage-tooltip.md`

Expected: 仅包含五态映射、四格 Tooltip、对应样式、测试和本次文档；不覆盖工作区中其他改动。
