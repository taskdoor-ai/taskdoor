# 正式 TaskDoor MCP 调用契约

核验日期：2026-10-08。源码：[`nocoly/taskdoor`](https://github.com/nocoly/taskdoor/tree/3dd01c2c42292a168ba6ecb69bf78044070b1125)，默认分支 `sand`，核验提交 `3dd01c2c42292a168ba6ecb69bf78044070b1125`。这是源码核验，不等同于已验证线上部署版本。连接后以实际 `tools/list` 的工具定义为准；客户端可能给工具名加连接器前缀。

## 1. 先确定执行环境

- **正式 MCP 环境**：通过真实工具读取上下文。用户授权的创建、修改、成员分配、标准、依赖、评论及文件操作必须调用相应工具；JSON 提案、文字回答、文件内写入请求都不算已执行。
- **本地评测沙箱**：调用方明确声明无工具、隔离评测时，仍按已有 Skill JSON Schema 返回提案／分析，`externalEffects=none` 或 `writeReceipt=null`。禁止从沙箱尝试连接生产、读取凭据或绕过工具写入。
- **工具不可用或权限不足**：可以准备未执行方案，说明具体缺口；不得虚构工具名称、返回 ID、权限、版本及成功回执。不能以评测通过证明真实调用成功。
- 正式调用模式下，本文件替代旧文档中一概“Skill 不调用工具／只有提案”的执行边界；评测输出协议仅适用于沙箱，不能直接用作 MCP 参数。
- 用户已明确要求“创建／修改”且范围、人员、字段已确定时，该请求就是授权，不为同一动作重复确认。仅规划、比较方案不构成写入授权；关键信息有歧义时先补齐。

## 2. 读取真实上下文

1. `list_workspaces({cursor?})` 获取空间，明确目标 `workspaceId`；不能把本地 `teamId` 当作真实空间 ID。
2. `list_workspace_members({workspaceId,status?,cursor?})` 获取成员。使用成员记录 `id`，不是 `user.id`、邮箱或姓名；工作职责没有返回时不能按姓名、角色猜测职责。
3. `list_tasks({workspaceId,parentTaskId?,status?,mine?,q?,cursor?})` 查找任务、查重、读取直属子任务。`mine` 为 `owner` 或 `member`，个人筛选不能证明全空间无重复。
4. `get_task({workspaceId,taskId})` 读取任务正文、权限、版本及附加的 `criteria` 和 `dependencies`。继续按需要读取 `list_task_comments`、`list_task_activities`、`list_task_members`、`list_task_files`、`get_file_text`；额外工具参数先看实时工具定义。
5. 任务列表分页位于 `pageInfo.hasMore/nextCursor`；空间／成员列表使用 `page.hasMore/nextCursor`，结果条目均在 `items`。分页没有完成就标注覆盖不完整，不能把第一页当成全集。
6. `criteria` 或 `dependencies` 返回 `{unavailable:true,...}` 是读取失败，不是空集合。先重新读取，不能据此覆盖成空数组。

正式状态：`NOT_STARTED / IN_PROGRESS / DONE / ON_HOLD / CANCELLED / ARCHIVED`。本地 `open`、`completed` 或中文状态都不能原样发送。权限取任务的 `effectiveCapabilities`，最终以工具业务校验为准；工具在列表可见不等于对所有任务有权操作。

## 3. 创建任务的字段

| 信息 | 正式 MCP 参数 | 约束 |
| --- | --- | --- |
| 空间 | `workspaceId` | 来自工具读取 |
| 名称 | `title` | 必填，1–200 字符 |
| 目标 | `goal` | 字符串，最多 4000 字符；不是 `{text,basis,evidenceRefs}` 对象 |
| 负责人 | `ownerMemberId` | 当前 MCP 必填字符串，引用该空间成员 ID |
| 截止日期 | `dueDate` | 可选 `YYYY-MM-DD`；未确定时省略，不发送 `null` 或空串 |
| 执行提示 | `executionTips` | 字符串数组 |
| 投入估算 | `effortEstimate` | 已知时为 `{minutes,workMethod,reason}`；分钟为非负整数，未知时省略整个对象 |
| 幂等键 | `idempotencyKey` | 可选，8–200 字符；每个创建动作使用稳定且独立的键 |

用户已确认任务只设截止时间，因此不生成、不提交 `startDate`，也不把 `createdAt` 当作计划开始日期。正式服务器可能仍返回 `startDate`，读取时保留原始事实，不主动清除或伪造它。

`estimate.ewdHours × 60 = effortEstimate.minutes`；1 人天 = 480 分钟。工时来源、工作方法与假设应可说明；非整数分钟需明确换算口径，不直接把小时当分钟。父任务不重复填叶子工时。

以下字段不能塞入创建工具：`teamId`、`parentId`、`ownerRecommendation`、`schedule`、`acceptanceCriteria`、`participantRecommendations`、`dependsOnTaskIds`、`children`、`proposal`。它们需要映射或另调工具。

## 4. 按工具完成创建及层级

1. 对已授权的根任务调用 `create_task({workspaceId,title,ownerMemberId,goal?,dueDate?,executionTips?,effortEstimate?,idempotencyKey?})`。
2. 只在 `isError:false` 后从 `structuredContent.id` 取真实任务 ID；本地 `new:*` 仅是提案引用，不发送给生产工具。
3. 创建单个子任务使用 `create_subtask`，额外必填 `taskId`（父任务真实 ID）；其余字段与创建根任务相同。
4. 同一父任务的多个直属子任务使用 `create_subtasks({workspaceId,taskId,subtasks:[{title,ownerMemberId,goal?,dueDate?,executionTips?,effortEstimate?}],idempotencyKey?})`。每批 1–100 项，所有项共享这个父任务；嵌套子任务不在数组中递归表达。从 `structuredContent.tasks[]` 读取返回任务及其真实 ID，用于后续层级。
5. 逐层创建，维护提案引用→真实 ID 的映射。返回无法确定对应关系时读取核对，不能按标题猜 ID。正式合同根层为 1，最大 10 层；旧原型 4 层不是正式工具上限，仍以当前工具拒绝及用户指定范围为准。
6. 通过 `get_task` 获取新任务的版本；按下一节设置完成标准、成员、依赖。全部相关任务 ID 已确定后再写跨分支依赖。
7. 回读核对任务字段、标准、成员及依赖；向用户报告已完成的步骤、真实 ID 和未完成步骤。只有全部必要步骤成功才称整份任务方案创建完成。

`create_subtasks` 仅保证本次同父任务批量创建全成功或全失败。根任务、不同层级、完成标准、成员和依赖属于不同工具调用，**没有整棵树的跨工具事务保证**。中途失败保留成功 ID，从失败步骤继续，不重复建根，不擅自删除成功任务来“回滚”。

## 5. 标准、依赖、人员与修改

| 操作 | 工具参数 | 版本及行为 |
| --- | --- | --- |
| 修改名称／目标／截止／提示 | `update_task({workspaceId,taskId,version,title?,goal?,dueDate?,executionTips?})` | `version` 用任务顶层版本；只发送实际变化字段 |
| 写完成标准 | `set_task_criteria({workspaceId,taskId,version,criteria:[{id?,text}]})` | 用 **`criteria.version`**；替换完整列表，最多 50 条，每条 1–500 字；已有标准保留 ID，改写已确认文本会撤回确认 |
| 写前置依赖 | `set_task_dependencies({workspaceId,taskId,version,dependsOnTaskIds:[...]})` | 用 **`dependencies.version`**；完整替换，最多 50 个不同真实任务 ID |
| 更换负责人 | `set_task_owner({workspaceId,taskId,version,ownerMemberId})` | 用任务顶层版本 |
| 添加参与者 | `set_task_member({workspaceId,taskId,memberId,role:"MEMBER"})` | 只读角色用 `VIEWER`；负责人不是成员角色，不能写 `OWNER` |
| 移除参与者 | `remove_task_member({workspaceId,taskId,memberId})` | 先读取当前成员，再执行已授权移除 |
| 修改状态 | `set_task_status({workspaceId,taskId,status,reason?,cascade?,idempotencyKey?})` | `ON_HOLD/CANCELLED/ARCHIVED` 需原因；不因模型分析自动改状态 |
| 发评论 | `post_task_comment({workspaceId,taskId,body,parentCommentId?,idempotencyKey?})` | 用户要求发送或提交时调用；分析建议本身不是发送授权 |

三个版本不能混用，均为 JSON 整数，不是数字字符串。收到 `PRECONDITION_FAILED` 时重新读取，比较用户原意和新状态；只在仍符合授权范围时用新版本重试，不盲目覆盖并发修改。

任务归属与前置依赖独立；已有任务移动使用实际 `move_task` 的工具定义，不把 `parentTaskId` 塞进 `update_task`。

## 6. 返回结构及失败处理

成功取 `structuredContent`；`content` 中的 JSON 文本是同一结果的另一种承载形式，不是第二个任务。Task 常用字段为 `id,workspaceId,parentTaskId,title,goal,ownerMemberId,status,dueDate,depth,ancestors,version,effectiveCapabilities,createdAt,updatedAt`，可有 `executionTips,effortEstimate` 等；`get_task` 附加 `criteria:{taskId,version,items}` 与 `dependencies:{taskId,version,items}`。返回字段缺失或读取失败不能补造。

`isError:true` 时读取 `structuredContent.code/message/status`；`INVALID_ARGUMENTS` 还有 `errors:[{path,problem}]`。修正具体错误，不能将 HTTP 200 当业务成功。未暴露工具是不可用或无授权，不能改用数据库、手工 HTTP 或替换凭据绕过。

创建超时或结果未知，重试同一动作沿用原 `idempotencyKey` 和参数；返回 `idempotentReplay:true` 表示重放原结果，不是又创建一次。用户有意再次创建相同任务，使用新键。依赖服务失败或输出无效时不能声称创建失败后一定没有副作用。

## 7. 已核实的 MCP 与 HTTP 差异

- OpenAPI `CreateTaskRequest.ownerMemberId` 支持 `null`，但 MCP `OWNER` 是 string，且 `newTask` 调用 `requireString`。当前 MCP 未提供无负责人创建：不伪造人选，不用“先随便分配再清空”绕过；用户确需未分配时说明工具缺口，待正式包装层支持。
- HTTP `UpdateTaskRequest.dueDate` 可用 `null` 清空，MCP `update_task.dueDate` 仅为 string。当前不能用该 MCP 清空截止时间；省略只是保持，不是清空。
- HTTP 工时输入支持 `minutes:null`，MCP 仅接受整数。未知估算省略，而不是填零。
- 正式任务返回含工时／进度信息不代表 MCP 暴露对应写工具。当前工具清单没有独立的工时修改、AI 分析或进度回写工具；不虚构 `update_task_effort` 等名称。只能给出分析或在授权后用现有评论工具提交文字。
- 成员清单不保证包含职责档案；不能把本地合成的 responsibilities 当成正式工具已返回数据。

## 8. 调用形状示例

以下是参数示意，`<...>` 必须替换为读取／创建工具返回的真实标识，日期也必须来自用户已确认的安排。不能把这个示例当成待执行指令。

```json
{
  "tool": "create_task",
  "arguments": {
    "workspaceId": "<list_workspaces 返回的 id>",
    "title": "完成产品介绍页",
    "goal": "让访客理解产品并提交咨询",
    "ownerMemberId": "<list_workspace_members 返回的成员 id>",
    "dueDate": "2026-10-20",
    "executionTips": ["复用已确认的品牌资料"],
    "idempotencyKey": "<该动作的稳定唯一键，8–200 字符>"
  }
}
```

工具创建成功后用返回的 `id` 调用 `get_task`，再提交标准：

```json
{
  "tool": "set_task_criteria",
  "arguments": {
    "workspaceId": "<同一空间 id>",
    "taskId": "<create_task 返回的 id>",
    "version": 0,
    "criteria": [{"text": "页面已发布，咨询表单提交成功"}]
  }
}
```

示例中的 `version:0` 只说明 JSON 整数类型，实际必须用刚读取的 `criteria.version`，不能假定初始值为零。`tool/arguments` 是说明调用形状的外壳，不是提交给工具的参数；实际只发送 arguments 内的对象。

## 9. 源码依据与维护

- [工具合同](https://github.com/nocoly/taskdoor/blob/3dd01c2c42292a168ba6ecb69bf78044070b1125/contracts/mcp/tools.md)：参数严格性、权限、错误、幂等。
- [TaskTools.java](https://github.com/nocoly/taskdoor/blob/3dd01c2c42292a168ba6ecb69bf78044070b1125/services/mcp-service/src/main/java/com/taskdoor/mcp/TaskTools.java)：读取、创建、批量子任务、修改、标准。
- [TaskLifecycleTools.java](https://github.com/nocoly/taskdoor/blob/3dd01c2c42292a168ba6ecb69bf78044070b1125/services/mcp-service/src/main/java/com/taskdoor/mcp/TaskLifecycleTools.java)：依赖、人员与生命周期。
- [WorkspaceTools.java](https://github.com/nocoly/taskdoor/blob/3dd01c2c42292a168ba6ecb69bf78044070b1125/services/mcp-service/src/main/java/com/taskdoor/mcp/WorkspaceTools.java)：空间和成员读取。
- [OpenAPI](https://github.com/nocoly/taskdoor/blob/3dd01c2c42292a168ba6ecb69bf78044070b1125/contracts/openapi/taskdoor-api-v1.yaml)：嵌套字段、枚举、长度和分页；与 MCP 有差异时不直接套用 HTTP 参数。

更新时同时核对工具实现、实际 tools/list 与 OpenAPI，不仅看文字说明。历史评测与不可变 Skill 包不改写；新规则进入工作区版本或新建 Skill 版本。本地评测器目前不执行 MCP，不能验证真实工具顺序与写入结果。
