---
module_id: "task-detail"
title: "任务详情与维护"
version: "1.1"
status: "review"
last_change: "PRD-0016"
summary: "围绕概览、讨论、文件、活动维护任务。"
lifecycle_stage: "维护任务"
pages: "任务详情"
objects: "task, task_relation, task_status, task_assignment"
operations: "read, update, change_status, change_owner, add_subtask, edit_relation, preview_delete, delete_task"
---

# 任务详情与维护

## 1. 目的

在同一个任务内查看目标、维护信息并继续协作。

## 2. 范围和边界

顶部维护标题、状态、负责人、协作者与截止日期；下方四个 Tab 展开协作。

## 3. 详细功能设计

### 3.1 概览 Overview

默认概览：目标 → 完成标准 → AI 分析 → 子任务 → 依赖与标签；点击字段编辑。

完成标准：圆环显示 AI 梯度，悬停／聚焦可查来源；点击人工确认，显示实心勾并计数，再点撤销。AI 不自动验收，保存失败保留原状态。

![概览 Overview英文界面](../assets/task-detail/overview-current-en.jpg)

*FIG-DETAIL-002 · 概览 Overview；示例记录保留原文。*

![完成标准 · 1/3：查看 AI 分段进度与当前人工确认数。](../assets/task-detail/criteria-before-en.jpg)

*FIG-DETAIL-010 · 完成标准 · 1/3：查看 AI 分段进度与当前人工确认数。*

![完成标准 · 2/3：人工确认第二条，确认数变为 2/3；提示支持撤销。](../assets/task-detail/criteria-confirmed-en.jpg)

*FIG-DETAIL-011 · 完成标准 · 2/3：人工确认第二条，确认数变为 2/3；提示支持撤销。*

![完成标准 · 3/3：撤销后恢复 1/3；提示区分 AI 评估与人工确认。](../assets/task-detail/criteria-undo-en.jpg)

*FIG-DETAIL-012 · 完成标准 · 3/3：撤销后恢复 1/3；提示区分 AI 评估与人工确认。*

![展开 AI 分析](../assets/task-detail/overview-analysis-en.jpg)

*FIG-DETAIL-006 · 概览下移①：分档进度、累计完成工作量与预计完成时间。*

![当前情况与下一步](../assets/task-detail/overview-situation-en.jpg)

*FIG-DETAIL-007 · 概览下移②：当前情况与下一步建议；示例资料保留原文。*

![子任务及下级数量](../assets/task-detail/overview-subtasks-en.jpg)

*FIG-DETAIL-008 · 概览下移③：子任务的负责人、状态与下级任务数，点击进入下一层。*

![展开子任务：查看 AI 进度梯度、计划完成时间与预测完成时间。](../assets/task-detail/subtask-analysis-expanded-en.jpg)

*FIG-DETAIL-013 · 展开子任务：查看 AI 进度梯度、计划完成时间与预测完成时间。*

![依赖与标签](../assets/task-detail/overview-relations-en.jpg)

*FIG-DETAIL-009 · 概览下移④：依赖和标签；当前示例没有依赖，可从 Add 添加。*

### 3.2 讨论 Discussion

发进展、提问、回复或引用附件；点击附件打开文件。译文标记 Translated，可 View original。

![讨论 Discussion英文界面](../assets/task-detail/discussion-current-en.jpg)

*FIG-DETAIL-003 · 讨论 Discussion；示例记录保留原文。*

### 3.3 文件 Files

文件树选资料 → 预览 → 编辑／查版本。正文保留原文，提交不自动完成任务。

![文件 Files英文界面](../assets/task-detail/files-current-en.jpg)

*FIG-DETAIL-004 · 文件 Files；示例记录保留原文。*

### 3.4 活动 Activity

按时间和类型追溯变更，返回对应讨论或文件；活动与讨论分开。

![活动 Activity英文界面](../assets/task-detail/activity-current-en.jpg)

*FIG-DETAIL-005 · 活动 Activity；示例记录保留原文。*

## 4. 验收标准

切 Tab 保留任务和草稿；确认、状态、AI 评估分别保存。子任务可独立打开，依赖不自动阻塞任务。
