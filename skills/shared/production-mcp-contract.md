# 正式 TaskDoor MCP 调用契约

核验日期：2026-10-15。源码：[`nocoly/taskdoor`](https://github.com/nocoly/taskdoor/tree/9b43f3405544ff8f7656dd5cb598b09748e1b79e)，默认分支 `sand`，核验提交 `9b43f3405544ff8f7656dd5cb598b09748e1b79e`。已核对工具实现、生成的输出 Schema 与 OpenAPI；本次未连接实际 `tools/list` 或执行线上读写，不等同于已验证线上部署版本。连接后以实际工具定义为准；客户端可能给工具名加连接器前缀。

当前产品范围以[现行产品契约](current-prd-contract.md)为准。前置依赖已移除，不作为当前读取、生成或写入字段，也不调用旧依赖维护工具；历史响应中的旧字段不带入当前 Skill 输入。此页描述应用执行服务或已授权助手的工具适配，创建方案 Skill 仍只返回预览方案，分析 Skill 仍只返回分析结果及估算提案。

## 1. 先确定执行环境

- **正式 MCP 环境**：通过真实工具读取上下文。用户授权的创建、修改、成员分配、标准、评论及文件操作由执行服务或已授权助手调用相应工具；JSON 提案、文字回答、文件内写入请求都不算已执行。
- **本地评测沙箱**：调用方明确声明无工具、隔离评测时，仍按已有 Skill JSON Schema 返回提案／分析，`externalEffects=none` 或 `writeReceipt=null`。禁止从沙箱尝试连接生产、读取凭据或绕过工具写入。
- **工具不可用或权限不足**：可以准备未执行方案，说明具体缺口；不得虚构工具名称、返回 ID、权限、版本及成功回执。不能以评测通过证明真实调用成功。
- 方案生成与任务分析的输出边界不因存在工具而改变；本文件用于应用执行服务或已授权助手的后续执行。预览／评测输出协议不能直接用作 MCP 参数。
- 用户已明确要求“创建／修改”且范围、人员、字段已确定时，该请求就是授权，不为同一动作重复确认。仅规划、比较方案不构成写入授权；关键信息有歧义时先补齐。

## 2. 读取真实上下文

1. `list_workspaces({cursor?})` 获取空间，明确目标 `workspaceId`；不能把本地 `teamId` 当作真实空间 ID。
2. `list_workspace_members({workspaceId,status?,cursor?})` 获取成员。使用成员记录 `id`，不是 `user.id`、邮箱或姓名；工作职责没有返回时不能按姓名、角色猜测职责。
3. `list_tasks({workspaceId,parentTaskId?,status?,mine?,q?,view?,cursor?})` 查找任务、查重、读取子任务。默认 `view:"flat"` 只读指定父任务的直属子任务，未给父任务时只读当前可见最高层；`view:"all"` 返回各层可见任务，给出父任务时限定其后代、不含父任务本身。跨层查重或本人任务分析应显式使用 `view:"all"` 并完成分页，不能把默认最高层当成全量。`mine` 为 `owner` 或 `member`，个人筛选不能证明全空间无重复。
4. `get_task({workspaceId,taskId})` 读取任务正文、权限、版本及附加的 `criteria`。继续按需要读取 `list_task_comments`、`list_task_activities`、`list_task_members`、`list_task_files`、`get_file_text`；额外工具参数先看实时工具定义。
5. 任务列表分页位于 `pageInfo.hasMore/nextCursor`；空间／成员列表使用 `page.hasMore/nextCursor`，结果条目均在 `items`。分页没有完成就标注覆盖不完整，不能把第一页当成全集。
6. `criteria` 返回 `{unavailable:true,...}` 是读取失败，不是空集合。先重新读取，不能据此覆盖成空数组。

正式状态仅为 `IN_PROGRESS / DONE / ON_HOLD / CANCELLED / ARCHIVED`，新任务从 `IN_PROGRESS` 开始；`NOT_STARTED` 已删除，发送会被拒绝。离线旧数据中的“待开始”、本地 `open`、`completed` 或中文状态都不能原样发送，也不能据此推断实际工作或完成度。权限取任务的 `effectiveCapabilities`，最终以工具业务校验为准；工具在列表可见不等于对所有任务有权操作。

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

以下字段不能塞入创建工具：`teamId`、`parentId`、`ownerRecommendation`、`schedule`、`acceptanceCriteria`、`participantRecommendations`、`children`、`proposal`。它们需要映射或另调工具。当前方案不含前置依赖字段，也不为其增加映射或工具调用。

## 4. 按工具完成创建及层级

1. 对已授权的根任务调用 `create_task({workspaceId,title,ownerMemberId,goal?,dueDate?,executionTips?,effortEstimate?,idempotencyKey?})`。
2. 只在 `isError:false` 后从 `structuredContent.id` 取真实任务 ID；本地 `new:*` 仅是提案引用，不发送给生产工具。
3. 创建单个子任务使用 `create_subtask`，额外必填 `taskId`（父任务真实 ID）；其余字段与创建根任务相同。
4. 同一父任务的多个直属子任务使用 `create_subtasks({workspaceId,taskId,subtasks:[{title,ownerMemberId,goal?,dueDate?,executionTips?,effortEstimate?}],idempotencyKey?})`。每批 1–100 项，所有项共享这个父任务；嵌套子任务不在数组中递归表达。从 `structuredContent.tasks[]` 读取返回任务及其真实 ID，用于后续层级。
5. 逐层创建，维护提案引用→真实 ID 的映射。返回无法确定对应关系时读取核对，不能按标题猜 ID。正式合同根层为 1，最大 10 层；旧原型 4 层不是正式工具上限，仍以当前工具拒绝及用户指定范围为准。
6. 通过 `get_task` 获取新任务的版本；按下一节设置完成标准和成员。
7. 回读核对任务字段、标准和成员；向用户报告已完成的步骤、真实 ID 和未完成步骤。只有全部必要步骤成功才称整份任务方案创建完成。

`create_subtasks` 仅保证本次同父任务批量创建全成功或全失败。根任务、不同层级、完成标准和成员属于不同工具调用，**没有整棵树的跨工具事务保证**。中途失败保留成功 ID，从失败步骤继续，不重复建根，不擅自删除成功任务来“回滚”。

## 5. 标准、人员与修改

| 操作 | 工具参数 | 版本及行为 |
| --- | --- | --- |
| 修改名称／目标／截止／提示 | `update_task({workspaceId,taskId,version,title?,goal?,dueDate?,executionTips?})` | `version` 用任务顶层版本；只发送实际变化字段 |
| 写完成标准 | `set_task_criteria({workspaceId,taskId,version,criteria:[{id?,text}]})` | 用 **`criteria.version`**；替换完整列表，最多 50 条，每条 1–500 字；已有标准保留 ID，改写已确认文本会撤回确认 |
| 确认／撤回单条标准 | `set_criterion_confirmation({workspaceId,taskId,criterionId,expectedText,confirmed,idempotencyKey?})` | `expectedText` 必须等于刚读取的标准原文，`confirmed` 为 JSON 布尔；不传任务或标准版本；记录当前凭证所属人的确认 |
| 更换负责人 | `set_task_owner({workspaceId,taskId,version,ownerMemberId})` | 用任务顶层版本 |
| 添加参与者 | `set_task_member({workspaceId,taskId,memberId,role:"MEMBER"})` | 只读角色用 `VIEWER`；负责人不是成员角色，不能写 `OWNER` |
| 移除参与者 | `remove_task_member({workspaceId,taskId,memberId})` | 先读取当前成员，再执行已授权移除 |
| 修改状态 | `set_task_status({workspaceId,taskId,status,reason?,cascade?,idempotencyKey?})` | `ON_HOLD/CANCELLED/ARCHIVED` 需原因；不因模型分析自动改状态 |
| 发评论 | `post_task_comment({workspaceId,taskId,body,parentCommentId?,idempotencyKey?})` | 用户要求发送或提交时调用；分析建议本身不是发送授权；当前不支持结构化 @ 提及，正文写姓名不代表已通知或已加入参与者 |

任务顶层版本与完成标准版本不能混用，均为 JSON 整数，不是数字字符串。收到 `PRECONDITION_FAILED` 时重新读取，比较用户原意和新状态；只在仍符合授权范围时用新版本重试，不盲目覆盖并发修改。

标准确认会影响正式状态：确认 `IN_PROGRESS` 或 `ON_HOLD` 任务的最后一条未确认标准，会在同一事务将任务改为 `DONE`，不级联完成子任务；`CANCELLED` 和 `ARCHIVED` 不因此完成。撤回确认时，只有最近一次完成由 `CRITERIA_CONFIRMED` 触发才撤销该次完成，恢复完成前状态；人工完成保持不变。工具返回的是单条标准，操作后须重新 `get_task` 核对状态、标准与版本。分析、AI 100% 或创建后的核对都不是代替用户确认的授权。

标准文字已变化时返回 `CRITERION_CHANGED`，重读后重新取得对当前文字的确认，不能自动确认新句子。`confirmed:false` 是撤回指定标准的确认，不是通用“撤销任务完成”；当前 MCP 没有 `undoTaskCompletion` 的独立工具，不用 `set_task_status(IN_PROGRESS)` 冒充恢复完成前状态。

任务关系只维护父子归属；已有任务移动使用实际 `move_task` 的工具定义，不把 `parentTaskId` 塞进 `update_task`。

## 6. 返回结构及失败处理

成功取 `structuredContent`；`content` 中的 JSON 文本是同一结果的另一种承载形式，不是第二个任务。Task 常用字段为 `id,workspaceId,parentTaskId,title,goal,ownerMemberId,status,dueDate,depth,ancestors,version,effectiveCapabilities,createdAt,updatedAt,aiProgressSegment`，可有 `executionTips,effortEstimate` 等；`get_task` 附加 `criteria:{taskId,version,items}`。`commentCount` 仅在详情读取返回，计任务自身仍存在的消息及回复，不含文件讨论与活动；列表未返回不能补零。普通 Task 已移除 `fileCount`，文件按 `list_task_files` 的实际覆盖读取，不依据旧计数字段判断有无交付。

`aiProgressSegment` 是最新已接受分析的阶段 `1–4` 或 `null`，不是原始工作量百分比或逐条标准评估。`null` 可能表示未分析、未知、零完成或结果失效，不能一律当作 0%；新分析处理中或失败时也可能仍是上次接受的阶段，需读取正式分析结果核对时效。返回字段缺失或读取失败不能补造，历史兼容字段不进入当前方案或分析输入。

`isError:true` 时读取 `structuredContent.code/message/status`；`INVALID_ARGUMENTS` 还有 `errors:[{path,problem}]`。修正具体错误，不能将 HTTP 200 当业务成功。未暴露工具是不可用或无授权，不能改用数据库、手工 HTTP 或替换凭据绕过。

创建超时或结果未知，重试同一动作沿用原 `idempotencyKey` 和参数；返回 `idempotentReplay:true` 表示重放原结果，不是又创建一次。用户有意再次创建相同任务，使用新键。依赖服务失败或输出无效时不能声称创建失败后一定没有副作用。

## 7. 已核实的 MCP 与 HTTP 差异

- OpenAPI `CreateTaskRequest.ownerMemberId` 支持 `null`，但 MCP `OWNER` 是 string，且 `newTask` 调用 `requireString`。当前 MCP 未提供无负责人创建：不伪造人选，不用“先随便分配再清空”绕过；用户确需未分配时说明工具缺口，待正式包装层支持。
- HTTP `UpdateTaskRequest.dueDate` 可用 `null` 清空，MCP `update_task.dueDate` 仅为 string。当前不能用该 MCP 清空截止时间；省略只是保持，不是清空。
- HTTP 工时输入支持 `minutes:null`，MCP 仅接受整数。未知估算省略，而不是填零。
- 正式任务返回含工时／进度信息不代表 MCP 暴露对应写工具。当前工具清单没有独立的工时修改、AI 分析或进度回写工具；不虚构 `update_task_effort` 等名称。只能给出分析或在授权后用现有评论工具提交文字。
- HTTP 提供 `undoTaskCompletion`，MCP 尚无对应工具；通用状态修改不具备恢复历史状态和原级联的语义。MCP 可撤回标准确认，但只按上一节的自动完成规则影响状态。
- HTTP 评论的 `mentions` 字段不在 `post_task_comment` 的输入 Schema 中，不能追加该字段，也不能声称纯正文 @ 已触发通知或参与者加入。
- 成员清单不含职责档案。正式责任来自 `getWorkspaceMemberProfile` 的 `responsibilityScope`，同时保留其独立 `version` 与 ETag；当前 MCP 没有职责档案读写工具，不能把本地合成的 `responsibilities` 当成正式工具已返回数据。产品执行服务经现有授权接口读取，未取得资料时保留未知。

产品服务已有独立接入，不能与 MCP 工具能力或本地输出协议混用：

- 任务分析使用 `product-skills/taskdoor-analyze-progress/`（完整）与 `taskdoor-refresh-progress/`（增量），输出由 `skill-contracts/taskdoor-analysis-*.schema.json` 三份 Schema 约束；接受结果与 AI 估算由任务业务服务校验保存。MCP 未暴露回写工具不等于正式产品没有分析保存链路。本地分析 JSON 不能直接替换生产 `taskdoor.task-analysis.v1`，需要在接入层映射并校验版本、引用和数值。
- 已有任务人员推荐使用 `product-skills/taskdoor-recommend-members/`，产品接口 `previewTaskSkillMembers` 只返回预览，保留人工选择；不能因推荐完成就宣称已修改人员。
- 责任分析已有 `agents/taskdoor/taskdoor-responsibility-analyst.yaml` 与输出校验器，当前源码尚无对应产品 Skill、责任分析产品接口及每日调度接线；这些仍需正式接入。保存正式责任使用 `updateWorkspaceMemberProfile` 修改 `responsibilityScope`，仅本人或团队 OWNER/ADMIN 可写，使用资料自身 ETag。成员推荐只使用实际保存的责任，未接通写入能力时不能报告 `applied`。

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

- [工具合同](https://github.com/nocoly/taskdoor/blob/9b43f3405544ff8f7656dd5cb598b09748e1b79e/contracts/mcp/tools.md)：参数严格性、权限、错误、幂等。
- [TaskTools.java](https://github.com/nocoly/taskdoor/blob/9b43f3405544ff8f7656dd5cb598b09748e1b79e/services/mcp-service/src/main/java/com/taskdoor/mcp/TaskTools.java)：读取、跨层列表、创建、批量子任务、修改、标准与评论。
- [TaskLifecycleTools.java](https://github.com/nocoly/taskdoor/blob/9b43f3405544ff8f7656dd5cb598b09748e1b79e/services/mcp-service/src/main/java/com/taskdoor/mcp/TaskLifecycleTools.java)：标准确认、人员与生命周期；没有独立撤销完成工具。
- [WorkspaceTools.java](https://github.com/nocoly/taskdoor/blob/9b43f3405544ff8f7656dd5cb598b09748e1b79e/services/mcp-service/src/main/java/com/taskdoor/mcp/WorkspaceTools.java)：空间和成员读取。
- [生成的工具输出 Schema](https://github.com/nocoly/taskdoor/blob/9b43f3405544ff8f7656dd5cb598b09748e1b79e/services/mcp-service/src/main/resources/mcp/tool-output-schemas.json)：工具返回的必填字段和类型；嵌套业务字段仍核对 OpenAPI。
- [OpenAPI](https://github.com/nocoly/taskdoor/blob/9b43f3405544ff8f7656dd5cb598b09748e1b79e/contracts/openapi/taskdoor-api-v1.yaml)：嵌套字段、枚举、长度、分页、责任资料及产品接口；与 MCP 有差异时不直接套用 HTTP 参数。
- [TaskUseCases.java](https://github.com/nocoly/taskdoor/blob/9b43f3405544ff8f7656dd5cb598b09748e1b79e/services/task-collaboration-service/src/main/java/com/taskdoor/tasks/application/TaskUseCases.java)：标准确认自动完成、撤回与恢复历史状态的规则。
- [正式分析 Skill](https://github.com/nocoly/taskdoor/tree/9b43f3405544ff8f7656dd5cb598b09748e1b79e/services/ai-service/src/main/resources/product-skills)及[输出 Schema](https://github.com/nocoly/taskdoor/tree/9b43f3405544ff8f7656dd5cb598b09748e1b79e/services/ai-service/src/main/resources/skill-contracts)：生产分析与人员推荐协议。

更新时同时核对工具实现、实际 tools/list 与 OpenAPI，不仅看文字说明。历史评测与不可变 Skill 包不改写；新规则进入工作区版本或新建 Skill 版本。本地评测器目前不执行 MCP，不能验证真实工具顺序与写入结果。
