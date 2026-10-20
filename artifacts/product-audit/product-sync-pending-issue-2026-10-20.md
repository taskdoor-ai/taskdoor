# 正式项目调整归档 · 2026-10-20

> 已提交为 [nocoly/taskdoor#58](https://github.com/nocoly/taskdoor/issues/58)。本文件保留归档，不再追加。

对应 PM Demo：[PR #18](https://github.com/taskdoor-ai/taskdoor/pull/18) · [固定提交 8f49f62e](https://github.com/taskdoor-ai/taskdoor/commit/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2)。

## 1. 任务详情上滑吸顶

作为 [#55](https://github.com/nocoly/taskdoor/issues/55) 的验收补齐：标题、属性和正文整体滚动；完整标题滚出后显示紧凑名称、状态、负责人和截止时间，页签吸附在下面；回顶恢复完整头部。紧凑栏只读，顶层任务保留 11px 顶部间距。

**修改位置**：正式仓库 `apps/web/src/features/tasks/components/TaskDetail.tsx` 和 `styles/task-detail-split.css`，改为详情外层滚动，解除正文层固定高度和独立滚动；`TaskDiscussion.tsx`、`files/components/TaskFileExplorer.tsx` 同步适配定位及底部输入框。

**Demo 参考**：[紧凑标题栏](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/components/TaskDetailStickySummary.tsx) · [详情接入](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/components/TaskDetail.tsx) · [滚动与吸附样式](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/tasks/styles/task-detail-split.css)。

**验收**：桌面、窄屏上滑收紧、回顶恢复，无跳动或遮挡；切任务回顶、切页签重判吸顶；讨论和文件定位正常，草稿、版本及预览内部交互保留。原立项中“吸附摘要不纳入”的假设按本条修正。

## 2. 人员选择列表与参与人名单改造

**人员选择列表**：

- 人员行保留头像、姓名和选中勾；“暂不分配”和姓名统一为 14px、400 常规字重。前方图标在左侧两行区域居中，并与人员头像列对齐。去掉匹配度／推荐等级星标和原因浮层，保留推荐排序、搜索、单选／多选与人数上下限。
- 移除底部整行邀请按钮，在“暂不分配”下显示“邀请更多同事进来协作”和独立“立即邀请”；无“暂不分配”选项时放在人员列表上方。复用现有邀请表单，点击邀请不清空选择，取消后保留原选择；讨论 @ 列表不新增邀请入口。

**参与人完整名单**：

- 默认显示前 4 个头像，折叠时显示“＋N”和下拉箭头；1～4 人也保留箭头。点击后显示全部参与人、总人数、头像和完整姓名，长名单可滚动；关闭回焦入口，切任务不保留旧名单。
- 保留头像右上角原小叉，完整名单每行也可移除，两处复用同一保存和活动逻辑。名单叉用 12px、1.6 描边浅灰图形，悬停无块状底色；桌面悬停／聚焦行时显示、触屏常显，点击区分别 28px／44px。
- 移除同步更新名单、总人数和头像；最后一人移除后保留添加“＋”并回焦。只读可查看、不显示移除；沿用最少人数限制，不改变负责人和团队身份。完整名单只在任务详情启用。

**修改位置**：正式仓库对应的人员选择器、头像组与任务详情接入。Demo 源文件：[PersonPicker](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/members/components/PersonPicker.tsx) · [列表样式](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/members/styles/person-picker.css) · [MemberSelector](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/features/members/components/MemberSelector.tsx) · [PersonAvatar](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/shared/ui/PersonAvatar.tsx) · [名单样式](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/shared/styles/pm-global.css) · [双语文案](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/shared/i18n/detail-messages.ts)／[入口文案](https://github.com/taskdoor-ai/taskdoor/blob/8f49f62e1a6dd268db0bbbe3316b2faad8ea69c2/src/shared/i18n/globalUiMessages.json)。

**验收**：桌面、窄屏和键盘操作下，邀请与清空选择互不触发；1 人、4 人和超过 4 人均能查看完整名单；两处移除结果一致，最后一人移除后可继续添加，只读及人数限制有效。
