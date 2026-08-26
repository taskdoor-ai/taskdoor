# 人与人 Handoff：工作接续协议

> 状态：人与人交接必须清晰、可接续，并与 Agent 协作遵循同一底层原则，已由产品负责人确认；具体对象、状态机和交互是待确认设计默认。  
> 核心判断：Handoff 不是“发一包文件”，而是双方对工作状态、责任边界和下一步形成共同理解，并记录接收者明确选择后完成的工作接续协议。“明确选择”不等于组织权力关系中的自由同意，因此还需要权力敏感保护。

### 阅读效力地图

| 层级 | 当前效力 |
| --- | --- |
| D-13 已确认原则 | 工作必须可接续；发送不等于接收；每层 Task 单 Owner；接收者有真实选择；结果与证据要回到整合者 |
| 保守保护基线 | 不伪造 Consent、不扩大权限、不从静默推断工作、不泄露私密拒绝原因、原责任在有效变化前继续存在；待产品细节确认期间不能开放更宽松旁路 |
| Q-11–Q-19 Proposal | Handoff 的产品位置、五类 Profile、状态机、复述强度、临时接管、一对一 recipient、Result Return 边界；精确 Schema 和界面均不得冒充已确认 |

本文中的 `must / 必须` 若用于 Q-11–Q-19 展开，只表示“采用该 Proposal 后为保持其安全性必须同时成立”，不表示产品负责人已经选择了该 Proposal。正式界面优先使用“工作交接、共享接续上下文、交回结果、移交这项责任、移交任务负责人”等作用语言，Profile 英文名属于领域 / 代码术语。

## 一、为什么 AgentDoor 必须显式设计 Handoff

团队工作真正容易断裂的地方，不只在任务创建和人员分配，还在工作跨越人与人、班次、职能、组织与 Agent 边界的时刻。

常见失败并不是“没有发消息”，而是：

- 发出者以为已经交掉，接收者以为只是让自己看看。
- 文件很多，却没有说明现状、决定理由和下一步。
- 接收者愿意帮忙，但缺少权限、时间或必要背景。
- 交接过程中出现两个人都以为对方负责，或者没有人负责。
- 原负责人担心功劳被抹去，接收者担心接下历史包袱。
- 对方点击“接受”，但双方理解的目标和范围并不一致。
- 工作完成后只说一句“做完了”，发起者仍要重新检查全部历史。

因此，AgentDoor 对 Handoff 的产品定义是：

> 把一部分上下文、工作或责任从一位协作主体移向另一位，记录接收者的明确选择、共同理解与权限就绪，并保持工作连续的双边协议。

建议默认（Q-11）：Handoff 作为 Task 下可独立审计的支撑实体，不是新的 Project，也不成为一级导航容器；该产品位置尚待确认。

## 二、截图中的 Agent 协作怎样映射到人

截图展示的其实是一个往返闭环：

```text
直接父 Task Owner 定义有界子问题
  → 多位协作者并行处理
  → 每条分支的职责与状态可见
  → 协作者回传结论和证据
  → 直接父 Task Owner 整合
  → 独立 Reviewer 再检查
```

适用于人的部分：

| Agent 协作表现 | 人际协作中的产品表达 |
| --- | --- |
| 子 Agent 有清楚名字和角色 | 显示协作者、关系类型和约定结果 |
| 每个 Agent 收到有界任务 | 明确范围、非目标、验收和权限 |
| 可以并行工作 | 独立结果正式创建为不同子 Task，Owner 各自唯一 |
| 运行中 / 已完成可见 | 只显示明确承诺和工作事件，不监控在线状态 |
| 结果回到总 Agent | 使用 Result Return 回传结果、证据与剩余风险 |
| 总 Agent 负责整合 | 直接父 Task Owner 保持当前层级的整合责任 |
| Reader 再审查 | Reviewer 接受独立复核责任，不自动成为 Owner |

不能直接照搬的是“4 个运行中”这样的进程隐喻。人不是后台进程。AgentDoor 只展示：

- 已明确接受的协作关系。
- 当前等待的对象或依赖；只在直接协作者确实需要协调时显示具名下一响应者。
- 按需可见的最近工作证据；不进入组织级人员概览。
- 是否等待权限、澄清、交付或验收。

系统不能根据在线、正在输入、静默时长或日历细节推断“他是否在工作”。

## 三、先分清协作、委托与交接（方向已确认 D-13；分类待确认 Q-12）

不是所有找人行为都是 Handoff。

| 行为 | 用户真正需要什么 | 责任变化 | AgentDoor 表达 |
| --- | --- | --- | --- |
| 求助 / 咨询 | 获得资料、判断、线索或短时评审 | Owner 不变；可不形成长期责任 | 协作邀请或团队求助 |
| 新工作委托 | 请对方完成一个尚未开始的独立结果 | 父 Task Owner 不变；新子 Task 有独立 Owner | Proposal → 接受 → 子 Task |
| 知识交接 | 让对方理解已有工作，以便继续参与 | 默认不改变责任 | `context-only Handoff` |
| 已有工作接续 | 把做到一半的 Todo 或持续责任交给他 | Todo assignee 或 Responsibility 原子变化 | `todo / responsibility Handoff` |
| 结果交回 | 协作者把产出交回给发起人整合、验收 | 子 Task 可进入 Review；父 Owner 不变 | `result-return Handoff` |
| 整个 Task 接管 | 把结果责任和持续跟进责任交出去 | Task Owner 原子替换 | `owner-transfer Handoff` |
| 请有权人批准 | 请求一个授权决定 | 不转移授权 | Decision / Authorization Request |

两个关键边界：

- 邀请回答“你愿不愿意以什么方式参与”；Handoff 回答“现在究竟交什么、接什么、何时生效”。
- 知识已经看过不等于责任已经转移；成为参与者也不等于获得批准或文件权限。

建议默认（Q-12 / Q-19）采用这棵决策树，避免把所有协作都包装成 Handoff；确认前只用于方案与 Demo 验证：

```text
只是找线索 / 判断 / 短评审？ → 求助或协作邀请
尚未开始、可独立验收的新结果？ → Proposal / 邀请 → 正式创建子 Task
已有上下文、Todo、责任或 Task 需要别人接续？ → Handoff
子 Task 完成并交给直接父 Task Owner？ → result-return Handoff
需要有权人批准？ → Decision / Authorization Request
```

新子 Task 所需背景属于 Task Brief，不因为“需要上下文”就再强制走一次 Handoff。已知接收人的已有工作移交，可以直接发出 Handoff Offer，不必先让对方重复接受一张普通邀请。团队广播只用于发现人；选定一位明确接收者后，再进入相应的邀请或 Handoff。

本文统一使用三个角色名：`Handoff source`、`Handoff recipient`、`直接父 Task Owner`。多层任务的结果逐级交回直接父 Owner，不自动越级到根 Task Owner。

## 四、对人的设计必须处理什么

### 发出者

发出者可能担心失去控制、功劳被抹去、未完成工作暴露，或者交接后仍要无限支持。

设计保护：

- 保留原贡献、决定与文件署名，Owner 变化不重写历史。
- 允许明确“已完成、未完成、最担心、不要轻易推翻的决定及理由”。
- 交接后可以保留有结束时间的 Advisor / Support Responsibility。
- 交接不是负面能力标签，也不是甩掉责任的按钮。
- 在协议激活前，原责任人仍负责。

### 接收者

接收者可能担心被塞工作、范围无限扩大、无法拒绝、缺少上下文、没有权限，或替历史问题背锅。

设计保护：

- 首屏先说清“为什么找你、接什么、不接什么、发起者还负责什么”。
- 可以澄清、改范围、有条件接受、只咨询、推荐他人、稍后处理或私密拒绝。
- 接手前展示已有问题与生效时间，区分交接前事实和接手后责任。
- 接收者可以重新选择实现方法；交的是目标、约束和证据，不是强制照做原方案。
- 接受、拒绝和澄清速度不进入个人绩效或能力画像。

### 权力关系

上下级、考核者与被考核者之间，“可以拒绝”不一定等于“安全拒绝”。因此：

- 接收者可选择“需要重新排优先级”“请第三方协调”“只接受缩小范围”，不必把问题表述成个人拒绝。
- 发出者只看到继续规划所需的结果状态，不看到私密原因、用时或历史拒绝模式；自动与人工入口都受同一防施压规则约束，不能绕过。
- 拒绝、澄清与范围协商数据不得进入个人导出、人员排名或下钻分析。
- 对存在汇报或考核关系的 Handoff，Demo 必须验证接收者是否感到被迫接受，并允许团队配置中立协调人。协调人不能处在接收者对本事项的直接汇报、考核或利益冲突链上；冲突必须披露并可更换。
- 接收者一旦 `declined`，同一 source / recipient / scope 的直接重发与提醒进入保护期：只有接收者主动重开、经无冲突协调人确认的实质范围变化，或正式应急策略才能解除。`expired` 后在权力关系场景也必须经该协调路径，不能换文案继续施压。
- 成员可通过与 Task Activity、画像和直接考核链隔离的保密安全渠道报告施压或报复；发出者与直接考核者不可读取个案。若组织无法配置无冲突协调人与安全渠道，系统保守地禁止重复发起，当前责任关系保持不变。

### 双方

双方都会受到“我以为你明白”的透明错觉影响。单个确认按钮不足以证明理解。

若采用 Q-13 / Q-14 的协议方案，闭环确认按以下步骤验证；这不是已确认的固定交互：

1. 发出者说明工作状态和请求。
2. 接收者用自己的话总结目标、范围、第一步和主要风险。
3. 系统把双方表达与共同 Revision、引用证据进行比较，指出差异；不把发出者陈述当作默认真值。
4. 有权人员确认同一协议版本。
5. 系统原子激活责任变化。

中高风险强制复述、低风险简化确认目前是待验证默认（Q-14），不是研究已经证明的固定阈值。

## 五、AgentDoor 的往返协作闭环

截图中的模式不只是单向交接，而是“工作出去、结果回来”：

```text
直接父 Task Owner 明确有界结果
  → 若是新独立结果：邀请 → 正式创建子 Task + Task Brief
  → 若是已有工作接续：Handoff Offer → 复述 / 协商 → 激活
  → 关联 Task / Todo / Responsibility 执行
  → 子 Task Owner 发起 result-return Handoff
  → 直接父 Task Owner 验收或要求补充
  → 子 Task 完成；结果随后由父 Owner 整合进父 Task
```

建议默认（Q-19）：Result Return 首版只用于“子 Task → 直接父 Task”。Todo 通过完成证据关闭；Advisor / Reviewer 的短回复沉淀为 Activity、Decision 或 File，并履行 Responsibility。若一项回复需要独立验收、持续上下文或继续拆解，它一开始就应该是子 Task。确认前只按此进行 Demo / 模型验证，不据此开放正式写入。

这里有两个不同状态：

- Handoff 状态：协议是否被理解、接受和激活。
- Work 状态：关联 Task / Todo 是否正在执行、等待、Review 或完成。

两者不能塞进一个大状态机。“协作中”是关联工作的状态，不代表交接协议仍未完成。

## 六、最小充分交接包

Handoff 包不复制完整聊天和文件树，而是从 Task、File、Decision、Activity 和 ChangeSet 引用真实上下文。

### 30 秒摘要

- 为什么现在需要交接。
- 希望接收者获得什么结果。
- 接受后什么责任会改变，什么不会改变。
- 当前风险级别和最晚响应意图。

### 工作协议

- 范围与明确非目标。
- 已完成什么、剩余什么。
- 接手后的第一个动作。
- 验收标准。
- 当前 Owner、协作者、下一项依赖；仅在直接协作者需要协调时显示具名下一响应者。
- 预计投入区间、必要的重叠支持和升级路径。

### 事实与证据

- 已确认事实。
- 已作 Decision 及理由。
- 被否决方案及不适用原因。
- 假设、未知和待验证问题。
- File List、用途、固定版本与最新版本差异。
- 外部承诺、关键依赖和触发预案。

### 接收与回执

- 接收者对目标和范围的复述。
- 接收者理解的第一步。
- 仍缺的信息、文件、权限或资源。
- 接受条件、修改范围或拒绝。
- 生效时间和交接后支持窗口。

AI 按风险和熟悉度渐进生成。轻量 Context Handoff 不强制填满所有字段；在 Q-14 确认前，其实际最小用户输入只要求：接续对象 / 引用、为什么分享、希望对方知道或回应什么，以及不改变责任的明确提示。风险级别、完整非目标、投入区间、支持窗口和复述在没有真实风险时由系统省略或后台保守推断，不强迫用户填写。若采用 Q-14，Owner Transfer、高风险运营和外部协作再要求更完整的字段与确认。

## 七、状态机与协议版本（建议默认 Q-13）

```text
draft
  → offered ─────────────────→ accepted → activated
       ├→ clarification-requested → offered（新 revision）
       └→ declined / cancelled / expired

accepted
  └→ 前置条件或关键上下文漂移 → clarification-requested / offered（新 revision）
  └→ recipient 撤回 Consent → offered；source 取消 / 到期 → cancelled / expired
```

- `offered`：已发出，但原责任关系完全不变。
- `clarification-requested`：接收者提出问题、权限缺口或范围调整。
- `accepted`：必要人员已经接受同一 Revision，但正式变更尚未写入。
- `activated`：权限和版本检查通过，责任变化与 ChangeSet 同事务生效。
- `declined`：接收者私密拒绝，不形成负面画像。

`accepted` 不是可以被客户端单独设置的事实，而是“currentRevision 的必要 Consent 均有效”所形成的派生状态。Consent 撤回、新 Revision 或到期事件发生后必须立即重新派生，不能留下“状态仍 accepted、实际已无有效 Consent”的矛盾。

当 Handoff source 本人检查当前 Revision 后点击“发出”，系统在同一命令中写入 `offered` 与该 Revision 的 source Consent，不要求发起者再点一次接受；Agent 只能起草，仍须 source 明确发出。若由第三方代拟但 source 尚未确认，则只能保存草稿或发起待 source 确认，不能伪造其 Consent。Steward 应急接管是唯一受控的 source Consent 例外，按后文规则记录。任何后续实质修改都会生成新 Revision，并使这次 source Consent 与其他旧 Consent 一并失效。

前台不单独显示含糊的“已接受”：分别写成“邀请已接受”“工作交接已同意，待生效”“结果已验收”和“关联工作进入待验收”，避免用户把四个不同对象的状态混为一谈。

任何范围、责任效果、关键 FileVersion 或验收标准变化，都生成新的不可变 Revision；旧 Consent 自动失效。

“有条件接受”是 `clarification-requested` 的用户界面动作，不写入 Consent，也不新增正式状态。条件补齐后，如果可见上下文或协议内容变化，则生成新 Revision，再由必要人员明确接受。

`declined`、`cancelled` 或 `expired` 都不改变原责任。系统可以建议换候选人、缩小范围、转团队广播，或在确有治理授权时升级给 Steward；不能根据沉默持续催促同一成员。发出者的支持窗口要写清支持主题、渠道、投入上限和结束条件，不能只放一个 `supportUntil` 日期。

防施压检查跨 Handoff 实例生效：Gateway 用服务端生成的 `interactionGuardKey` 查找既往 decline / expiry 与关联链，客户端改标题、换入口或新建 ID 都不能清空保护。实质范围变化也必须保留 `relatedHandoffId`；存在汇报 / 考核关系时仍需无冲突协调人确认，不能靠改变 digest 自证为新请求。

临时接管到期时不能自动切回原 Owner。系统只提出方向相反的新 `owner-transfer Handoff`；原 Owner 作为新 recipient 理解并接受后再激活。它不是 `result-return`。

## 八、建议领域模型（建议默认 Q-12 / Q-13）

```ts
type HandoffKind =
  | "context-only"
  | "todo-assignment"
  | "responsibility-transfer"
  | "result-return"
  | "owner-transfer";

type HandoffStatus =
  | "draft"
  | "offered"
  | "clarification-requested"
  | "accepted"
  | "activated"
  | "declined"
  | "cancelled"
  | "expired";

type Handoff = {
  id: string;
  teamId: string;
  taskId: string;
  kind: HandoffKind;

  fromPrincipalId: string;
  toPrincipalId: string;
  scopeRef:
    | { kind: "task"; id: string }
    | { kind: "todo"; id: string }
    | { kind: "responsibility"; id: string };

  currentRevision: number;
  status: HandoffStatus; // 服务端维护的投影；accepted 由 currentRevision 的有效 Consent 派生
  visibilityPolicyId: string;
  interactionGuardKey: string; // 服务端由 tenant + 双方 + scope + effect target 生成，标题或入口变化不改变
  createdByPrincipalId: string;
  relatedHandoffId?: string;
  expiresAt?: string;
  activatedAt?: string;
};

type HandoffRevision = {
  handoffId: string;
  revision: number;
  digest: string;

  reason: string;
  desiredOutcome: string;
  inScope: string[];
  outOfScope: string[];
  completedSummary: string;
  remainingWork: string;
  nextAction: string;
  acceptanceCriteria: string[];

  factRefs: string[];
  decisionRefs: string[];
  assumptions: string[];
  unknowns: string[];
  risks: string[];
  contingencyPlans: string[];
  contextItems: HandoffContextItem[];

  requestedEffect: HandoffEffect;
  targetStateDigest: string;
  riskLevel: "low" | "medium" | "high";
  supportWindow?: {
    topics: string[];
    channelRef?: string;
    effortLimit?: string;
    endsAt?: string;
    endCondition: string;
  };
  temporaryTransfer?: {
    intendedUntil: string;
    intendedReturnToMemberId: string;
  };
  createdByPrincipalId: string;
  createdAt: string;
};

type HandoffContextItem =
  | {
      objectRef: string;
      kind: "file";
      purpose: string;
      versionMode: "pin-version" | "follow-latest";
      resolvedVersionId: string;
      contentDigest: string;
      permissionBasisDigest: string;
      receiverAccess: "metadata" | "summary" | "read" | "edit";
    }
  | {
      objectRef: string; // FileVersion ID
      kind: "file-version";
      purpose: string;
      versionMode: "pin-version";
      resolvedVersionId: string; // 必须与 objectRef 相等
      contentDigest: string;
      permissionBasisDigest: string;
      receiverAccess: "metadata" | "summary" | "read" | "edit";
    }
  | {
      objectRef: string;
      kind: "decision" | "activity" | "changeset";
      purpose: string;
      objectDigest: string;
      permissionBasisDigest: string;
      receiverAccess: "metadata" | "summary" | "read";
    };

type HandoffPreflightGap = {
  // 只存在于发出者侧权限预检，绝不进入接收者可见 Revision / Manifest。
  reasonCode: "receiver-cannot-discover" | "receiver-cannot-read" | "policy-unknown";
  blocking: boolean;
};

type HandoffEffect =
  | { kind: "none" }
  | { kind: "todo-assignee"; todoId: string; fromMemberId: string; toMemberId: string }
  | { kind: "responsibility"; fromResponsibilityId: string; successorResponsibilityId: string; fromMemberId: string; toMemberId: string; validUntil?: string }
  | { kind: "task-owner"; taskId: string; fromMemberId: string; toMemberId: string }
  | { kind: "return-result"; childTaskId: string; directParentTaskId: string };

type HandoffConsent = {
  handoffId: string;
  revision: number;
  revisionDigest: string;
  principalId: string;
  roles: ("source" | "recipient" | "task-owner" | "authorized-steward")[];
  understandingSummary?: string;
  firstAction?: string;
  acceptedAt: string;
};

type HandoffConsentWithdrawal = {
  handoffId: string;
  revision: number;
  principalId: string;
  withdrawnAt: string;
  reasonVisibility: "private" | "parties";
};
```

约束：

- Handoff 必须归属一个 Task，但不是 Task 的替代品。
- 明确接收者之前使用协作推荐或团队广播；广播响应不创建 Handoff。
- 新建一个由同事拥有的子 Task，使用 Proposal / 邀请；已有工作发生接续时才使用 Handoff。
- Context Handoff 和 Result Return 可以不改变责任。
- 建议默认（Q-18）首版 recipient 只解析为一位具名主体；岗位、值班队列或广播先用于发现 / 解析接收者，知会人不等于责任接收人。确认前不开放队列级责任变化；队列级 Handoff 是否需要独立模型留待真实轮班场景验证。
- Todo 变复杂时先 Todo → Task，再进行 Owner Transfer。
- Owner Transfer 不再维护第二套握手协议，而是 `kind=owner-transfer` 的严格 Handoff Profile。
- Agent 可以起草 Handoff，不能替任何人 Consent。在 Q-05 当前建议默认下，Agent 也不能成为人类 Task Owner；若 Owner 资格决策改变，需重新审查责任和授权模型。

Handoff 两端保存 Principal ID，责任 Effect 使用现有领域对象的 Member ID。Gateway 必须通过同 tenant 的唯一 `Principal.memberId` 映射生成 Effect，禁止直接比较两个 ID 域或由客户端提交映射。正常的 Todo、Responsibility、Result Return 与 Owner Transfer 要求 source / recipient 中承担责任或 Consent 的主体为 active member；Steward 应急接管可把 suspended / revoked 的原 Owner 映射为 effect.from 和审计来源，但绝不生成其 Consent，active Steward 必须亲自成为 recipient。`context-only` 不产生 Member Effect，可在策略允许时面向具名 active external Principal；它仍不让 external 获得 Task Owner 或内部 Responsibility 身份。

`kind`、`taskId`、`scopeRef`、source / recipient、`requestedEffect` 与必要 Consent 不能由客户端任意组合。Command Gateway 必须按 Profile 做穷举校验：

| Profile | scope / task 约束 | 唯一允许的 Effect | 主体一致性 |
| --- | --- | --- | --- |
| Context | scope 属于 `taskId` | `none` | Consent 只能来自 source / recipient |
| Todo | Todo 必须属于 `taskId` | 同 Todo 的 `todo-assignee` | effect.from / to 必须分别等于 source / recipient 映射出的 memberId，source 是当前 assignee |
| Responsibility | from Responsibility 必须属于 `taskId` | supersede 原记录并创建指定 successor 的转移 | effect.from / to 必须分别等于 source / recipient 映射出的 memberId，source 是当前 active holder；旧 memberId 不原地改写 |
| Result Return | `taskId` 与 scope 都是 child Task；其父级必须是 effect.directParentTaskId | `return-result` | source 是 child Owner，recipient 是直接父 Task Owner |
| Owner Transfer | scope Task 必须等于 `taskId` | 同 Task 的 `task-owner` | effect.from / to 必须分别等于 source / recipient 映射出的 memberId，且 source 是当前 Owner |

服务端应从已验证的 Profile Command 生成 Effect，不信任客户端提交的任意对象 ID。任何不匹配直接拒绝，不能出现用 Context 的同意集合执行 Owner 变化，或由 B 接受却把责任改给 C。

## 九、激活不变量（若采用 Q-12 / Q-13 Profile）

若产品采用上述 Profile，Handoff 只有同时满足以下条件才能 `activated`；这些是该方案的安全约束，不表示 Profile 已获确认：

1. 必要角色接受同一 Revision 和 digest。
2. 接收者完成下一步所需的最低权限已经就绪。
3. 关键文件、版本和 Decision 仍可访问，没有未确认漂移。
4. 被交接的 Task、Todo 或 Responsibility 状态仍与 Revision 一致。
5. 双方表达、共同 Revision 与引用证据之间不存在未解决冲突。
6. 责任变化与 ChangeSet 在同一事务写入。
7. 事务内使用 `targetStateDigest` 做 CAS（或等价行锁 / 串行化隔离），并基于当前 AuthorizationGrant 与 PolicyVersion 重新计算 PolicyDecision；检查与写入之间不能留竞态窗口。

Handoff 激活的 ChangeSet 对被改 Task / Todo / Responsibility 必须记录 before / after digest，不能把并发安全建立在可选字段上。

建议默认的必要同意人：

| Profile | 必要 Consent | 说明 |
| --- | --- | --- |
| Context | 发出者、接收者 | 只证明上下文被接收，不产生责任 |
| Todo | 当前 assignee、拟接收人 | 若组织策略要求，Task Owner 还需授权该变化 |
| Responsibility | 当前责任人、拟接收人、Task Owner | Task Owner 只确认任务内责任边界，不替接收者接受 |
| Result Return | 交付方、接收整合的父 Task Owner | `offered=已交付`、子 Task `Review=待验收`；父 Owner Consent 后待激活，激活后子 Task 才完成；采用到父 Task 是后续整合事件 |
| Owner Transfer | 当前 Owner、拟接任 Owner | 当前 Owner 不可用时，只有具备明确接管授权的 Steward 可作为 recipient 接任临时 Owner，并以 authorized-steward 记录 source 例外与理由 |

即使必要人员已经 Consent，实际动作仍须通过 AuthorizationGrant / PolicyDecision；“同意做”与“有权改对象”是两项不同判断。

`understandingSummary` 与 `firstAction` 在模型中可选，是为了保留低风险 Context 的轻量性；若采用 Q-14，中高风险 Profile 的校验策略要求它们存在。条件接受、反提版本和拒绝是协议响应，不写成正面 Consent。

对于 Owner Transfer：

- 原 Owner 在激活前始终保留。
- 通常由当前 Owner 与目标成员接受同一 Revision。仅当当前 Owner 确实不可用且应急策略授权时，`fromPrincipalId` 仍记录当前 Owner，Steward 同时是临时 recipient 与 `createdByPrincipalId`；`authorized-steward Consent` 记录正常 source Consent 的例外，不得伪造当前 Owner Consent，也不得借例外直接把 Owner 指给第三人。
- 激活时一次性执行 `ownerId: A → B`，不能先清空，也不能短暂双 Owner。
- 正式 Task 首次由已接受 Proposal 物化后，任何 Owner 变化只能由 `owner-transfer` Handoff 激活事务写入；普通 ChangeSet、旧 UI / API、管理员直改与 Agent 命令都必须拒绝。Steward 应急路径也不例外。
- 父 Task Owner 变化不自动覆盖子 Task Owner。

对于 Result Return：

- source 发出 `offered` 时代表“已交付”，子 Task 以同一受权命令和 ChangeSet 从当前非终态进入 Review，但不等于验收；若 Handoff 随后取消、拒绝或到期，则以补偿 ChangeSet 回到发送前状态，除非 Task 已有独立的新变更，此时要求 Owner 明确处理冲突。
- 直接父 Task Owner 可以要求补充；补充形成新 Revision，也可以把剩余工作转为新 Task / Todo。
- 直接父 Task Owner 对满足验收条件的 Revision Consent 后进入 `accepted`；激活事务才把子 Task从 Review 变为 Completed。
- “把结果采用到父 Task 的方案、Decision 或 File”是父 Task 内后续整合事件，不与 Result Return 激活合并。结果已验收也不代表父 Task 已完成。

## 十、文件、版本与权限

### 通用 Handoff Manifest

现有 Agent File List 应提升为人与 Agent 共用的 Handoff Manifest：

- 每项只保存对象引用、用途、版本与接收者可见级别。
- FileVersion 内容与策略版本必须不可变；Revision digest 覆盖 fileId、resolvedVersionId、contentDigest 与 permissionBasisDigest，不能只相信一个可被原地改写的版本号。
- `kind=file` 可选择 `pin-version / follow-latest`，但当前 Revision 始终记录实际 resolvedVersionId；`kind=file-version` 只能 `pin-version`，且 `resolvedVersionId == objectRef`。Gateway 还必须验证 File、FileVersion 与 Handoff 同 tenant，版本确实属于该 File。任一条目缺少 versionMode、实际 resolvedVersionId、contentDigest 或 permissionBasisDigest 时禁止发出与激活；非文件条目必须固定 objectDigest 与 permissionBasisDigest。任一摘要不匹配都生成新 Revision。
- 关键证据和交付物默认固定 FileVersion。
- 持续编辑文件可以跟随最新，但激活时记录当时解析到的版本。
- 等待期间出现实质版本变化，系统显示 diff 并使相关 Consent 失效。
- 私人聊天和私人 Agent 对话默认不进入；用户只能明确选择经脱敏的内容。

### 权限

- Handoff 不产生授权。
- 发出者不能转发自己没有分享权的内容。
- 接收者接受工作不等于获得父 Task、所有文件、批准或发布权限。
- 接收者不可发现的对象只进入发出者侧 `HandoffPreflightGap`，不进入 Handoff Revision 或 Manifest；接收者不能看到其 objectRef、标题、来源或可反推出敏感事项的数量细节。
- 发送前和激活前都以接收者身份执行 PolicyDecision。
- 缺少关键权限时允许“有条件接受”，但不能激活。
- 外部成员的文件访问、AgentGrant 与临时支持权限分别设置期限和撤销。

若接收者无权阅读原文件，可以单独创建经过确认的脱敏摘要；摘要是有自身权限和来源血缘的新对象，不能把隐藏内容直接塞进 Handoff 文本。

## 十一、产品入口与界面（建议默认 Q-11 / Q-16）

### Task 详情

建议首版不新增“交接”一级导航。Task 详情增加“协作”区域，包含邀请、工作交接和结果交回。

协作概览借鉴截图的状态感，但以工作为中心：

```text
协作关系
4 条工作分支 · 1 待你响应 · 1 待验收

程夏  子任务负责人  已准备交回  最近证据：洞察摘要 v3
唐梨  评审人        等待证据    当前依赖：品牌规则证据
乔木  顾问          协作中      最近证据：概念批注
```

不显示“3 个人正在工作”，而显示“3 条已接受的工作关系”。最近证据默认只对该 Task 的直接协作者按需可见；组织级概览只显示对象依赖和聚合状态，不展示具名证据节奏。

### 工作交接首屏

先回答责任问题，再展示文件：

```text
责任移交：门店灰度现场协调

当前任务负责人：林洁（不变）
责任交出人：叶舟
拟接收人：陈安

陈安接受后负责：现场异常收集、门店确认和每日汇总
叶舟仍负责：培训材料与常见问题更新
不包含：扩大灰度范围、修改 POS、批准预算
```

下面依次展示目标与验收、当前状态、事实/决定/未知、文件版本与权限、接收者复述、协议 diff 和审计。

### 我的工作

首页增加三个聚合入口：

- 待我接收。
- 等待对方确认。
- 待我验收 / 整合。

邀请接受前不是 Todo；接受后只按第三节决策树物化“新参与”：可创建新 Task、Todo 或 Responsibility。替换已有 Task Owner、Todo assignee 或 active Responsibility holder 属于已有工作接续，必须走对应 Handoff Profile，普通邀请不能更新这些字段。

### 状态可见但不监控

可以显示：

- 待接收、澄清中、有条件接受、待生效、已生效。
- 关联工作正常推进、等待补充、待交回、待验收。
- 当前等待的对象或依赖；只有直接协作者确实需要协调时，才按权限显示具名下一响应者。
- 最新可验证证据按需展示，成员可以纠正其可见范围和状态说明。

不能显示：

- 在线、正在输入、静默时长。
- 根据日历或电脑活动推断的“正在工作”。
- 个人接受率、平均响应速度和处理量排名。
- 因“没有新事件”自动升级催促、把个人标成“瓶颈”，或向组织层暴露具名证据频率。
- 在拒绝保护期内由人工、Agent、API 或换一张邀请重复发起相同 scope；Command Gateway 必须统一拒绝绕过。

## 十二、AI 作为中立 Facilitator

### 发出前

- 判断用户需要求助、委托、知识交接、责任移交还是 Owner Transfer。
- 从已有对象起草最小包，区分事实、决定、假设和未知。
- 检查范围不清、责任空窗、错误版本、缺少权限、外部承诺和隐私泄露。
- 生成“接收者视角预览”，让发出者看到对方实际能看到什么。

### 接收前

- 用接收者视角解释“接受后你负责什么、发出者还负责什么”。
- 提醒容量冲突、权限缺口和职责隔离。
- 提出 1–3 个高价值澄清问题。
- 帮助接收者缩小范围、有条件接受或安全拒绝。
- 识别汇报 / 考核关系，优先提供重新排优先级、第三方协调和缩小范围，不把接受包装成自愿证明。

### 激活时

- 比较 source、recipient、共同 Revision 与引用证据，指出理解差异，不把 source 当作真值。
- 重查权限和版本。
- 生成同事务 ChangeSet。
- 通知利益相关人责任变化，但不公开拒绝原因。

### 执行与交回

- 只根据 Task、File、Decision 和 ChangeSet 的显式事件形成摘要。
- 识别范围漂移、版本变化、权限失效、反复交回和无人整合。
- 起草 Result Return：结果、证据、决定、剩余风险和建议下一步。
- 交接完成后只生成候选责任证据；实际交付被验收后才形成经验信号。

AI 不得：

- 替成员接受、拒绝或转移 Owner。
- 根据回复慢、消息少或无新事件评价投入。
- 把发出者的说法当成无争议事实。
- 自动扩大权限。
- 用一个“交接质量分”给人排序。
- 根据静默自动催促，或向发出者 / 管理者披露私密拒绝原因、响应耗时和历史模式。
- 在成员拒绝后改写标题、换入口或代发同一 scope，以规避防施压策略。

## 十三、按风险调整强度（待验证默认 Q-14）

| 风险 | 典型场景 | 最低协议 |
| --- | --- | --- |
| 低 | 分享项目背景、低风险 Todo 接续 | 异步最小包、接收确认 |
| 中 | 跨职能工作包、责任移交、外部协作者 | 接收者复述、权限与版本检查、范围确认 |
| 高 | 生产事故、出货决定、敏感权限、Owner Transfer | 直接双向沟通（可同步或结构化异步）、同 Revision Consent、明确生效时刻、必要重叠支持 |

风险依据：

- 后果是否重大或不可逆。
- 当前状态是否紧急、不稳定。
- 是否涉及敏感权限、批准或职责隔离。
- 跨团队、外部组织和依赖数量。
- 知识是否隐性、陌生或高度专业。
- 接收者对场景的熟悉程度。
- 是否存在可用时间重叠。

在 Q-14 未确认前，仅按以下保守规则做 Demo 与测试，不作为最终产品决定：组织政策先设最低风险级；系统根据上面因素提出可解释的建议级别，任一敏感权限、不可逆后果、Owner Transfer 或高权力压力触发即按高风险；信息未知时采用较高一级。发出者不能单方面降级，接收者可以随时提高强度；任何降级都要由 Task Owner 与受影响接收者共同确认理由并留记录。AI 只建议和解释，不作最终风险承诺。

关键操作执行中原则上不切换 Owner；系统先建议完成安全检查点，或使用有授权的应急协议。同步、异步、复述字段和重叠时长都是需要通过跨时区、无障碍与真实团队测试验证的交互假设。

## 十四、验证指标与反监控

衡量系统是否降低交接损耗，而不是衡量个人服从或速度：

- 激活前发现关键文件或权限缺失的比例。
- 接手后因上下文缺失重新打开或交回的比例。
- 从提出到双方形成明确范围的时间。
- Result Return 首次验收通过率。
- 是否出现 Owner / Responsibility 空窗或重叠。
- 文件变化后受影响 Handoff 被识别的比例。
- 用户是否能准确回答“我负责什么、不负责什么、第一步是什么”。
- 接收者对拒绝、改范围和纠正 AI 的安全感。
- 上下级与平级场景的被迫接受感、监控感和归责公平差异。
- 完成交接所需时间与字段负担，避免安全流程本身压垮轻任务。

反监控红线：

- 不做个人响应速度、接受率、拒绝次数和工作量排行榜。
- “没有新事件”只表示系统不知道，不表示没有工作。
- 私密拒绝原因不进入团队画像。
- 拒绝、澄清、验收与响应类事件禁止个人导出和下钻。建议默认的生产聚合硬下限是同一 90 天窗口内至少 10 位不同成员且 20 个事件；同时实施互补抑制、禁止任意交叉筛选 / 差分查询，任何筛选后的单元格都必须重新满足阈值。五行业 Demo 的 6–9 人团队因此一律不展示这些人员行为指标。阈值只降低风险，不声称实现匿名；正式上线前仍需隐私评审。
- 指标设用途与保留期限，默认只用于产品安全和流程改进，不直接用于绩效。
- 经明确同意开展的可用性研究数据必须进入与生产责任画像、推荐和绩效链路隔离的数据域；研究参与者可撤回，结果只按合格群体汇总。
- Handoff 数量不能等同于贡献；验收证据和真实责任才可以成为候选画像证据。

## 十五、跨行业首轮验收

### 支付事故：结果交回

```text
江南完成“定位重复扣款链路”子 Task
  → 发起 result-return Handoff 给直接父 Task Owner 林野
  → 包含修复草案、异常路径、固定日志版本和一项未决业务规则
  → 林野复述：“代码结论可接收，但业务规则仍需许程确认”
  → 系统发现林野无业务批准权，不把未决规则包装成事实
  → 林野接收技术结果，子 Task 完成；规则问题形成 Decision Request
```

### 零售运营：责任移交

培训负责人休假前把门店答疑责任交给区域督导。接收者先发现两家店配方文件无权读取，选择有条件接受；权限补齐并重新确认后，Responsibility 才原子变化，根 Task Owner 不变。

### 影视制作：外部交回

调色供应商返回锁片结果，只能引用授权的代理文件和交付版。内部后期 Owner 验收后接入主 Task；供应商不能看到合同、演员或其他供应商目录。

### 制造质量：高风险临时接管

质量 Owner 临时离场，接收者必须检查在制品状态、图纸版本、出货冻结和客户通知权限。系统明确生效时刻；返回原 Owner 时发起方向相反的新 owner-transfer Handoff，不按时间自动切回，也不与结果交回混用。

### 品牌营销：知识交接

洞察负责人把已确认人群、证据边界和未验证假设交给创意负责人。接收者确认理解，但不因此成为传播根 Task Owner，也不获得预算批准权。

## 十六、研究依据与证据边界

- AHRQ 的闭环沟通要求发送、接收反馈和发送者确认；其 Handoff 指南明确强调，在接收者理解并接受前，原责任人仍然负责。[AHRQ TeamSTEPPS](https://www.ahrq.gov/teamstepps-program/curriculum/communication/overview/index.html)
- I-PASS 将状态、摘要、行动、预案和接收者综合纳入结构化交接；九家医院实施完整 Bundle 后，研究观察到医疗错误和可预防不良事件下降。这里支持“结构化 + 双向确认”，不证明某张表单可以直接迁移到知识工作。[NEJM I-PASS 研究](https://www.nejm.org/doi/full/10.1056/NEJMsa1405556)
- FAA 的责任移交流程包含接收者预览、双向提问、明确接管时刻和交接后复核，并要求双方对完整性共同负责。[FAA Transfer of Position Responsibility](https://www.faa.gov/air_traffic/publications/atpubs/atc_html/appendix_a.html)
- 英国 HSE 把准备、双向交接和接收者复核视为连续过程，并建议根据接收者信息需要和风险调整资源。[HSE Shift Handover](https://www.hse.gov.uk/humanfactors/topics/shift-handover.htm)
- NASA 的运行交接研究强调，与其罗列历史事件，不如说明问题、假设、意图和预期状态；异常、新人和中断后回归需要更深交接。[NASA Human Factors Shift Handover](https://human-factors.arc.nasa.gov/publications/Parke_MER_SurfaceOps_Handovers_05.pdf)
- 组织内知识转移研究显示，主要障碍不仅是意愿，还包括接收者吸收能力、因果含糊和双方关系困难。[Szulanski 1996](https://doi.org/10.1002/smj.4250171105)
- 共享心智模型研究支持让双方共享目标、约束和知识结构，而不是倾倒全部内容。[DeChurch & Mesmer-Magnus 2010](https://doi.org/10.1037/a0017455)
- 工作心理所有权可能促进投入，也可能通过领地防御降低信息交换，因此产品要保留贡献归属，同时避免旧责任人持续控制。[Chen et al. 2023](https://pubmed.ncbi.nlm.nih.gov/36006739/)
- 心理安全与自主支持型帮助说明，提问、拒绝和调整范围必须是合法动作，不应被当成低能力信号。[Edmondson 1999](https://doi.org/10.2307/2666999)、[Nadler & Chernyak-Hai 2014](https://pubmed.ncbi.nlm.nih.gov/23978066/)

这些研究主要来自医疗、航空、高可靠组织和组织心理学，只支持底层原则，不证明 AgentDoor 的字段、状态或阈值已经有效。具体交互仍需通过五行业 Demo 和真实团队试点验证。

## 十七、待确认设计

1. Q-11：Handoff 是否作为 Task 下可独立审计的支撑实体，但不进入一级导航。
2. Q-12：是否采用 Context、Todo、Responsibility、Result Return、Owner Transfer 五种 Profile。
3. Q-14：中高风险 Handoff 是否强制接收者复述；低风险是否允许简化确认。
4. Q-13：`accepted` 与 `activated` 是否分开，确保“愿意接”不等于责任已经生效。
5. Q-15：临时接管到期是否只提醒发起方向相反的新 Owner / Responsibility Transfer，禁止自动切回。
6. Q-16：Task 详情是否统一使用“协作”区域容纳邀请、Handoff 和结果交回。
7. Q-17：是否采用权力敏感保护的建议默认：重新排优先级 / 无冲突协调 / 保密安全渠道；同 scope 的人工和自动重复发起共同受保护；拒绝类数据不下钻，生产聚合至少 90 天内 10 人 / 20 事件并做抑制，Demo 小团队不展示，研究数据与生产画像隔离。确认前按这一保守基线设计，不开放更宽松旁路。
8. Q-18：首版是否只支持具名一对一 recipient；岗位 / 值班队列先解析到明确成员后再交接。
9. Q-19：Result Return 是否首版仅支持子 Task 逐级交回直接父 Task，其余短回复使用 Activity / Decision / File。
