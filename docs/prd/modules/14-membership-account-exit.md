---
module_id: "membership-account-exit"
title: "个人与团队生命周期结束"
version: "1.0"
status: "review"
last_change: "PRD-0016"
summary: "结束会话或成员关系，保留协作历史。"
lifecycle_stage: "结束会话、成员关系或账号"
pages: "账户菜单, 团队切换, 团队成员, 个人设置, 账号停用"
objects: "session, team_membership, team_role, task_acl, task_assignment, cli_device_authorization, account"
operations: "logout, switch_team, leave_team, remove_member, transfer_responsibility, recover_assignment, revoke_device, deactivate_account"
---

# 个人与团队生命周期结束

## 1. 目的

让用户安全结束当前使用，并保留团队协作历史。

## 2. 范围和边界

登录退出、切换团队、离开和停用分别处理；当前仅有本地退出与团队移除。

## 3. 详细功能设计

### 3.1 日常退出

退出登录结束当前会话；切换团队只改变工作上下文，不删除任务。

### 3.2 离开与停用目标

交接任务与唯一管理员身份 → 确认离开／停用 → 撤权；讨论、文件、活动保留贡献者归属。

![成员或账号退出前先检查责任和管理员约束，再撤销会话与设备授权](../assets/account-exit/membership-exit-flow.svg)

*FIG-EXIT-001 · 上线目标流程：离开团队、管理员移除和账号停用共享责任检查，但分别终止 Membership 或 Account；阻断项不会被自动跳过。*

## 4. 验收标准

不留下无人处理的责任或无管理员团队；正式跨端撤权与账号停用仍待接入。
