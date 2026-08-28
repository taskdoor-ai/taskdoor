# AgentDoor 产品定义 V2

> 状态：治理规则与“已确认”条目生效；其余产品细节仍是讨论稿，等待产品负责人确认后再进入功能改造  
> 日期：2026-08-26  
> 依据：2026-08-26 会话、上周会议纪要、当前本地 Demo 代码、协作心理与高可靠行业交接研究

本目录是 AgentDoor 当前产品事实的统一入口；每个条目的状态决定它能否直接作为实现依据。内容分为三种状态：

- **已确认**：产品负责人在会议或当前会话中明确确认。
- **设计建议**：根据已确认方向展开，仍允许调整。
- **当前实现**：从本地代码直接核对得到的事实，不代表产品决策已经完整落地。

这里的 “canonical” 只表示该主题应在本目录维护，不表示文件里的每句话都已获批准；真正的决定状态以条目标注和 [决策台账](./09-decision-register.md) 为准。没有状态标注的扩展设计默认视为 Proposal。

全项目的工作方式、规则优先级、变更等级、DoR / DoD、Review、Handoff 和风格基调统一由 [00-project-operating-charter.md](./00-project-operating-charter.md) 管理。日常工作先搜索并读取直接相关规则；只有治理、跨域核心合同、C3 或发现冲突时才完整通读。精简执行与按需记录见 [工作记录规范](../workflow/README.md)。

## 快速术语

| 术语 | 本文含义 |
| --- | --- |
| Task / Owner | 需要持续跟进的结果对象；每个正式 Task 恰好一位 Owner |
| Proposal | 尚可编辑、尚未形成正式责任的候选 Task 或协作方案 |
| Responsibility | Task 内成员已接受的有界协作预期，不等于 Owner 或权限 |
| Handoff | 已有上下文、工作或责任的双边接续协议；新工作委托不自动属于 Handoff |
| Result Return | 子 Task 把结果和证据逐级交给直接父 Task Owner 的 Handoff Profile |
| Principal | 可审计的操作主体：成员、受委托 Agent 或受限外部协作者 |
| Steward | 具备明确治理授权的应急接管角色，不因身份自动拥有业务权限 |
| Decision | 需要有权人确认的业务结论；与普通讨论、Handoff 分开 |
| PolicyDecision / ChangeSet | 一次动作的授权判定 / 不可改写的变更信封，属于架构术语 |

## 已确认的底层原则

1. Task 是当前产品唯一行动对象；当前原型不再创建或操作 Todo。
2. Task 可以多层级扩展；每个 Task 只有一位 Owner，不同层级 Task 可以有不同 Owner。
3. Task 内继续展示 File、版本与引用；取消独立团队文件模块不改变文件真相或 ACL。
4. Task 列表不使用 Folder 分组，新建 Task 不选择目录；分类只使用无标签组的扁平标签。
5. 创建任务默认由当前用户自己完成。AI 先理解需求，只在发现经验、知识、权限、容量或协作范围缺口时建议找人。
6. 是否邀请协作者由用户主动决定；系统提供候选人对比与依据，不自动分配。
7. 责任画像要基于平台可见证据解释“团队实际上如何工作”，必须显示证据覆盖，并受权限约束；当前 Task 创建与详情不提供逐项 Responsibility 分配表面。
8. AI 不只辅助阶段推进，而要对平台内整个协作过程提供洞察与下一步建议。
9. Demo 必须模拟真实团队，覆盖多行业、多复杂度与多种协作关系。
10. 人与人的 Handoff 工作部分必须足够清晰，并与 Agent 间协作遵循同一底层原则。

“不知道找谁时通过团队动态广播”已经作为重点设计方向展开，但它是否首版进入一级导航、默认广播范围多大，仍留在决策台账等待确认。

当前设计把第 10 条展开为“发送不等于完成、接收者理解并主动接受、责任原子生效”，但具体 Profile、状态机和界面位置仍是待确认默认，不冒充产品负责人已经拍板。

## 建议确认顺序

1. 先看 [00-project-operating-charter.md](./00-project-operating-charter.md)，确认全项目怎样判断、推进、验证和交接。
2. 再看 [01-product-definition.md](./01-product-definition.md)，确认产品边界。
3. 再看 [03-demand-led-collaboration.md](./03-demand-led-collaboration.md)，确认创建与找人流程。
4. 再看 [11-human-handoff.md](./11-human-handoff.md)，确认邀请、接续、回传与 Owner 转移的边界。
5. 集中处理 [09-decision-register.md](./09-decision-register.md) 的待确认项。
6. 最后看 [08-delivery-roadmap.md](./08-delivery-roadmap.md)，确认后才拆编码任务。

## 文档地图

| 文档 | 当前效力 | 回答的问题 |
| --- | --- | --- |
| [00-project-operating-charter.md](./00-project-operating-charter.md) | 生效的治理规范 | 全项目以什么原则、流程、质量门槛和风格推进 |
| [01-product-definition.md](./01-product-definition.md) | 已确认原则 + Proposal | AgentDoor 是什么、解决什么、不做什么 |
| [02-information-architecture.md](./02-information-architecture.md) | 已确认对象 + 待确认模型 | Task、File、动态、成员与 AI 如何组成产品 |
| [03-demand-led-collaboration.md](./03-demand-led-collaboration.md) | 已确认方向 + 待确认交互 | 如何从用户需求渐进规划，并让用户主动选择协作者 |
| [04-responsibility-and-routing.md](./04-responsibility-and-routing.md) | 已确认方向 + 待确认数据规则 | 动态责任画像、人员推荐规则、解释与权限 |
| [05-team-files-and-activity.md](./05-team-files-and-activity.md) | 已确认方向 + 待确认模型 | Task 内文件真相和任务外协作广播如何衔接 |
| [06-ai-collaboration-insights.md](./06-ai-collaboration-insights.md) | 已确认覆盖范围 + 待确认写入级别 | AI 可以在哪些协作节点提供什么洞察 |
| [07-demo-validation-scenarios.md](./07-demo-validation-scenarios.md) | 验证设计，不是功能决定 | 如何用多行业真实团队验证产品架构 |
| [08-delivery-roadmap.md](./08-delivery-roadmap.md) | 当前事实 + 有条件候选路线 | 当前实现、差距、改造顺序和验收标准 |
| [09-decision-register.md](./09-decision-register.md) | 决定状态唯一台账 | 已确认决策、假设与待确认问题 |
| [10-research-basis.md](./10-research-basis.md) | 研究依据，不替代决定 | 协作心理、人员推荐与权限判断的研究依据 |
| [11-human-handoff.md](./11-human-handoff.md) | 已确认原则 + Q-11–Q-19 Proposal | 人与人的工作如何清晰接续、回传和验收 |

## 文档边界

- 本目录与 `docs/agentdoor-design-system.md` 是当前产品和界面规范入口。
- 已被当前产品合同替代的旧产品定义、改造 Todo 和页面级研究已经删除，避免与 D-139 形成第二事实源。
- 历史实现过程不作为当前需求；决定状态只查询本目录的决策台账。

## 使用原则

- 所有工作遵循“安静、清晰、有依据、尊重人、可接续”的项目基调；默认走一次性轻量闭环，只在持久合同或高风险边界被触发时升级。
- 连续反馈不重复读、重复确认或逐轮建档；验证聚焦受影响路径，不默认跑全量回归或设计债务基线。
- 局部、可逆且不改变产品合同的实现，只需确认不与已确认决定冲突；改变持久产品合同的工作才先确认具体 Revision。
- 只有改变产品合同的实现必须指向明确决定；常规缺陷、样式、布局、Mock 和复用调整不为此新增条目。
- AI 推断必须显示依据、置信边界和权限范围。
- 邀请、Handoff 与工作状态必须分开；“已发送”“已读”或“已接受邀请”都不能被包装成责任已经转移。
- 候选卡中的“忙闲”只来自成员主动发布、可撤回且会过期的粗粒度协作窗口；不向发起人展示精确任务数、个人审核队列或历史速度。
- 拒绝后的同 scope 人工 / 自动重发共同受保护；6–9 人 Demo 不展示可反推个人的拒绝、响应或验收聚合。
- Demo 中的精确工作量、能力与职责必须标记数据来源，不能把 Mock 数字伪装成事实。
- 当前前端 Mock 只能验证交互，不得声称已经实现真实 ACL、Agent 委托或不可篡改审计。
