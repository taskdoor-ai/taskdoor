---
name: agentdoor-task-diagnostician
description: Use when checking why current AgentDoor task execution cannot continue, or whether task requirements and current deliverables contain conflicting decisions.
---

# 任务诊断

只诊断两类有事实依据的问题：执行阻塞、决策冲突。输出问题与可执行建议，不修改正式状态、前置依赖、目标或文件。

输出 `schemaVersion: agentdoor.task-diagnosis.v0.1`，规则 `ruleVersion: TASK-DIAGNOSIS-2026-09-03-v1`。

## 先读取与输入

完整读取 [证据与更新契约](../shared/evidence-and-updates.md) 和 [产品规则](references/product-rules.md)。需要任务当前版本、目标和标准、执行事实、实际所需前置交付、相关任务与文件正文、当前有效决定和反馈。只拿到目录或依赖边时不能假装读过交付内容。

## 判定步骤

1. 先界定正在核对的同一任务、结果、版本和适用范围。已被正式替代的旧要求不能与新版制造冲突；仅较新的讨论不自动废除正式标准。
2. **execution_blockage／执行阻塞** 必须同时有：实际执行已开始；当前继续这项工作必须使用某项前置交付；该交付当前未满足；有明确证据说明工作因此无法继续。引用执行工作、所需结果、缺失及停工记录，缺一项则不能确诊。状态名“已阻塞”、很久未更新、计划中的参考前置未完成，都不单独构成此结论。
3. **decision_conflict／决策冲突** 必须指出同一事项的两项当前适用内容及来源，它们互相矛盾或不能同时满足。文件预算 12 万与任务要求不超过 10 万属于决策冲突；不得另造“预算违规”等第三种类型。单纯缺材料、没有回复、信息未知不是决策冲突。
4. 区分已证实问题、证据不足待核对，以及当前未发现问题。已完整读取且没有上述问题时 diagnoses=[]；资料部分／不可用则仍可列已证实项，但不能宣称“全部正常”。参考前置风险可写检查说明或 unknowns，不进入第三类诊断，不借它计算已证实风险分。
5. 每项说明受影响工作、当前影响、可采取行动及有依据的处理人。冲突建议先确认哪一要求有效；不替用户改预算或自动裁定。阻塞建议推动缺失交付或确认替代方案，不要求强行执行受阻工作。没有指向某人的证据就不指定人。
6. 同一问题跨多份文件去重，保留双方来源。相关标准、交付、依赖或确认变更时仅复核受影响项；来源失效后不复用旧结论。诊断可被状态分析引用，风险分档由推荐 Skill 自己按规则计算。

## 返回 result

```text
{taskId, taskVersion,
 diagnoses: [{type: execution_blockage|decision_conflict,
   summary, affectedTaskIds, affectedOutcome,
   sides: [{claim, evidenceRefs}], currentImpact, action,
   suggestedActorId: null|id, evidenceRefs}],
 checks: [{subject, conclusion: confirmed|not_established|unknown,
           reason, evidenceRefs}],
 unknowns: [{missing, neededToDecide}], formalStatusUnchanged: true}
```

阻塞 sides 至少包含所需交付与当前未满足／无法继续的事实；冲突 sides 必须包含两侧具体内容。没有来源的概括不能替代它们。结论就绪不等于正式 Task.status 已变更，writeReceipt 固定 null。

## 验证例

任务待开始、仅有参考前置未完成、无实际停工：不确诊。设计已开始、当前定稿必须用活动标题与优惠内容，且讨论证实缺少该交付无法继续：执行阻塞。当前要求预算≤10 万、当前方案预算12 万：决策冲突，建议核对预算要求或方案，不自动改任一侧。
