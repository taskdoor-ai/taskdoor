# 正式项目待提交调整 · 2026-10-20

> 目标：`nocoly/taskdoor`。本地草稿，尚未提交。

## 1. 任务详情上滑吸顶，与 PM Demo 一致

正式版目前把完整标题和属性固定在顶部，只有正文内部滚动。请改成 Demo 已实现的效果，作为 [#55](https://github.com/nocoly/taskdoor/issues/55) 的验收补齐。

**效果**：标题、属性和正文整体滚动；完整标题滚出后，顶部显示紧凑的名称、状态、负责人和截止时间，页签吸附在下面；回顶恢复完整头部。紧凑栏只读，顶层任务原有的 11px 顶部间距保留。

**修改位置**（正式仓库 `apps/web/src/features/tasks/`）：

- [components/TaskDetail.tsx](https://github.com/nocoly/taskdoor/blob/360b3db6f981eda6d225f21f4350d7e17ea1870e/apps/web/src/features/tasks/components/TaskDetail.tsx#L964)：参照 Demo 接入紧凑标题栏，监听详情外层滚动；切任务回顶、切页签重新判断吸顶。
- [styles/task-detail-split.css](https://github.com/nocoly/taskdoor/blob/360b3db6f981eda6d225f21f4350d7e17ea1870e/apps/web/src/features/tasks/styles/task-detail-split.css#L19)：改为详情外层滚动，解除正文层的固定高度和独立滚动；页签、文件工具栏按紧凑标题栏的实际高度吸附。
- `components/TaskDiscussion.tsx`、`files/components/TaskFileExplorer.tsx`：同步适配消息／文件定位和底部输入框，保留草稿、文件版本及 PDF／HTML、文件树、全屏所需的内部交互。

**参考 Demo**：[紧凑标题栏组件](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/src/features/tasks/components/TaskDetailStickySummary.tsx) · [详情接入](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/src/features/tasks/components/TaskDetail.tsx#L573) · [滚动与吸附样式](https://github.com/taskdoor-ai/taskdoor/blob/323522edf476a41934d009ec292fb51e50b792a2/src/features/tasks/styles/task-detail-split.css)。对应 [提交 323522ed](https://github.com/taskdoor-ai/taskdoor/commit/323522edf476a41934d009ec292fb51e50b792a2)、[PR #13](https://github.com/taskdoor-ai/taskdoor/pull/13)。

**验收**：桌面和窄屏，上滑收紧、回顶恢复，无跳动或遮挡；切页签、文件和讨论定位正常，草稿与编辑内容保留。

正式立项中“吸附摘要不纳入”的默认假设需同步纠正，标题吸顶按本条补齐。

## 2. 人员选择列表与参与人名单改造

精简负责人、参与人等入口共用的人员选择列表，同时让任务详情支持查看全部参与人和移除。

**人员选择列表**：

- 人员行保留头像、姓名和选中勾；“暂不分配”与姓名统一为 14px、400 常规字重，其图标在左侧两行区域居中，并与人员头像列对齐。去掉匹配度／推荐等级星标及原因浮层，保留原推荐排序、搜索、单选／多选和人数上下限。
- 移除列表底部整行邀请按钮，在“暂不分配”下显示“邀请更多同事进来协作”和独立的“立即邀请”；不提供“暂不分配”时，将说明放在人员列表上方。沿用现有邀请表单，讨论 @ 选择列表不增加邀请入口。
- “暂不分配”和“立即邀请”是两个独立操作，点击邀请不清空已选人员；取消邀请后仍可继续选择，原选择保留。

**参与人完整名单与移除**：

- 默认显示前 4 个参与人头像；超过 4 人时显示“＋N”和下拉箭头，N 只表示折叠人数。1～4 人时也保留下拉箭头；点击后展示包含全部参与人的名单，而非只列出折叠的人。名单显示总人数，每行包含头像和完整姓名，长名单可滚动。
- 展开入口与头像等高；“＋N”文字约 12px、箭头 16px，留出清晰间距。支持点击、Enter／空格展开，Esc 或点击外部关闭；关闭后焦点返回入口，切换任务不保留上一任务的名单。
- **保留头像右上角原有的小叉**，用于快捷移除可见成员；名单每行右侧也提供移除入口，方便移除任意参与人，包括折叠成员。两处复用同一套人员修改、保存和活动记录逻辑。
- 名单里的叉使用 **12px、1.6 描边的浅灰细线图形**，悬停不显示块状底色。桌面在悬停或键盘聚焦该行时显示，触屏常显；图形大小与点击范围分开，桌面点击区域为 28px，触屏为 44px。
- 移除后同步更新名单、总人数、头像和“＋N”。移除最后一人后收起名单及头像组，保留添加“＋”，键盘焦点回到该按钮。添加“＋”继续打开原有成员选择器。
- 沿用既有人员维护权限和最小人数限制：只读状态可展开查看名单，不显示两处移除入口；任务详情默认允许移除全部参与人，不改变负责人和团队成员身份。完整名单能力仅在任务详情启用。

**对应 Demo 源文件**：[人员选择列表](../../src/features/members/components/PersonPicker.tsx) · [列表与邀请说明样式](../../src/features/members/styles/person-picker.css) · [列表双语文案](../../src/shared/i18n/detail-messages.ts) · [详情入口](../../src/features/tasks/components/TaskDetail.tsx) · [人员选择与移除回调](../../src/features/members/components/MemberSelector.tsx) · [头像组与完整名单](../../src/shared/ui/PersonAvatar.tsx) · [入口和移除样式](../../src/shared/styles/pm-global.css) · [中英文入口文案](../../src/shared/i18n/globalUiMessages.json)。

**对应提交与 PR**：本轮 PM demo 改动已在本地完成，尚未提交，暂无对应提交及 PR 链接；形成交付后补齐本条引用。

**验收**：人员选择列表无推荐标识及原因浮层，原排序、搜索和勾选保持；邀请与暂不分配互不触发，取消邀请不改变已选人员。1 人、4 人及超过 4 人时均可查看完整名单，展开人数与名单一致；头像快捷移除和名单移除均正确更新同一任务，最后一人移除后可继续添加；桌面悬停／键盘、触屏常显及只读限制符合上述规则，窄屏不横向溢出。
