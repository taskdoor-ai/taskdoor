# AgentDoor 项目工作宪章治理记录

> Governance Revision：`GOVERNANCE-2026-08-26-r1`  
> 变更级别：C2（产品治理 / 文档，不含功能代码）  
> Work Owner：主 Agent `/root`  
> 产品决定人：产品负责人（当前会话）  
> 最终 Review：`approved-with-follow-up`

## Task Brief

- **目标**：建立一套可长期控制 AgentDoor 产品、设计、工程、协作与 Agent 执行基调的工作流程、规则和原则。
- **范围**：项目工作宪章、Agent 执行门槛、工作产物模板、决策台账、路线图效力、设计系统新旧边界和 Handoff 文档效力。
- **非目标**：不修改功能代码，不安装依赖，不创建 Git 初始 commit，不确认 Q-01–Q-19 的产品默认。
- **完成证据**：单一事实源与状态清楚；C0–C3、DoR / DoD、Review、Deviation、交付摘要和正式 Handoff 可执行；陌生读者能按场景得到一致路由；文档结构与链接通过检查。

## Decision Brief

- **决定**：G-01，建立并遵循统一项目工作宪章。
- **依据**：产品负责人在当前会话明确要求更新工作流程、规则和原则，用于把控整个项目基调风格。
- **边界**：C0–C3 等细则作为当前治理 Revision 的执行默认；后续变化按 C2 治理变更记录 `supersedes`。
- **登记**：[产品决策台账](../../product-v2/09-decision-register.md)。

## Technical Assessment

> 状态：`implementation-ready`，仅限本次已获授权的治理文档更新；C2 / C3 功能实现仍未 Ready。

当前事实与处理：

| 事实 / 风险 | 本次处理 |
| --- | --- |
| `master` 没有可解析 HEAD，全部项目文件未跟踪 | 不声称可靠历史 diff / 回滚；固定 after-state hash；明确禁止 Agent 自行建立首个 commit |
| 旧设计系统包含 Work Request、固定阶段、看板、自定义视图与固定导航 | 建立有效性地图，旧语义折叠并标 `legacy / inactive`，V2 与决策台账优先 |
| 普通交付与正式 Handoff 容易混用 | 新增“交付摘要 / Continuation Note”；只有既有工作或责任接续才进入正式 Handoff |
| 产品 Task Owner 与工程交付负责人混用 | 拆为 `Task Owner` 与 `Work Owner`，明确不互相继承 |
| 小事容易被治理流程做重 | C0 / C1 走短读取、自检 / 自审与内联产物；C2 / C3 才要求完整确认与独立 Review |
| 确认前后的技术评估顺序冲突 | Technical Assessment 分为 `pre-decision` 和 `implementation-ready` 两态 |
| Q 项容易从路线图被误当批准 | 路线图标为 `pre-decision`，逐段列出 Q 阻断，编码前清单覆盖 Q-01–Q-19 |

## 变更对象

- `AGENTS.md`
- `docs/product-v2/00-project-operating-charter.md`
- `docs/product-v2/README.md`
- `docs/product-v2/08-delivery-roadmap.md`
- `docs/product-v2/09-decision-register.md`
- `docs/product-v2/11-human-handoff.md`
- `docs/workflow/README.md`
- `docs/workflow/deviations/README.md`
- `docs/agentdoor-design-system.md`

## Review Report

| Review | 覆盖视角 | 结论 |
| --- | --- | --- |
| 陌生产品读者 | 小改、找人流程、Done、Handoff、AI 边界 | 首轮问题已修复 |
| 陌生工程读者 | 分级、DoR / DoD、baseline、Review、Deviation | 首轮问题已修复 |
| 设计 / 人性读者 | 人格、交互、旧语义污染、反监控、Handoff | Must fix 已清零；保留 DS-V2-01 Follow-up |
| 最终治理红队 | 规则冲突与绕过 | `approved`，无残留 |
| 四场景演练 | 错字、共享文案语义、人员推荐、Owner 转移接口 | `approved`，均可得到唯一安全路由 |

### Follow-up

| 后续项 | Work Owner | 期限或触发条件 | 验证方式 |
| --- | --- | --- | --- |
| `DS-V2-01`：把旧 Work Request、固定阶段、看板、自定义视图与固定导航全文迁入独立历史文档 | 设计系统维护者 | 移除“待按 V2 重构”状态，或开始实现新的 Task / 导航 UI 前 | 现行设计系统正文不再命中 `remain fixed`、`only system-default` 等旧强制句，历史链接仍可访问 |

因此本次整体结论为 `approved-with-follow-up`；该 Follow-up 不阻断治理 Revision 生效，但会阻断新的 Task / 导航 UI 直接引用旧设计正文。

## 验证证据

- 本地 Markdown 相对链接：全部可解析。
- Markdown 代码围栏与 HTML `details`：全部配对。
- 术语扫描：C0–C3 与 AI L1–L5 分离；无未标记的 `Agentdoor` 产品名；旧强制语义只存在于明确历史区。
- 陌生读者 Review：无 Blocker、无 Must fix。
- `npm run verify`：N/A，本次没有修改 UI、组件、样式或运行时代码。
- Git 历史 diff / 回滚验证：未执行且当前不可用；仓库没有 HEAD，不能扩大声明。

### After-state SHA-256

```text
0857ea5fba5775eb702b2a7d49b79e8b734c4ce5c7fc4b96b2f7c3ab67ad9008  AGENTS.md
93bc0353588494dba39fa4c410ab5990a2d1c57b81c6121b8d4efc349498ec18  docs/product-v2/00-project-operating-charter.md
016f45e24c659cb385eb76b9bf4810c6d7bf3d21bcc592f628bc22e80de71ad7  docs/product-v2/README.md
7cd50452157bc1fa8543df03792ac3830478a0cea96b2cfdc43188fbba624250  docs/product-v2/08-delivery-roadmap.md
e8953df189a16a8964f8082caab19cae3ae62462bfa2975eb8f628d4341f5fda  docs/product-v2/09-decision-register.md
68589ed41f0f51171c8f28e4837bd6e8b1784d78ab80a967392d22b6f88dd5b2  docs/product-v2/11-human-handoff.md
a59321498002e2e995636e27c218302e175c011a999eff0f4229acfea28d7847  docs/workflow/README.md
7d41431b8d4a71c3e0fb2f7ba483cd410363ac786f6abc5f1d029d95d9fb29a7  docs/workflow/deviations/README.md
d7cd3016e0a256459efdfa0eb6f31315d3efb49554bb016050177bba466f1d51  docs/agentdoor-design-system.md
```

## 交付摘要

- **结果**：`GOVERNANCE-2026-08-26-r1` 已形成并通过独立治理、场景、设计 / 人性审查。
- **明确未做**：未修改功能代码；未确认 Q-01–Q-19；未建立 Git baseline；未迁移 DS-V2-01 历史正文。
- **当前边界**：文档治理可以生效；C2 / C3 功能实现需先由人类批准 Git baseline 或宪章规定的等效机制，并确认相关 Q 项。
- **正式 Handoff**：N/A。本次是向产品负责人交付治理结果，没有转移既有产品 Task、Todo、Responsibility 或 Task Owner。
