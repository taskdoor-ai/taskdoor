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
  "progress": {"state": "unknown", "ewdResultRef": null, "inputVersions": {"task": 4}, "totalEwdMinutes": null, "completedEwdMinutes": null, "completionPercent": null, "trend": null, "reason": "未提供当前有效估算与明细核对，不能沿用旧版百分比。"},
  "formalStatusUnchanged": true
}
```
