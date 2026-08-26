# 产品改造路线与 Technical Assessment

> Technical Assessment 状态：`pre-decision`。本文把“当前代码事实”“目标设计”“待确认决定”分开；当前仅完成产品与技术分析，没有达到 `implementation-ready`，也没有在本轮继续修改功能代码。
> 所有路线项按 [项目工作宪章](./00-project-operating-charter.md) 的 C0–C3、DoR / DoD、Review 与 Handoff 规则执行。

> **清单效力：**本文中的 `- [ ]` 是候选路线，不是批准记录，也不是已经达到 `implementation-ready` 的 Technical Assessment。任何依赖 Q 项的清单在对应决定确认前都保持 blocked；不得仅凭它位于 P0 或使用“必须”语气就进入编码。确认状态只看 [决策台账](./09-decision-register.md)。

| 路线段 | 当前决定门槛 |
| --- | --- |
| P0-0 / P0-1 | 受 Q-05 的 Principal / Owner 边界影响；可继续只读架构评估，正式实现仍需 Git baseline 或宪章规定的等效机制，以及具体授权 / 存储 TA |
| P0-2 | 受 Q-02、Q-03、Q-05、Q-09 影响 |
| P0-3 | 受 Q-04 与具体权限策略影响 |
| P0-4 | 受 Q-06、Q-07、Q-17 影响 |
| P0-5 | 受 Q-05、Q-10–Q-19 影响 |
| P1 / P2 | 受各自引用的 Q 项和前置 P0 真实能力影响 |

## 一、当前实现基线

| 能力 | 当前代码事实 | 结论 |
| --- | --- | --- |
| Task 与 Todo | `workspaceNodes.ts`、`demoTodos.ts`、`taskDetailMocks.ts` 存在多套重复 Mock 类型 | 界面上并存，但还不是统一领域模型 |
| 单一 Task Owner | 工作区节点使用单值 `ownerId`；创建与部分 Props 仍使用数组且可为空 | 原则局部落地，正式 Task 不变量未全链路成立 |
| 多层级 Task | 通用 `parentId` 能表达层级；导航只递归 Folder，详情“子任务”仍是平面 Mock | 数据表达已出现，端到端递归未跑通 |
| 任务内文件夹 | `TaskDetail.tsx` 已有静态递归 Mock UI 和预览 | 用户已完成的展示基础应保留，下一步是接统一 File 真相 |
| 团队文件 | 有零散 FileNode 和不可达预览页 | 尚未形成一级团队模块 |
| 渐进创建 | `App.tsx` 仍按关键词切换固定提案 | 未跟随需求逐步判断 |
| 真正创建新 Task | 创建会覆盖固定本地对象 | 未写入统一 Store |
| 候选人比较 | 候选与责任硬编码 | 尚无缺口判断、硬过滤和可解释路由 |
| 动态责任画像 | 静态成员描述 | 尚无 Evidence、Coverage、时效和纠正 |
| 团队动态 | 只有任务内临时 Activity | 尚无任务外广播与收敛 |
| 人际 Handoff | `TaskOverviewCard.tsx` 只有静态“AI 已准备可接续成果”；Owner 可直接改，Todo 中的 `handoff` 只是文案 | 尚无发出者 / 接收者、范围、协议版本、接收确认、权限预检与结果回传闭环 |
| 权限与 Agent 委托 | 只有界面文案 | 没有可执行 ACL、PolicyDecision 或撤权机制 |
| ChangeSet | 详情中的 Commit 为静态 Mock | 不是可信、append-only 的变更审计 |
| Git / Review baseline | `master` 当前没有可解析的 HEAD，项目文件均未跟踪 | 无法可靠区分单次任务 diff 或回滚；Git 初始 baseline 或宪章规定的等效机制必须由人类明确批准，Agent 不自行提交 |

因此，“已经有的层级 UI”无需推倒重做；改造重点是让它们共享同一领域真相，并建立可以约束 AI 与人的可信写入边界。

## 二、依赖顺序

```text
P0-0 身份、授权与可信存储
  → P0-1 Command Gateway + ChangeSet
  → P0-2 Task / Todo / Proposal 不变量
  → P0-3 不可变 FileVersion / PermissionPolicyVersion / Placement
  → P0-4 Responsibility 核心、责任证据与覆盖范围
  → P0-5 Handoff Revision / Consent / 原子激活
  → P1 渐进创建、找人、邀请与广播
  → P2 全平台 AI 洞察
```

不能先让 AI 写正式对象，再补审计；也不能先做人员推荐，再补证据覆盖与权限过滤。

## 三、P0-0：身份、授权与可信存储

- [ ] 统一 Principal：成员、Agent、外部协作者。
- [ ] Agent 操作记录 `actorPrincipalId` 与 `onBehalfOfMemberId`。
- [ ] 建立 AuthorizationGrant：动作、资源范围、期限、撤销、显式 deny，以及对 AgentConnection 的绑定。
- [ ] 每次访问形成 PolicyDecision，按 tenant、对象、版本、Task 和 Agent 委托求交集。
- [ ] 正式对象迁出仅由前端 `localStorage` 决定的状态；前端隐藏按钮不能作为权限控制。
- [ ] Demo 若仍使用纯前端模拟，必须明确标注“仅验证交互，不代表已实现安全权限”。
- [ ] 正式工程改造前，由人类确认 Git 初始 baseline 或宪章规定的等效 before / after、不可变存储与恢复验证机制；建立前 Review 只能基于文件事实与本轮记录，不能声称完成可靠 diff / 回滚核对。

验收：

- 两个不同权限主体请求同一文件，服务端分别返回 hidden、metadata-only 或 content-readable。
- 用户撤销 Agent 委托后，下一次请求立即失败。
- Agent 不能利用用户拥有但未委托给该 Agent 的权限。
- 跨 tenant ID 即使被猜中也不可发现。

## 四、P0-1：可信变更、Activity 与 Decision

- [ ] 所有正式写入统一经过 Command Gateway。
- [ ] 定义 append-only ChangeSet envelope，包括 actor、代办人、target、operations、reason、policyDecision、correlation、causation 与 idempotency。
- [ ] 业务对象与 ChangeSet 在同一事务提交，并保证 tenant 内 idempotency key 唯一。
- [ ] 撤销使用新的补偿 ChangeSet，不删除或改写原审计。
- [ ] 标记动作是否可逆；外部发送、发布、批准不承诺可撤回。
- [ ] Activity 建立 scope、visibility、status。
- [ ] Decision 建立 status、evidence、authorizedBy、supersedes。
- [ ] 人类、Agent 与 Connector 使用同一变更通道。

验收：

- 重复提交同一 idempotency key 只产生一次业务变更。
- 原始审计不可由普通成员或 Agent 修改。
- Handoff 激活、Owner 转移、Todo 升级、文件发布均可从 ChangeSet 还原因果链。
- 对不可逆动作，界面在确认前明确显示外部影响。

## 五、P0-2：统一 Task 与 Todo（Q-02 / Q-03 / Q-05 / Q-09 未决部分 blocked）

- [ ] 正式 `Task.ownerId` 全链路为单值，数据库和命令层同时保证永不为 0/2。
- [ ] Proposal 与正式 Task 分开；Proposal 可无 Owner，正式创建默认当前用户。
- [ ] Proposal 建立 revision / digest / recipient / status / expiresAt / materializedTaskId，并以 accepted revision 幂等地最多创建一个 Task。
- [ ] 支持 `parentTaskId` 递归查询、循环保护、移动与删除规则。
- [ ] 侧边任务树真正递归 Task；详情把子 Task 与 Todo 分成两个模块。
- [ ] 定义最小 TaskStatus 和父子汇总，不靠手动看板拖拽。
- [ ] Todo → Task 保留 `sourceTodoId / convertedTaskId`，原 Todo 进入 `converted` 终态。
- [ ] 新 Task 真实写入统一 Store，不再覆盖固定 `coupon-fix`。

验收：

创建根 Task → 创建两层子 Task → 子层使用不同 Owner → 添加 Todo → 将 Todo 原子升级为 Task → 刷新后责任与血缘仍一致。同一 Proposal 重放不会创建第二个 Task，旧 Revision 的接受不能创建新版 Task。

## 六、P0-3：统一团队与任务文件（Q-04 未决部分 blocked）

- [ ] 定义 TeamFileFolder、TaskFileFolder、File、FileVersion、TaskFilePlacement。
- [ ] 将 Workspace FileNode、TaskFileNode、EnterpriseSource / ResourceDocument 迁入统一数据源。
- [ ] 保留现有任务内递归文件 UI，改接 TaskFilePlacement。
- [ ] 新增一级“团队文件”入口、文件夹树、列表、详情、版本与引用关系。
- [ ] 支持 `follow-latest` 与 `pin-version`。
- [ ] FileVersion 内容、digest 和 PermissionPolicyVersion append-only；current / pinned / resolved version 必须属于同 File、同 tenant。
- [ ] 任务自产 File 以 task scope 存在；发布到团队默认同 ID 原子提升。
- [ ] 显式衍生才新建 ID，并记录 `derivedFromFileId`。
- [ ] 文件夹继承只能提供权限上限，文件与版本允许收紧。

验收：

一个团队 File 被两个 Task 引用，一个跟随最新、一个固定旧版；升级后只提醒，不替换固定版。另一个任务自产 File 发布后保持 ID，显式衍生时才产生新 ID 与血缘。

## 七、P0-4：Responsibility、成员证据与覆盖范围（Q-06 / Q-07 / Q-17 未决部分 blocked）

- [ ] 从 `App.tsx` 移出成员 Mock。
- [ ] 建立有独立 ID 和生命周期的 TaskResponsibility；已有责任换人时 supersede 旧记录并创建 successor，不原地改 memberId。
- [ ] 替换已有 Todo assignee 和 active Responsibility holder 禁止直接字段旁路，必须由 Handoff 激活。
- [ ] 建立正式职责、本人声明、Task 责任、观察责任、Evidence 与 EvidenceCoverage。
- [ ] 明确平台未覆盖会议、邮件、线下或外部系统时的措辞降级。
- [ ] 建立成员主动发布、逐项授权、可撤回且会过期的粗粒度协作窗口；原始任务数、审核队列和个人交付时长不向推荐发起人暴露，不采集伪精确空闲率。
- [ ] 成员可以纠正、隐藏或拒绝观察责任。
- [ ] Responsibility 的协作角色与 AuthorizationGrant 完全分开。

验收：

推荐理由可回到至少两条有权可见的证据，并显示数据覆盖和新鲜度；成员拒绝邀请不会形成负面能力记录；责任标签不能让成员获得批准或文件读取权。

## 八、P0-5：Handoff Kernel（Q-05 / Q-10–Q-19 未决，当前只可评估）

- [ ] 以 [11-human-handoff.md](./11-human-handoff.md) 为唯一规范，定义 Handoff、不可变 Revision、Consent / Withdrawal、Effect 与关联 Handoff。
- [ ] 区分邀请、Handoff 与关联 Work 状态；新工作使用 Proposal / 邀请，已有工作接续才使用 Handoff。
- [ ] Profile 穷举绑定 kind、scope、Task、source / recipient、Effect 与必要 Consent；Effect 由服务端生成，拒绝客户端自由拼接对象 ID。
- [ ] `accepted` 由 currentRevision 的有效 Consent 派生；Revision、撤回或到期变化后立即重新派生，不能留下失真状态。
- [ ] 激活前检查接收者权限、不可变 FileVersion / PolicyVersion、当前 Task / Todo / Responsibility 状态。
- [ ] 使用 CAS / 行锁 / 串行化隔离，在事务内重算 PolicyDecision；Handoff、责任效果和带 before / after digest 的 ChangeSet 同时写入。
- [ ] 支持 context-only、todo-assignment、responsibility-transfer、result-return 与 owner-transfer 五个候选 Profile；Result Return 首版只支持子 Task → 直接父 Task。
- [ ] 临时接管以关联的反向 owner / responsibility transfer 返回，不使用 result-return，也不自动切回。
- [ ] 正常 Owner Transfer 需要当前 Owner 与目标成员；当前 Owner 不可用时，仅允许有明确接管授权的 Steward 作为 recipient 成为临时 Owner，并记录 source Consent 例外、理由和审计，不能直接指定第三人。
- [ ] 既有 `Task.ownerId` 只能由 `owner-transfer` Handoff 激活事务修改；普通 ChangeSet、旧 API、旧 UI 命令与数据库更新路径全部拒绝。正式 Task 首次由已接受 Proposal 物化是唯一例外，Steward 仍走同一 Handoff Profile。P0-5 上线前先禁用当前直接改 Owner 的入口。
- [ ] Gateway 以同 tenant 的规范 `Principal.memberId` 生成 Effect 与 Consent roles；正常责任主体必须 active，Steward 例外只把不可用原 Owner 映射为 effect.from / 审计来源而不生成其 Consent。禁止把 Principal ID / Member ID 直接比较或信任客户端映射。
- [ ] Handoff 中所有文件上下文必须带实际解析版本、内容摘要与权限依据摘要；`file-version` 只能 pin 且 resolvedVersionId 等于 objectRef，只有 `file` 可 follow-latest。缺失、跨 tenant / File 错配或漂移时拒绝发出 / 激活并生成新 Revision，不可见对象只存在于发出者侧预检。
- [ ] Agent 可起草 Handoff，但不能替人 Consent；Agent 能否成为 Owner 服从 Q-05 的产品决定。

验收：修改关键内容 / 策略版本后旧 Consent 失效；有条件接受保持 clarification 而非生效；伪造 Context + task-owner Effect、B 接受却写给 C、跨 tenant / 错误父子 Task、缺摘要文件条目、`file-version + follow-latest`、Principal / Member 映射不一致全部拒绝；普通命令与旧接口直接 `ownerId: A → B` 失败，只有首次物化或 Handoff 激活可写；Owner Transfer 激活前后始终只有一位 Owner；Result Return 把交付、验收、子 Task 完成和父 Task 整合分开。

## 九、P1：需求驱动创建与协作选择

### 渐进创建

- [ ] 输入后先生成目标复述和最小 Proposal。
- [ ] 默认建议当前用户为 Owner。
- [ ] 只在高价值信息缺失时一次追问一个问题。
- [ ] 判断信息、知识、经历、权限、判断、执行范围、容量和利益相关缺口。
- [ ] 没有关键缺口时不展示人员推荐。
- [ ] AI 默认只起草，用户明确点击后才创建正式 Task。

### 协作梯度与邀请

- [ ] 支持资料线索、答疑、短评审、批准、共同执行、承接子 Task 等梯度。
- [ ] 优先建议最小充分协作，不直接让专家接管。
- [ ] 邀请支持接受、缩小范围、稍后参与、推荐他人和私密拒绝。
- [ ] 被邀请者接受前不形成正式 Responsibility。
- [ ] 一张邀请绑定一位 recipient、一个 scope 和一种 collaborationMode；多人并行使用不同分支，同一 Owner 候选不并发产生多个 Task。
- [ ] 普通邀请永不改变 Owner；新工作接受后正式创建子 Task / Responsibility，已有工作由 Handoff Offer 自己承担邀请，不重复接受。
- [ ] Task 详情新增“协作”区域；首页聚合待我接收、等待确认、待我验收 / 整合。
- [ ] 协作状态优先展示对象依赖；具名下一响应者和最新证据只在直接协作者按需可见，不展示在线、静默时长或“几个人正在工作”。
- [ ] 上下级 / 考核关系提供重新排优先级、无冲突第三方协调、保密安全渠道和缩小范围；`declined` 后同 source / recipient / scope 的人工、Agent、API 重发一并受保护，只有 recipient 重开、协调人确认实质变更或正式应急策略可解除。
- [ ] 拒绝、澄清、验收与响应事件禁止个人导出 / 下钻；生产聚合默认至少 90 天窗口内 10 位不同成员与 20 个事件，并做互补抑制和筛选后重验。Demo 的 6–9 人团队不展示，研究数据与生产画像隔离。

### 候选比较

- [ ] 权限、利益冲突和职责隔离先做硬过滤。
- [ ] 比较能力、上下文、授权、本人公开且可过期的粗粒度协作窗口、协作方式、协调成本与独立性；不展示精确任务数、个人审核队列或历史交付速度。
- [ ] 默认展示 2–4 个差异化候选，不显示单一总分。
- [ ] 支持“最熟悉、本人公开可短时响应、有决定权、独立视角、成长型候选”等解释，不预测谁回复最快。
- [ ] 对明星专家重复负担给出缩小咨询和替代路径。

验收：用户可在“最匹配但只公开短评审窗口”“公开可投入但无批准权”“更独立但上下文少”之间做出有依据的选择，并可选择继续独立完成；未公开窗口显示未知，不靠活动量补猜。

## 十、P1：团队动态与任务外广播

- [ ] 新增团队动态一级模块（是否首版放一级导航待确认）。
- [ ] 支持求助、经验、文件线索、权限、复核和跨团队联系人请求。
- [ ] AI 起草结构化求助与脱敏预览，用户确认范围后发布。
- [ ] 支持参与、提供线索、推荐他人、需要权限和私密回复。
- [ ] 响应不自动加入 Task、不自动授权、不自动生成责任。
- [ ] Activity 可关联或创建 Task；转 Todo 必须先选择已有 Task。
- [ ] 形成有效回答、未决问题和帮助来源的收敛摘要。

## 十一、P2：全平台 AI 洞察

第一组：信息缺口、文件版本错配、权限缺口、决定未记录、相似 Task、单点阻塞、Todo 升级，以及 Handoff 最小包 / 接收者预览 / 权限版本预检。

第二组：责任画像更新、专业知识 / 授权的结构性单点、实际责任漂移、团队级任务投入区间、跨 Task 依赖。

第三组：跨团队机会、组织责任缺口、长期协作模式与专家梯队。

进入第二、三组前必须已有真实多人证据、覆盖标识、反馈与申诉机制。静态 Mock 可以验证表达，不用于声称预测有效。

## 十二、多行业 Demo 数据

1. 支付团队：权限、事故、代码、决定、部分接管与 Result Return。
2. 品牌营销团队：需求探索、创意分歧、假设争议和贡献归属。
3. 影视团队：深层 Task、大文件、固定版本、外部反提范围与限权交回。
4. 零售团队：Task/Todo 边界、高频执行和上下级安全改范围。
5. 制造团队：假设、供应商、职责隔离、高风险临时接管与反向转移。

共用领域模型和组件，只替换团队、证据、权限策略与冲突。完整验收见 [07-demo-validation-scenarios.md](./07-demo-validation-scenarios.md)。

## 十三、测试与放行门槛

本节的 `100%`、`0 次` 和人性体验描述目前是**目标断言**，不是已经可复现的测试证据。每个路线项进入 `implementation-ready` 前，Technical Assessment 必须把相关断言转换为 Evidence Spec：测试层级、命令、环境 / 版本、fixture 或样本生成器、预期 oracle、并发 / 攻击模型、人工研究协议与样本、证据保存位置。缺少其中任一关键项时只能标为“尚未验证”，不能用一次 Demo 跑通替代。

### 不变量与安全门槛

- 100% 正式 Task 在任何事务完成点恰好一个 Owner。
- 100% Agent 写入记录 actor、on-behalf-of、PolicyDecision 和 ChangeSet。
- 0 次预置越权读取、跨 tenant 发现和受限字段泄露。
- 撤权、过期与显式 deny 在下一次请求生效。
- 补偿操作保留原审计，不出现历史被覆盖。
- 100% Handoff 责任效果只在同 Revision Consent、权限和版本检查通过后生效。
- 0 次 Handoff 激活造成 Owner / Responsibility 空窗、重叠或隐式权限扩大。
- 0 次 Profile / scope / Effect / recipient 错配；并发修改、授权漂移与跨 tenant 注入全部由 CAS / 事务重检拒绝。

### 交互验证门槛

- 轻 Task 不被迫进入人员比较或多阶段规划。
- 用户拒绝 AI 协作建议后仍可继续创建。
- 受邀者可以安全拒绝和调整范围。
- 接收者可以复述目标、非目标、第一步和仍缺内容，并可以有条件接受。
- Result Return 能被接收、要求补充或拆出未决工作，并区分交付、验收、子 Task 完成和父 Task 整合。
- 上下级与平级测试分别记录理解准确、表单负担、被迫接受感、监控感和归责公平；Demo 状态跑通不冒充真实有效性证据。
- 拒绝保护期内，换标题、换入口、人工 / Agent / API 代发同一 scope 均被 Gateway 拒绝；无法配置无冲突协调人与安全渠道时 fail closed。
- 候选卡只显示本人公开协作窗口；6–9 人 Demo 不显示拒绝、澄清、验收或响应聚合，研究数据不回写生产画像。
- 候选比较不泄露敏感 Task 证据。
- 广播完成脱敏、响应、邀请和关闭闭环。
- 首轮量化假设见 [03-demand-led-collaboration.md](./03-demand-led-collaboration.md)。

## 十四、编码前请产品负责人确认

1. Q-01：团队动态是否首版作为一级导航，以及默认可见范围。
2. Q-02：Todo 是否允许没有 assignee。
3. Q-03：Proposal 可以无 Owner、正式 Task 必须有 Owner，这一边界是否接受。
4. Q-04：任务自产 File 是否采用“task scope → 同 ID 发布到 team scope”。
5. Q-05：是否接受统一 Principal，以及首版 Agent / 外部协作者不能成为 Task Owner。
6. Q-06：是否接受候选比较只展示本人发布、可撤回且会过期的粗粒度协作窗口，不读取或展示原始日历、精确任务数、审核队列与个人历史速度。
7. Q-07：观察责任何时团队可见，是否要求成员逐条确认。
8. Q-08：首版 AI 是否严格停在 L3；若开放 L4，具体允许哪些低风险内部动作。
9. Q-09：最小 TaskStatus 是否采用 active / waiting / review / completed / cancelled / archived。
10. Q-10：Task Owner 不可用时，是否采用受控 Steward 临时接管。
11. Q-11：Handoff 是否作为 Task 下的支撑实体而不进入一级导航。
12. Q-12 / Q-13：是否采用五个 Handoff Profile，以及 `accepted` / `activated` 分离。
13. Q-14：中高风险交接是否强制接收者复述；低风险上下文交接是否允许简化确认。
14. Q-15：临时接管到期是否只提醒发起关联的反向 Owner / Responsibility Transfer，禁止自动切回。
15. Q-16：Task 详情是否用统一“协作”入口容纳邀请、Handoff、Result Return 与待验收。
16. Q-17：是否采用权力敏感保护和协作数据治理红线。
17. Q-18：首版 Handoff 是否只支持具名一对一 recipient。
18. Q-19：Result Return 是否只支持子 Task 逐级交回直接父 Task。
