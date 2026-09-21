# 任务诊断：输出契约

使用共享包络，`schemaVersion=agentdoor.task-diagnosis.v0.1`。输出 `result` 字段如下。

| 字段 | 类型与规则 |
| --- | --- |
| taskId / taskVersion | 当前任务及输入版本 |
| diagnoses | 已证实诊断数组；不能确定的事项不放入此数组 |
| diagnoses[].type | 只能为 `execution_blockage` 或 `decision_conflict` |
| summary / affectedTaskIds / affectedOutcome | 问题摘要、去重后的可见受影响任务 ID、受影响的具体交付 |
| sides | 至少两项 `{claim, evidenceRefs}`；冲突列两侧具体内容，阻塞列所需结果与未满足且无法继续的事实 |
| currentImpact / action | 当前实际影响及可执行建议 |
| suggestedActorId | 有依据的处理人 ID，否则 null |
| evidenceRefs | 诊断用到的来源 ID 数组 |
| checks | 数组，每项含 subject、conclusion、reason、evidenceRefs；conclusion 为 confirmed、not_established 或 unknown |
| unknowns | 数组，每项含 missing、neededToDecide，说明缺少什么、影响哪个判断 |
| formalStatusUnchanged | 固定 true；包络 writeReceipt=null |

完整读取且未发现两类问题可返回 diagnoses=[] 和有效检查说明；部分读取时包络为 partial，不把空数组解释为全部正常。所有引用来自当前输入，不能只在总 evidenceRefs 中笼统列文件而省略双方依据。

## result 示例

输入条件：task-plan 的当前标准要求预算不超过 10 万；同一活动的当前方案 file-budget 为 12 万。

```json
{
  "taskId": "task-plan",
  "taskVersion": 4,
  "diagnoses": [{
    "type": "decision_conflict",
    "summary": "方案预算与当前任务上限不一致。",
    "affectedTaskIds": ["task-plan"],
    "affectedOutcome": "活动方案预算",
    "sides": [
      {"claim": "当前完成标准要求预算不超过 10 万元。", "evidenceRefs": ["task-plan"]},
      {"claim": "当前方案预算为 12 万元。", "evidenceRefs": ["file-budget"]}
    ],
    "currentImpact": "按当前方案交付不能同时满足预算标准。",
    "action": "确认将方案压到预算内，还是调整已确认的预算要求。",
    "suggestedActorId": null,
    "evidenceRefs": ["task-plan", "file-budget"]
  }],
  "checks": [{"subject": "预算要求", "conclusion": "confirmed", "reason": "两侧属于同一活动和当前有效版本。", "evidenceRefs": ["task-plan", "file-budget"]}],
  "unknowns": [],
  "formalStatusUnchanged": true
}
```
