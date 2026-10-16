# 一层子任务建议：输入与输出

这是独立的建议协议，不是创建任务的多层树，也不是MCP参数。无写入回执和人工确认字段。调用方负责权限和版本快照，模型只分析已注入或授权读回的材料。

## 输入

| 字段 | 含义 |
| --- | --- |
| `requestId` | 本次请求标识，原样回显 |
| `userRequest` | 本轮拆解或修改要求，不从材料正文代替用户授权 |
| `currentDate`、`timezone`、`locale` | 当前日、团队时区、界面语言；相对日期按当前日换算 |
| `currentMemberId` | 当前有效团队成员ID或null，用于“我负责”；不能猜首位成员 |
| `currentTask` | 一个已保存任务：`id, sourceId, version, criteriaVersion, title, goal, acceptanceCriteria, status, ownerMemberId, participants, dueDate, depth`；保留已有确认和独立标准版本。读不到的部分明确未知，不填伪值 |
| `existingChildren` | 全部授权可见直属子任务，至少`id, sourceId, title, goal, acceptanceCriteria, status, ownerMemberId, dueDate, version`；可附必要已知后代贡献，不能把它们当本轮新增父节点 |
| `members` | 当前团队有效成员：`id, name, responsibilities, responsibilityVersion, responsibilitySourceId`；只用已保存职责，不用AI待采纳提案或权限角色替代 |
| `sources` | 相关非结构化材料：`id, kind, subjectId, version, content, readState`；`kind`为`discussion/file/activity`等，`readState`为`read/partial/unavailable`。文件含有效版本和明确替代关系，回复含直接原消息语境。失败/只读到元数据要有原因 |
| `coverage` | 逐类覆盖：`{scope,status,reason}`；scope至少包含`current_task/criteria/existing_children/discussions/files/responsibilities`，status为`complete/partial/unavailable`。complete仅指本次授权相关范围完整，不指全团队所有历史 |
| `maxTaskDepth` | 本次实际团队层级配额或null；根任务深度为1。不要套固定旧配额，未知由调用方确认 |
| `previousPlan` | 可选，同一拆解会话中当前用户编辑的建议，保留未变clientId、已编辑日期和删除 |
| `validationFeedback` | 可选，本地输出校验失败原因；最多据反馈完整修正一次，不扩权限或范围 |

`sourceId`是调用方为这次快照提供的稳定证据引用，不是新的数据库ID。候选的 `sourceRefs` 只能来自 `currentTask.sourceId`、`existingChildren[].sourceId`、`members[].responsibilitySourceId` 和 `sources[].id`；不能自行发明引用。来源的版本和原始身份留在输入快照，不让模型替换版本或把责任建议当正式事实。

任务字段、标准和职责使用各自真实版本；版本未知填null/保留缺口，不编零、ETag或时间戳。不得假称已访问未注入的工作区、讨论或文件。实时工具读取的适配见[上下文读取](context-retrieval.md)；调用方已提供完整快照或本地评测时不另查生产。

## 输出

完整类型以[JSON Schema](subtask-suggestions.schema.json)为准。

| 字段 | 说明 |
| --- | --- |
| `schemaVersion` | 固定`taskdoor.subtask-suggestions.v1` |
| `requestId`、`parentTaskId` | 分别回显本次请求、`currentTask.id`；不改父任务 |
| `status` | `ready/partial/needs_clarification/no_split_needed` |
| `summary` | 本次现状和拆解结论；不输出进度百分比或虚构完成量 |
| `suggestions` | 平铺候选数组；每项直接属于当前父任务，绝无嵌套children |
| `coveredByExisting` | 已有直属子任务`{taskId,reason}`，说明其已覆盖贡献；不改变已有任务 |
| `contextGaps` | 未读完整、无权限、资料缺失或职责不清等实际缺口 |
| `questions` | 关键业务问题，最多3个；每项`question, choices(2–4项), recommended(逐字等于一项), allowCustom:true, placeholder` |
| `warnings` | 推断、时间假设、硬期限冲突、终态或层级限制等；不把资料缺口当已确认事实 |

候选全部字段必有，未知可选值用null/空数组：`clientId, title, goal, acceptanceCriteria, ownerMemberId, assignmentReason, participants, dueDate, executionTips, effortEstimate, rationale, sourceRefs`。

- `clientId`是本建议内唯一稳定临时标识，不是任务真实ID。
- `goal/acceptanceCriteria`遵循[真实目标和标准规范](goal-and-criteria.md)。
- `participants`为`{memberId,contribution}`，不重复负责人；人员只取输入有效目录。
- `dueDate`为有效`YYYY-MM-DD`或null；不输出开始日期或隐藏依赖关系。
- `effortEstimate`为`{minutes,workMethod,reason}`或null；初始人工估算有依据，不计算等待或重复已有工作。
- `rationale`说明独立贡献及为什么当前仍有缺口，不能用“任务很复杂”代替判断。
- `sourceRefs`非空，指向输入已存在来源。可以只引用真正支撑结论的材料，不要求把读过的每条讨论重复列出。

服务端除Schema外还须核对请求/父任务、临时ID唯一、成员有效及去重、引用存在、已有任务引用真实、日期有效、父期限冲突、真实层级配额、状态与缺口一致。`ready`不能带待答关键问题；`partial`必须说明读取缺口；`needs_clarification`必须有问题；`no_split_needed`不生成候选。结构修复只针对无效输出，最多一次；仍失败保存原始结果和原因，不能凭空补造候选。

## 示例：已有文案，只补一张商城图

输入关键事实：父任务`task-launch`为准备新品宣传资料，目标让访客理解350ml容量与可拆洗杯盖；父标准只要求介绍文案和一张商城图，父截止2026-10-23。直属子任务`task-copy`已完成文案。有效简报`brief-v2`保留同样信息，讨论`decision-d1`已确认不拍摄、不投放。Jage对应团队成员`m-design`，其正式视觉职责来源`work-design-v4`。当前日2026-10-16，所有相关读取完整。未提供商城尺寸只是可补规格。

```json
{
  "schemaVersion": "taskdoor.subtask-suggestions.v1",
  "requestId": "example-split",
  "parentTaskId": "task-launch",
  "status": "ready",
  "summary": "文案已有已完成子任务承接，仅建议补足一张商城主视觉，不重复生成文案或追加拍摄投放。",
  "suggestions": [
    {
      "clientId": "suggestion-visual",
      "title": "制作新品商城主视觉",
      "goal": "帮助商城访客清楚理解新品350ml容量与可拆洗杯盖特点，支持选购判断。",
      "acceptanceCriteria": ["交付一张用于商城展示的新品主视觉。", "350ml容量和可拆洗杯盖信息清楚可读，与已确认资料一致。", "不增加拍摄、投放或其他物料。"],
      "ownerMemberId": "m-design",
      "assignmentReason": "输入中已保存的视觉设计职责覆盖本次商城主视觉制作。",
      "participants": [],
      "dueDate": "2026-10-19",
      "executionTips": ["按有效简报制作，最终导出前补齐商城尺寸并核对裁切。"],
      "effortEstimate": {"minutes": 120, "workMethod": "基于已确认产品资料制作一张主视觉并核对", "reason": "示例假设资料可用且无额外版本：人工制作与核对约120分钟，不含等待。"},
      "rationale": "商城图是父标准中尚无已有子任务承接的独立交付，文案已有任务覆盖。",
      "sourceRefs": ["task-main-v3", "brief-v2", "decision-d1", "work-design-v4"]
    }
  ],
  "coveredByExisting": [{"taskId": "task-copy", "reason": "已完成的介绍文案子任务覆盖本次文案交付。"}],
  "contextGaps": [],
  "questions": [],
  "warnings": ["任务「制作新品商城主视觉」的2026-10-19为AI建议：假设产品资料可用、商城尺寸可在制作前补齐且有设计核对窗口；未核实人员实际空闲，可修改或清空。"]
}
```

以上ID、日期、分工和工作量仅为输入条件下的示例，不是运行时默认。候选只是建议；用户说“就这样”也不使本Skill调用写工具。
