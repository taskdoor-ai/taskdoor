# 我的工作推荐：输出契约

使用共享包络，`schemaVersion=agentdoor.personal-priority.v0.1`，`ruleVersion=PERSONAL-PRIORITY-2026-09-03-v4`。

| result 字段 | 类型与规则 |
| --- | --- |
| evaluatedAt / timezone | 回显本次判断时刻及团队时区 |
| scope | 本人负责或参与、三状态的筛选说明 |
| rankedTasks | 已知有效候选，按实际顺位排列 |
| rankedTasks[].rank / taskId / taskVersion | 从 1 连续的顺位、实际任务 ID 和输入版本 |
| factors | 对象，包含 B、C、P、D、H、Q，数值来自 PRD 固定档位 |
| I / U / W | I=B+C+P，U=max(D,H,Q)，W=0.6I+0.4U；不提前舍入 |
| hits | 数组，每项 `{factor, score, fact, evidenceRefs}`；逐项保存实际成立条件，零分已知事实也可说明 |
| unknownFactors | 未知分项名称数组；相应分项暂取 0 |
| dueSortValue | 可比较的截止时刻字符串，含时区偏移；无可比较日期为 null |
| nextAction / reason | 本人当前可执行行动与一句推荐原因 |
| excluded | 数组，每项 `{taskId, reason}`，说明未入选原因 |
| coverage | 原样回显输入读取覆盖；不得扩大范围 |

仅有日期的排序值按团队当地当天结束表示；明确时刻使用原时刻。不可识别日期列为未知，不能补造时间。命中同一事实的不同分项分别解释条件，不能把协作影响直接复制为当前停等。

空候选在范围完整时可返回空数组；范围不完整用 partial。未知不等于低价值。rank 仅为任务顺位，不用于人员排名。

## result 示例

输入条件：当前用户参与故障恢复任务，任务进行中；核心承诺、两项活跃下游、当前重要性标签、持续服务损失及当前停等均有依据。无截止日期。

```json
{
  "evaluatedAt": "2026-09-03T02:00:00Z",
  "timezone": "Asia/Shanghai",
  "scope": "本人负责或参与，状态为待开始、进行中或已阻塞",
  "rankedTasks": [{
    "rank": 1,
    "taskId": "task-incident",
    "taskVersion": 2,
    "factors": {"B": 50, "C": 30, "P": 20, "D": 0, "H": 100, "Q": 80},
    "I": 100, "U": 100, "W": 100,
    "hits": [
      {"factor": "B", "score": 50, "fact": "恢复当前核心服务承诺。", "evidenceRefs": ["task-incident"]},
      {"factor": "C", "score": 30, "fact": "两项活跃下游明确需要恢复结果。", "evidenceRefs": ["delivery-needs"]},
      {"factor": "P", "score": 20, "fact": "当前任务有关联且可读的高优先级标签。", "evidenceRefs": ["task-incident"]},
      {"factor": "H", "score": 100, "fact": "服务中断仍持续，需本人协调恢复。", "evidenceRefs": ["incident-update"]},
      {"factor": "Q", "score": 80, "fact": "下游当前停等本人协调的恢复结果。", "evidenceRefs": ["waiting-record"]}
    ],
    "unknownFactors": [],
    "dueSortValue": null,
    "nextAction": "协调服务恢复并回应等待方。",
    "reason": "关键服务中断正在影响多项交付，需先协调恢复并回应等待方。"
  }],
  "excluded": [],
  "coverage": {"tasks": {"state": "complete", "scope": "当前用户可见任务"}}
}
```
