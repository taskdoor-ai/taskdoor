# 上下文 AI 调整浮层 Implementation Plan

> 用户已审阅“模块旁展开、不遮暗页面、同层预览应用、点击外部收起保留输入”的具体方案，并于本轮确认实施。使用 writing-plans / subagent-driven-development / TDD。保持共享工作区及用户已有修改，不创建工作树、不提交或重置。

**Goal:** 创建页、详情页的 AI 调整改为锚定入口的非模态浮层，保留局部输入和现有安全写入流程。

**Architecture:** 复用 Base UI / TaskDoor Popover 的 Portal、碰撞检测和焦点行为；扩展共享 PopoverContent 支持显式 anchor、fixed 定位和安全边距，其他调用默认不变。页面保留最近 scope 与独立 open 状态，并通过 useTaskAiAdjustmentDrafts 持有按 mode / 主任务稳定 ID / scope / 子任务 ID 隔离的会话草稿，浮层可临时卸载。输入、预览、错误保留到本页生命周期结束；明确取消和成功应用只清除当前范围。关闭不写入任务；上下文变化沿用旧候选签名校验，不更改解析或保存适配器。外部锚点没有基础库 Trigger 的焦点保护目标，首尾 Tab 显式收起并返回真实入口，中间按键仍放行。

**Tech Stack:** React / TypeScript、已有 21st 适配 Button / Textarea / Popover、语义 Token、node:test / tsx、Codex 浏览器验证。无新增依赖和真实 AI 调用。

## 已确认布局与状态

- 白色轻浮层，沿用 Geist / 中文系统字、蓝色主动作；不引入新品牌色或字体。顶部一行“调整：范围 · 任务名称”和轻量 Mock 标记，右侧收起；输入框直接占主体，不保留大图标、欢迎标题与二级范围卡。
- 输入下方为少量支持示例、帮助折叠和蓝色圆形“预览调整”箭头。预览在同一浮层内展开，展示真实前后值、取消和明确应用；重新输入清除旧预览。
- 桌面优先锚定按钮下方，接近视口边缘自动翻转/移位，独立于原列表 overflow；手机使用同一浮层限制视口宽高并内部滚动，不加遮罩；触控目标至少 44px，支持减少动画偏好。
- 外部点击、Esc、收起按钮只折叠，重新打开恢复同 scope 输入和预览；明确取消丢弃当前 AI 草稿。不同任务/模块的草稿不能串用。切换原页面或重新生成方案后的新 ID 不继承其他对象输入。
- 生成不写入，应用仍走草稿/已创建对应适配器；失败保留输入与预览，过期禁用应用并允许重新预览，保存中防重复和误关闭。任务关系、人选待接受、手工标准冲突保护不变。

## Task 1：草稿范围隔离（独立工作）

Files: `src/lib/taskAiAdjustmentDrafts.ts`, `server/taskAiAdjustmentDrafts.test.ts`。

- [x] 测试先行：`getTaskAiAdjustmentDraftKey(mode, taskId, scope)` 区分 mode、主任务、task/subtasks/subtask 与子 ID，并避免字符串拼接碰撞；reducer patch 留下其他 key 的正文/候选，discard 只删除指定 key。
- [x] 实现 `TaskAiAdjustmentDraft`（instruction、proposal、error、notice）、`TaskAiAdjustmentDrafts = Record<string, TaskAiAdjustmentDraft>`、`emptyTaskAiAdjustmentDraft` 常量、`taskAiAdjustmentDraftReducer`。patch action 合并指定 key；discard action 不改其他 scope；所有更新不可变。
- [x] `node --import tsx --test server/taskAiAdjustmentDrafts.test.ts`，红绿验证后审核实际代码。

## Task 2：浮层与页面接线

Files: `src/components/TaskAiAdjustmentDialog.tsx`（更名为 `TaskAiAdjustmentPopover.tsx`）、`src/components/ui/popover.tsx`、`src/components/TaskCreationPage.tsx`、`src/components/TaskDetail.tsx`、`src/components/TaskCreationPlanEditor.tsx`、`src/components/TaskCriteriaEditor.tsx`、`src/components/TaskSubtaskList.tsx`、`src/styles/task-ai-adjustment.css`、`tsconfig.node.json`、`server/taskAiAdjustmentUi.test.ts`。

- [x] 先修改 UI 回归用例，断言共享 `TaskAiAdjustmentPopover`、非模态、显式锚点、收起与取消分离，旧 Dialog 挂载不再存在；观察原实现失败。
- [x] 扩展 PopoverContent 的 Positioner props，保留原 defaults；传 `anchor={anchor}`、`positionMethod="fixed"`、`collisionPadding={8}`，不插入假触发器或遮罩。
- [x] 保留候选生成、签名校验、失败防重等函数；输入状态接 reducer，按 key 读取。组件接收 `open / onOpenChange / anchor / draftSession`，草稿独立于浮层挂载；外部点击不抢夺用户新焦点，Esc/按钮回到有效 anchor。
- [x] TaskAiAdjustButton 显式传 `event.currentTarget` 到调用方；菜单发起时使用仍在 DOM 的更多按钮作为 anchor，不能锚定即将卸载的菜单项。创建和详情同时接线，创建确认以 aiOpen 而非已保留 scope 判断是否禁用。
- [x] 调整为紧凑浮动输入器；预览、帮助和错误原位呈现，mobile overflow / focus-visible / reduced-motion。

## Task 3：验证与记录

- [x] 独立规格审查后质量审查，修复确定缺陷，不扩展任务服务。
- [x] 运行 AI／标准相关回归及全量 `node --import tsx --test --test-reporter=spec server/*.test.ts`，`npm run build`，`git diff --check`。
- [x] 在独立测试 origin 验证：锚点靠近触发器、不锁页面；外部收起重开保留、Esc焦点、不同模块/子项隔离、同层预览/取消/应用、已创建保存刷新、过期和手工冲突、菜单锚点、390px 窄屏边缘与长内容滚动。
- [x] D-151 只替代 D-149 的居中弹窗形式，更新设计系统和设计包入口说明；记录真实测试，不声称真实模型或生产审计。

## 验证记录（2026-08-31）

- 纯草稿 reducer 9 项、最终草稿＋UI 接线 18 项通过；全量 **530 / 530** 通过，构建及 `git diff --check` 通过。构建仅有既有 Vite 配置迁移及 chunk 大小警告。
- 规格审查发现示例切换会卸载全部 AI 草稿，已将存储提升到页面；新增失败回归后修复，实测 A → B → A 恢复输入和候选。
- 质量审查发现外部 anchor 未注册 Trigger 导致 Tab 边界缺少目标；新增边界处理和回归，实测正反向退出返回真实入口，Esc 同样保留输入。
- `5392` 独立开发源验证：主任务／子任务模块／不同子任务输入隔离、外部点击不抢焦点、取消清空、过期候选重新预览、详情保存刷新、创建草稿应用、多条标准保留、手工脏输入被 AI 更新后仍保留并阻止覆盖。
- 手机 `390 × 844`：浮层宽 374px、左右各 8px，无横向溢出；长预览正文内部滚动，固定底部动作可达，按钮 44px。视口检查后恢复默认。
- `5393` 独立构建源验证：单任务示例 → AI 增加完成标准 → 应用到草稿 → 确认创建 → 查看详情；回执为创建 1 个任务，详情包含新增标准，浏览器 error 日志为空。开发热更新期间曾出现新旧组件 props 的瞬时不一致，最终构建未复现。
- 所有写入仅发生于隔离测试 origin，未操作用户 `5173` 的任务数据；不代表真实 AI、服务端持久化或生产审计验证。
