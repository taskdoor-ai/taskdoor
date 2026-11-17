# 正式项目调整待提交汇总（2026-11-18）

目标仓库 `nocoly/taskdoor`。本批已提交为 [nocoly/taskdoor#123](https://github.com/nocoly/taskdoor/issues/123)：任务文件排序与行内信息中 PM Demo 已设计、正式项目未采纳的部分，对应 PM Demo [PR #52](https://github.com/taskdoor-ai/taskdoor/pull/52)（实现提交 `de18fe6`）。

同批同步正式项目已定稿行为的 PM Demo 交付：[PR #54](https://github.com/taskdoor-ai/taskdoor/pull/54)（紧凑通知设置弹窗，Demo issue #49）、[PR #55](https://github.com/taskdoor-ai/taskdoor/pull/55)（AC 排版与对齐，Demo issue #51）、[PR #56](https://github.com/taskdoor-ai/taskdoor/pull/56)（文件排序与上传者头像，Demo issue #53），均已合并 `main`。

## 1. 排序偏好按成员/工作区作用域隔离

- 偏好键带作用域：`taskdoor:task-file-sort:{成员或工作区标识}`；切换账号或工作区后互不影响，无作用域时退回 `taskdoor:task-file-sort`。
- 存储不可用时仅当前会话生效，不抛错。

**验收**　两个账号/工作区分别选择不同排序后互不覆盖；localStorage 不可用时页面不报错、当次排序仍生效。

## 2. 无效时间排序容错

- 时间类排序前先归一化：缺失、空串或非 ISO 值一律排末，不按 0 排前、不抛错；等值回退本地化名称比较。

**验收**　构造缺失/非法 `createdAt`、`updatedAt` 的节点排序稳定排末，其余按所选键正确排列。

## 3. 文件时间语义

- `createdAt` 记录上传/新建，不因编辑、重命名、移动改变；`updatedAt` 仅内容或元数据实际变化时更新（新建、上传、重命名、移动、编辑保存各自的触发点按真实语义明确）。

**验收**　重命名/移动不推高 `updatedAt`；编辑保存只更新 `updatedAt` 不动 `createdAt`；排序与列表展示与语义一致。

## 4. 树形视图行内大小与更新时间列

- 树形视图行右侧与平铺列表一致显示文件大小和更新时间；窄屏保留大小列、隐藏时间列。

**验收**　树形与平铺在桌面端都显示大小/时间两列且对齐；窄屏下大小列仍可见、时间列隐藏。

## 5. 预览顺序跟随当前目录显示顺序

- 文件预览器的上一项/下一项按当前目录的显示顺序（含所选排序）遍历，而不是固定源顺序。

**验收**　选择非默认排序后，预览切换顺序与目录可见顺序一致。

## 6. 展开箭头不再保留自身悬浮反馈

- 目录展开/折叠箭头取消自身 hover/pressed 背景，交互反馈统一在整行。

**验收**　悬停/按下箭头时无独立底色，整行反馈一致；展开收起行为不变。

## 参考实现

- PM Demo 实现与验收见 [PR #52](https://github.com/taskdoor-ai/taskdoor/pull/52)；关键源码：`src/features/tasks/files/lib/task-file-tree.ts`（排序与 `taskFileTimestamp`）、`src/features/tasks/files/components/TaskFileBrowser.tsx`（作用域偏好键）、`src/features/tasks/files/components/TaskFileFolderView.tsx`（行内列）、`src/features/tasks/files/components/TaskFileTree.tsx`（树形列与箭头）。
