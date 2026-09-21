---
module_id: "workspace-navigation"
title: "工作区与全局导航"
version: "1.0"
status: "review"
last_change: "PRD-0016"
summary: "通过顶栏进入团队、通知、连接 AI 和设置。"
lifecycle_stage: "进入工作区"
pages: "工作区, 我的工作, 通知中心, 个人中心, 个人信息设置, 我的责任, 团队设置"
objects: "workspace_session, team, notification, responsibility_document, responsibility_proposal"
operations: "enter_workspace, switch_team, navigate, open_notification, open_profile, read_responsibility, edit_responsibility, add_responsibility, update_responsibility, delete_responsibility, ignore_responsibility_proposal"
---

# 工作区与全局导航

## 1. 目的

提供稳定的团队、任务与个人设置入口。

## 2. 范围和边界

顶栏提供全局入口，列表与详情承载任务工作。

## 3. 详细功能设计

### 3.1 进入与切换

进入有效团队 → 查看任务；顶栏可切换团队，无团队则创建或加入。

### 3.2 个人与团队设置

账户菜单 → 设置 → 个人资料、我的责任、团队信息或成员。责任按团队保存，AI 建议确认后才更新。

![顶部全局入口、任务索引、内容区域及团队设置权限的工作区信息架构目标示意](../assets/workspace-navigation/workspace-map.svg)

*FIG-WORK-001 · 工作区导航设计。*

![个人设置与团队设置的导航入口。](../assets/workspace-navigation/settings-en.png)

*FIG-WORK-003 · 个人设置与团队设置的导航入口。*

![个人信息 Profile：头像、姓名与邮箱。](../assets/workspace-navigation/profile-en.jpg)

*FIG-WORK-004 · 个人信息 Profile：头像、姓名与邮箱。*

![团队信息 Team information：团队标识、名称与管理入口。](../assets/workspace-navigation/team-information-en.jpg)

*FIG-WORK-005 · 团队信息 Team information：团队标识、名称与管理入口。*

## 4. 验收标准

切换团队不混入旧团队内容；空工作区提供明确的新建入口。
