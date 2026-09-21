---
module_id: "deletion-recovery-retention"
title: "删除、恢复与数据保留"
version: "1.0"
status: "review"
last_change: "PRD-0016"
summary: "删除前核对影响，明确可恢复范围。"
lifecycle_stage: "删除、恢复与数据保留"
pages: "任务详情, 文件详情, 删除影响确认, 任务回收站, 文件回收站"
objects: "task, task_deletion_impact, recycle_bin_record, file, file_version, task_file_placement, file_deletion_impact, file_recycle_record, retention_record, activity, audit_record"
operations: "preview_delete, delete_task, list_recycle_bin, restore_task, purge_task, preview_delete_file, delete_file, list_file_recycle, restore_file, purge_file"
---

# 删除、恢复与数据保留

## 1. 目的

让用户清理不需要的内容，并清楚了解影响及可恢复范围。

## 2. 范围和边界

当前删除任务树不可撤销，文件仅支持当次撤销；30 天回收站待实现。

## 3. 详细功能设计

### 3.1 当前删除流程

删除 → 核对任务与后代影响 → 确认移除；失败保留内容并提示重试。

### 3.2 恢复目标

上线目标：删除 → 30 天回收站 → 有权用户核对关系后恢复／到期清理；不误删正式提交与共享文件。

![任务和文件分别从影响预览进入三十天回收站，随后恢复或按期清理，正式事实始终保留](../assets/deletion-recovery/delete-recovery-flow.svg)

*FIG-DELETE-001 · 上线目标流程：Task 与 File 共用“预览—确认—30 天回收”原则但保持独立记录；恢复重新校验各自关系，正式事实不随逻辑删除消失。*

## 4. 验收标准

删除前明确告知是否可恢复；删除不等于完成任务。
