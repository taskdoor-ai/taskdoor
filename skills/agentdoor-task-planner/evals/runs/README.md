# 实际试跑记录

这里保存独立 agent 的实际首次输出，不是手写的理想答案。团队、任务和历史均为合成数据。

- `2026-09-01-first/`：首轮 24 例，输入与第一次结果不覆盖。`structural-report.json` 是当轮规则下的原始检查记录。
- `2026-09-01-retest/`：仅针对首轮发现及两个对照案例的修订后重测，不替换首轮，不代表全量回归。
- `2026-09-01-overnight-core/`：六行业 24 例扩展首轮，独立语义复核 23/24；RENO-01 的“未读取历史”误述保留。
- `2026-09-01-overnight-edge/`：16 个边缘首轮及原始评分；`2026-09-01-overnight-edge-regrade/` 使用完全相同的输出，只修正四项同快照等价来源的评分规则，不是新模型尝试。
- `2026-09-01-overnight-complex/`：8 个复杂树案例、79 个既有任务节点，独立语义复核 8/8。
- `2026-09-01-overnight-multiturn/`：4 个 episode、12 轮。B1 与 D2 的首次协议失败保存在各轮 `attempts/attempt-1/`，纠正结果不覆盖它们；C3 语义失败保持原样。
- `2026-09-01-overnight-targeted/`：发现问题后的目标与正反例回归。第一次修订 8/9，保留 EDGE-12 Owner 边界失败；第二次单案修订 1/1。`semantic-summary.json` 分别报告两阶段及每个案例的最新结果。
- `2026-09-01-realistic-first/`：12 个高拟真行业场景的初始基线；机器 4/12，独立语义 5/12。
- `2026-09-01-realistic-retest/` 与 `2026-09-01-realistic-retest-regrade/`：同一轮输出的原评分与勘误后评分；勘误不改模型答案，独立语义为 8/12。
- `2026-09-01-realistic-final/`：第二次全量运行；当时机器 9/12、语义 8/12，保留 subset 依赖评分缺口及后续勘误。
- `2026-09-01-realistic-targeted-exact/`：7 个依赖高难案启用最终依赖精确集合；机器与语义均 2/7。
- `2026-09-01-realistic-impact-matrix/`：输入证据先冻结的高难回归；冻结机器 3/7，同输出勘误后及语义均 4/7。
- `2026-09-01-realistic-focused-final/`：source_only、直接审核者和传递消费者定点回归；机器与语义均 3/7。
- `2026-09-01-realistic-full-final/`：当前 Skill 的最终 12 案全量回归；冻结机器 8/12，C04 旧边评分更正后同输出机器与最终语义均为 7/12。

每次的 `manifest.json` 记录输入与协议哈希，`protocol-snapshot.json` 保留执行时的指令正文，`expectations-snapshot.json` 保留当次评分规则。`execution-metadata.json` 说明谁执行、谁复核，以及哪些参数未提供。

`semantic-review-*.json` 保留评审者原文，证据中的临时路径按该目录的 `artifact-path-map.json` 映射到归档副本；不要依赖 `/tmp` 长期存在。`grading-erratum.json` 单独保存评分勘误，不修改首轮结论。

用当前检查器重新检查历史目录时，输出会写回 `structural-report.json`。为了保留原始记录，**先复制整个目录到新的临时位置再运行 `check`**；使用当次期望快照，报告中的版本匹配字段会如实说明当前 Skill 或契约已变化。当前检查器与 Schema 也可能升级，不能把重新检查冒充当年的原始检查；首轮校验器源码另存于 `validator-snapshot/`。

首轮汇总结论见 [评估报告](../evaluation-report.md)，扩展矩阵、已知失败、修复和未验证范围见 [扩展测试报告](../overnight-report.md)。
