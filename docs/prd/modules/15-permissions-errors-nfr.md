---
module_id: "permissions-errors-nfr"
title: "统一权限、异常与非功能要求"
version: "1.0"
status: "review"
last_change: "PRD-0016"
summary: "统一权限、保存反馈和基本可用性。"
lifecycle_stage: "全生命周期治理"
pages: "全局, 团队设置, 任务工作区, 任务详情, 个人安全设置, CLI"
objects: "principal, team_membership, team_role, object_acl, operation_scope, policy_decision, assignment_recovery, error_response, audit_event"
operations: "authorize, discover, mutate, retry_operation, refresh_version, recover_assignment, restore_file, revoke_access, inspect_audit"
---

# 统一权限、异常与非功能要求

## 1. 目的

让主要流程可靠、可恢复，并尊重用户的数据权限。

## 2. 范围和边界

生产鉴权、租户隔离、持久化和性能尚待落实，当前仅本地校验。

## 3. 详细功能设计

### 3.1 权限与确认

只读写有权内容；团队角色不等于全部任务权限。AI／CLI 遵循用户授权，重要写入须确认。

### 3.2 失败与重试

区分加载、空、失败；保存失败保留输入，冲突重新核对，重试不重复创建。

### 3.3 基本使用体验

支持键盘与窄屏，重要操作不只靠悬停或颜色；未知数据不冒充零或成功。

![用户、团队、对象和操作四个边界共同决定一次动作是否被允许](../assets/permissions-errors/permission-boundary.svg)

*FIG-PERM-001 · 上线目标模型：授权是四项交集，不是角色相加；CLI 还需设备和用户委托，任何边界失效都拒绝操作。*

## 4. 验收标准

核对权限、保存反馈、重试、键盘与窄屏。
