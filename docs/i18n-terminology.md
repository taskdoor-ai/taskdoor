# TaskDoor 中英文术语表

2026-09-21。用于主应用系统文案、可访问名称与内置示例译文。依据是现有任务模型和行业常用表达，不声称行业存在强制统一标准。用户内容、存储键、角色权限及历史原始数据不随术语修订而改变。

| 中文 | 英文 | 定义与边界 |
| --- | --- | --- |
| 任务 | Task | 要完成的工作及其目标、条件和记录。 |
| 概览 | Overview | 任务目标、完成标准、分析、子任务与依赖的入口。 |
| 负责人 | Owner | 对任务结果负责的人；不是团队管理员或仅关注任务的人。 |
| 参与人 | Collaborator / Collaborators | 参与任务协作的成员，不因此获得管理员权限。字段标签用复数。 |
| 成员 | Member | 团队人员身份，与任务角色分开。 |
| 职责 | Responsibilities | 成员负责的工作范围，与系统权限 Role 分开。 |
| 目标 | Goal | 希望达到的结果，不是标题的重复。 |
| 完成标准 | Acceptance criteria | 当前任务可逐项核验的完成条件；不新增审批流程。 |
| 主任务 | Main task | 创建方案中的顶层任务。 |
| 父任务 | Parent task | 层级关系中的直接上一级，不是所有祖先。 |
| 子任务 | Subtask / Subtasks | 下一级任务，表达归属。 |
| 前置依赖 | Dependency / Dependencies | 需要先满足的任务关系，表达先后约束而非归属。 |
| 截止日期 | Due date | 约定的日历截止日，空值为 No due date。 |
| 预计投入 | Estimated effort | 人工工作量估算，不是日历历时、成本或进度。 |
| 人天 | person-day / person-days | 本产品按 480 分钟折算；1 用单数，其他用复数。 |
| 状态 | Status | 工作流程状态，独立于进度和预测。 |
| 进度 | Progress | 有依据的完成程度，未知不等于零。 |
| AI 预测 | AI forecast | 对未来完成情况的推断，不能冒充已确认事实。 |
| 讨论 | Discussion | 任务交流面板；单条发言为 Comment，回复为 Reply。 |
| 文件 | Files | 任务相关文件入口。 |
| 活动 | Activity | 谁在何时做了什么的记录，不作为“讨论”的别名。 |
| 标签 | Tag / Tags | 分类标记，不是任务状态。 |
| 登录／退出登录 | Log in / Log out | 成对使用，不与 Sign in / Sign out 混用。 |
| 注册 | Sign up | 创建账户，不与 Register 混用。 |
| 置顶操作／置顶分组 | Pin / Pinned tasks | 动词用于按钮，名词用于分组，不共享一个词条。 |

## 依据

- [Asana 任务分配说明](https://help.asana.com/s/article/assign-tasks-to-teammates)：Asana 常用 Assignee；TaskDoor 根据既有结果负责模型保留 Owner，不借翻译改变角色含义。
- [Asana 任务依赖说明](https://help.asana.com/s/article/task-dependencies)：Dependency 表达前后任务的约束。
- [Atlassian Acceptance criteria 说明](https://www.atlassian.com/work-management/project-management/acceptance-criteria/)：当前任务完成和被接受所需满足的明确条件。
- [Atlassian Definition of done 说明](https://www.atlassian.com/agile/project-management/definition-of-done)：团队共同完成定义与单项任务条件应区分，不把本产品字段叫作 Definition of done。

## 维护与验证

系统文案使用完整句插值；姓名、标签和任务内容通过明确的 mock 身份及原文基线映射。未知文本保留原样，不通用替换用户数据。

server/terminologyI18n.test.ts 检查字段一致性、中英文键与参数、推荐说明与自定内容保护。scripts/check-ui-i18n.cjs 检查主应用可达 JSX 和直接 ui() 调用的词条覆盖；不能证明所有动态数据及服务端输出完成。详细限制见[检查记录](i18n-ui-audit-2026-09-21.md)。
