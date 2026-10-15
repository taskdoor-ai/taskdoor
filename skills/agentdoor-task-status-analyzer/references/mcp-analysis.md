# MCP 任务分析与完成标准

正式模式先按 [正式 MCP 契约](../../shared/production-mcp-contract.md) 读取真实上下文，实时 `tools/list` 优先于本文。未连接工具时只能准备分析，不声称已回写。

## 输入字段与读取顺序

1. 定位 `workspaceId`、`taskId`，调用 `get_task`。任务字段使用 `id, workspaceId, parentTaskId, title, goal, status, ownerMemberId, dueDate, version, effectiveCapabilities, createdAt, updatedAt, aiProgressSegment`，可选 `executionTips, effortEstimate`。正式状态只有 `IN_PROGRESS / DONE / ON_HOLD / CANCELLED / ARCHIVED`，不提交已移除的 `NOT_STARTED`。`aiProgressSegment` 仅为已接受分析的 1–4 阶段或 null，不能代替原始进度、当前证据或标准评估；null 不等于 0%。缺失字段保持未知，不用本地 Mock 补齐。
2. 完成标准读取 `criteria:{taskId,version,items}`，逐条用真实 `id,text` 绑定分析；人工确认如有返回，原样保留 `confirmation:{memberId,confirmedAt}`。`criteria.version` 与任务顶层版本独立。不能根据状态、讨论中的“完成了”或模型的 100% 生成确认事实。
3. 根据本次分析需要读取 `list_task_comments`、`list_task_activities`、`list_task_files` 与 `get_file_text`；文件列表元数据不能替代正文。证据绑定实际 ID、版本与正文位置。工具参数只能来自实时定义，不猜分页参数。直属子任务用 `list_tasks({workspaceId,parentTaskId:taskId,view:"flat",...})`；需要整个后代范围时用 `view:"all"`（不含父任务本身），未完成分页不能声称覆盖全部子任务。`commentCount` 仅详情有，未返回保持未知；普通 Task 不再返回 `fileCount`，不能据缺失计数断言无文件。
4. 子任务归属只使用 `parentTaskId`，不读取、输出或维护已取消的前置依赖字段与关系边，也不保留空兼容字段。用户明确的所需材料、确认与交接顺序从业务正文核对；材料未到不自动证明实际停工。成员 ID 使用空间成员记录 ID；未知行动处理人为 `null`。
5. `unavailable:true`、权限不足或读取失败不是空集合。按类型记录覆盖缺口，继续分析已读部分，无法核对的标准为 `unknown`。

## 输出供 AI 分析区使用

保留 `currentSituation`、`nextActions`、`progress`，补充 `criteriaVersion` 和 `criterionAssessments`。字段形状见 [输出契约](output-contract.md)。

- 每条标准独立评估，只用该条相关证据；返回标准 ID、原文、标准版本、百分比、依据、已达成内容、剩余缺口和待核对项。即使缺少 EWD 权重，仍可核对单条标准；不得将各标准的百分比平均作为整体工作量。
- 整体 EWD `completionPercent` 保留原始精度，用于工作量核算和燃起图；另返回 `displayPercent` 供前端四段条展示，不用它倒算已完成量。
- 逐条 `percent` 和整体 `displayPercent` 只能为 `0 / 25 / 50 / 75 / 100 / null`。有效原始比例按最近的 25 档四舍五入，正数至少 25、未达 100 至多 75；只有该项范围全部得到有效证据支持才为 100。未知为 null；0 必须有当前证据支持尚未形成结果。例：71.2 → 75，99 → 75，100 → 100。
- 没有有效 EWD 明细或只有任务总估算时，先按当前目标、标准和已知工作条件补齐内部明细，必要时重估，使用 `progress.estimate` 返回完整 EWD 估算提案；不能只凭总分钟生成完成量。范围或内容证据仍不足时，相关整体数值与 `displayPercent` 保持 null，单条标准仍可独立返回有证据的分析。
- 历史点、预测完工日期与延期天数仅使用真实记录及有效执行依据。`dueDate` 是比较目标，不是预测日；`createdAt` 不是计划开始日。没有历史不补曲线，没有恢复依据不猜解除阻塞日。
- 人工确认独立保存，AI 达到 100% 仍显示 AI 来源；分析不能自动修改任务状态或确认。已有确认不能被迟到的旧分析覆盖。

## 执行边界

当前已核验工具清单未提供 AI 分析、逐条 AI 评估或进度回写工具。上述输出包括估算提案，仍是分析结果，不是 `update_task` 或 `set_task_criteria` 的参数；不借更新标准保存分析，不用评论假装结构化进度保存成功。应用接入时负责保存 AI 估算新版本，不能将它标为人工确认或覆盖人工已确认估算、创建基线和历史。用户明确要求发送分析时，才可按实际评论工具提交文字并核对回执。新增工具后以实时工具定义实现读写映射，不自造名称。

正式产品已有 `taskdoor-analyze-progress` / `taskdoor-refresh-progress` 与任务业务服务的保存链路，使用生产 `taskdoor.task-analysis.v1` 及三份 `taskdoor-analysis-*.schema.json`；本地 `agentdoor.task-status-analysis.v0.1` 包络、`progress.estimate` 与 comparison 不能直接提交给该链路。接入层须按现有生产 Schema 映射，正文保持普通文本、证据引用独立保留，并核对任务、标准和来源版本；未完成映射或未取得保存回执时仍只返回提案。

`set_criterion_confirmation` 是用户确认操作，不是分析保存方式。确认最后一条标准可能自动完成进行中或阻塞中的任务，撤回可能恢复该次自动完成前状态；须按共享契约核对实际回执及回读，不能为了让 AI 进度为 100% 而调用它。MCP 尚无独立“撤销任务完成”工具，评论也不支持结构化 @ 或自动加人。

`set_task_criteria` 仅用于已授权的标准内容修改，使用 `criteria.version` 完整替换并保留已有标准 ID；分析本身不改标准。结果应用前核对当前权限、任务版本、标准版本及证据版本，过期结果标 stale。

保存成功事件与用户主动重新分析均由应用调用同一 Skill；连续变化合并后提交受影响任务与必要祖先的最新输入。Skill 不实现调度，迟到的旧结果不得覆盖更新输入对应的结果。

## 统一输入与复杂证据

按 [证据场景与统一输入](evidence-scenarios.md) 整理读取结果。保留实际标准ID、独立版本、回复关系、文件替代关系和失败读取状态；本地与正式分析使用相同业务字段，不把本地结构直接发给工具。包络 inputVersions 完整回显，证据引用可以只取相关子集。
