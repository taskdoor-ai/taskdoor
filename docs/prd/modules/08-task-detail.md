---
module_id: "task-detail"
title: "任务详情"
group: "任务管理"
version: "1.1"
status: "review"
last_change: "PRD-0034"
summary: "围绕概览、讨论、文件、活动维护任务。"
lifecycle_stage: "维护任务"
pages: "任务详情"
objects: "task, task_relation, task_status, task_assignment"
operations: "read, update, change_status, change_owner, add_subtask, edit_relation, preview_delete, delete_task"
---

# 任务详情

## 1. 目的

在同一个任务内查看目标、维护信息并继续协作。

## 2. 范围和边界

- 维护任务信息，并通过概览、讨论、文件和活动继续协作。
- 权限以[权限、异常与质量要求](15-permissions-errors-nfr.md)为准。

## 3. 详细功能设计

### 3.1 概览 Overview

查看和编辑目标、完成标准、子任务、依赖与标签，参考 AI 分析推进任务。

#### 完成标准与人工确认

- 逐条查看任务完成标准的 AI 标准评估与依据，**负责人**和参与者均可人工确认或撤销。
- **人工确认**记录确认人、时间及标准版本，与 AI 分析分别保存。
- 修改该条标准的实质内容后旧确认失效，改排序不使确认失效。
- 新增条目未确认，删除条目不把旧确认转移给其他条目。
- 保存**失败**保留原状态。

![概览 Overview英文界面](../assets/task-detail/overview-current-en.jpg)

*FIG-DETAIL-002 · 概览 Overview；示例记录保留原文。*

![完成标准 · 1/3：查看 AI 分段进度与当前人工确认数。](../assets/task-detail/criteria-before-en.jpg)

*FIG-DETAIL-010 · 完成标准 · 1/3：查看 AI 分段进度与当前人工确认数。*

![完成标准 · 2/3：人工确认第二条，确认数变为 2/3；悬停可查看 AI 分析与撤销操作。](../assets/task-detail/criteria-confirmed-en.jpg)

*FIG-DETAIL-011 · 完成标准 · 2/3：人工确认第二条，确认数变为 2/3；悬停可查看 AI 分析与撤销操作。*

![完成标准 · 步骤 3：撤销后恢复 1/3；提示区分 AI 评估与人工确认。](../assets/task-detail/criteria-undo-en.jpg)

*FIG-DETAIL-012 · 完成标准 · 步骤 3：撤销后恢复 1/3；提示区分 AI 评估与人工确认。*

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

围绕任务交流进展、提问和回复，可引用附件、查看原文。

![讨论 Discussion英文界面](../assets/task-detail/discussion-current-en.jpg)

*FIG-DETAIL-003 · 讨论 Discussion；示例记录保留原文。*

### 3.3 文件 Files

1. 在文件树中选择资料。
2. 预览文件内容。
3. 编辑文件或查看版本。

默认打开最新版本，引用固定版本并标明版本号，详见[文件与成果提交](11-files-local-commits.md)。正文保留原文，提交不自动完成任务。

![文件 Files英文界面](../assets/task-detail/files-current-en.jpg)

*FIG-DETAIL-004 · 文件 Files；示例记录保留原文。*

### 3.4 活动 Activity

按时间和类型追溯变更，返回对应讨论或文件；活动与讨论分开。

![活动 Activity英文界面](../assets/task-detail/activity-current-en.jpg)

*FIG-DETAIL-005 · 活动 Activity；示例记录保留原文。*

### 3.5 状态与完成后的维护

#### 状态操作

- 任务状态由**负责人**或参与者直接设置。
- 可在待开始、进行中、已阻塞、已完成、已取消之间修改，不增加审批、**负责人**专属完成或强制完成核对页。
- 标准未全确认、没有附件、子任务未完成不阻断用户选择已完成。
- **任务状态**不能反向填充 AI 进度。

#### 完成后的修改

已完成任务仍可编辑目标、标准、人员、文件和子任务，保存后不自动重开。重新分析及人工确认失效按所属规则处理；用户需要时自行修改状态。

### 3.6 子任务与删除

- 子任务支持独立打开、编辑、设置状态，层级统一遵循[任务创建的**四层**上限](07-task-creation.md)。
- 新增子任务也通过对话生成待确认方案。
- 依赖是参考关系，不自动阻塞任务。
- 不能自依赖、重复或形成循环。

仅当前任务负责人可发起删除。删除整个分支及二次确认见[删除与数据保留](13-deletion-recovery-retention.md)，不能将删除子任务当作普通内容编辑绕过权限。

## 4. 功能验收标准

- 负责人和参与者均可修改状态；无负责人时参与者也可设置已完成，不要求标准或附件先通过。
- 已完成任务新增标准后仍为已完成，新条目未确认且触发 AI 分析；仅改排序不清空原确认。
- AI 结果更新不覆盖人工确认；保存失败不改变确认计数或任务状态。
- 切换详情 Tab 保留当前任务和面板内未提交输入；这不等于创建对话退出后恢复方案。
- 第 4 层任务不能继续创建子任务；非负责人不能直接删除该任务。
