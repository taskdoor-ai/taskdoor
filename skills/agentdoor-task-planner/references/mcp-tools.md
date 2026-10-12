# 创建任务的 MCP 字段

以下用于理解 TaskDoor 字段与调用顺序，实际参数以连接提供的 `tools/list` 为准。只发送工具允许的字段。

## 身份与读取

- `list_workspaces({cursor?})` 获取工作区；`list_workspace_members({workspaceId,status?,cursor?})` 获取成员，引用成员记录的 `id`，不是 `user.id`、邮箱或姓名。待加入或停用成员不能当作已可分配人员；成员角色也不能证明工作职责。
- `list_tasks({workspaceId,parentTaskId?,q?,cursor?,...})` 查找相关任务与直属子任务；个人筛选不能代表全空间。任务列表分页为 `pageInfo.hasMore/nextCursor`，空间和成员分页为 `page.hasMore/nextCursor`，条目在 `items`。
- `get_task({workspaceId,taskId})` 返回任务字段及 `criteria`、`dependencies`、版本和权限；`list_task_members({workspaceId,taskId})` 核对参与者。分页参数仅在当前工具定义允许时发送，不能根据返回的 `pageInfo` 自行增加不被允许的 `cursor`。读取未完成或返回 `unavailable:true` 表示资料不可用，不能当空集合覆盖。

## 创建参数

| 信息 | 参数 | 保存方式 |
| --- | --- | --- |
| 工作区 | `workspaceId` | 真实工作区 ID |
| 名称 | `title` | 字符串 |
| 负责人 | `ownerMemberId` | 该工作区可参与成员的 ID，创建必填 |
| 目标 | `goal` | 字符串，不是结构化对象 |
| 截止日期 | `dueDate` | 确定时为 `YYYY-MM-DD`；未确定就省略 |
| 执行建议 | `executionTips` | 字符串数组，一条建议一项 |
| 预计投入 | `effortEstimate` | 已知时为 `{minutes,workMethod,reason}`，分钟为非负整数；未知省略整个对象 |
| 幂等键 | `idempotencyKey` | 每个创建动作独立且稳定，8–200 字符 |

本 Skill 只设置截止日期，不生成 `startDate`，也不把 `createdAt` 当计划开始日期；读取已有开始日期不主动清除。1 人时换算为 60 分钟，1 人天为 480 分钟，换算后的整数分钟说明取整口径。

根任务用 `create_task({...})`。单个子任务用 `create_subtask({workspaceId,taskId,...})`，其中 `taskId` 是父任务 ID；同父子任务用 `create_subtasks({workspaceId,taskId,subtasks:[{title,ownerMemberId,goal?,dueDate?,executionTips?,effortEstimate?}],idempotencyKey})`。批量回执的任务在 `tasks[]`，只表示该次同父批量动作，不保证整棵树跨工具调用的事务。

`acceptanceCriteria`、`participantRecommendations`、`dependsOnTaskIds`、`children` 和本地 `teamId` 不能塞进创建参数。完成标准、参与者和依赖通过下面的独立工具设置。

## 标准、成员与依赖

| 动作 | 参数 | 版本 |
| --- | --- | --- |
| 完成标准 | `set_task_criteria({workspaceId,taskId,version,criteria:[{text,id?}]})` | 用 `criteria.version`，完整替换标准列表；已有标准保留 ID |
| 前置依赖 | `set_task_dependencies({workspaceId,taskId,version,dependsOnTaskIds:[...]})` | 用 `dependencies.version`，完整替换；无新增依赖不调用 |
| 必要参与者 | `set_task_member({workspaceId,taskId,memberId,role:"MEMBER"})` | 不要求版本；只读角色为 `VIEWER`，负责人不能写成 `OWNER` |
| 已授权字段修改 | `update_task({workspaceId,taskId,version,title?,goal?,dueDate?,executionTips?})` | 用任务顶层 `version`，只提交实际变化字段 |
| 已授权负责人修改 | `set_task_owner({workspaceId,taskId,version,ownerMemberId})` | 用任务顶层 `version` |

版本均为读取到的 JSON 整数，三个版本不能混用或猜零。`PRECONDITION_FAILED` 时重读并比较变化，仅在仍符合本次授权时继续；不能覆盖他人刚提交的内容。范围包含与依赖独立，避免自指、循环和重复依赖。

当前创建工具支持 `effortEstimate`，但 `update_task` 不接受该字段，不能用它刷新估算。最后读取时还要看估算的 `stale` 状态；若连接未提供对应更新工具，只能报告需复核，不能自造工具或参数。后续工具能力发生变化时，以实际 `tools/list` 为准。

## 回执与失败

读取 `structuredContent`；若客户端只提供 `content` 的 JSON 文本，解析其中同一结果，不能当作第二个任务。创建成功后从返回的 `id` 或批量 `tasks[].id` 获取真实 ID，不使用模型自造的临时 ID。

`isError:true` 是业务失败，读取 `code/message`，参数错误还有 `errors` 的字段路径。缺少工具或权限时报告缺口，不换凭据或绕过工具操作。部分成功时明确成功 ID、失败动作和原因，不宣称整份方案完成或已回滚。

当前工具说明明确：省略幂等键时，相同参数可能被视为先前动作的重试。有意再次创建相同内容必须使用新键；相同动作重试保持原键和参数，`idempotentReplay:true` 是原结果重放，不是新任务。
