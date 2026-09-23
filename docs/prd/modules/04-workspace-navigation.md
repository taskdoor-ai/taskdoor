---
module_id: "workspace-navigation"
title: "工作区与导航"
group: "账号与团队"
version: "1.0"
status: "review"
last_change: "PRD-0050"
summary: "通过顶栏进入团队、通知、连接 AI 和设置。"
lifecycle_stage: "进入工作区"
pages: "工作区, 我的工作, 通知中心, 个人中心, 个人信息设置, 我的责任, 团队设置"
objects: "workspace_session, team, notification, responsibility_document, responsibility_proposal"
operations: "enter_workspace, switch_team, navigate, open_notification, open_profile, read_responsibility, edit_responsibility, add_responsibility, update_responsibility, delete_responsibility, ignore_responsibility_proposal"
---

# 工作区与导航

## 1. 目的

提供稳定的团队、任务与个人设置入口。

## 2. 范围和边界

覆盖团队切换、任务入口及个人与团队设置。

## 3. 详细功能设计

### 3.1 进入与切换

已完成首次设置且有团队的用户登录后直接查看任务，顶栏可切换已有团队；新用户设置及已有用户无团队的处理见[团队管理](03-team-onboarding.md)。团队切换菜单只展示团队图标、名称和当前选中状态，不展示用户在各团队中的身份；身份在团队设置和成员管理中查看。

### 3.2 个人与团队设置

- **个人设置**：个人信息与我的责任；只读邮箱及维护规则见[账号与个人资料](02-account-identity.md) 3.6。
- **团队设置**：团队信息、成员管理与团队时区；日期规则见[语言、翻译与时区](02-internationalization.md)。

![顶部全局入口、任务索引、内容区域及团队设置权限的工作区信息架构目标示意](../assets/workspace-navigation/workspace-map.svg)

*FIG-WORK-001 · 工作区导航设计。*

![个人设置与团队设置的导航入口。](../assets/workspace-navigation/settings-en.png)

*FIG-WORK-003 · 个人设置与团队设置的导航入口。*

![个人信息 Profile：头像、姓名与邮箱。](../assets/workspace-navigation/profile-en.jpg)

*FIG-WORK-004 · 个人信息：头像、姓名与邮箱。*

![团队信息 Team information：团队标识、名称与管理入口。](../assets/workspace-navigation/team-information-en.jpg)

*FIG-WORK-005 · 团队信息 Team information：团队标识、名称与管理入口。*

团队切换菜单底部固定显示“创建团队”，团队列表独立滚动。创建流程和数量限制见[团队管理](03-team-onboarding.md)。

## 4. 功能验收标准

- **团队切换**：不混入上一团队内容；菜单不显示管理员／成员身份，当前团队仍有明确选中状态。
- **空工作区**：提供明确的新建入口。
