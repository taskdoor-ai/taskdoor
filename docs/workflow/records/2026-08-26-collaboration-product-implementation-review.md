# AgentDoor 协作内核产品改造 Review

> Work Owner / 汇总人：主 Agent
> Reviewer：`decision_reviewer`
> 覆盖视角：产品、架构、人性、设计、安全与隐私
> 绑定 Decision：`2026-08-26-collaboration-product-implementation-decision.md` Revision 2
> 结论：`blocked-pending-decision`

## 需求符合度

- 已把“基于现有功能改造，而不是推倒重来”落实为逐项保留、修改、新增、隔离清单。
- 已保留 TaskDetail 的视觉骨架、任务组织目录、多层 Task、递归文件树、列表、Todo 详情和 Agent 上下文，并为现有信息建立迁移矩阵。
- 已形成从需求、默认自己负责、缺口识别、主动找人、范围协商、Handoff、Result Return 到责任证据的整体协作路径。
- 已明确区分已确认产品原则、建议默认和仍待产品负责人确认的 Q 项；没有把方案冒充已决定功能。
- 没有进入未经授权的代码修改、依赖安装、初始 Git commit 或真实数据接入。

## 标准符合度

- **产品不变量**：正式 Task 恰好一位人类 Owner；Proposal 不产生责任；子 Task 独立拥有 Owner；邀请、接受、生效和验收分开。
- **架构 / 数据**：TaskFolder、父子 Task、TeamFileFolder、TaskFileFolder 和 File placement 已分开；统一 DemoRepository 是唯一读写真相。
- **权限 / 隐私**：前端 Demo 不冒充真实 ACL；无有效 Member 时不得写 repository、读取团队受限上下文或物化；候选不展示在线状态、精确负载和人员总分。
- **人性**：默认自己负责，协作由用户主动展开；接收者可以改范围、推荐他人或私密拒绝；候选为 0–4 位，不凑数、不预选。
- **UI / 无障碍 / 复用**：TaskDetail 外壳继续使用；第三方组件只做视觉构图研究，行为优先复用现有 Base UI / Radix；动效必须支持 reduced-motion。
- **测试与证据**：`npm run design:check` 通过；Markdown 代码围栏检查通过；当前没有 Git HEAD，无法形成实现 diff 或回滚证据，因此代码阶段被正确阻断。

## 问题

| 级别 | 问题 | 证据 | 必要修复 |
| --- | --- | --- | --- |
| Blocker | 产品方向尚未由产品负责人确认 | Decision Revision 2 第十一、十三节 | 确认选项 C、建议默认及 Slice 0 + 1 范围，或按 Q 编号提出例外 |
| Blocker | 工作区没有可恢复 baseline | `git rev-parse --verify HEAD` 失败；全部项目文件未跟踪 | 批准本地 Git 初始 baseline（不推送）或提供等效不可变 before / recovery 机制 |
| Blocker | Demo 安全承诺边界尚未确认 | Technical Assessment 明确 localStorage 不能证明 ACL、tenant、审计和事务 | 确认当前为高保真交互 Demo，并接受权限与审计只标记为模拟 |

## Follow-up

| 后续项 | Work Owner | 期限或触发条件 | 验证方式 |
| --- | --- | --- | --- |
| 定稿 `TaskProposal` 与 `CollaborationOffer` 的关系 | Product + Architecture | Slice 2 implementation-ready 前 | 状态、revision、recipient、Consent 和幂等路径无歧义 |
| 补齐可解析的模拟 PermissionPolicy / PolicyDecision 真相 | Architecture + Security Review | Slice 4 implementation-ready 前 | 正常、越权、撤权与版本漂移 fixture 均可复现 |
| 完成候选组件专项核验 | Design + Engineering | 复制第三方源码或新增依赖前 | 许可、来源、维护、Issue、安装和 bundle 记录齐全 |
| 完成 `DS-V2-01` | Design System Owner | 新 Task / 导航 UI 开工前 | 旧固定阶段、看板与导航强制语义迁入历史文档 |

## 复审结果

首轮 Review 为 `changes-required`，指出 File / Folder 模型、任务组织目录保留、Proposal Owner、TaskDetail 数据兼容、设计系统触发器和组件研究证据六类问题。修订后再次复审，Must-fix 已清零；当前仅因产品决定与 baseline 未完成而保持 `blocked-pending-decision`。

文档固定证据：

```text
06c07dc572637d1634083f87cf7ce1c3ec52540e4763f472118d55a3ebcac59d  2026-08-26-collaboration-product-implementation-decision.md
e85385419d781799541fc4d3d47f9ad07a1d0e079c6f2aa4326e357066f8b229  2026-08-26-collaboration-product-implementation-technical-assessment.md
d28a0dbd98103e56d321bda781d36545742f09dbdda0b84715f9e6defa36076b  collaboration-flow-v2.md
```

最终结论：方案内容可以交由产品负责人确认；在确认与 baseline 前，不得进入 C2 / C3 功能实现。
