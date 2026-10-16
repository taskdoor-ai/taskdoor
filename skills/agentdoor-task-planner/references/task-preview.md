# 前端任务预览数据结构

生产输出版本：`taskdoor.task-preview.v1`。这是用户可编辑的方案数据，不是 MCP 入参，也不是任务创建回执。完整结构以 [JSON Schema](task-preview.schema.json) 为准。

## 调用输入

调用方提供 `requestId`、`userRequest`、`currentDate`、`timezone` 、`currentMemberId` 和有效 `members`。成员项包括当前工作区成员 `id`、名称与已确认职责；调用方负责身份、权限及有效性核对。`currentMemberId` 用于解析“我负责”等指代；未提供当前人员身份时不能凭首位成员推断。没有资料的成员不得作为可分配人选。可附相关业务资料，避免携带整个历史工作区。

`members` 是预留给调用方注入的当前团队人员变量，不是安装包内固定名单。发起生成前，应用服务通过当前团队成员接口读取有效成员；使用 MCP 时调用 `list_workspace_members({workspaceId, status: "ACTIVE"})`，按 `page.hasMore` 和 `page.nextCursor` 完整读取分页。一次生成或同一批评测复用同一份成员快照，不让模型逐任务重新查询。

| 注入字段 | 数据来源 |
| --- | --- |
| `members[].id` | 成员列表每项的 `id`，即该工作区的成员 ID；不能换成 `user.id` 或显示名称 |
| `members[].name` | 成员列表的 `user.displayName`，供模型识别人名和前端显示 |
| `members[].responsibilities` | 当前团队成员职责接口的数据，或调用方已确认的职责变量；按成员 ID 合并为字符串数组 |
| `currentMemberId` | 已登录用户在当前工作区对应的成员项 `id`，供解析“我负责” |
| `locale` | 界面语言 `zh-CN` 或 `en`；说明类文字用这种语言书写（见 SKILL.md「输出语言」） |

当前 MCP 成员列表不包含职责；`role` 是权限角色，不能替代职责。可由调用方预留 `responsibilitiesByMemberId` 变量，把已确认职责按成员 ID 关联到列表，再组装 `members`。职责缺失用空数组并保留缺口；不能把待邀请、已停用、其他团队成员或按同名猜出的人员混入。列表读取失败时由调用方展示获取失败，不伪装为空团队或使用其他团队名单。

输出中的 `ownerMemberId` 与所有层级的 `participants[].memberId` 必须来自本次 `members[].id`。姓名和职责是输入上下文与显示信息，不取代关联 ID；前端通过 ID 查当前成员目录即可显示人员信息。用户确认后创建前，再核对这些 ID 仍属于当前团队的有效成员。

已有任务比对使用 `existingTasks`（至多 200 条）；`decisions` 保留用户已确认的重复或父任务选择，不重复询问。`validationFeedback` 只用于服务端拒绝后的完整修正，不扩大权限或交付范围。

方案调整时传入 `previousPlan`，其内容是当前前端编辑版本，连同本轮 `userRequest` 描述要调整的部分。前端直接编辑无需每次重新调用模型。未传入旧方案时按新方案生成；不能凭模型记忆当作当前版本。

输出先由服务端按前端的读法整理：文本去首尾空白，空的完成标准、执行建议和警告去掉，负责人不重复列为参与人，参与人去重，当前任务按不重叠工作生成初始投入，缺方法或依据的工时视为未知。整理后仍不合规（如空标题、空目标、全空的完成标准、缺协作说明的参与人）时，服务端带 `validationFeedback` 让模型重新输出一次，仍不合规则返回失败；前端不会收到它无法显示的 `ready` 方案。

## 字段

| 字段 | 含义与前端处理 |
| --- | --- |
| `schemaVersion` | 固定 `taskdoor.task-preview.v1`，调用方据此解析 |
| `requestId` | 原样回显输入请求 ID；不是幂等键或授权凭据 |
| `status` | `ready` 表示可供预览；`needs_clarification` 表示仍有关键缺口，都不代表已确认 |
| `summary` | 简短说明本次交付范围，不重复全部标准；有拆解意图时说明保存后独立进行 |
| `tasks` | 当前新任务数组，最多一项；无法确定多个无关请求中的当前对象时补问 |
| `duplicates` | 疑似与已有任务重复：`{taskId, relationship, reason}`，`taskId` 只能取自输入 `existingTasks`；`relationship` 为 `same_outcome`、`overlap` 或 `possible`；至多 5 个，补问时为空。服务端返回给页面时补上目录中的 `title` |
| `parentCandidates` | 可以挂接的已有父任务：`{taskId, reason}`，只能取自 `existingTasks` 中 `canCreateChild` 为 `true` 的任务；至多 3 个；用户已选父任务或独立创建、或仍在补问时为空。服务端补上 `title` |
| `questions` | 需要用户回答的关键业务问题，最多 3 个，每项是一道选择题（见下表）；无问题为空数组 |
| `warnings` | 资料缺口、建议假设或分配限制；AI 建议日期须说明对应任务、日期及关键假设；无内容为空数组 |

补问项字段（全部必填）：

| 补问字段 | 含义与约束 |
| --- | --- |
| `question` | 问题文本，问业务信息，不问接口参数 |
| `choices` | 2–4 个互不相同的选项文本，贴合用户原话与团队成员职责，可直接作为回答；不写“其他”“不确定”等空泛项 |
| `recommended` | 必须逐字等于 `choices` 中的一项，是模型认为最可能的回答 |
| `allowCustom` | 恒为 `true`：前端始终提供自定义回答 |
| `placeholder` | 自定义框里的提示文字：一句贴合这道题的填写示例，例如「说明希望改变的结果，例如让目标客户了解新品功能」；非空，至多 200 字 |

例如 `{"question": "活动在哪一天上线？", "choices": ["本周五", "下周一", "下周五"], "recommended": "本周五", "allowCustom": true, "placeholder": "写明具体日期，例如 10 月 24 日上线"}`。服务端校验选项数量、去重和推荐项归属，不合规的方案整体返回失败。

节点字段全部返回，未明确的可选值用 `null` 或空数组，便于前端直接绑定表单。

| 节点字段 | 含义与约束 |
| --- | --- |
| `clientId` | 本方案内唯一、稳定的临时 ID；修改保留，新增使用新值。不是数据库任务 ID |
| `title` / `goal` | 标题识别工作；目标说明真实用途、问题或期望状态，不能只是交付物换称，二者均非空；详见[目标与标准规范](goal-and-criteria.md) |
| `acceptanceCriteria` | 非空的逐条完成标准，覆盖当前任务承诺的各项交付及范围 |
| `ownerMemberId` | 输入可选成员目录中的 ID，未知或明确暂不分配为 `null` |
| `assignmentReason` | 根据用户选择或已确认职责简要说明推荐依据；未分配时写具体缺口 |
| `participants` | 必要协作人的 `memberId` 和具体 `contribution`；不重复或包含负责人 |
| `dueDate` | `YYYY-MM-DD` 或 `null`；保留用户日期，适合排期时可给 AI 建议并通过 warnings 说明来源；持续、不需要或无法合理排期时留空，不返回开始日期 |
| `executionTips` | 执行建议数组，保持用户指定条目 |
| `effortEstimate` | `null` 或 `{minutes, workMethod, reason}`；生成初始人工投入。创建审阅和详情概览隐藏但随方案保存，作为 AI 估算及创建基线；未知不补零，确认创建不等于人工确认估算 |
| `children` | 为兼容既有字段保留，但本版本恒为空数组；已保存任务的拆解使用独立协议 |

`ready` 时至少有一个任务，无待回答关键问题。没有合适负责人时 `ownerMemberId` 为 `null`，写明缺口但仍可 `ready`；用户可在预览中选择或邀请成员，也可保持未分配后确认创建。截止日期和工时未知本身不阻止预览。完全无法确定交付物时可返回空任务数组和明确问题。

指标、实验假设、取证方式与日期建议使用现有文字字段，不新增 O／KR、置信度、时间来源或排期对象。日期来源是候选说明，不是已保存元数据；是否展示及保存由应用接入核验。首次建议、用户明确无截止及再次优化的规则见[截止日期建议](task-scheduling.md)。下方历史结构示例中的 null 仍是有效值；方法例子不能取代运行时输入与日期判断。

当前只生成一个新任务，`children:[]`。作为已有任务的子任务时，仍是创建当前一个新任务，不等于批量拆解。应用在确认时按完整父链和实际团队配额核验绝对层级，默认10层、绝对上限20层；不把未知配额当已验证通过。

已验证能正确生成本结构的模型，调用方可把 Schema 作为 API 的 JSON Schema 输出约束；在运行副本中将 requestId 限定为本次输入，并将负责人及参与者 ID 限定为本次成员目录，保留负责人为 null 的分支。接口接受 Schema 请求不等于实际正确支持当前对象和字符串数组；若实际返回损坏的数组内容，使用 JSON object 模式并在返回后执行完整本地校验，不能为适配接口降低验收要求。不要修改共享 Schema 或把本次人员写入安装包。单纯 JSON object 模式只要求 JSON 对象，不保证这些业务字段与结构。

当前协议移除 `dependsOnClientIds`，包括空数组在内都不接受；`additionalProperties:false` 会拒绝旧字段。旧方案调整时移除该字段，不以其他字段恢复前置关系；业务材料和顺序保留为正文。

JSON Schema 验证字段类型；应用还要核对 `clientId` 唯一性、成员引用、有效日期、负责人唯一、参与者去重、单任务与空 children，以及已有父任务归属的实际层级。这些检查不授予写入权限。

文本数组还须包含实际文本：完成标准不能仅含标点或序列化任务；不在当前任务之外重复生成相同交付。校验失败时保留原始响应和具体原因，带 `validationFeedback` 最多请求一次完整修正；修正仍失败就返回失败，不替模型补造完成标准或把无效内容标为可用方案。用户主动重试是新的请求。

## 示例

以下示例假设输入成员目录已提供 `member-lead`、`member-writer`、`member-designer` 及对应统筹、文案、视觉职责；仅为解释结构，不可作为默认成员。用户原话：“准备新品发布资料，需要一份讲清用途和卖点的文案、一张海报，海报交源文件和导出图，资料已经确认。先不设截止，按职责分工。”

```json
{
  "schemaVersion": "taskdoor.task-preview.v1",
  "requestId": "request-example",
  "status": "ready",
  "summary": "整理新品发布资料，先审阅主任务。",
  "tasks": [
    {
      "clientId": "draft-root",
      "title": "准备新品发布资料",
      "goal": "让新品发布的受众清楚理解产品用途与已确认卖点",
      "acceptanceCriteria": [
        "介绍文案包含用途和已确认的核心卖点",
        "海报源文件与导出图齐全"
      ],
      "ownerMemberId": "member-lead",
      "assignmentReason": "输入职责中承担整体交付统筹",
      "participants": [
        {
          "memberId": "member-writer",
          "contribution": "整理与核对介绍文案"
        },
        {
          "memberId": "member-designer",
          "contribution": "制作并核验海报源文件与导出图"
        }
      ],
      "dueDate": null,
      "executionTips": [],
      "effortEstimate": {
        "minutes": 240,
        "workMethod": "使用已确认资料与常用制作工具，人工整理文案、制作海报并核验",
        "reason": "示例估算假设：资料齐全，文案制作与核对120分钟、海报制作与核验120分钟；不含等待。"
      },
      "children": []
    }
  ],
  "questions": [],
  "warnings": [],
  "duplicates": [],
  "parentCandidates": []
}
```

### 保存后的独立拆解

创建方案中不生成子任务。用户要求后续拆解时先审阅并保存当前任务，再在已保存任务上使用独立 `taskdoor-decompose-task`，读取其目标、标准、讨论、有效文件、已有子任务和正式职责，只建议下一层；它的输出协议与本创建协议分开，不嵌进本次 `tasks`。

### 成员变量注入示例

以下是调用方组装好的输入，不是用户需要填写的表单。示例 ID 只用于说明与上方方案的关联；实际每次调用都替换为当前团队接口取得的成员 ID，不把示例人员作为默认配置。

```json
{
  "requestId": "request-example",
  "userRequest": "准备新品发布资料，需要一份讲清用途和卖点的文案、一张海报，海报交源文件和导出图，资料已经确认。先不设截止，按职责分工。",
  "currentDate": "2026-10-09",
  "timezone": "Asia/Shanghai",
  "currentMemberId": "member-lead",
  "locale": "zh-CN",
  "members": [
    {
      "id": "member-lead",
      "name": "统筹成员",
      "responsibilities": [
        "统筹交付范围与分工"
      ]
    },
    {
      "id": "member-writer",
      "name": "内容成员",
      "responsibilities": [
        "产品介绍文案制作"
      ]
    },
    {
      "id": "member-designer",
      "name": "视觉成员",
      "responsibilities": [
        "海报设计与视觉交付"
      ]
    }
  ],
  "existingTasks": []
}
```

## 确认后的应用衔接

前端将模型方案作为草稿展示，用户可以修改当前任务字段、人员及已有父任务归属，也可以删除当前草稿。应用保存编辑版本，并在用户点击确认时取得这个最终版本；不能重跑模型并用新答案覆盖用户编辑。

执行服务重新校验权限、当前成员、层级和字段，使用临时 ID 映射真实 ID，创建当前任务及用户确认的已有父任务归属，再保存标准、必要参与者、有效初始估算及其来源和创建基线。例如 `acceptanceCriteria` 映射到标准写入，`participants` 映射到任务成员；不映射或提交已取消的前置依赖字段。本版本不生成嵌套子树；当前任务及其字段须原子提交。

应用持有方案版本和确认状态；模型输出不携带 `confirmed`、写入授权、令牌、真实任务 ID 或成功回执。隐藏预计投入不删除有效估算；创建成功保存为 AI 估算，人工确认仍为 false，不要求用户额外确认隐藏字段。创建后的补估、必要重估、完成度和燃起预测更新由应用调用 AI 分析 Skill 处理，创建基线和历史观察不回填。

创建失败保留当前方案，不留下部分任务；提交结果未知时由服务查询同一次操作的结果，再决定是否重试。预览 Skill 不修复真实任务。只读资料不足时仍可输出已有方案与缺口。
