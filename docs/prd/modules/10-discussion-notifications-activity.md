---
module_id: "discussion-notifications-activity"
title: "讨论、通知与活动记录"
version: "1.0"
status: "review"
last_change: "PRD-0016"
summary: "交流进展、处理提醒、追溯变更。"
lifecycle_stage: "围绕任务协作"
pages: "任务讨论, 文件讨论, 通知中心, 任务活动"
objects: "discussion_message, notification, activity, change_set"
operations: "post_message, reply, edit_own_message, delete_own_message, mention, attach_file, mark_read, open_source, list_activity"
---

# 讨论、通知与活动记录

## 1. 目的

让团队沟通、待处理提醒和变更记录各有明确入口。

## 2. 范围和边界

讨论用于交流，通知提醒处理，活动追溯变化；当前为本地演示，跨用户投递待接入。

## 3. 详细功能设计

### 3.1 讨论与通知

讨论中发言、回复、提及或引用文件；通知 → 来源任务与记录 → 处理。

### 3.2 追溯变化

活动按类型筛选字段、讨论和文件变更；来源无权限时仅提示。

## 4. 验收标准

通知不替代任务事实；讨论与活动不混为一份列表。三个区域的当前截图见任务详情章节。
