# 讨论时间、搜索筛选与筛选样式

## 1. 讨论时间支持点击切换

任务讨论、文件内讨论的主消息和回复，默认按相对时间规则展示；点击切换为含年份的具体时间，再次点击还原，每条消息独立控制。沿用当前语言和日期时区规则，保留完整时间提示；缺少有效时间时不补造。

验收：鼠标、Enter／空格和触屏均可切换，切换一条不影响其他消息。

PM Demo 来源：[时间组件](../../src/features/tasks/discussion/components/DiscussionTimestamp.tsx) · [任务讨论消息](../../src/features/tasks/discussion/components/TaskDiscussionMessage.tsx) · [文件讨论消息](../../src/features/tasks/discussion/components/DiscussionMessages.tsx)。

## 2. 讨论增加搜索和范围筛选，统一工具栏样式

- **搜索**：在当前任务可读取的讨论中搜索正文、发布人和附件名，匹配原文及当前显示的自动翻译；空格分隔的多个关键词取交集，不搜索附件正文或其他任务。
- **范围**：单选下表中的关系范围；“包含附件的讨论”独立勾选，与关键词、关系范围取交集。失效附件仍可按原引用名称检索，打开时沿用来源校验。
- **入口与样式**：工具栏放在讨论页签下、消息列表上，搜索框靠左，筛选紧跟右侧。讨论与文件共用浅底圆角搜索框；筛选菜单沿任务列表分类行的字号、间距和留白，桌面行高40px、触控44px，上下内边距一致。
- **已选与清除**：筛选入口直接显示图标、当前范围及适用的附件条件、清除叉；只有图标区有选中／悬停／展开底色。无独立条件行或数量徽标。清除叉移除范围与附件条件、保留关键词并回焦入口；搜索框只清关键词。菜单无“清除全部”及对应底部分隔线，单选范围后关闭。
- **状态保持**：切换页签保留查询条件，筛选保留既有置顶分区、普通消息倒序、页签总量及正在写的回复草稿，无匹配时提示调整条件。定位筛选外的原文或通知目标时清除查询条件并定位准确消息；目标不可用时沿原提示。新普通发言成功后恢复完整结果并查看最新消息，失败保留条件和草稿。发送或创建子任务期间暂不可调整条件；筛选隐藏的消息不计入本次阅读回执。

| 范围 | 匹配规则 |
| --- | --- |
| 全部讨论 | 当前任务内可读取的全部讨论。 |
| 与我有关 | 本人发布、他人直接回复本人、有效提及本人或全体任务成员。普通正文中的@文字不算有效提及。 |
| 我发布的 | 本人主消息及回复。 |
| 我回复别人 | 本人对他人消息发出的直接回复，排除自回复。 |
| 别人回复我 | 他人对本人消息发出的直接回复，排除自回复，不沿整串讨论扩大。 |

验收：覆盖五种范围、关键词与附件叠加、自回复、有效／普通@、失效附件、空结果、分别清除、切页签保持、回复草稿保留及筛选外定位；桌面、窄屏与键盘结果一致。

PM Demo 来源：[筛选入口](../../src/features/tasks/discussion/components/DiscussionFilter.tsx) · [筛选规则](../../src/features/tasks/discussion/lib/discussion-filter.ts) · [讨论状态与定位](../../src/features/tasks/components/TaskDiscussion.tsx) · [搜索框共用样式](../../src/features/tasks/styles/task-pane-toolbar.css) · [筛选菜单共用尺寸](../../src/features/tasks/styles/task-filter-shared.css) · [选中入口样式](../../src/features/tasks/styles/task-discussion-feed.css) · [界面参考](../../docs/prd/assets/discussion-notifications-activity/discussion-tools-menu-zh.png)。

## 3. 任务列表筛选选中底色减淡

筛选按钮的选中背景和数量徽标使用同一安静表面：浅色#fafafa、深色#262626，选中后悬停不加深。保留原边框、图标、数量、点击区和筛选规则。

验收：浅深色下按钮与徽标底色一致，筛选数量正确，窄屏点击区不小于44px。

PM Demo 来源：[列表工具样式](../../src/features/tasks/styles/task-workspace-list.css) · [数量徽标](../../src/features/tasks/styles/task-filter-panel.css)。
