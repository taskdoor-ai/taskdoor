---
module_id: "member-collaboration"
title: "团队成员与协作邀请"
version: "1.0"
status: "review"
last_change: "PRD-0016"
summary: "邀请成员，分别确认团队身份与任务责任。"
lifecycle_stage: "明确责任并邀请协作"
pages: "团队成员, 任务创建, 任务详情, 通知"
objects: "team_invitation, team_membership, task_participation_invitation, owner_proposal"
operations: "invite_member, accept_team_invitation, decline_team_invitation, resend_invitation, invite_participant, propose_owner, accept_responsibility, revoke_invitation, change_role, remove_member"
---

# 团队成员与协作邀请

## 1. 目的

让合适的人加入团队，并明确各自的任务责任。

## 2. 范围和边界

加入团队、参与任务、接手负责人分别确认；当前为本地邀请，真实投递与接受待接入。

## 3. 详细功能设计

### 3.1 邀请成员

设置 → 成员 → 邀请 → 填邮箱与角色 → 发送 → 对方接受后加入。

### 3.2 分配责任

负责人至多一人，可未分配；邀请他人负责或参与，接受后生效，推荐不算确认。

![成员邀请表单：姓名选填、邮箱与角色；未发送邀请。](../assets/member-collaboration/invite-en.png)

*FIG-MEMBER-002 · 成员邀请表单：姓名选填、邮箱与角色；未发送邀请。*

![团队邀请、任务参与邀请与负责人变更分别运行的状态示意](../assets/member-collaboration/invitation-states.svg)

*FIG-MEMBER-001 · 上线目标状态：三类邀请并行但不合并；加入团队、参与任务和接手负责人分别在各自接受动作后生效。*

![成员管理：邀请入口、成员职责与角色。](../assets/member-collaboration/members-en.jpg)

*FIG-MEMBER-003 · 成员管理：邀请入口、成员职责与角色。*

![成员列表下半页：完整团队分工与角色。](../assets/member-collaboration/members-bottom-en.jpg)

*FIG-MEMBER-004 · 成员列表下半页：完整团队分工与角色。*

## 4. 验收标准

加入团队不自动分配任务；待接受、未分配和正式负责能清楚区分。
