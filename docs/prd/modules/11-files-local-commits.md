---
module_id: "files-local-commits"
title: "文件与本地提交闭环"
version: "1.0"
status: "review"
last_change: "PRD-0019"
summary: "管理任务文件，核对后提交成果。"
lifecycle_stage: "上传文件并提交结果"
pages: "任务文件, 文件详情, 文件删除影响确认, 文件回收站, 提交草稿, TaskDoor CLI"
objects: "file, file_version, task_file_placement, file_upload_session, file_deletion_impact, file_recycle_record, task_commit_draft, task_commit"
operations: "create_folder, prepare_upload, upload_bytes, complete_upload, add_file_version, place_file, remove_placement, preview_delete_file, delete_file, list_file_recycle, restore_file, purge_file, create_commit_draft, update_commit_draft, delete_commit_draft, commit, supersede_commit"
---

# 文件与本地提交闭环

## 1. 目的

让任务资料与交付成果集中保存、查阅和讨论。

## 2. 范围和边界

当前支持本地文件树、预览、编辑和修订；真实上传、跨端同步及正式提交待接入。

## 3. 详细功能设计

### 3.1 查看与维护

Files → 选文件／文件夹 → 预览 → 编辑、查版本或引用到讨论。截图见任务详情。

### 3.2 回填产出与协作内容

上线目标：本地 Agent 产生内容 → 用户选择回填产出物或协作事项 → 文件进入任务文件区，说明与待协作问题进入讨论 → 其他成员基于这些上下文继续工作。成果可分阶段回填，无需等到任务结束；正式提交仍需核对版本和说明，提交与完成分开。

## 4. 验收标准

区分处理中与可用文件；删除关联和删除文件分别提示影响，失败保留原状态。正式提交可追溯且不可改写。
