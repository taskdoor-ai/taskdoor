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

当前 MCP 成员列表不包含职责；`role` 是权限角色，不能替代职责。可由调用方预留 `responsibilitiesByMemberId` 变量，把已确认职责按成员 ID 关联到列表，再组装 `members`。职责缺失用空数组并保留缺口；不能把待邀请、已停用、其他团队成员或按同名猜出的人员混入。列表读取失败时由调用方展示获取失败，不伪装为空团队或使用其他团队名单。

输出中的 `ownerMemberId` 与所有层级的 `participants[].memberId` 必须来自本次 `members[].id`。姓名和职责是输入上下文与显示信息，不取代关联 ID；前端通过 ID 查当前成员目录即可显示人员信息。用户确认后创建前，再核对这些 ID 仍属于当前团队的有效成员。

方案调整时传入 `previousPlan`，其内容是当前前端编辑版本，连同本轮 `userRequest` 描述要调整的部分。前端直接编辑无需每次重新调用模型。未传入旧方案时默认先生成主任务、`children: []`；只有本轮 `userRequest` 明确要求拆解或指定子任务时才生成子任务。调用方把「继续拆解子任务」的操作意图写入 `userRequest`，无需额外创建模式字段。调整时保留 `previousPlan` 中已有层级与人工编辑，不能凭模型记忆当作当前版本，也不恢复用户删除的分支。

## 字段

| 字段 | 含义与前端处理 |
| --- | --- |
| `schemaVersion` | 固定 `taskdoor.task-preview.v1`，调用方据此解析 |
| `requestId` | 原样回显输入请求 ID；不是幂等键或授权凭据 |
| `status` | `ready` 表示可供预览；`needs_clarification` 表示仍有关键缺口，都不代表已确认 |
| `summary` | 简短说明本次交付范围，不重复整棵任务树 |
| `tasks` | 根任务数组；共同目标可为一棵树，独立需求可以多根 |
| `questions` | 需要用户回答的关键业务问题；无问题为空数组 |
| `warnings` | 资料缺口、建议假设或分配限制；无内容为空数组 |

当前 Schema 规定的节点字段全部返回，未明确的可选值用 `null` 或空数组。预计投入是生成与保存数据，不因创建界面隐藏而省略。

| 节点字段 | 含义与约束 |
| --- | --- |
| `clientId` | 本方案内唯一、稳定的临时 ID；修改保留，新增使用新值。不是数据库任务 ID |
| `title` / `goal` | 任务名称 / 交付目标，非空 |
| `acceptanceCriteria` | 非空的逐条完成标准，父节点也需要 |
| `ownerMemberId` | 输入可选成员目录中的 ID，未知或明确暂不分配为 `null` |
| `assignmentReason` | 根据用户选择或已确认职责简要说明推荐依据；未分配时写具体缺口 |
| `participants` | 必要协作人的 `memberId` 和具体 `contribution`；不重复或包含负责人 |
| `dueDate` | `YYYY-MM-DD` 或 `null`；只保留截止日期，不返回开始日期 |
| `executionTips` | 执行建议数组，保持用户指定条目 |
| `effortEstimate` | 初始预计投入；依据足够时生成 `{minutes, workMethod, reason}`，整数人工分钟、方法及依据；未知或未提供投入的汇总父节点为 `null`，父级由有效叶子去重汇总；用户给定的父级投入保留为参考，不重复累计 |
| `children` | 默认 `[]`；用户明确要求拆解或指定子任务后才生成同结构子任务，调整时保留已有层级及用户删除结果 |

`ready` 时至少有一个任务，无待回答关键问题；若负责人未分配，仅当用户明确要求暂不分配时仍可为 `ready`。其他分配缺口用 `needs_clarification`。截止日期和工时未知本身不必阻止预览。完全无法确定交付物时可返回空任务数组和明确问题。

已验证能正确生成本结构的模型，调用方可把 Schema 作为 API 的 JSON Schema 输出约束；在运行副本中将 requestId 限定为本次输入，并将负责人及参与者 ID 限定为本次成员目录，保留负责人为 null 的分支。接口接受 Schema 请求不等于实际正确支持递归树和字符串数组；若实际返回损坏的数组内容，使用 JSON object 模式并在返回后执行完整本地校验，不能为适配接口降低验收要求。不要修改共享 Schema 或把本次人员写入安装包。单纯 JSON object 模式只要求 JSON 对象，不保证这些业务字段与结构。

JSON Schema 验证字段类型并拒绝未知字段；`dependsOnClientIds` 已删除，即使值为 `[]` 也不能输出。应用还要核对 `clientId` 唯一性、成员引用、有效日期、负责人唯一、参与者去重，以及子任务生成是否符合本轮用户意图。这些检查不授予写入权限。

文本数组还须包含实际文本：完成标准不能仅含标点或序列化任务；任务树不能在同一分支重复放入相同交付。不补回已删除的前置依赖字段。校验失败时保留原始响应和具体原因，最多请求一次完整修正；修正仍失败就返回失败，不替模型补造完成标准或把无效内容标为可用方案。

## 示例

### 默认先生成主任务

输入成员目录已提供下例人员和职责，`currentMemberId` 为 `member-lead`。用户原话：“帮我准备新品发布资料，需要一份介绍文案和一张海报，资料已经确认，我负责。”未要求拆解，多项交付仍放在主任务，预计投入照常生成。

```json
{
  "schemaVersion": "taskdoor.task-preview.v1",
  "requestId": "request-main-only",
  "status": "ready",
  "summary": "先整理新品发布资料主任务，不拆子任务。",
  "tasks": [
    {
      "clientId": "draft-main",
      "title": "准备新品发布资料",
      "goal": "交付可用于新品发布的介绍文案和海报",
      "acceptanceCriteria": [
        "介绍文案说明产品用途和已确认卖点",
        "海报展示已确认的产品卖点"
      ],
      "ownerMemberId": "member-lead",
      "assignmentReason": "用户明确由自己负责，当前成员 ID 为 member-lead",
      "participants": [
        {
          "memberId": "member-writer",
          "contribution": "制作介绍文案"
        },
        {
          "memberId": "member-designer",
          "contribution": "制作发布海报"
        }
      ],
      "dueDate": null,
      "executionTips": [],
      "effortEstimate": {
        "minutes": 240,
        "workMethod": "基于已确认资料完成文案和海报，分别核对后交付",
        "reason": "AI 初始估算，内部合计文案及海报的制作、核对和修改；内部明细不作为子任务创建"
      },
      "children": []
    }
  ],
  "questions": [],
  "warnings": []
}
```

### 用户明确要求拆解

以下示例假设输入成员目录已提供 `member-lead`、`member-writer`、`member-designer` 及对应统筹、文案、视觉职责；仅为解释结构，不可作为默认成员。用户原话：“准备新品发布资料，需要一份讲清用途和卖点的文案、一张海报，海报交源文件和导出图，资料已经确认。请拆成子任务，按职责分工。”

```json
{
  "schemaVersion": "taskdoor.task-preview.v1",
  "requestId": "request-example",
  "status": "ready",
  "summary": "准备新品发布资料，文案和海报可以并行。",
  "tasks": [
    {
      "clientId": "draft-root",
      "title": "准备新品发布资料",
      "goal": "交付可用于新品发布的文案和海报资料包",
      "acceptanceCriteria": [
        "介绍文案包含用途和已确认的核心卖点",
        "海报源文件与导出图齐全"
      ],
      "ownerMemberId": "member-lead",
      "assignmentReason": "输入职责中承担整体交付统筹",
      "participants": [],
      "dueDate": null,
      "executionTips": [],
      "effortEstimate": null,
      "children": [
        {
          "clientId": "draft-copy",
          "title": "编写新品介绍文案",
          "goal": "交付帮助读者理解产品用途和特点的介绍文案",
          "acceptanceCriteria": [
            "包含产品用途",
            "说明已确认的核心卖点"
          ],
          "ownerMemberId": "member-writer",
          "assignmentReason": "输入职责覆盖文案制作",
          "participants": [],
          "dueDate": null,
          "executionTips": [],
          "effortEstimate": {
            "minutes": 90,
            "workMethod": "基于已确认资料整理用途与卖点文案",
            "reason": "AI 初始估算，含起草、核对与修改；假设资料齐全"
          },
          "children": []
        },
        {
          "clientId": "draft-poster",
          "title": "制作新品发布海报",
          "goal": "交付可用于新品发布的视觉资料",
          "acceptanceCriteria": [
            "使用已确认的卖点文案",
            "交付可编辑源文件和导出图"
          ],
          "ownerMemberId": "member-designer",
          "assignmentReason": "输入职责覆盖视觉设计",
          "participants": [],
          "dueDate": null,
          "executionTips": [],
          "effortEstimate": {
            "minutes": 180,
            "workMethod": "基于已确认文案制作海报并导出",
            "reason": "AI 初始估算，含排版、核对、修改及源文件整理"
          },
          "children": []
        }
      ]
    }
  ],
  "questions": [],
  "warnings": []
}
```

### 成员变量注入示例

以下是调用方组装好的输入，不是用户需要填写的表单。示例 ID 只用于说明与上方方案的关联；实际每次调用都替换为当前团队接口取得的成员 ID，不把示例人员作为默认配置。

```json
{
  "requestId": "request-example",
  "userRequest": "准备新品发布资料，需要一份讲清用途和卖点的文案、一张海报，海报交源文件和导出图，资料已经确认。请拆成子任务，按职责分工。",
  "currentDate": "2026-10-09",
  "timezone": "Asia/Shanghai",
  "currentMemberId": "member-lead",
  "members": [
    {"id": "member-lead", "name": "统筹成员", "responsibilities": ["统筹交付范围与分工"]},
    {"id": "member-writer", "name": "内容成员", "responsibilities": ["产品介绍文案制作"]},
    {"id": "member-designer", "name": "视觉成员", "responsibilities": ["海报设计与视觉交付"]}
  ]
}
```

## 确认后的应用衔接

前端将模型方案作为草稿展示，用户可以修改当前可见字段、人员、顺序和层级，也可以删除任务。预计投入在创建审阅和详情概览隐藏，但保留生成值；用户不必为了获得估算先拆解子任务。应用保存编辑版本，并在用户点击确认时取得这个最终版本；不能重跑模型并用新答案覆盖用户编辑。

执行服务重新校验权限、当前成员和字段，使用临时 ID 映射真实 ID，按父子关系创建，再保存标准和必要参与者。例如 `acceptanceCriteria` 映射到标准写入，`participants` 映射到任务成员，`effortEstimate` 随最终方案保存为初始估算并记录来源，AI 生成值不得标为人工确认。任务关系只保存父子归属，不映射或提交前置依赖。不能将嵌套 `children` 整体作为单任务创建入参。

有效初始估算供「分析」Tab 使用；创建基线与后续 AI 分析快照分开保留。后续补估、重估、完成度与预测更新由 AI 分析 Skill 负责。

应用持有方案版本和确认状态；模型输出不携带 `confirmed`、写入授权、令牌、真实任务 ID 或成功回执。执行错误与部分成功由服务记录，预览 Skill 不修复真实任务、不盲目重试创建。只读资料不足时仍可输出已有方案与缺口。
