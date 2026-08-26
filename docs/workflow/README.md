# AgentDoor 工作产物模板

> 使用原则：模板服务于判断和接续，不服务于仪式。C0 / C1 默认在任务回复中使用精简版；只有跨多人、跨多轮或 C2 / C3 工作才需要保存独立文件。长期产品决定必须回到 `docs/product-v2/09-decision-register.md`，不能让模板成为第二份事实源。

## 一、选择哪种产物

| 场景 | 使用产物 |
| --- | --- |
| 只读回答、审查、诊断 | 结论 + 依据 + 未知 |
| 小修、小型文案或测试 | Task Brief 精简版 + 自审 / 验证 + 交付摘要 |
| 产品语义、交互或领域对象变化 | Decision Brief + Technical Assessment + Review + 交付摘要；需要接续时正式 Handoff |
| 权限、人员数据、Task Owner / Handoff、迁移或不可逆动作 | 完整产物 + 安全 / 隐私 Review + Deviation / 回滚（如适用） |

文件命名建议：

```text
docs/workflow/records/YYYY-MM-DD-<topic>-decision.md
docs/workflow/records/YYYY-MM-DD-<topic>-technical-assessment.md
docs/workflow/records/YYYY-MM-DD-<topic>-review.md
docs/workflow/records/YYYY-MM-DD-<topic>-continuation.md
```

临时工具日志、完整终端输出和逐步思考不进入长期记录；只保留结论、证据、决定和可复现命令。

## 二、Task Brief

### C1 精简版

```md
## Task Brief
- 目标：
- 范围 / 非目标：
- 完成证据：
- 变更级别：C1
- Work Owner / 交付负责人：
```

### C2 / C3 完整版

```md
# <工作名称> Task Brief

## 原始需求与来源
- 原始表述：
- 请求人 / 决定人：
- 关联 D / Q：

## 目标
- 用户 / 业务结果：
- 为什么现在做：

## 范围
- 包含：
- 非目标：
- 受影响对象与用户：

## 当前事实
- 代码 / 数据证据：
- 已确认决定：
- 假设与未知：

## 变更治理
- 级别：C2 / C3
- Work Owner / 交付负责人：
- 协作者：
- Review 视角 / Reviewer：
- Agent 被授权：
- Agent 不得：

## 完成证据
- 正常场景：
- 失败 / 拒绝场景：
- 权限 / 数据场景：
```

## 三、Decision Brief

```md
# <决定主题> Decision Brief

> 状态：draft / proposed / confirmed / rejected / superseded
> Revision：
> 产品负责人：

## 要解决的结果

## 当前事实
- 事实：
- 推断：
- 未知：

## 范围与非目标

## 选项与取舍
| 选项 | 用户价值 | 人性影响 | 架构 / 权限 | 成本与可逆性 |
| --- | --- | --- | --- | --- |

## 建议默认及理由

## 需要明确确认
1.

## 验收例子

## 决定结果
- 决定：
- 决定人 / 日期：
- supersedes：
- 受影响文档：
- 重新审视触发条件：
```

确认后，把结论写入决策台账；本文件保留取舍和上下文，不重复维护决定状态。

## 四、Technical Assessment

```md
# <工作名称> Technical Assessment

> 状态：pre-decision / implementation-ready
> 绑定 Decision Revision：

## 结论
- 可行性：
- 建议最小改动：
- 阻断决定：

`pre-decision` 只回答可行性、选项、影响和未知；方向确认后再更新为 `implementation-ready`，补齐实施范围、迁移、验证和恢复。前者不能作为进入代码的 DoR 证据。

## 当前实现事实
| 事实 | 证据路径 / 命令 | 与目标差距 |
| --- | --- | --- |

## 领域与不变量
- 对象 / 状态：
- 必须保持：
- 禁止旁路：

## 影响范围
- 文件 / 模块：
- API / Store / Schema：
- 共享组件 / Token：
- 兼容与迁移：

## 权限、隐私与审计
- Actor / on-behalf-of：
- PolicyDecision：
- 数据最小化：
- 负面测试：

## 实施顺序
1.

## 验证计划
- 自动检查：
- 正常 / 空 / 错误 / 冲突：
- 并发 / 幂等 / 撤权：
- 桌面 / 移动 / 键盘 / 焦点：

## 风险与恢复
- 风险：
- 回滚 / 补偿：
- 尚未验证：
```

## 五、Review Report

```md
# <工作名称> Review

> Work Owner / 汇总人：
> Reviewer 与覆盖视角：
> 结论：approved / approved-with-follow-up / changes-required / blocked-pending-decision

## 需求符合度
- 是否实现原始结果：
- 是否越过范围 / 非目标：
- 是否混淆已确认与待确认：

## 标准符合度
- 产品不变量：
- 架构 / 权限 / 数据：
- 人性与反监控：
- UI / 无障碍 / 复用：
- 测试与证据：

## 问题
| 级别 | 问题 | 证据 | 必要修复 |
| --- | --- | --- | --- |
| Blocker / Must fix / Follow-up | | | |

## Follow-up（仅 approved-with-follow-up）
| 后续项 | Work Owner | 期限或触发条件 | 验证方式 |
| --- | --- | --- | --- |
| | | | |

## 复审结果
```

C2 / C3 的作者不能是唯一 Reviewer。C3 必须列出所有触发视角及其具名结论，Work Owner 汇总为一个更保守的最终结论。Reviewer 不能替产品负责人确认 Q 项，也不能借审查扩大需求。

强制映射：未决决定类 Blocker → `blocked-pending-decision`；任一未修 Must fix → `changes-required`；存在任何未关闭 Follow-up → `approved-with-follow-up`；只有没有未结问题时才使用 `approved`。

## 六、交付摘要 / Continuation Note

```md
# <工作名称> 交付摘要

## 30 秒摘要
- 结果：
- 当前状态：
- 下一位接收者 / Work Owner：
- 第一动作：

## 已完成

## 明确未完成 / 非目标

## 决定与理由
- 采用：
- 否决：
- 假设 / 未知：

## 改动与证据
- 文件 / 对象 / 固定版本：
- 验证命令与结果：
- 截图 / 场景：

## 风险与恢复
- 已知风险：
- 回滚 / 补偿：
- 权限 / 数据注意：

## 接收信息（需要继续协作时）
- 接收者理解的目标：
- 范围 / 非目标：
- 第一动作：
- 仍缺内容：
```

普通代码 / 文档 / 设计交付至少使用上面的摘要结构；它只是可接续记录，不代表接收者 Consent、工作接受或责任变化。

需要转移既有上下文、Todo、Responsibility、Task Owner，或执行子 Task Result Return 时，才创建产品语义的正式 Handoff，并遵守 [人与人 Handoff 规范](../product-v2/11-human-handoff.md)。发送交付摘要不等于正式 Handoff 已接受或生效。

## 七、Deviation Record

```md
# <偏离主题> Deviation Record

> 状态：proposed / active / expired / closed

- 编号：DEV-YYYY-NNN
- 被偏离规则：
- 原因：
- 已尝试替代：
- 精确作用范围：
- 风险与受影响对象：
- 补偿控制：
- 恢复方式：
- 批准人：
- 生效 / 失效条件：
- 复查触发点：
- 清理 Work Owner：
- 关联 Task / Decision / ChangeSet：
- 登记索引行：
- 验证与关闭证据：
```

Deviation 文件放在 `docs/workflow/deviations/`，并登记到该目录的 `README.md`。批准权和不可豁免集合只以 [项目工作宪章第十五节](../product-v2/00-project-operating-charter.md) 为准；本模板不复制一份可能变旧的缩略清单。Agent 可以起草，不能批准自己的偏离。
