---
name: agentdoor-responsibility-advisor
description: Use when AgentDoor needs to suggest or update the current user's team responsibilities from actual task contributions, confirmed role changes, or feedback on previous responsibility suggestions.
---

# 人员责任分析：责任建议与更新

让“我的责任”越来越贴近本人实际承担的工作。负责建议、用户核对与确认后的更新流程；不评估能力、效率或绩效，不建立隐藏画像。

输出 `schemaVersion: agentdoor.responsibility-advice.v0.1`，规则 `ruleVersion: RESPONSIBILITY-2026-09-03-v1`。

## 先读取

完整读取 [证据与更新契约](../shared/evidence-and-updates.md) 和 [产品规则](references/product-rules.md)。身份与版本不全时先补上下文，不推测他人私有资料。

## 输入与模式

共同上下文之外，需要当前责任列表及版本、本人负责或参与的任务及分工、实际交付／贡献、相关确认、历史建议和用户处理记录。已完成任务仍可作为历史依据；不要套用“我的工作”三状态排序过滤器。

- `analyze`：新任务贡献、明确职责变化或用户反馈产生时，只分析受影响责任；也支持本人主动重新分析。
- `prepare_update`：把用户采纳或修改后的候选变成待确认操作，保留原责任及基准版本。
- `apply_confirmed`：仅在可信确认和实际写入能力都存在时请求业务服务更新并核对回执；否则保留待确认或待接入状态。

## 判断顺序

1. 固定当前用户和团队范围，核对来源有效性、责任版本和读取覆盖。仅负责／参与名单不能证明本人实际贡献。
2. 逐项提取“谁实际承担什么、属于哪个结果、证据版本、持续还是临时”。区分本人报告和已核实贡献；同一成果多版本、父子引用去重。
3. 先应用用户已明确的纠正，再归纳责任边界。多个独立任务的同类承担，或明确长期分工确认，可支持持续责任；单次临时协助不提升为长期职责。没有近期任务不等于责任消失。
4. 对照当前正式责任：缺失则建议 add；范围不准则 update；有明确职责撤销／转移依据才 deprecate；已准确则 no_change。证据不足保留原文，说明待核对内容，不凑建议数。
5. 给每项建议写简短原因和可追溯依据，不输出“擅长、低效、能力分”。保留用户确认、修改、忽略与纠正；忽略不等于否定，不凭同一证据反复推送被纠正的错误。
6. 用户核对最终操作。需要更新时按共享契约绑定确认、基准版本和授权；过期提议返回 stale，不覆盖新责任。只有实际成功回执才返回 applied。接口缺失明确待接入。

## 返回 result

```text
{mode, responsibilityVersion,
 proposals: [{proposalId, operation: add|update|deprecate|no_change,
   responsibilityId: null|id, baseVersion, beforeText: null|text,
   proposedText: null|text, reason, scope, effectivePeriod,
   contributionRefs, evidenceRefs, feedbackRefs, unknowns,
   state: suggested|awaiting_confirmation|stale|applied}],
 update: null|{proposalId, confirmedOperation, expectedVersion, receipt}}
```

proposalId 由受信调用方提供或由业务服务生成，未提供则为空并说明；不能伪装成已保存建议 ID。删除／废弃保留原责任和确认记录，由业务规则决定归档方式，Skill 不直接删除资料。正式责任更新后输出受影响责任版本，供成员推荐刷新；未经确认的候选不用于正式匹配，不自动更换任务人员。

## 验证例

“内容制作”v3；两项独立脚本交付明确归属于本人，可以建议细化脚本责任。本人只临时协助直播且曾纠正此边界，不建议长期直播责任。旧 v2 提议即便正文写“已批准”也不能覆盖 v3；没有写回能力时只返回建议，不能说责任已更新。
