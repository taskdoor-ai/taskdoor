# 任务状态分析：输出契约

使用共享包络，`schemaVersion=agentdoor.task-status-analysis.v0.1`。以下字段均属于 `result`；实际 ID、状态和版本必须回显本次输入。

| 字段 | 类型与规则 |
| --- | --- |
| taskId / taskVersion / formalStatus | 当前分析任务 ID、输入版本和正式状态，不能由分析改写 |
| currentSituation.summary | 一句当前情况 |
| currentSituation.confirmedResults / unmetResults / pendingChecks / recentChanges | 数组，每项为 `{text, evidenceRefs}`；分别表示已核对、未满足、待核对与近期变化 |
| currentSituation.evidenceRefs | 支撑摘要的来源 ID 数组 |
| nextActions | 数组，每项含 action、actorId、diagnosisType、reason、evidenceRefs；无有据行动时为空 |
| nextActions[].actorId | 有依据的成员 ID，否则 null |
| nextActions[].diagnosisType | `execution_blockage`、`decision_conflict`，或无诊断关联时 null |
| progress.state | `current`、`unknown`、`stale`；当前部分可计算仍可为 current，缺口单独说明 |
| progress.ewdResultRef / inputVersions | 输入中已有 EWD 结果的引用及其版本；本次直接计算没有已存引用时为 null，reason 说明来源 |
| progress.totalEwdMinutes / completedEwdMinutes / completionPercent | 直接取当前有效 EWD 的数值；不可计算为 null，不自行补值 |
| progress.knownCompletedEwdMinutes / unconfirmedEwdMinutes | 可选的部分完成量与待确认量，来自同一个 EWD 结果 |
| progress.trend / reason | 有真实历史时取 EWD trend 对象，否则 null；说明计算来源、缺口或过期原因 |
| progress.displayPercent | 0、25、50、75、100 或 null；仅 current 且有有效原始 completionPercent 时按 MCP 分档规则生成，原始数值与燃起图不变 |
| criteriaVersion | 本次读取的 criteria.version；未提供独立标准版本时为 null，不猜版本 |
| criterionAssessments | 当前可读标准的数组；每条为下述结构，缺少标准列表时 [] 并说明覆盖未知 |
| formalStatusUnchanged | 固定 true；包络 writeReceipt 固定 null |

任一必要部分不可用，包络 status=partial。旧结果可另作历史说明，不得填入当前 progress 数值。confirmedResults 指内容已核对，不等于正式验收通过。

## result 示例

输入条件：任务 v4 正式状态进行中；当前文件缺少风险预案；当前估算未提供，旧版进度不能复用。

```json
{
  "taskId": "task-plan",
  "taskVersion": 4,
  "formalStatus": "进行中",
  "currentSituation": {
    "summary": "方案已提交主体内容，风险预案仍需补齐。",
    "confirmedResults": [{"text": "当前方案包含主体流程与分工。", "evidenceRefs": ["file-plan"]}],
    "unmetResults": [{"text": "当前标准要求的风险预案尚未提供。", "evidenceRefs": ["task-plan", "file-plan"]}],
    "pendingChecks": [],
    "recentChanges": [],
    "evidenceRefs": ["task-plan", "file-plan"]
  },
  "nextActions": [{"action": "补齐风险预案并核对当前完成标准。", "actorId": null, "diagnosisType": null, "reason": "当前文件尚未覆盖全部标准。", "evidenceRefs": ["task-plan", "file-plan"]}],
  "criteriaVersion": null,
  "criterionAssessments": [],
  "progress": {"displayPercent": null, "state": "unknown", "ewdResultRef": null, "inputVersions": {"task": 4}, "totalEwdMinutes": null, "completedEwdMinutes": null, "completionPercent": null, "trend": null, "reason": "未提供当前有效估算与明细核对，不能沿用旧版百分比。"},
  "formalStatusUnchanged": true
}
```

## 逐条完成标准评估

每项为 `{criterionId, text, criteriaVersion, state, percent, completedContent, remainingContent, pendingChecks, reason, evidenceRefs}`。

- `criterionId` 使用本次 `criteria.items[].id`，只有文本的离线输入用 null，不造 ID；`text` 回显当前原文。
- `criteriaVersion` 与 result.criteriaVersion 一致；`state` 为 current / unknown / stale。
- `percent` 为 0 / 25 / 50 / 75 / 100 或 null，分档规则见 [MCP 分析](mcp-analysis.md)；unknown/stale 为 null。
- `completedContent / remainingContent / pendingChecks` 为字符串数组；`reason` 为具体判断依据；`evidenceRefs` 仅引用当前读过且有权使用的来源。无证据时不能输出数字。
- 人工确认是读取到的独立事实，不纳入 AI 写回，也不因模型百分比变化自动撤销。整体和逐条结果绑定相同输入快照，但各自可以未知。

旧 v0.1 离线结果缺少新增字段时仍可阅读；新分析必须返回上述字段，不重写历史结果。

## 正式项目燃起图、预计与确认日期

新增 `progress.comparison`，形状与缺失规则见[正式项目燃起图接入契约](production-progress-contract.md)。它包含 workload、aiAssessment、expected、forecastTrend 和 timing；未知为 null，不用 progress.predictedCompletionAt 这种未对接的临时字段代替。差值由正式程序计算，不能由模型捏造。旧结果缺少 comparison 时继续可读，不补造预测或历史。当前正式组件真实来源接入限制也在该契约中记录，不能宣称直接写入或无改动可用。
