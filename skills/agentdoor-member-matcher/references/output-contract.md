# 人员匹配输出

使用共享包络：schemaVersion、skillId、ruleVersion、requestId、principalId、teamId、inputVersions、coverage、evaluatedAt、status、result、evidenceRefs、unknowns、warnings、writeReceipt。status使用ready/partial/needs_context/stale；writeReceipt固定null。

result包含：
- taskId、taskVersion：当前目标与版本。
- candidates：按输入候选顺序逐项返回；每项memberId、responsibilityVersion、matchLevel（high/partial/low/unknown）、suggestedRole（owner/participant/null）、matchedRequirements、gaps、pendingChecks（字符串数组）、reason、evidenceRefs（来源ID数组）。
- recommendedOwnerId：成员ID或null，最多一人；对应high且suggestedRole=owner。
- assignmentUnchanged：固定true。

`matchedRequirements` 只能是匹配要求的字符串数组，例如 `["商品卖点与正式资料逐项一致"]`。逐项 coverage、reason、evidenceRefs 对象只放在 `requirementAssessments`，不能混入 matchedRequirements。两字段分别用于简短展示与完整评分依据。

每个候选引用其正式责任来源及当前任务。经验只引用已读取的归属证据。数字、ID和版本使用当前输入，不从示例生成。没有可读责任时为unknown，不能说low。权限明确拒绝时不能推荐角色。历史成绩不作为绩效或能力评价。

## 匹配百分比与梯度

新分析每位候选必须返回 matchPercent（0/25/50/75/100 或 null）、requirementAssessments。它衡量当前任务要求与正式责任的覆盖，不是能力、绩效、成功概率或任务完成度。

- 将目标与完成标准分为不重复的结果要求，每项返回 requirement、coverage（full/partial/none/unknown）、evidenceRefs、reason；不能把同一结果重复计权。
- 有输入明确权重时采用该权重，否则各项等权；full=1、partial=0.5、none=0。任一要求覆盖未知时整体 null，不把未知算0。
- 加权比例按最近25档四舍五入；正数至少25，未完全覆盖最多75；只有所有要求均 full 才100。
- 75/100 对应 high，25/50 对应 partial，0 对应 low，null 对应 unknown。high 也不必推荐负责人：关键结果有缺口、边界冲突或权限拒绝时，不建议 owner；最多推荐一人。
- 百分比与是否可分配分别判断。权限未核验列 pendingChecks，禁止把匹配100%说成已接受或已分配。
- 示例：两项独立结果“脚本交付、卖点核对”均覆盖=100%；只覆盖卖点核对=50%；只承担该项资料支持=25%；脚本覆盖、核对仅部分支持=75%；无相关责任=0%；正式责任缺失=null。

旧历史输出缺少新增字段仍可读取；新运行必须生成百分比和逐项依据。当前协议版本保留，规则版本升级。
