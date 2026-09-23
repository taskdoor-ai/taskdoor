# 任务分析内部：问题核对

本规则只支撑当前情况总结和下一步建议，不是单独 Skill，不输出独立诊断报告。

- 决策冲突：同一目标与有效版本的两项要求无法同时成立。核对双方原文、来源与当前影响；用 nextActions[].diagnosisType=decision_conflict 标记相关行动。
- 执行阻塞：当前正在推进的工作确实缺少必需结果且无法继续；同时核对所需输入与实际停工证据。对应行动类型 execution_blockage。
- 未开始任务的正常等待、参考依赖未完成、主观担心不自动成为确证问题。信息不足进入 currentSituation.pendingChecks，行动类型可为 null。
- 新版本消除旧冲突后不沿用旧判断。依据必须来自当前可见上下文；无正文不假装看过。
- 问题写入 currentSituation.unmetResults 或 pendingChecks，引用双方来源；nextActions 给具体行动和有据处理人，不发明负责人。
- 正式状态保持输入原值，分析不能自动阻塞、完成或重开任务。总结、进度、建议使用相同有效输入版本。
