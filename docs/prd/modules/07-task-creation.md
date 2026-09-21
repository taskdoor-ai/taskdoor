---
module_id: "task-creation"
title: "任务创建与规划"
version: "1.0"
status: "review"
last_change: "PRD-0019"
summary: "参考历史任务拆解需求、识别责任并分配人员。"
lifecycle_stage: "创建与规划任务"
pages: "新建任务页, 子任务创建"
objects: "task_draft, task, task_relation, task_effort, owner_proposal"
operations: "create_manual, plan_with_ai, edit_draft, create_task, create_subtask, propose_owner"
---

# 任务创建与规划

## 1. 目的

将需求整理为可编辑方案，确认后创建任务。

## 2. 范围和边界

支持单任务、复杂拆分、多层级、补问和关系确认；当前为本地 Mock 规划，真实历史任务分析与责任匹配待接入。

## 3. 详细功能设计

### 3.1 基本流程

输入需求 → 参考历史任务，必要时补问／确认关系 → 拆解任务 → 识别人员责任并建议分配 → 审阅调整 → 确认创建。

历史任务用于参考拆解方式、识别相似工作或已有父任务；结合成员责任推荐负责人和协作者。方案包含目标、完成标准、子任务和人员，可逐项调整；无合适人选时保留未分配。确认后才创建，成员邀请与任务分配分别处理。

### 3.2 七种示例的创建过程

本地英文演示，任务原文保留；截图停在创建或发送邀请之前。

#### 单任务：直接整理为可审阅草稿

![选择示例后的需求输入](../assets/task-creation/single-input-en.jpg)

*FIG-CREATE-003 · 选择示例后的需求输入。*

![单任务草稿与确认创建入口](../assets/task-creation/single-review-en.jpg)

*FIG-CREATE-004 · 单任务草稿与确认创建入口。*

#### 需求不清楚：两步补问后继续规划

![需求不清楚示例：从一句活动需求开始。](../assets/task-creation/clarify-input-en.jpg)

*FIG-CREATE-023 · 需求不清楚示例：从一句活动需求开始。*

![第 1 步：确认活动要达到的目标](../assets/task-creation/clarify-goal-en.jpg)

*FIG-CREATE-005 · 第 1 步：确认活动要达到的目标。*

![第 2 步：选择需要交付的内容](../assets/task-creation/clarify-deliverables-en.jpg)

*FIG-CREATE-006 · 第 2 步：选择需要交付的内容。*

![补问后的草稿：目标和完成标准承接已确认回答](../assets/task-creation/clarify-review-en.jpg)

*FIG-CREATE-007 · 补问后的草稿：目标和完成标准承接已确认回答。*

#### 复杂项目：主任务与七个子任务

![复杂项目原始需求](../assets/task-creation/complex-input-en.jpg)

*FIG-CREATE-008 · 复杂项目原始需求。*

![主任务目标、完成标准与预计投入](../assets/task-creation/complex-review-en.jpg)

*FIG-CREATE-009 · 主任务目标、完成标准与预计投入。*

![复杂项目子任务上半页：商务、内容、发布与履约分工。](../assets/task-creation/complex-subtasks-top-en.jpg)

*FIG-CREATE-021 · 复杂项目子任务上半页：商务、内容、发布与履约分工。*

![子任务分工与整份方案的确认入口](../assets/task-creation/complex-subtasks-en.jpg)

*FIG-CREATE-010 · 子任务分工与整份方案的确认入口。*

#### 多层级任务：从主任务到末级交付

四层示例：主任务 → 内容制作 → 脚本规划 → 具体交付，另含商务与发布复盘分支。

![多层级示例的完整原始需求。](../assets/task-creation/nested-input-en.jpg)

*FIG-CREATE-022 · 多层级示例的完整原始需求。*

![多层项目的主任务草稿](../assets/task-creation/nested-review-en.jpg)

*FIG-CREATE-011 · ① 主任务：目标、完成标准、预计投入与人员。*

![展开后的四层结构：主任务加三级子任务，共 10 个任务](../assets/task-creation/nested-tree-en.jpg)

*FIG-CREATE-012 · ② 层级上半段：内容制作 → 脚本规划 → 卖点核对／直播脚本；主任务加三级子任务。*

![层级下半段与完整任务数量](../assets/task-creation/nested-tree-bottom-en.jpg)

*FIG-CREATE-019 · ③ 层级下半段：视频交付、发布执行与复盘分支；共 10 个任务，审阅后统一确认创建。*

![展开末级任务核对交付内容与人员](../assets/task-creation/nested-leaf-detail-en.jpg)

*FIG-CREATE-020 · ④ 展开末级任务：核对目标、完成标准、执行提示、依赖、人员及预计投入。*

#### 相似任务：核对已有工作后独立规划

![相似任务示例的原始需求。](../assets/task-creation/similar-input-en.jpg)

*FIG-CREATE-024 · 相似任务示例的原始需求。*

![只读候选任务与查看、独立规划入口；已有任务正文保留原语言](../assets/task-creation/similar-decision-en.jpg)

*FIG-CREATE-013 · 只读候选任务与查看、独立规划入口；已有任务正文保留原语言。*

![选择独立规划后形成的新任务草稿](../assets/task-creation/similar-review-en.jpg)

*FIG-CREATE-014 · 选择独立规划后形成的新任务草稿。*

#### 已有父任务：确认归属后审阅子任务

![已有父任务示例的原始需求。](../assets/task-creation/parent-input-en.jpg)

*FIG-CREATE-025 · 已有父任务示例的原始需求。*

![父任务候选及已有子任务；已有任务名称和正文保留原语言](../assets/task-creation/parent-decision-en.jpg)

*FIG-CREATE-015 · 父任务候选及已有子任务；已有任务名称和正文保留原语言。*

![确认归属后的子任务草稿与父任务路径](../assets/task-creation/parent-review-en.jpg)

*FIG-CREATE-016 · 确认归属后的子任务草稿与父任务路径。*

#### 没有匹配负责人：保留未分配并提供邀请入口

![未匹配负责人示例的原始需求。](../assets/task-creation/unassigned-input-en.jpg)

*FIG-CREATE-026 · 未匹配负责人示例的原始需求。*

![未分配负责人提示与 Invite members 入口](../assets/task-creation/unassigned-review-en.jpg)

*FIG-CREATE-017 · 未分配负责人提示与 Invite members 入口。*

![从创建方案打开的成员邀请表单](../assets/task-creation/unassigned-invite-en.jpg)

*FIG-CREATE-018 · 从创建方案打开的成员邀请表单。*

## 4. 验收标准

历史任务参考、层级拆解和人员建议可审阅调整；无合适负责人时可未分配。创建失败保留方案，继续操作前处理未保存编辑。
