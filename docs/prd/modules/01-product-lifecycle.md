---
module_id: "product-lifecycle"
title: "产品目标与生命周期"
version: "1.0"
status: "review"
last_change: "PRD-0019"
summary: "创建任务 → 任务协作 → 完成任务。"
lifecycle_stage: "全生命周期"
pages: "产品入口, 生命周期总览"
objects: "account, team, membership, task, device_authorization"
operations: "register, join_team, create_task, collaborate, submit_result, complete_task, delete_task, leave_team, deactivate_account"
---

# 产品目标与生命周期

## 1. 目的

TaskDoor 承接任务规划与团队上下文，成员连接本地 Agent 工作，通过回填与协作完成任务。

## 2. 范围和边界

登录／注册、创建／加入团队是前置步骤；核心闭环为创建任务 → 任务协作 → 完成任务。当前为本地演示，真实历史任务分析、Agent 读写与跨成员同步待接入。

## 3. 详细功能设计

### 3.1 创建任务

输入工作目标 → 参考历史任务拆解 → 识别人员责任并建议分配 → 审阅调整 → 创建任务。

### 3.2 任务协作

连接本地 Agent 开展工作 → 将产出物或需协作的内容回填 TaskDoor → 邀请其他成员协助 → 成员基于更新后的任务上下文连接自己的本地 Agent 继续工作。按需重复，直到成果达成。

任务上下文包括目标、完成标准、任务拆解与分工、产出物、讨论和进展；连接时提供该成员有权访问的完整上下文。

### 3.3 完成任务

核对产出物和完成标准 → 人工确认完成，保留任务上下文与协作记录。

![创建任务、任务协作和完成任务闭环](../assets/product-lifecycle/user-lifecycle.svg)

*FIG-LIFE-001 · 核心工作流程。*

## 4. 验收标准

- 创建方案能参考历史任务，包含拆解、责任识别与人员分配建议，并允许调整。
- 回填的成果与协作内容归入对应任务，其他有权成员再次连接 Agent 时可获取更新后的上下文。
- 回填与协作可多轮进行，任务由用户确认完成。
