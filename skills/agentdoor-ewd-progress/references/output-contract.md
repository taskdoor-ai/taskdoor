# EWD：字段与计算契约

使用共享包络，`schemaVersion=agentdoor.ewd-progress.v0.1`。result 必须含 mode、estimate、progress、trend；只填写当前模式，其余为 null。数值不可获得用 null，数组没有项用 []。

## 单位与标识

内部全部工作量用分钟，展示人天＝分钟÷480，planner 人时＝分钟÷60。三点估算先统一分钟，再应用 (O+4M+P)/6。计算不提前舍入，展示再舍入。

每个 EWD 明细必须有 `id`、`breakdownItem`、`criteriaRefs`。沿用输入明细 ID；新明细可使用本次输出内唯一的候选 ID，调用方确认后持久化。候选 ID 仅是估算内部标识，不能用作读取证据或假称已保存；progress 必须使用当前估算基线中的同一 ID。

标准已有 ID 时 criteriaRefs 使用该 ID；输入只有有序标准文本时使用 `{taskId, index, text}`，index 从 0 开始且绑定任务版本，不能伪造正式标准 ID。evidenceRefs 仍只使用输入来源 ID。

## estimate 字段

| 字段 | 类型与规则 |
| --- | --- |
| basis / estimationRuleVersion | platform、team_rule、history、unknown；记录实际采用规则版本 |
| items | 明细数组，每项包含下述字段 |
| items[].id / breakdownItem / criteriaRefs | 稳定明细 ID、人工工作及可核对结果、对应标准 |
| dimensionChecks | 对象，八个键为 deliverableScale、implementationDifficulty、uncertainty、inputReadiness、coordination、iteration、verification、tooling |
| 每个维度值 | `{decision, work, quantity, reason, evidenceRefs}`；decision 为 include、adjust、not_applicable 或 unknown，quantity 未知可 null |
| quantity / basis / additionalFactors | 数量说明或 null、工作与估算依据、补充因素数组；补充项含 factor、affectedItemIds、reason、evidenceRefs |
| threePoint | optimisticMinutes、mostLikelyMinutes、pessimisticMinutes、expectedMinutes；前三者满足 0≤O≤M≤P，expectedMinutes=(O+4M+P)/6 |
| ewdMinutes / evidenceRefs | 等于 expectedMinutes；依据数组。待估项三点值与 ewdMinutes 均为 null |
| knownEwdMinutes | 已知明细的有效 EWD 之和；未知项未被按 0 认定 |
| totalEwdMinutes / personDays | 范围完整且无待估项时的总量及人天，否则 null |
| assumptions / unknowns | 字符串数组，说明估算条件及缺口 |

八维是检查清单，decision 不是评分；同一工作不能因跨维重复列项。换人或日期变化本身不重估，工作条件实际改变才复核。历史反馈只是部分人或部分范围时不能当成整项实际耗时。

## progress 字段

| 字段 | 类型与规则 |
| --- | --- |
| taskVersion / estimateVersion / criteriaVersion | 输入有效版本，标准没有单独版本时使用其所属任务版本并说明 |
| items | 每项含 id、ewdMinutes、progressPercent、completedEwdMinutes、completedContent、remainingContent、evidenceRefs、confirmationSource |
| progressPercent | 0–100 或 null；单项完成量=ewdMinutes×progressPercent/100，任一必要值未知则 null |
| completedContent / remainingContent | 当前内容中的已完成与未完成结果，不能仅写“已上传” |
| confirmationSource | 已提供的内容核对或正式确认来源 ID；本次直接判断且无先前确认记录时为 null，evidenceRefs 仍需列正文依据 |
| knownCompletedEwdMinutes | 所有已知数字进度项的已完成量之和 |
| completedEwdMinutes | 全部明细可判断时的总完成量，否则 null |
| totalEwdMinutes / completionPercent | 当前有效总量；总量>0且全部明细可判断时计算比例，否则比例为 null |
| unknownOutcomeIds | 待确认明细 ID 数组，沿用原字段名，不另建结果对象 |
| unconfirmedEwdMinutes | 待确认明细的 EWD 之和；其 EWD 也未知时为 null |

总量为零不能除零，也不能自动返回 100%。范围不全、估算未知或部分进度未知时包络为 partial。已知完成量可用于显示，但不能伪装成完整完成量。

## trend 字段

points 为按实际发生时间排序的历史点，每项含 at、totalEwdMinutes、completedEwdMinutes、unconfirmedEwdMinutes、inputVersions、changeReasons。此处 completedEwdMinutes 是该时点**已有数字进度项**的完成量之和；若当时有未知项，必须同时保留待确认量，不能描述为全范围已核对。

changeReasons 说明范围新增、范围移除、重估、内容核对或确认撤销等实际变化。explanation 解释两条线的差距及变化原因。没有历史时 points=[]，明确历史不足；不得构造每日点。没有记录的时点不补零。

## progress 示例

输入条件：三个已确认明细分别为 120、480、120 分钟，当前内容支持 100%、80%、40%，估算与标准版本均为 1。对应 PRD 的 1.50 人天、已完成 1.15 人天。

```json
{
  "mode": "progress",
  "estimate": null,
  "progress": {
    "taskVersion": 1, "estimateVersion": 1, "criteriaVersion": 1,
    "items": [
      {"id": "ewd-goal", "ewdMinutes": 120, "progressPercent": 100, "completedEwdMinutes": 120, "completedContent": "目标、预算和约束完整。", "remainingContent": "无。", "evidenceRefs": ["file-plan"], "confirmationSource": null},
      {"id": "ewd-plan", "ewdMinutes": 480, "progressPercent": 80, "completedEwdMinutes": 384, "completedContent": "主体流程和分工完整。", "remainingContent": "风险预案待补齐。", "evidenceRefs": ["file-plan"], "confirmationSource": null},
      {"id": "ewd-check", "ewdMinutes": 120, "progressPercent": 40, "completedEwdMinutes": 48, "completedContent": "格式检查已完成。", "remainingContent": "内容核对待完成。", "evidenceRefs": ["file-check"], "confirmationSource": null}
    ],
    "knownCompletedEwdMinutes": 552, "completedEwdMinutes": 552,
    "totalEwdMinutes": 720, "completionPercent": 76.66666666666667,
    "unknownOutcomeIds": [], "unconfirmedEwdMinutes": 0
  },
  "trend": null
}
```
