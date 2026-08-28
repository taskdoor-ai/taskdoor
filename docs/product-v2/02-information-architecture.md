# 信息架构与领域模型

> 状态：Task 是唯一行动对象、Task 多层级、正式 Task 单 Owner、Task 内文件与人际 Handoff 必须清晰已经确认；主体、权限、Handoff Profile、状态机与发布协议是编码前建议，需在决策台账确认。

## 一、模块结构

```text
AgentDoor
├── 首页 / 我的工作
├── 任务
│   ├── 全部任务
│   ├── 任务列表：搜索 / 状态 / 负责人 / 扁平标签
│   ├── 标签管理（无标签组，任务列表标题区入口）
│   └── 任务详情：概览 / [关联任务] / 文件 / 活动
├── 团队动态
│   ├── 求助与广播
│   ├── 经验与机会
│   └── 我的关注与响应
├── 设置
│   └── 设置 Dialog（从头像组件打开）
│       ├── 个人设置
│       │   └── 个人信息（跨团队）
│       └── 团队设置
│           ├── 团队信息（按团队切换）
│           ├── 成员（当前只读投影）
│           └── 我的责任（责任正文与 AI 建议）
│               ├── 团队资料摘要
│               ├── 团队责任说明（本人 / 团队管理员共同维护）
│               └── AI 审阅建议（建议写入文本、具体依据、采纳 / 忽略）
├── 连接 AI
└── 设置与治理
```

Task 是当前产品唯一行动对象；File、成员、动态、决定、变更、授权和证据是支撑协作闭环的领域对象。产品“极简”不把 File、Handoff、权限或审计压成 Task 字段，但不再为 Todo、Task Folder 或独立团队文件建立当前产品入口。

D-84 增加全局通知入口，但不把 Notification 升格为新的业务真相或一级模块。通知中心是由 Proposal、Task、Responsibility、Handoff、Decision、Insight 与 Result Return 派生的收件投影；`read / unread` 只属于送达展示，接受、拒绝、范围反提、激活、验收和失效仍写回各自原对象。生产实现必须以 `recipient + source object + revision digest` 去重，并在权限过滤后生成摘要；来源撤权或失效时不得继续展示缓存正文。

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

## 三、Task

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

一张 Owner 候选 Proposal 只绑定一位 recipient 和一个有界 scope。任何目标、范围或 Owner 变化都生成新 revision；接受只对同一 digest 有效。正式创建以 Proposal ID + accepted revision 作为幂等键，最多产生一个 `materializedTaskId`。多人并行使用不同 Proposal；同一 Owner 位置不知道找谁时先广播，不并发发送多张可自动生效的邀请。

复杂事务的创建 Proposal 可以额外包含一层显式结构草稿：

```ts
type TaskChildDraft = {
  id: string;
  title: string;
  goal: string;
  proposedOwnerId: string;
  participantIds: string[];
  fileCandidateIds: string[];
  contextIds: string[];
};

type TaskStructureProposal = {
  mode: "single" | "decomposed";
  children: TaskChildDraft[];
};
```

- `single` 只物化父 Task；`decomposed` 在同一次确认中物化父 Task 与一层子 Task，并把子 Task 的 `parentTaskId` 指向父 Task。
- 拟由当前用户处理的子 Task 可直接写入该 Owner；拟由同事处理时，在真实接受协议接入前，正式 `ownerId` 仍沿用父 Task Owner，同时保留 `proposedOwnerId` 与 `pending-acceptance`，不能伪装为已经完成转移。
- 父子 Task 使用同一 Task Schema，只额外维护 `parentTaskId` 层级关系；创建投影可以用父 Task 的周期初始化子 Task，但不产生平行的 Child 类型或目录归属。
- 创建者与 Owner 分离：`creatorId` 是不可被普通 Owner 变更覆盖的发起事实，`ownerId` 是当前结果责任关系。创建者可以把父 Task 或任一子 Task 分配给自己或同事；参与关系仍独立保存。
- 父子 Task 分别维护成员、文件候选和引用。每个子 Task 草稿独立保存 `participantIds`、`fileCandidateIds` 与 `contextIds`；负责人不能同时重复为 Participant。分析找到的场景来源不直接等于候选；候选不直接等于已确认引用。父 Task 的 Participant、File Reference、文件候选或 PolicyDecision 不自动复制到子 Task，子 Task 关系也不反向写入父 Task。
- 父 Task 和每个子 Task 可以分别维护底层协作缺口，用于解释“尚缺什么”；当前创建界面不录入逐项 Responsibility，不把缺口自动变成 Participant、责任或子 Task。
- 创建结构只物化 Task。只有具有独立结果和推进边界的工作才进入 `children`。

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

### Task 下的协作缺口

协作缺口只保存“完成目标仍缺什么”的判断依据，用于 AI 建议和后续邀请准备。当前创建与详情不提供逐项 Responsibility 分配；缺口本身不是 Task、Participant、Owner 或 active Responsibility，外部成员接受前也不产生责任或权限。

```ts
type TaskCollaborationGap = {
  id: string;
  taskId: string;
  kind: "judgment" | "evidence" | "permission" | "independent-result";
  title: string;
  detail: string;
  evidence: string;
  impact: string;
  state: "unassigned" | "invitation-draft" | "resolved" | "converted-to-subtask";
  suggestedMemberId?: string;
  invitationDraftId?: string;
  childTaskId?: string;
  subtaskAssessment: {
    eligible: boolean;
    reasons: string[];
    suggestedTitle?: string;
    suggestedGoal?: string;
  };
};
```

- `unassigned` 可以保留候选建议，但没有 assignee、邀请、参与者或责任效果。
- `invitation-draft` 必须绑定 `gapId + recipientId`；同一人补多个缺口时仍是多份范围独立的草稿，发送和接受继续服从既有协议。
- 只有 `independent-result` 且独立结果、推进和接续条件成立时，AI 才能建议转子 Task。
- 用户确认转换后建立 `childTaskId` 和正式 `parentTaskId`；外部候选尚未接受邀请时，新子 Task 先沿用父 Task Owner。

Task 列表是一个不分组的平面工作区：

- 一级“任务”入口直接进入唯一 Task List，不渲染 Folder 侧栏、目录树、目录面包屑、目录计数或恢复目录按钮。
- 应用左侧窄轨顶部展示当前 Team Logo，并以共享单选菜单作为 Team 切换入口；移动端顶部栏同时展示当前 Team 名称。当前前端 Mock 只切换 Team 标识与选中状态，不得暗示任务、文件、通知、责任或 ACL 已完成真实的跨 Team 过滤与持久化。
- Task 父子关系统一在紧随“概览”的条件式“关联任务”页签呈现；完全没有父子关系时不渲染。Task List 不按 `parentTaskId` 缩进，避免把层级关系伪装成列表分组。
- 标签是 Task 唯一分类能力。标签是无组扁平集合，“标签管理”入口放在 Task List 标题区；筛选和所有展示都直接读取标签，不渲染标签组、级联导航或组标题。
- List 工具栏提供任务名称搜索、状态、负责人和标签筛选；结果直接使用稳定列头“任务 / 状态 / 标签 / 负责人 / 截止时间”。标签复用规范 TagBadge，超出列容量时显示收敛数量。底部按每页 10 条分页，筛选变化后回到第 1 页；空结果不展示分页。窄屏隐藏列头并把同一字段堆叠。
- 新建 Task 不选择目录，Task Schema 不写入 `folderId`。父子关系只使用 `parentTaskId`。

不变量：

- 正式 Task 从创建到归档始终恰好有一位有效人类 Owner，数据库与 Command Gateway 同时约束，不能出现 0 位或 2 位。
- Task 同时保留一个创建者事实；创建者与 Owner 可以相同，也可以不同。Owner 转移不改写创建者，创建者身份也不赋予 Owner 权限。
- 当前用户创建时默认自己是 Owner；若创建前选择同事，仍保持 Proposal，直到对方接受。
- 单 Task Proposal 直接呈现标准任务表单，不创建只有一个“父任务”的结构投影；只有 Proposal 初始已经包含至少一个子 Task 时，才把父 Task 与一层子 Task 纵向排列。创建确认页不显示父 / 子数量统计或“添加子任务”入口，复杂结构也只编辑、展开、收起或删除 Proposal 已有子 Task，不在此阶段继续追加。每一项都呈现同一套编辑组合，顺序为“任务信息、上级任务、[文件]”；方括号表示文件区只在该 Task 的 `fileCandidateIds ∪ contextIds` 能解析出至少一个当前可见来源时出现，二者都为空时整个区不渲染。候选存在不要求选择，正式创建仍只写 `contextIds`。主 Task 的 Owner / Participant 只在右侧摘要核对，底层关系和正式创建投影继续存在；当前创建投影不录入逐项 Responsibility 或验收标准。创建者继续保留为创建事实但不在每个任务块重复展示。父 / 子只通过层级标签、圆形浅绿数字序号和 `parentTaskId` 区分；序号不承载状态语义。每项可独立展开或收起，不使用 Dialog、页签或第二套编辑状态。
- 父任务和每个子任务分别维护 Owner；子任务 Owner 不自动获得父任务所有文件权限。
- 删除父任务不能静默删除子任务；移动任务不能形成循环。
- 父任务状态不覆盖子任务状态。系统计算汇总并建议变化，不替 Owner 静默推进。
- 父任务完成时若仍有活跃子任务，必须在同一操作中选择保留、迁移、取消或继续跟踪，不能留下隐性孤儿。
- `draft` 不是 TaskStatus；草稿属于 Proposal。

建议的最小状态语义：

- `active`：当前有人持续推进。
- `waiting`：明确等待外部输入、决定或权限。
- `review`：结果已形成，等待有权人验证。
- `completed`：Task Owner 已明确确认结果完成。
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

任务详情的“活动”是当前 Task 的统一协作时间线：成员主动发布的信息、AI 生成的可解释建议、具有协作意义的操作与 Commit 都以具体动作类型进入同一投影，例如动态、AI 建议、状态变更、周期变更、参与者加入和代码提交；其中“动态”是成员主动发布内容的动作标签，回复单独标为“回复”，不替代“活动”模块名称。活动不增加事件分组或来源分类。每种动作使用稳定的 Token 色标签和文字共同标识，颜色只表达动作类型；“AI 建议”额外使用 Sparkles 图标与推断语义色。Commit、Activity、Insight 与 ChangeSet 仍是边界不同的原对象；时间线只按权限引用和呈现，不复制来源、不把普通浏览行为写成活动，也不以统一界面取消审计层的不可变要求。成员可按当前 Task 实际存在的具体类型筛选；Commit 事件保留提交说明、作者、时间和关联文件明细，关注引用定位到该原事件。

D-102 的 Task 顶部人员投影只读取负责人、参与者与对应邀请状态，不新增第二份 Member 或 Owner 真相。字段对用户统一显示为“负责人 / 参与者”；两类人员复用同一头像＋姓名组件。`accepted` 显示事实绿色实心对勾，`pending` 显示中性空心待勾选；拒绝后人员不再出现在当前列表，但拒绝事件按原协议保留。前端更换入口可以准备待接受候选，正式 `ownerId` 仍只能按 owner-transfer Handoff 激活事务修改。

D-139 取消 Todo 的独立入口和 Task 详情投影，当前原型不再创建或操作 Todo；Task 是唯一行动对象。创建与详情也不再录入或展示逐项 Responsibility 分配和验收标准。底层唯一 Task Owner、参与者、状态、活动、File、父子 Task、Handoff 与权限安全语义不因此改变。

### 任务详情

- 概览：目标、Owner、参与者、当前状态、主要风险与 AI 建议，不再内嵌父子 Task 列表。
- 关联任务：紧随概览的条件页签；至少有一个直属关系时才显示并展示总数，页内以“任务名称 / 类型 / 状态 / 负责人”四列统一呈现，类型逐行区分上级与下级，点击整行进入对应 Task，不在详情一次展开整棵树。
- 文件：展示当前 Task 有权可见的文件与引用，不按协作人员切换；文件层级、引用、FileVersion 与 ACL 仍读取同一真相。
- 活动：讨论、@、AI 建议、系统事件和 Commit 的统一时间线。

## 四、Task 文件与文件真相

Task 文件和团队作用域 File 使用同一套 File / FileVersion 真相，可以处于不同作用域，并在 Task 内拥有组织视图。

当前产品表面不提供一级“文件”入口、团队文件夹侧栏或独立团队文件 List。File 只从 Task 详情“文件”页进入：直接展示当前 Task 中按 ACL 有权可见的文件与引用，不按协作人员切换，也不复制内容或权限事实。TeamFileFolder 与 team scope 仍可作为底层发布和复用语义存在，但本轮不建立其独立浏览或管理界面。

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

- TeamFileFolder 是团队作用域 File 的底层规范目录，不是当前产品入口；TaskFileFolder 只是任务内组织层，不改变 File 的真实身份或权限。
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

设置 Dialog 是当前成员查看本人信息和团队投影的统一入口，不是第二套 Member、Team 或 Responsibility 真相：头像菜单只提供普通“设置”入口，不展示个人信息卡，展开时也不增加蓝色装饰外框；Dialog 身份区只保留头像与姓名。左侧按“个人设置 / 团队设置”分组：个人设置为“个人信息”，团队设置拆为“团队信息 / 成员 / 我的责任”。Team 上下文由应用级 TeamSwitcher 控制。团队信息以“通用”设置展示当前 Team Logo，允许显式保存现有 Team 名称，并在二次确认后离开或删除本机 Team 投影；至少保留一个 Team。成员以“用户 / 角色”两列展示本机 membership，角色表头与角色 Select 共用右侧固定列，支持邀请链接复制与重新生成、邮箱邀请和管理员 / 成员角色切换；在职管理员至少保留一位。我的责任承接该 Team 的纯文本责任说明和独立观察建议。上述成员和危险操作只构成本机可持久化的功能原型，不表示真实邮件、生产 Team membership、服务端 ACL、审计或组织删除已经接入；工作角色也不改变个人工作身份、Owner、Task Responsibility 或 AuthorizationGrant。阅读态把责任正文投影为同权重陈述列表；编辑态让每条责任独立增删改，保存时仍序列化回同一份纯文本，不要求成员手工输入空行。

团队责任说明由本人和该 Team 的管理员编辑，每次写入保留 actor、revision 和更新时间；该编辑权不允许改变 Owner、Task Responsibility、AuthorizationGrant 或历史证据。AI 自动更新只允许写观察建议，并保留证据引用、Coverage、规则版本和 actor / on-behalf-of。待处理建议只显示“采纳 / 忽略”：采纳原子地追加正文并把建议标记为 accepted，忽略标记为 hidden；两者都从待处理队列消失但保留记录。AI 不得自行触发采纳。

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

Handoff 是 Task 下的工作接续协议；它记录双方对同一版本的理解与同意，并在激活时对 Responsibility 或 Task Owner 产生可审计效果。[11-human-handoff.md](./11-human-handoff.md) 是 Handoff、Revision、Effect、Consent 与 Profile 映射的唯一规范 Schema；这里仅定义信息架构使用的索引投影，不能作为第二套领域模型。

```ts
type HandoffIndexProjection = {
  id: string;
  teamId: string;
  taskId: string;
  kind: "context-only" | "responsibility-transfer" | "result-return" | "owner-transfer";
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
- 激活事务必须对 Task / Responsibility 当前版本执行 CAS 或串行化锁，在事务内重算当前授权与 Policy 版本；Handoff 状态、业务效果和带强制 before / after digest 的 ChangeSet 同时提交。
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

Activity 供人阅读和参与，包括评论、求助、广播、回应和“AI 建议”。删除或隐藏展示不能删除对应的审计变更。

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

动态可以转成 Task 或关联已有 Task，必须由用户确认；当前产品不再从动态创建 Todo。

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

正式 Task 的 `plannedStartOn + plannedEndOn` 是可选的轻量计划周期：两者要么同时为空，要么同时存在且结束日期不得早于开始日期。AI 可以从自然语言或历史建议周期，但必须显示来源和不确定性，并允许成员修改或清空；读取、保存与重新进入不得把清空状态自动补成默认日期。首版不因此恢复计划工时、里程碑、基线、日历排程等完整项目管理字段。

Task 汇总状态、成员当前承诺、责任画像和“AI 建议”都是派生信息，不能覆盖原始证据。阶段迁移由证据触发建议，人类或获明确授权的低风险规则确认写入。
