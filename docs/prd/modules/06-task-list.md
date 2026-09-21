---
module_id: "task-list"
title: "任务列表"
version: "1.0"
status: "review"
last_change: "PRD-0016"
summary: "通过搜索、筛选和置顶找到任务。"
lifecycle_stage: "发现与进入任务"
pages: "任务工作区, 任务列表, 筛选菜单, 标签管理"
objects: "task, task_pin, task_filter, task_list_state, label_catalog, label_definition"
operations: "list, switch_scope, search, filter, sort, pin, unpin, load_more, open, restore_list_state, list_labels, create_label, rename_label, archive_label"
---

# 任务列表

## 1. 目的

快速找到并进入需要处理的任务。

## 2. 范围和边界

包含搜索、范围、状态、标签、日期、排序与个人置顶；当前使用本地任务集合。

## 3. 详细功能设计

### 3.1 查找任务

选范围（全部／我负责／我参与）→ 搜名称 → 按状态、标签、日期筛选 → 打开任务。

默认最近更新，可改最新创建；无结果可清除条件。

### 3.2 持续关注

悬停行可置顶或打开更多操作，长标题缓慢滚动。置顶只在顶部出现一次，仍受搜索与筛选约束。

![常显搜索、范围、状态与高级筛选面板。](../assets/task-list/filters-en.png)

*FIG-LIST-002 · 常显搜索、范围、状态与高级筛选面板。*

## 4. 验收标准

列表与详情一致；置顶仅影响本人。服务端分页、跨端偏好同步待接入。
