# MCP 任务分析与完成标准

正式模式先按 [正式 MCP 契约](../../shared/production-mcp-contract.md) 读取真实上下文，实时 `tools/list` 优先于本文。未连接工具时只能准备分析，不声称已回写。

## 输入字段与读取顺序

1. 定位 `workspaceId`、`taskId`，调用 `get_task`。任务字段使用 `id, workspaceId, parentTaskId, title, goal, status, ownerMemberId, dueDate, version, effectiveCapabilities, createdAt, updatedAt`，可选 `executionTips, effortEstimate`。缺失字段保持未知，不用本地 Mock 补齐。
2. 完成标准读取 `criteria:{taskId,version,items}`，逐条用真实 `id,text` 绑定分析；人工确认如有返回，原样保留 `confirmation:{memberId,confirmedAt}`。`criteria.version` 与任务顶层版本独立。不能根据状态、讨论中的“完成了”或模型的 100% 生成确认事实。
3. 根据本次分析需要读取 `list_task_comments`、`list_task_activities`、`list_task_files` 与 `get_file_text`；文件列表元数据不能替代正文。证据绑定实际 ID、版本与正文位置。工具参数只能来自实时定义，不猜分页参数。直属子任务用 `list_tasks({workspaceId,parentTaskId:taskId,...})`，按需继续读取下一层；未完成分页不能声称覆盖全部子任务。
4. `dependencies` 是前置依赖，不是子任务归属；未完成依赖不自动证明当前任务停工。成员 ID 使用空间成员记录 ID；未知行动处理人为 `null`。
5. `unavailable:true`、权限不足或读取失败不是空集合。按类型记录覆盖缺口，继续分析已读部分，无法核对的标准为 `unknown`。

## 输出供 AI 分析区使用

保留 `currentSituation`、`nextActions`、`progress`，补充 `criteriaVersion` 和 `criterionAssessments`。字段形状见 [输出契约](output-contract.md)。

- 每条标准独立评估，只用该条相关证据；返回标准 ID、原文、标准版本、百分比、依据、已达成内容、剩余缺口和待核对项。即使缺少 EWD 权重，仍可核对单条标准；不得将各标准的百分比平均作为整体工作量。
- 整体 EWD `completionPercent` 保留原始精度，用于工作量核算和燃起图；另返回 `displayPercent` 供前端四段条展示，不用它倒算已完成量。
- 逐条 `percent` 和整体 `displayPercent` 只能为 `0 / 25 / 50 / 75 / 100 / null`。有效原始比例按最近的 25 档四舍五入，正数至少 25、未达 100 至多 75；只有该项范围全部得到有效证据支持才为 100。未知为 null；0 必须有当前证据支持尚未形成结果。例：71.2 → 75，99 → 75，100 → 100。
- 没有有效 EWD 明细、只有任务总估算时，不能凭总分钟生成完成量；整体数值与 `displayPercent` 保持 null。单条标准可独立返回有证据的分析。
- 历史点、预测完工日期与延期天数仅使用真实记录及有效执行依据。`dueDate` 是比较目标，不是预测日；`createdAt` 不是计划开始日。没有历史不补曲线，没有恢复依据不猜解除阻塞日。
- 人工确认独立保存，AI 达到 100% 仍显示 AI 来源；分析不能自动修改任务状态或确认。已有确认不能被迟到的旧分析覆盖。

## 执行边界

当前已核验工具清单未提供 AI 分析、逐条 AI 评估或进度回写工具。上述输出是分析结果，不是 `update_task` 或 `set_task_criteria` 的参数；不借更新标准保存分析，不用评论假装结构化进度保存成功。用户明确要求发送分析时，才可按实际评论工具提交文字并核对回执。新增工具后以实时工具定义实现读写映射，不自造名称。

`set_task_criteria` 仅用于已授权的标准内容修改，使用 `criteria.version` 完整替换并保留已有标准 ID；分析本身不改标准。结果应用前核对当前权限、任务版本、标准版本及证据版本，过期结果标 stale。

## 统一输入与复杂证据

按 [证据场景与统一输入](evidence-scenarios.md) 整理读取结果。保留实际标准ID、独立版本、回复关系、文件替代关系和失败读取状态；本地与正式分析使用相同业务字段，不把本地结构直接发给工具。包络 inputVersions 完整回显，证据引用可以只取相关子集。
