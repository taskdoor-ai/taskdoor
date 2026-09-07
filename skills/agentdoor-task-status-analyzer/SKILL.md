---
name: agentdoor-task-status-analyzer
description: Use when an AgentDoor user asks for a task's current situation, next action, completion progress, or an updated summary after deliverables or requirements change.
---

# 任务状态分析

组织“当前情况、下一步建议、进度”三部分。分析不等于修改任务状态，进度不等于已通过正式验收。

输出 `schemaVersion: agentdoor.task-status-analysis.v0.1`，规则 `ruleVersion: TASK-STATUS-2026-09-03-v1`。

## 先读取与输入

完整读取 [证据与更新契约](../shared/evidence-and-updates.md) 和 [产品规则](references/product-rules.md)。需要当前任务和子任务范围、目标／标准、正式状态与版本、当前讨论、文件正文／交付／确认，以及有效诊断和进度结果。

诊断不足且实际需要识别问题时，读取并应用 [任务诊断](../agentdoor-task-diagnostician/SKILL.md)；计算进度时读取并应用 [EWD 与进度](../agentdoor-ewd-progress/SKILL.md) 的 progress／trend 模式。已有同版本有效结果直接复用；所需数据或计算能力不可用时，返回对应缺口，不模拟成功调用。

## 分析顺序

1. 锁定任务、标准、文件和当前确认的有效版本。把事实分成正式状态、讨论报告、已核对结果、未满足项、待核对项；“我做完了”是报告，不能推翻当前缺失结果。
2. **当前情况**：先写有依据的已交付结果与剩余缺口，必要时解释近期实质变化。保留正式状态；发现状态与交付矛盾时建议核对，不暗改状态或自动宣告完成。父任务汇总注明哪些是子任务结果，不将个别子项完成说成整体完成。
3. **下一步建议**：优先核对当前有效冲突、解除确证阻塞，再补齐尚未满足结果。只引用诊断 Skill 的两种类型，参考前置尚未完成不等于阻塞。通常给一项最直接可执行行动；需要多人分别处理时按具体贡献列出，不虚构处理人或分配权限。
4. **进度**：只引用同一当前输入版本下的 EWD 结果，包含完成量、总量、完成度和真实燃起图。不要用子任务数量、耗时、评论或提交次数另算百分比；EWD 服务／必要数据不可用时 percent=null，说明待核对。旧版本 100% 不可充当当前进度。
5. 总结是否收敛时区分新增完成、范围增减和重估；历史不足不判断趋势。内容缺失、读取失败或旧核对失效分别说明，不能用“0%”代替未知。
6. 标准、交付内容、反馈或确认变化时只重算受影响部分。重复刷新不制造新进展或分析时间；失效版本结果不覆盖新结果。输出可读摘要和可追溯依据，不展示内部推理链。

## 返回 result

```text
{taskId, taskVersion, formalStatus,
 currentSituation: {summary, confirmedResults, unmetResults, pendingChecks,
                    recentChanges, evidenceRefs},
 nextActions: [{action, actorId: null|id,
                diagnosisType: null|execution_blockage|decision_conflict,
                reason, evidenceRefs}],
 progress: {state: current|unknown|stale,
            ewdResultRef: null|ref, inputVersions,
            totalEwdMinutes: null|number, completedEwdMinutes: null|number,
            completionPercent: null|number, trend: null|result, reason},
 formalStatusUnchanged: true}
```

必要进度未知但当前情况仍可判定时，外层 status=partial；不要让一个不可用服务阻止已知事实展示，也不要假装全部完成。仅列声明为当前有效的证据；如果保留旧结果供历史对照，要明确历史版本、不得填入当前数值字段。writeReceipt=null。

## 验证例

任务 v4 正式状态为进行中，讨论说“完成”，但当前文件缺少 c2；旧 v3 进度为 100%，当前进度服务不可用。输出“已提交结果仍缺 c2，需要补齐并核对”，正式状态仍进行中，当前 completionPercent=null；不能沿用旧 100% 或编造新百分比。
