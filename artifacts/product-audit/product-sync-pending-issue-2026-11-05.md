# 正式项目交付归档 · 2026-11-05

2026-11-05 已提交为 [nocoly/taskdoor#74](https://github.com/nocoly/taskdoor/issues/74)。本批共 1 项。

## 1. 任务讨论支持 @全体成员

- 普通发言和回复共用现有 @ 菜单。输入 `@` 或点击 @ 按钮时，首项显示群组图标及单行「全体成员」（英文 `All members`），下方不显示说明。选择后插入一个可删除的提及，普通手输同名文字按正文处理。
- 发布成功时，按当时有效的任务负责人和参与者发送站内提醒，排除发言人。群组提及不新增参与者。同一消息的全体提及、单人提及和回复按收件人合并，点击通知直接打开原消息。

**验收**　普通发言和回复均可选中单行「全体成员」。选择、取消、发布失败及仅手输同名文字均不触发全体提醒。发布后，符合条件的收件人各收到一条可定位原消息的提醒，非任务成员和失效成员不因群组提及收到提醒。

**PM Demo**　[PR #22](https://github.com/taskdoor-ai/taskdoor/pull/22) · [提交 63f662fc](https://github.com/taskdoor-ai/taskdoor/commit/63f662fc14261e88870345410323200a5ffe901d)

**Demo 源码**　[讨论编辑器](https://github.com/taskdoor-ai/taskdoor/blob/63f662fc14261e88870345410323200a5ffe901d/src/features/tasks/discussion/components/DiscussionComposer.tsx) · [消息展示](https://github.com/taskdoor-ai/taskdoor/blob/63f662fc14261e88870345410323200a5ffe901d/src/features/tasks/discussion/components/DiscussionMarkdown.tsx) · [发布与收件人规则](https://github.com/taskdoor-ai/taskdoor/blob/63f662fc14261e88870345410323200a5ffe901d/src/features/tasks/lib/task-mention-publishing.ts) · [通知与定位](https://github.com/taskdoor-ai/taskdoor/blob/63f662fc14261e88870345410323200a5ffe901d/src/app/workspace/lib/discussion-notifications.ts)

---

本地交付索引（不属于 issue 正文）。PM Demo PR #22 基于 [PR #21](https://github.com/taskdoor-ai/taskdoor/pull/21) 的分支。
