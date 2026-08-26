# 信息架构与领域模型

> 状态：任务/待办保留、任务多层级、正式任务单 Owner、任务文件层级、团队文件夹与人际 Handoff 必须清晰已经确认；主体、权限、Handoff Profile、状态机与发布协议是编码前建议，需在决策台账确认。

## 一、模块结构

```text
AgentDoor
├── 首页 / 我的工作
├── 任务
│   ├── 全部任务
│   ├── 任务树
│   └── 任务详情：概览 / 子任务 / 待办 / 文件 / 协作 / 动态 / 决定 / 变更
├── 我的待办
├── 团队文件
│   ├── 文件夹树
│   ├── 文件列表与预览
│   ├── 版本与权限
│   └── 被哪些任务引用
├── 团队动态
│   ├── 求助与广播
│   ├── 经验与机会
│   └── 我的关注与响应
├── 团队成员
│   ├── 正式职责
│   ├── 实际责任画像
│   ├── 当前承诺
│   └── 协作证据
├── 连接 AI
└── 设置与治理
```

任务、待办和文件是日常工作对象；成员、动态、决定、变更、授权和证据是支撑协作闭环的领域对象。产品“极简”指不再增加项目、计划、里程碑等平行容器，不代表用一个万能表承载所有语义。

## 二、协作主体与可信写入边界

### 统一主体

平台需要先回答“谁在做、代表谁做”，再讨论 AI 能做什么。

```ts
type PrincipalBase = {
  id: string;
  tenantId: string;
  status: "active" | "suspended" | "revoked";
};

type Principal =
  | (PrincipalBase & { type: "member"; memberId: string })
  | (PrincipalBase & { type: "agent" })
  | (PrincipalBase & { type: "external"; externalSubjectId: string });

type AgentConnection = {
  principalId: string;
  delegatedByMemberId: string;
  connectorId: string;
  status: "active" | "revoked";
};
```

- 以下 Owner 资格是 Q-05 的建议默认，尚未由产品负责人确认：`member` 可成为 Task Owner；`agent` 是受某位成员委托的独立主体，不成为 Owner；`external` 首版不成为 Owner，除非先转为正式成员。
- `member Principal → Member` 的唯一规范映射是同 tenant、`type=member` 的 `Principal.memberId`；映射在 suspended / revoked 后仍保留用于历史与应急接管校验。领域命令不得把 Principal ID 与 Member ID 当作同一字符串比较。正常责任动作要求 source / recipient 与 Consent 主体为 active member；Steward 应急接管只允许把不可用的原 Owner 映射为 effect.from 和审计来源，不为其生成 Consent，recipient / Steward 仍必须 active。Handoff Consent 的角色由服务端根据该映射与当前对象状态派生，客户端不能自报角色。
- 每个操作都记录实际 `actorPrincipalId`；Agent 操作还记录 `onBehalfOfMemberId`。
- Agent 的权限不继承为“与用户完全相同”，而是用户权限、委托范围、对象策略和任务作用域的交集。

### 可信命令边界

所有正式写入必须经过统一 Command Gateway：

```text
UI / Agent / Connector
  → 身份与租户校验
  → Policy Decision
  → 领域不变量校验
  → 原子写入对象
  → 追加 ChangeSet
  → 派生 Activity / Insight
```

当前基于前端 Mock 与 `localStorage` 的 Demo 只能验证交互和领域语义，不能声称已经实现 ACL、安全授权或不可篡改审计。

## 三、任务与待办

### Proposal 不是正式任务

AI 默认只能产生可编辑 Proposal。Proposal 可以没有 Owner，也可以包含“建议由某人负责”；用户点击创建前，它不出现在正式任务树、不产生责任、不通知成员。

```ts
type TaskProposal = {
  id: string;
  teamId: string;
  title: string;
  goal?: string;
  proposedParentTaskId?: string;
  proposedOwnerId?: string;
  recipientId?: string;
  revision: number;
  revisionDigest: string;
  status: "editing" | "offered" | "scope-proposed" | "accepted" | "materialized" | "declined" | "cancelled" | "expired";
  createdForMemberId: string;
  acceptedRevision?: number;
  materializedTaskId?: string;
  expiresAt?: string;
};
```

一张 Owner 候选 Proposal 只绑定一位 recipient 和一个有界 scope。任何目标、范围、Owner 或验收变化都生成新 revision；接受只对同一 digest 有效。正式创建以 Proposal ID + accepted revision 作为幂等键，最多产生一个 `materializedTaskId`。多人并行使用不同 Proposal；同一 Owner 位置不知道找谁时先广播，不并发发送多张可自动生效的邀请。

### 正式任务

```ts
type TaskStatus =
  | "active"
  | "waiting"
  | "review"
  | "completed"
  | "cancelled"
  | "archived";

type Task = {
  id: string;
  teamId: string;
  parentTaskId?: string;
  folderId?: string;
  sourceTodoId?: string;

  title: string;
  goal?: string;
  ownerId: string;
  status: TaskStatus;

  participantIds: string[];
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
};
```

不变量：

- 正式 Task 从创建到归档始终恰好有一位有效人类 Owner，数据库与 Command Gateway 同时约束，不能出现 0 位或 2 位。
- 当前用户创建时默认自己是 Owner；若创建前选择同事，仍保持 Proposal，直到对方接受。
- 父任务和每个子任务分别维护 Owner；子任务 Owner 不自动获得父任务所有文件权限。
- 删除父任务不能静默删除子任务；移动任务不能形成循环。
- 父任务状态不覆盖子任务状态。系统计算汇总并建议变化，不替 Owner 静默推进。
- 父任务完成时若仍有活跃子任务，必须在同一操作中选择保留、迁移、取消或继续跟踪，不能留下隐性孤儿。
- `draft` 不是 TaskStatus；草稿属于 Proposal。

建议的最小状态语义：

- `active`：当前有人持续推进。
- `waiting`：明确等待外部输入、决定或权限。
- `review`：结果已形成，等待有权人验证。
- `completed`：验收证据已确认。
- `cancelled`：不再追求目标，保留历史。
- `archived`：从活跃视图收起，不改变原完成事实。

### Owner 转移

普通协作邀请与 Owner 转移是不同语义。接受咨询、评审或参与，不等于接管结果责任；实现上 Owner 转移不再维护第二套握手，而使用 `kind=owner-transfer` 的严格 Handoff Profile。

- 正常转移由目标成员与当前 Owner 接受同一不可变 Handoff Revision。
- 权限、关键文件版本和 Task 当前状态通过检查后，Handoff 才从 `accepted` 进入 `activated`。
- 激活时原子替换 `ownerId` 并追加 ChangeSet，绝不先清空旧 Owner，也不短暂出现双 Owner。
- 正式 Task 首次由已接受 Proposal 物化后，`ownerId` 只能由 `owner-transfer` Handoff 的激活事务写入；通用 UpdateTask、普通 ChangeSet、旧 API / UI、管理员或 Agent 直改一律拒绝。Steward 应急接管仍使用同一 Profile。
- 创建一个由同事拥有的子任务时，也先形成 Proposal；对方接受后再正式创建。
- 成员停用前，系统先要求处理其活跃 Task。当前 Owner 确实不可用时，具备显式接管授权的 Steward 作为 recipient 接任临时 Owner：`authorized-steward Consent` 是正常 source Consent 的受控例外，同时记录原 Owner、代发人、授权依据和原因；不得伪造原 Owner Consent，也不得借例外直接指定任意第三人。
- 在 Q-05 当前建议默认下，Agent 不能接受 Owner 转移，也不能代表目标成员接受。

### 待办

```ts
type Todo = {
  id: string;
  taskId: string;
  title: string;
  assigneeId?: string;
  status: "open" | "doing" | "done" | "cancelled" | "converted";
  commitmentAt?: string;
  fileRefIds: string[];
  sourceActivityId?: string;
  convertedTaskId?: string;
  createdByPrincipalId: string;
};
```

Todo 创建时可以保持未分配；从无 assignee 变为有人承担，先得到对方对有界工作的接受。替换已有 `assigneeId` 必须通过 `todo-assignment Handoff`，不能直接改字段绕过接续协议。

Todo 可以引用完成这一步所需的支持文件，但不拥有独立讨论空间、独立文件目录、子工作或结果责任；出现这些需求时，应升级为 Task。

| 问题 | 是 | 否 |
| --- | --- | --- |
| 是否需要单独承担结果责任？ | Task | 继续判断 |
| 是否需要独立上下文、讨论或文件空间？ | Task | 继续判断 |
| 是否可能继续拆解？ | Task | 继续判断 |
| 是否只是明确、可立即执行的一步？ | Todo | 保留在描述或建议中 |

Todo → Task 必须通过一次原子转换：

1. 生成带 `sourceTodoId` 的 Task Proposal。
2. 默认建议当前 Task Owner 或发起人，不能把 Todo assignee 静默变成 Owner。
3. 确认 Owner 后创建新 Task。
4. 原 Todo 标记为 `converted` 并写入 `convertedTaskId`，不与新 Task 双活。
5. 支持文件引用和来源 Activity 保留血缘。

团队动态只有先选择已有 `targetTaskId` 后才能转为 Todo；否则先创建 Task。生成的 Todo 保存 `sourceActivityId`。

### 任务详情

- 概览：目标、Owner、当前状态、主要风险。
- 子任务：递归任务树，只在需要时展开。
- 待办：当前层级的原子行动。
- 文件：有层级的任务文件投影视图。
- 协作：邀请、已接受的工作关系、Handoff、结果交回与待验收。
- 动态：讨论、@、AI 建议和系统事件。
- 决定：结论、选项、依据、确认人与状态。
- 变更：任务字段、Owner、责任、文件版本和 AI 写入记录。

## 四、文件与文件夹

团队文件和任务文件使用同一套 File / FileVersion 真相，但可以处于不同作用域，并在任务中拥有不同组织视图。

```ts
type TeamFileFolder = {
  id: string;
  teamId: string;
  parentFolderId?: string;
  name: string;
  permissionPolicyId: string;
};

type TaskFileFolder = {
  id: string;
  taskId: string;
  parentFolderId?: string;
  name: string;
};

type PermissionPolicyVersion = {
  id: string;
  permissionPolicyId: string;
  version: number;
  digest: string;
  rulesRef: string;
  createdAt: string;
};

type FileVersion = {
  id: string;
  fileId: string;
  versionLabel: string;
  contentRef: string;
  contentDigest: string;
  permissionPolicyVersionId?: string;
  createdByPrincipalId: string;
  createdAt: string;
};

type FileScope =
  | { kind: "task"; taskId: string }
  | { kind: "team"; teamFolderId: string };

type File = {
  id: string;
  teamId: string;
  name: string;
  source: "upload" | "connector" | "agent-output" | "native";
  lifecycle: "draft" | "published" | "archived";
  scope: FileScope;
  currentVersionId: string;
  permissionPolicyId: string;
  derivedFromFileId?: string;
};

type TaskFilePlacement = {
  id: string;
  taskId: string;
  taskFolderId?: string;
  fileId: string;
  versionMode: "follow-latest" | "pin-version";
  versionId?: string;
  purpose?: "input" | "evidence" | "working" | "delivery";
};
```

规则：

- TeamFileFolder 是团队规范目录；TaskFileFolder 只是任务内组织层，不改变 File 的真实身份或权限。
- 任务引用团队文件时新增 TaskFilePlacement，始终使用同一个 File ID。
- `pin-version` 必须带 `versionId`；`follow-latest` 读取当前版本并在变化时提示影响。
- FileVersion 是 append-only 内容快照；`contentRef`、`contentDigest`、`fileId` 与策略版本不得原地修改。新内容必须创建新 FileVersion。
- FileVersion 默认继承 File 当前策略；设置 `permissionPolicyVersionId` 时只能引用不可变、且进一步收紧的策略版本。策略调整创建新版本并触发引用影响检查，不能原地改同一 PolicyVersion。
- `File.currentVersionId` 与 Placement / Handoff 的 `versionId / resolvedVersionId` 必须确实属于同一个 File 且同 tenant。
- task-scope File 只能放置在所属 Task；跨 Task 使用前必须先发布到 team scope。
- 任务自产文件先成为 `scope=task` 的规范 File，不是游离附件或第二份数据。
- 发布到团队时，默认保持同一 File ID，原子更新 scope、目录、lifecycle 和经用户确认的新 audience / 权限策略，并记录 ChangeSet；发布本身可能明确扩大团队可发现或可访问范围。
- 只有用户明确选择“创建衍生副本”时才新建 File ID，同时写入 `derivedFromFileId`；后续不假装两份文件自动同步。
- TaskFilePlacement、Handoff、版本固定和衍生不会隐式扩大引用者权限；只有单独确认的发布 / 授权动作可以改变 File audience。

## 五、成员、参与者与责任

Task Owner 负责确保当前任务被持续跟进。Participant 只表示可以参与，不足以表达具体责任；Responsibility 说明协作预期，也不产生权限。

```ts
type TaskResponsibility = {
  id: string;
  taskId: string;
  memberId: string;
  responsibility: string;
  collaborationRole?: "contributor" | "reviewer" | "advisor" | "coordinator";
  expectedAction?: string;
  source: "manual" | "accepted-suggestion" | "handoff";
  sourceHandoffId?: string;
  status: "proposed" | "active" | "fulfilled" | "released" | "superseded";
  acceptedAt?: string;
  validUntil?: string;
};
```

- 一个 Task 只能有一名 Owner，但可以有多项明确协作责任。
- 邀请参与不等于接受责任，接受责任也不等于获得内容或批准权限。
- `reviewer` 描述希望对方做什么；能否正式批准或发布，只查询 AuthorizationGrant 和 PolicyDecision。
- 正式职责、观察责任和协作角色都不能作为权限捷径。
- Responsibility 是 Task 内不可继续拆解的有界协作预期，不拥有子工作树；一旦需要独立结果、持续上下文或独立验收，应升级为子 Task。
- 已有 active Responsibility 换人时不原地修改 `memberId`：Handoff 激活事务把旧记录标为 `superseded`，创建带新 ID 和 `sourceHandoffId` 的 successor。这样历史责任不会被改写，也不存在直接字段修改旁路。

## 六、Handoff

Handoff 是 Task 下的工作接续协议；它记录双方对同一版本的理解与同意，并在激活时对 Todo、Responsibility 或 Task Owner 产生可审计效果。[11-human-handoff.md](./11-human-handoff.md) 是 Handoff、Revision、Effect、Consent 与 Profile 映射的唯一规范 Schema；这里仅定义信息架构使用的索引投影，不能作为第二套领域模型。

```ts
type HandoffIndexProjection = {
  id: string;
  teamId: string;
  taskId: string;
  kind: "context-only" | "todo-assignment" | "responsibility-transfer" | "result-return" | "owner-transfer";
  fromPrincipalId: string;
  toPrincipalId: string;
  scopeRef: string;
  currentRevision: number;
  derivedStatus: "draft" | "offered" | "clarification-requested" | "accepted" | "activated" | "declined" | "cancelled" | "expired";
  blockedReasonCodes: string[];
  relatedHandoffId?: string;
  visibilityPolicyId: string;
};
```

关键不变量：

- 新工作委托使用 Proposal / 邀请；已有工作、上下文或结果发生接续时才创建 Handoff。
- `offered` 和 `accepted` 都不改变责任；同 Revision Consent、权限、关键版本与当前对象状态全部通过后才 `activated`。
- `accepted` 是当前 Revision 的必要有效 Consent 已齐全所形成的派生状态，不能被客户端独立写入。协议变化立即切换 currentRevision、失效旧 Consent 并回到 `offered / clarification-requested`；撤回接受也重新派生状态。
- Profile 必须穷举约束 kind、scope、Task、source / recipient、Effect 与必要 Consent，服务端生成 Effect，不能让客户端自由拼接对象 ID。
- 协议内容变化生成新 Revision，旧 Consent 失效；Agent 可以起草，但不能替人 Consent。
- Handoff 不授予权限。接收者可见内容由 PolicyDecision 单独决定。
- 激活事务必须对 Task / Todo / Responsibility 当前版本执行 CAS 或串行化锁，在事务内重算当前授权与 Policy 版本；Handoff 状态、业务效果和带强制 before / after digest 的 ChangeSet 同时提交。
- 临时接管到期只提醒发起一个关联原 Handoff 的反向 owner / responsibility transfer，不自动切回，也不使用 `result-return`。

## 七、Activity、Decision 与 ChangeSet

### Activity

```ts
type Activity = {
  id: string;
  scope: { kind: "team" | "task"; objectId: string };
  type: "comment" | "help-request" | "response" | "handoff-event" | "insight" | "system";
  authorPrincipalId: string;
  visibilityPolicyId: string;
  status: "active" | "closed" | "hidden";
  createdAt: string;
};
```

Activity 供人阅读和参与，包括评论、求助、广播、回应和 AI 洞察。删除或隐藏展示不能删除对应的审计变更。

### Decision

```ts
type Decision = {
  id: string;
  teamId: string;
  question: string;
  outcome: string;
  status: "proposed" | "confirmed" | "superseded" | "revoked";
  evidenceRefs: string[];
  authorizedByPrincipalId?: string;
  supersedesDecisionId?: string;
  visibilityPolicyId: string;
};
```

Decision 明确记录问题、选项、依据、决定者、生效范围和被替代关系；“确认”前必须校验决定者对该动作的授权。

### ChangeSet

```ts
type MutationOperation = {
  op: "set" | "add" | "remove" | "link" | "unlink";
  targetRef: string;
  path: string;
  beforeDigest?: string;
  afterDigest?: string;
  valueRef?: string;
};

type ChangeSet = {
  schemaVersion: 1;
  id: string;
  tenantId: string;
  actorPrincipalId: string;
  onBehalfOfMemberId?: string;
  targetRefs: string[];
  operations: MutationOperation[];
  reason?: string;
  correlationId: string;
  causationId?: string;
  policyDecisionId: string;
  idempotencyKey: string;
  kind: "apply" | "compensate";
  compensatesChangeSetId?: string;
  reversibility: "reversible" | "external-or-irreversible";
  createdAt: string;
};
```

- ChangeSet 是 append-only 的正式变更信封，所有人类、Agent 和 Connector 写入都经过它。
- Operation 至少表达动作、目标、字段路径和前后摘要；敏感正文使用受权限保护的 `valueRef`，不把内容直接泄露到审计流。
- “撤回”通过新的补偿 ChangeSet 完成，原记录永不删除或改写。
- 外部发布、批准、发送消息等动作可能不可逆，不能用“可撤回”承诺掩盖。
- Activity、Decision 和 ChangeSet 互相引用但不能合并，否则聊天、业务结论和审计会失去边界。
- 业务对象写入与 ChangeSet 追加在同一事务提交，任一失败则整体回滚；`(tenantId, idempotencyKey)` 必须唯一。
- Handoff `activated` 时，协议状态、责任效果和 ChangeSet 同事务提交；任一前置条件漂移则整体拒绝并要求新 Revision。

## 八、团队动态

团队动态是任务外的协作发现层，不是另一个聊天工具。首批类型：

- `help-request`：不知道该找谁时广播需求。
- `expertise-offer`：成员主动声明可帮助领域和时间窗口。
- `insight`：跨任务可复用的发现。
- `risk-signal`：多个任务出现共同风险。
- `opportunity`：可以跨团队共同推进的机会。

动态可以转成 Task 或关联已有 Task，必须由用户确认。转 Todo 时必须指定已有 Task，避免产生没有任务归属的待办。

## 九、授权与策略判定

```ts
type AuthorizationGrant = {
  id: string;
  tenantId: string;
  principalId: string;
  effect: "allow" | "deny";
  actions: string[];
  resourceScope: string;
  delegatedByPrincipalId?: string;
  agentConnectionId?: string;
  validUntil?: string;
  revokedAt?: string;
};

type PolicyDecision = {
  id: string;
  actorPrincipalId: string;
  onBehalfOfMemberId?: string;
  action: string;
  resourceRef: string;
  result: "allow" | "deny" | "allow-redacted";
  matchedGrantIds: string[];
  reasonCodes: string[];
  decidedAt: string;
};
```

每次读取或写入都重新计算，不依赖前端隐藏按钮：

1. Principal 处于同一 tenant 且状态有效。
2. 显式 deny 优先于 allow。
3. 文件夹继承只提供上限；子文件与版本可以进一步收紧，不能静默放宽。
4. 同时检查对象、版本、Task、动作和可见字段。
5. Agent 访问先验证 AgentConnection 仍有效、`onBehalfOfMemberId` 与连接委托人一致，再取“委托成员权限 ∩ 绑定该连接的 Agent Grant ∩ 对象/版本策略 ∩ Task 作用域”。
6. 授权过期或撤销后下一次请求立即失效。
7. 责任、能力、推荐结果和 Participant 身份不产生授权。

至少区分：

- 是否可发现对象存在。
- 是否可看安全元数据。
- 是否可看摘要。
- 是否可读正文。
- 是否可评论、响应或编辑。
- 是否可批准、发布或共享。
- Agent 是否可读。
- Agent 是否可写回。

## 十、状态、时间与派生信息

日期与时间不是所有 Task 的强制字段。保留可选时间承诺与预计投入区间，只在协作比较时辅助判断；自然语言或历史估计必须显示来源、区间和不确定性。

Task 汇总状态、成员当前承诺、责任画像和 AI 洞察都是派生信息，不能覆盖原始证据。阶段迁移由证据触发建议，人类或获明确授权的低风险规则确认写入。
