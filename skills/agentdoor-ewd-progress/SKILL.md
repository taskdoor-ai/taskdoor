---
name: agentdoor-ewd-progress
description: Use when estimating AgentDoor task effort, allocating effort to verifiable outcomes, calculating content-backed completion, or explaining workload and completion trends.
---

# EWD 工时评估与进度

统一预计投入、完成量和燃起图的数据口径。EWD 是工作量估算，不是任务历时、已投入工时或人员效率。

输出 `schemaVersion: agentdoor.ewd-progress.v0.1`，规则 `ruleVersion: EWD-2026-09-04-v9`；采用团队规则时另记该规则版本，不伪造历史数据。

## 先读取与选择模式

完整读取 [证据与更新契约](../shared/evidence-and-updates.md) 和 [模板、完成度与燃起图规则](references/product-rules.md)。只执行请求的模式，不把执行阶段核对变成创建任务必跑步骤。

- `estimate`：名称、目标、完成标准、明确数量与追加要求；团队有效规则和历史可选。
- `progress`：有效估算及版本、EWD 明细项及数值、当前标准与任务已提供内容、确认来源和有效性；父任务另需完整叶子范围。
- `trend`：真实历史快照及发生时间、总量／完成量、范围及规则版本、变更原因。

## 计算顺序

1. **估算工作量。** 根据任务名称、目标和完成标准生成任务 EWD 拆分明细；每个 EWD 明细项是一项具体人工工作，同时对应一项可核对的完成结果，同级不重叠并覆盖当前已确认范围的 100%。例如整理资料、操作 AI、分析、制作、修改、沟通、审核和验收；等待、排队和 AI 无人值守运行不列入明细。按交付规模、实现难度、信息不确定性、资料准备、协作依赖、修改迭代、核验验收、工具环境八个维度检查，识别需要新增或调整的明细项、数量、条件、风险与依据。维度不打分；同一项工作受多个维度影响时只保留一条明细，不能重复计时。AI 可列 additionalFactor，但必须同时给出受影响的明细项与依据。
2. **三点估算。** 首版由 AI 根据任务名称、目标、完成标准、八个检查维度和已识别风险，为每个 EWD 明细项给出乐观值 O、最可能值 M、保守值 P；它们不是固定分档或自由打分，每个数值必须有对应工作和判断依据。O、M、P 满足 0≤O≤M≤P：O 假设现有条件顺利且无额外返工；M 表示按当前信息正常完成；P 只包含已识别不确定因素发生后的投入，不增加任务范围。程序计算 expectedEwdMinutes＝(O＋4M＋P)÷6，任务 EWD 为全部明细项 EWD 之和。关键条件未知且足以改变区间时返回 unknown。用户可修正数值；团队历史校准后续明细项估算，不改变维度含义。
3. **统一单位。** 内部以分钟记录，1 人天＝8 人时＝480 分钟；显示人天不改变计算精度。未知用 null，不用 0。有些部分未知时保留 knownEwdMinutes，totalEwdMinutes=null；不能把已知部分当作完整总量。父任务只汇总有效叶子，不能再加一份父任务估算。
4. **形成明细与基线。** 每个 EWD 明细项写明应完成内容、对应完成标准和 EWD；各项之和必须等于有效总 EWD。共享工作只列一次，跨项质量要求只作为相关项的判断条件。能独立交付、验收并需要单独负责、交接或并行的结果应拆为子任务，不混入同一任务的 EWD 明细。用户确认后保存拆分明细、总 EWD 和规则版本作为估算基线；范围或估算变化生成新版本，不回写旧基线。
5. **判断进度。** 根据每个 EWD 明细项及任务已提供的当前内容，直接判断该项 0–100% 的进度，并说明已完成内容、未完成内容和依据。不能可靠判断时返回 unknown，不编百分比；任务状态、上传动作或讨论“做完了”不能单独代表内容完成。
6. **汇总。** 单项已完成 EWD＝单项 EWD × 单项进度；全部 EWD 明细项均有数字进度时，completionPercent＝completedEwdMinutes / totalEwdMinutes × 100。总量未知、明细覆盖不全或存在 unknown 时 percent=null、status=partial；已知完成量和待确认 EWD 分别返回。
7. **解释趋势。** 使用当时真实总 EWD 和完成 EWD，不用现在数据回填过去或读取失败补 0。分别标注 scope_added、scope_removed、reestimated、content_confirmed、confirmation_revoked；两条量都可能回退。比例提高先核对分母变化，范围缩减不算新完成。

## 返回 result

```text
{mode, estimate: null|{basis: platform|team_rule|history|unknown,
 estimationRuleVersion, items: [{breakdownItem, criteriaRefs,
   dimensionChecks:{deliverableScale,implementationDifficulty,uncertainty,
     inputReadiness,coordination,iteration,verification,tooling},
   quantity, basis, additionalFactors,
   threePoint:{optimisticMinutes,mostLikelyMinutes,
     pessimisticMinutes,expectedMinutes}, ewdMinutes, evidenceRefs}],
 knownEwdMinutes, totalEwdMinutes, personDays, assumptions, unknowns},
 progress: null|{taskVersion, estimateVersion, criteriaVersion,
 items: [{id, ewdMinutes, progressPercent, completedEwdMinutes,
          completedContent, remainingContent, evidenceRefs, confirmationSource}],
 knownCompletedEwdMinutes, completedEwdMinutes, totalEwdMinutes,
 completionPercent, unknownOutcomeIds},
 trend: null|{points: [{at, totalEwdMinutes, completedEwdMinutes,
                       inputVersions, changeReasons}], explanation}}
```

未执行的模式为 null；不可获得的字段为 null 并列缺口。候选分配与已有效分配分开标识；返回输入版本和规则版本供调用方复用。创建适配时将人天 × 8 填入 planner 的 `ewdHours`，平台八维明细检查与三点估算／团队规则映射 `basis:model`，不是伪造 history。

燃起图沿用用户界面文案“新增工作量”“完成工作量”：底层分别映射各时点累计范围总 EWD、已完成 EWD，不把第一条误算成每日增量；范围缩减或重估在说明中标明，避免把比例上升解读成新增交付。

## 验证例

一个任务的三个 EWD 明细项分别为 240、480、240 分钟，AI 根据当前内容判断进度为 100%、60%、0%：总 EWD 为 960 分钟，已完成 EWD 为 528 分钟，完成度为 55%。若其中一项无法判断，则总体百分比为空，单独返回已确认完成量和待确认 EWD。
