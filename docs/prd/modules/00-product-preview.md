---
module_id: "product-preview"
title: "产品全貌预览"
version: "1.1"
status: "review"
last_change: "PRD-0018"
summary: "以英文界面截图快速浏览产品全貌。"
presentation: "gallery"
---

# 产品全貌预览

## 1. 目的

快速预览当前演示产品；生成页以分类、缩略图和大图展示截图，每张大图下方提供一句场景说明，来源留在源文件。

## 2. 范围和边界

复用已登记的英文运行截图，保留截图内产品文案，保留分类与切换导航，并用简短图注说明当前场景与步骤。不以截图证明生产服务能力。

## 3. 详细功能设计

### 团队与账号





![个人信息 Profile：头像、姓名与邮箱。](../assets/workspace-navigation/profile-en.jpg)

*FIG-PREVIEW-020 · 个人信息 Profile：头像、姓名与邮箱。*

![团队信息 Team information：团队标识、名称与管理入口。](../assets/workspace-navigation/team-information-en.jpg)

*FIG-PREVIEW-021 · 团队信息 Team information：团队标识、名称与管理入口。*

![成员管理：邀请入口、成员职责与角色。](../assets/member-collaboration/members-en.jpg)

*FIG-PREVIEW-022 · 成员管理：邀请入口、成员职责与角色。*

![成员列表下半页：完整团队分工与角色。](../assets/member-collaboration/members-bottom-en.jpg)

*FIG-PREVIEW-023 · 成员列表下半页：完整团队分工与角色。*

![成员邀请表单：姓名选填、邮箱与角色；未发送邀请。](../assets/member-collaboration/invite-en.png)

*FIG-PREVIEW-016 · 成员邀请表单：姓名选填、邮箱与角色；未发送邀请。*

![个人设置与团队设置的导航入口。](../assets/workspace-navigation/settings-en.png)

*FIG-PREVIEW-017 · 个人设置与团队设置的导航入口。*

### 创建规划

![选择示例后的需求输入](../assets/task-creation/single-input-en.jpg)

*FIG-PREVIEW-027 · 单任务 · 1/2：输入会议纪要需求。*

![单任务草稿与确认创建入口](../assets/task-creation/single-review-en.jpg)

*FIG-PREVIEW-003 · 单任务 · 2/2：审阅目标、完成标准与人员，准备确认创建。*

![需求不清楚示例：从一句活动需求开始。](../assets/task-creation/clarify-input-en.jpg)

*FIG-PREVIEW-028 · 引导补问 · 1/4：输入尚不明确的活动需求。*

![第 1 步：确认活动要达到的目标](../assets/task-creation/clarify-goal-en.jpg)

*FIG-PREVIEW-029 · 引导补问 · 2/4：确认活动目标。*

![第 2 步：选择需要交付的内容](../assets/task-creation/clarify-deliverables-en.jpg)

*FIG-PREVIEW-030 · 引导补问 · 3/4：选择需要交付的内容。*

![补问后的草稿：目标和完成标准承接已确认回答](../assets/task-creation/clarify-review-en.jpg)

*FIG-PREVIEW-031 · 引导补问 · 4/4：审阅由回答形成的任务草稿。*

![复杂项目原始需求](../assets/task-creation/complex-input-en.jpg)

*FIG-PREVIEW-032 · 复杂项目 · 1/4：输入完整项目需求。*

![主任务目标、完成标准与预计投入](../assets/task-creation/complex-review-en.jpg)

*FIG-PREVIEW-033 · 复杂项目 · 2/4：审阅主任务目标、完成标准与投入。*

![复杂项目子任务上半页：商务、内容、发布与履约分工。](../assets/task-creation/complex-subtasks-top-en.jpg)

*FIG-PREVIEW-034 · 复杂项目 · 3/4：查看商务、内容、发布与履约分工。*

![子任务分工与整份方案的确认入口](../assets/task-creation/complex-subtasks-en.jpg)

*FIG-PREVIEW-035 · 复杂项目 · 4/4：查看广告、分析与合规分工，准备统一创建。*

![多层级示例的完整原始需求。](../assets/task-creation/nested-input-en.jpg)

*FIG-PREVIEW-036 · 多层级任务 · 1/5：输入分层拆解需求。*

![多层项目的主任务草稿](../assets/task-creation/nested-review-en.jpg)

*FIG-PREVIEW-004 · 多层级任务 · 2/5：审阅主任务与人员安排。*

![展开后的四层结构：主任务加三级子任务，共 10 个任务](../assets/task-creation/nested-tree-en.jpg)

*FIG-PREVIEW-005 · 多层级任务 · 3/5：展开内容制作、脚本规划与具体交付。*

![层级下半段与完整任务数量](../assets/task-creation/nested-tree-bottom-en.jpg)

*FIG-PREVIEW-006 · 多层级任务 · 4/5：查看视频、发布与复盘分支，共 10 个任务。*

![展开末级任务核对交付内容与人员](../assets/task-creation/nested-leaf-detail-en.jpg)

*FIG-PREVIEW-007 · 多层级任务 · 5/5：展开末级任务，核对交付要求与责任。*

![相似任务示例的原始需求。](../assets/task-creation/similar-input-en.jpg)

*FIG-PREVIEW-037 · 相似任务 · 1/3：输入新品发布复盘需求。*

![只读候选任务与查看、独立规划入口；已有任务正文保留原语言](../assets/task-creation/similar-decision-en.jpg)

*FIG-PREVIEW-038 · 相似任务 · 2/3：核对已有任务，选择查看或独立规划。*

![选择独立规划后形成的新任务草稿](../assets/task-creation/similar-review-en.jpg)

*FIG-PREVIEW-039 · 相似任务 · 3/3：审阅独立规划的新任务。*

![已有父任务示例的原始需求。](../assets/task-creation/parent-input-en.jpg)

*FIG-PREVIEW-040 · 已有父任务 · 1/3：输入媒体邀请需求。*

![父任务候选及已有子任务；已有任务名称和正文保留原语言](../assets/task-creation/parent-decision-en.jpg)

*FIG-PREVIEW-041 · 已有父任务 · 2/3：核对父任务范围与现有子任务。*

![确认归属后的子任务草稿与父任务路径](../assets/task-creation/parent-review-en.jpg)

*FIG-PREVIEW-042 · 已有父任务 · 3/3：审阅新子任务，确认父任务归属。*

![未匹配负责人示例的原始需求。](../assets/task-creation/unassigned-input-en.jpg)

*FIG-PREVIEW-043 · 未匹配负责人 · 1/3：输入办公室无线网络部署需求。*

![未分配负责人提示与 Invite members 入口](../assets/task-creation/unassigned-review-en.jpg)

*FIG-PREVIEW-044 · 未匹配负责人 · 2/3：保留未分配状态，提供成员邀请入口。*

![从创建方案打开的成员邀请表单](../assets/task-creation/unassigned-invite-en.jpg)

*FIG-PREVIEW-045 · 未匹配负责人 · 3/3：打开邀请表单，尚未发送。*

### 任务协作

![overview](../assets/task-detail/overview-current-en.jpg)

*FIG-PREVIEW-001 · 任务概览：查看目标、完成标准与子任务。*

![完成标准 · 1/3：查看 AI 分段进度与当前人工确认数。](../assets/task-detail/criteria-before-en.jpg)

*FIG-PREVIEW-046 · 完成标准 · 1/3：查看 AI 分段进度与当前人工确认数。*

![完成标准 · 2/3：人工确认第二条，确认数变为 2/3；提示支持撤销。](../assets/task-detail/criteria-confirmed-en.jpg)

*FIG-PREVIEW-047 · 完成标准 · 2/3：人工确认第二条，确认数变为 2/3；提示支持撤销。*

![完成标准 · 3/3：撤销后恢复 1/3；提示区分 AI 评估与人工确认。](../assets/task-detail/criteria-undo-en.jpg)

*FIG-PREVIEW-048 · 完成标准 · 3/3：撤销后恢复 1/3；提示区分 AI 评估与人工确认。*

![常显搜索、范围、状态与高级筛选面板。](../assets/task-list/filters-en.png)

*FIG-PREVIEW-015 · 常显搜索、范围、状态与高级筛选面板。*

![展开 AI 分析](../assets/task-detail/overview-analysis-en.jpg)

*FIG-PREVIEW-008 · AI 分析 · 1/2：展开进度梯度、累计完成工作量与预计完成时间。*

![当前情况与下一步](../assets/task-detail/overview-situation-en.jpg)

*FIG-PREVIEW-009 · AI 分析 · 2/2：查看当前情况与下一步建议。*

![子任务及下级数量](../assets/task-detail/overview-subtasks-en.jpg)

*FIG-PREVIEW-010 · 子任务及下级数量*

![展开子任务：查看 AI 进度梯度、计划完成时间与预测完成时间。](../assets/task-detail/subtask-analysis-expanded-en.jpg)

*FIG-PREVIEW-049 · 展开子任务：查看 AI 进度梯度、计划完成时间与预测完成时间。*

![依赖与标签](../assets/task-detail/overview-relations-en.jpg)

*FIG-PREVIEW-011 · 依赖与标签*

![discussion](../assets/task-detail/discussion-current-en.jpg)

*FIG-PREVIEW-012 · 任务讨论：交流进展、回复成员并查看附件。*

![files](../assets/task-detail/files-current-en.jpg)

*FIG-PREVIEW-013 · 任务文件：从文件树选择资料并预览正文。*

![activity](../assets/task-detail/activity-current-en.jpg)

*FIG-PREVIEW-014 · 任务活动：按时间查看任务变更记录。*

### 连接 AI

![连接 AI 弹窗：工具选择与 TaskDoor CLI 安装登录说明。](../assets/cli-connection/connect-ai-en.jpg)

*FIG-PREVIEW-024 · 连接 AI 弹窗：工具选择与 TaskDoor CLI 安装登录说明。*

![连接 AI 下半页：任务命令示例，属于拟定语法。](../assets/cli-connection/connect-ai-examples-en.jpg)

*FIG-PREVIEW-025 · 连接 AI 下半页：任务命令示例，属于拟定语法。*

![连接 AI 底部：文件上传、活动回复与删除命令示例。](../assets/cli-connection/connect-ai-bottom-en.jpg)

*FIG-PREVIEW-026 · 连接 AI 底部：文件上传、活动回复与删除命令示例。*

## 4. 验收标准

按分类切换缩略图，点击缩略图、顶部前后按钮或大图左右两侧的箭头查看完整大图，支持左右方向键。仅显示必要导航与当前图片说明，不展开长篇正文；打印时展开全部截图。
