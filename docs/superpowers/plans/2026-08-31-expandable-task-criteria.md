# 子任务完成标准展开编辑 Implementation Plan

> 用户已确认交互；使用 writing-plans / subagent-driven-development 执行。当前共享工作区中就地修改，不提交、不重置、不移动工作树，保留所有无关改动。

**Goal:** 创建页与详情子任务列表共用“摘要 / 共 N 条 · 展开编辑”，逐条修改、添加、删除，取消不写入，保存只改该任务的完成标准，保留 AI 调整。

**Architecture:** `TaskCriteriaEditor` 管理暂存行、展开与冲突；回调 `onSave(next: string[], expected: string[])` 由创建适配器更新原草稿、由详情适配器仅修改当前直属子任务。详情节点、原快照和活动复用可恢复 localStorage journal，成功后才更新内存。任务名称导航与编辑控件为兄弟节点，禁止交互嵌套。无变化不记活动，不用 AI 语法解析手工正文。

**Tech Stack:** React / TypeScript，既有 21st 适配 Accordion、Button、Textarea 与 --ad-* Token；node:test、tsx、浏览器实测；无新增依赖。

## 视觉与状态

沿用 Geist/中文系统字体、蓝色主动作与白色任务表面。摘要只显示第一条，标注总数；展开为一层浅蓝边线的条目编辑区，圆点是条目标识，不是验收勾选或编号优先级。保存、取消与 AI 同行，手机换行且 44px 点击区。不新增弹窗、文件页、验收、排序或拖拽能力。

编辑至少保留一条非空标准；空白行明确指出位置，不静默丢弃。AI 仍使用现有预览弹窗；本编辑器有未保存输入时，内嵌 AI 按钮提示先保存/取消。其他入口更改同一标准时，保留输入、阻止旧值覆盖并提供明确重新载入。创建最终确认在存在未保存标准时禁用，避免悄悄漏掉输入。

## 任务 1：纯保存契约（独立子任务）

- [x] 新增 `src/lib/taskCriteriaEditing.ts` 和 `server/taskCriteriaEditing.test.ts`。导出 `validateTaskCriteria(values)`，拒绝空列表/空行并 trim；导出 `applySavedTaskCriteria(nodes, parentTaskId, taskId, expected, values, author)`，仅允许当前直属子任务、校验真实字段快照、保留其他字段，返回 `{nodes, activity: TaskActivityMock | null, original: TaskNode}`。
- [x] 先断言模块存在失败，再测试多条/中文分号与换行不拆条/无变化/过期/越界/不改状态责任/不把目标或示例当标准。记录红绿结果。
- [x] 主线程审核规格与代码质量，运行 `node --import tsx --test server/taskCriteriaEditing.test.ts`。

## 任务 2：共享 UI 与接线

- [x] 新增 `src/components/TaskCriteriaEditor.tsx`，使用 Accordion controlled open、草稿数组与原数组比较、保存中防重复、失败保留、焦点恢复；`onDirtyChange` 向创建页报告未保存状态。
- [x] 新增 UI 结构与渲染用例，先红后绿：`server/taskCriteriaEditor.test.ts`；扩展 `server/taskSubtaskList.test.ts` 验证导航与标准分开，非拼接摘要假装编辑。
- [x] 修改 `TaskCreationPlanEditor.tsx` 子项标准为共享编辑器，移除菜单里旧的添加标准；主任务标准编辑不改。保存再次核对当前子项 expected；创建页保留未保存提示并禁用最终确认。
- [x] 修改 `TaskSubtaskList.tsx`，任务名称独立导航按钮，同一行下方挂共享标准编辑器；只读没有保存回调时允许展开看多条。`TaskDetail.tsx` 传入 scoped 保存和 AI 回调。
- [x] `App.tsx` 用纯适配器构造候选，journal 同步写节点、真实活动和原快照；仅成功后更新 React state，失败使用既有恢复锁，不伪报保存。活动文案“修改完成标准”，不写为 AI 生成。
- [x] 新增 `src/styles/task-criteria-editor.css`，由页面载入，不污染基础组件；窄屏排版、focus-visible、reduce-motion。

## 任务 3：验证与交付

- [x] 运行 `node --import tsx --test server/taskCriteria*.test.ts server/taskSubtaskList.test.ts server/taskCreation*.test.ts server/taskAiAdjustment*.test.ts server/taskActivity*.test.ts` 与 `npm run build`、`git diff --check`。
- [x] 隔离本地端口浏览器验证：创建展开/增删/取消/保存/最终创建门禁；详情多条保存/刷新/活动；AI与手工同字段冲突保留；名称导航与展开分离；手机长文本和Esc/键盘。
- [x] 记录 D-150（写前检查编号）与设计系统的展示增量；交付不声称已接真实模型或生产审计。

## 验证记录（2026-08-31）

- UI 用例首次因缺少共享组件失败；纯保存用例首次因缺少模块失败，完成实现后均通过。另补“一条多行拆为多条”的红绿回归：此前 activity 为 null，现保留条目边界并实际保存。
- 独立只读审查发现并修复：切回自定义需求绕过未保存门禁、活动换行序列化掩盖拆条变更、SSR 测试缺 React 环境；复查无阻塞项，定向 11/11 通过。
- 浏览器使用隔离端口 5391，不修改用户 5173 的存储。复杂场景子任务从 1 条新增为 3 条，空条目报位置，未保存时禁用确认创建，取消恢复原文与条数；Esc 取消并返回展开按钮。
- 手工修改期间，内嵌 AI 禁用；从单项菜单应用 AI 示例后，手工输入保留、显示同字段冲突、保存禁用，显式载入最新标准后恢复编辑。初始 AI 创建仍需最终确认。
- 已创建详情修改第一条、删除一条后保存，刷新仍为 3 条；点击名称进入子任务，活动仅新增一条“修改完成标准”及真实前后值，讨论为 0，负责人待接受与状态不变。
- 390×844 窄屏长文本无横向溢出（document scrollWidth = viewport width = 390），全部编辑按钮实测高 44px；已重置 viewport。浏览器错误日志为空。
- 全量回归中两条旧源码断言与先前实现不符（创建 currentUserId 参数、状态多 class），仅更新断言，不修改已有业务。全量测试通过；构建通过，保留已有 Vite 配置兼容与产物体积提醒。
