# 信息架构与领域模型

> 状态：Task 是唯一行动对象、Task 多层级、正式 Task Owner 为 0..1、Task 内文件与人际 Handoff 必须清晰已经确认；主体、权限、Handoff Profile、状态机与发布协议是编码前建议，需在决策台账确认。
> 当前产品投影：创建遵循 D-143 / D-147，React 原型从任务列表进入需求与候选计划、经确认写入浏览器本机任务列表；不代表已接入真实 AI、生产服务或外部邀请。导航按 D-146 / D-148 / D-156 / D-181 / D-183 使用轻量顶栏，默认“我的工作”入口位于任务列表上方，与原详情共用任务工作区；下文可信 Proposal 物化模型仍为未来后端候选。

D-158 将左侧进一步融合为个人索引：顶部同一工具行依次为搜索、明确的筛选按钮、新建加号，下一行单独“我的工作”，再接按已有标签分组的本人任务，不重复显示“我负责的任务”标题或使用分隔线割裂入口与列表。D-189 将本人范围收窄为有效 `ownerId = currentUserId`，并额外保留 `ownerId = "" && createdBy = currentUserId` 的恢复入口；后者只进入“待确认负责人”独立分组，不计入正式负责任务或“我的工作”分析。列表不提供负责人范围切换；状态筛选仍在菜单内，入口使用 ListFilter 图标的“筛选任务”按钮，保留已生效状态提示和管理标签功能。该调整不影响下述 D-157 的任务头部连接能力。

D-160 保留工具行位置，将筛选更新为状态与标签两组多选的轻量浮层：维度内 OR、维度间 AND，空选不限，即选即生效而不关闭。条件外显并可移除，重置保留搜索与查看上下文；标签管理为二级入口。筛选作用于个人任务列表，Dashboard 的完整本人范围不随筛选改变。

D-161 移除工作区的“看板视图”入口、底部占位及对应页面，不在其他菜单增加替代入口；只保留个人任务索引、“我的工作”与原详情。该项替代此前保留看板的要求，不改变任务数据、筛选规则或详情状态编辑。

## 一、模块结构

2026-09-01—2026-09-02 导航修订 D-156／D-172／D-177／D-178／D-181／D-183：Task 仍是唯一行动对象。个人 Dashboard 命名“我的工作”，入口位于任务列表上方，默认呈现本人接下来要推进的工作；顶栏只保留团队、通知和头像账户入口，主题切换作为头像菜单首项放在“设置”上方，取消 D-154 的“工作台／任务”Tab。桌面保留同一紧凑左侧任务索引，右侧按当前选择展示“我的工作”或原任务详情，不预选任务，窄屏逐层进入并可返回。不恢复一级模块侧栏、移动端汉堡菜单、旧注意力地图、顶栏连接入口或一级 AI 连接页。D-172 只在“我的工作”头部提供带文字的“连接 AI”按钮；D-177 要求该入口与 D-155／D-157 共用 `AiConnectionDialog`，展示 ChatGPT、Claude Code、CodeBuddy、Cursor 四个产品；D-178 进一步要求带入 `personalWorkbenchModel.ownedTasks` 的完整正式负责任务列表，不受左侧筛选影响，每项仅含 Task ID、名称和真实状态，空列表以 `meta=0` 表达。D-155 保留整条讨论右侧及回复编辑区 @ 右侧的局部上下文连接入口；D-157 保留已有任务头部的上下文连接。选择产品、复制内容或尝试唤起均不代表设备检测、真实握手、Agent 接单或写回。

```text
TaskDoor · 任务协作工作区
├── 轻量顶栏
│   ├── 团队切换
│   ├── 通知 → 右侧抽屉，移动端全宽
│   └── 头像菜单
│       ├── 主题切换 → 当前主题决定“切换到深色／浅色”
│       ├── 设置 Dialog → 个人信息 / 团队信息 / 成员 / 我的责任
│       └── 退出登录 → 当前仅保留入口，不清除本机任务数据
└── 两栏任务工作区（窄屏逐层进入内容并可返回）
    ├── 左：任务列表（独立滚动）
    │   ├── 搜索 → 筛选任务（ListFilter）→ 新建加号（同一工具行）
    │   ├── 我的工作（默认选中，单独一行）
    │   ├── 已有标签展示组 / 未打标签 → 任务名称与选中态
    │   └── 标签管理（筛选浮层内）
    └── 右：当前内容
        ├── 我的工作：我要推进什么 → 为什么现在处理 → 进入原任务
        │   └── 风险、完成标准缺口与协作变化作为具体行动的依据
        └── 所选任务详情
            ├── 任务 / 父任务 / 当前任务（归属与返回路径）
            ├── 紧凑 Heading Card（名称、目标、可展开完成标准）与属性
            ├── 当前情况三列：当前情况 / 下一步建议 / 完成进度（百分比与燃起图上下排列）
            │   └── TaskStatus 与 EWD 完成度分开；仅有子任务且有显式历史时绘图
            └── 讨论（默认） / 子任务 / 文件 / 活动
```

Task 是当前产品唯一行动对象；File、成员、动态、决定、变更、授权和证据是支撑协作闭环的领域对象。产品“极简”不把 File、Handoff、权限或审计压成 Task 字段，但不再为 Todo、Task Folder 或独立团队文件建立当前产品入口。

顶栏在桌面和移动端使用同一组控件，不重复渲染团队入口，也不保留独立主题快捷按钮。头像菜单首项是主题切换，位于“设置”上方，并用当前主题决定“切换到深色／浅色”的完整可访问名称；同一动作继续复用现有主题状态与本机持久化。切换“我的工作”、任务、创建／标签管理再返回，保留列表的搜索、筛选和滚动位置；个人行动链接进入原详情，返回保留个人查看上下文，详情内仍以面包屑区分父子归属。“我的工作”有明确选中态，不把它当作未选任务的空白占位；不再提供看板切换。团队切换当前只改变界面上下文，菜单明确提示它不会改变权限或数据范围。团队设置保留 D-95 的本机交互能力，不因移动入口而恢复独立团队模块。当前原型没有真实认证会话；头像菜单中的退出登录只建立动作入口，不清除本机数据，正式会话撤销和登录落点待身份系统接入。

“我的工作”沿用 D-154，按稳定成员 ID 与有效 `ownerId` 读取本人负责的全部任务，不受左侧搜索、状态、标签或组折叠影响；待接受人选不算已负责，无法确认归属时保留未知。父任务的协调／核对与本人叶子执行分开，他人子任务投入不整体计入本人负荷；不以任务数量冒充工作量完成率。D-156 让具体行动成为主体，风险、完成标准与协作变化用于解释为何处理，不再按能力名强制分区。内容复用任务详情的现状、来源与事件，区分固定示例、可核推导、未知和过期，不另外编造一套判断。没有真实日历、可用时间或剩余投入时不提供负载、忙闲、完成概率与精确排程，不显示个人总燃起图，不自动写任务、通知或调度。D-154 / D-156 只批准本地个人入口与 Mock，真实 AI、生产 ACL 及组合级算法仍需独立确认；详见 [我的工作设计](../task-design-kit/09-personal-workbench.md)。

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

### Proposal 不是正式任务（未来架构候选）

若未来重新接入创建，AI 默认只能产生可编辑 Proposal。Proposal 可以没有 Owner，也可以包含“建议由某人负责”；用户明确确认前，它不出现在正式任务树、不产生责任、不通知成员。当前 React 原型不生成 Proposal。

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

Task 列表是按已有标签展示分组的个人任务索引（D-148 / D-158 / D-160 / D-161）：

- 顶部工具行依次为搜索、“筛选任务”按钮、新建加号，其下单独一行放默认选中的“我的工作”，再接分组任务，不再加“我负责的任务”标题或割裂用分隔线。桌面右侧展示个人 Dashboard 或所选任务详情，不渲染 Folder 侧栏、目录树、目录面包屑、目录计数或恢复目录按钮；左侧不是一级模块导航。
- 列表只包含当前稳定成员 ID 对应的有效负责任务，不以参与、创建或待接受推定负责；不提供负责人筛选切换或看板视图。任务搜索与状态／标签筛选作用于该个人范围，Dashboard 仍读取完整本人范围。本地个人过滤不等于生产 ACL。
- 筛选浮层按状态、标签分两组多选，维度内 OR、维度间及任务搜索 AND，某组空选不限；“未打标签”与有标签选项可并选取 OR。标签展示已配置图标与颜色，仅数量多时提供标签搜索。选择后立即生效且浮层保持打开；条件外显、可逐项移除，重置只清状态与标签条件，保留任务搜索、查看位置和折叠偏好。管理标签是二级入口，不增加高级条件编辑器。
- Team 切换统一放在轻量顶栏左侧，桌面与窄屏复用同一控件。当前前端 Mock 只切换 Team 标识与选中状态，不得暗示任务、文件、通知、责任或 ACL 已完成真实的跨 Team 过滤与持久化。
- Task 父任务通过详情顶部归属路径表达，直接子任务在“子任务”页签呈现；D-142 已移除概览，不恢复旧“关联任务”页签或第二份子任务列表。Task List 不按 `parentTaskId` 缩进，避免把层级关系伪装成列表分组。
- 标签仍是 Task 的扁平多值分类且选填。标签过滤匹配全部 `labels`，不是只匹配默认展示组；标签筛选生效时，按任务原标签数组中首个命中的所选标签临时归组，清除后恢复首个非空标签的默认组。多标签任务每 Task ID 只出现一次，无标签归“未打标签”。这是视图归组，不是业务主标签，不新增 `primaryTag`、TagGroup、Folder 或级联导航，不改变原标签顺序、其余标签或父子关系。
- 展示组可收起；搜索时临时展开有匹配任务的组，清除搜索恢复原折叠状态。筛选重置不清除原折叠偏好；标签数据变化后按当前标签与选中条件重新归组，父子任务各按自身标签处理，不推导继承。若展示组计数，只数实际显示在该组的去重 Task，不把多标签命中数量冒充展示行数；标签管理入口继续保留。
- 标题区保留“新建任务”，按 D-147 进入独立需求与候选计划页面；本列表不放第二个需求输入壳，不选择目录，Task Schema 不写入 `folderId`；父子关系只使用 `parentTaskId`。
- 任务行仅显示名称与选中态，作为详情入口，不展示图标、状态、日期或目标正文；其他任务信息仍在右侧既有详情中查看。左侧结果独立滚动，切换任务时不重建列表。窄屏隐藏未使用的一栏而保留上下文，不把两栏挤成小字；没有匹配结果时说明筛选为空并提供清除操作。

不变量：

其中涉及 Proposal、首次创建与创建者写入的条款只约束未来创建命令；当前 React 输入壳不触发这些状态。

- 正式 Task 的有效人类 Owner 基数为 `0..1`。创建时无合适人选可显式未分配；一旦已有 Owner，数据库与 Command Gateway 必须拒绝绕过 Handoff 的清空或双 Owner。
- Task 同时保留一个创建者事实；创建者与 Owner 可以相同，也可以不同。Owner 转移不改写创建者，创建者身份也不赋予 Owner 权限。
- 当前用户创建时不默认成为 Owner；只有足够责任证据或用户明确选择人选时才形成提议，目标成员接受前仍不是正式 Owner。
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

依据 D-142，任务详情的“讨论”与“活动”分开呈现。人的发言、回复、@ 与文件引用进入讨论；状态、期限、名称、目标、人员操作、标签、外观和 Commit 等变更进入活动。活动采用紧凑时间线，能回答“谁、何时、修改了什么”，有真实前后值时显示对比，旧记录缺失旧值时保留原文而不反推。筛选只列当前任务存在的变更类型，不提供发言框，也不纳入 AI 建议或浏览行为。Commit、Activity、Insight 与 ChangeSet 仍是独立原对象，源 ID、文件链接和访问边界不变；仅调整投影不能冒充服务端不可篡改审计。

D-102 的 Task 顶部人员投影只读取负责人、参与者与对应邀请状态，不新增第二份 Member 或 Owner 真相。字段对用户统一显示为“负责人 / 参与者”；两类人员复用同一头像＋姓名组件。`accepted` 显示事实绿色实心对勾，`pending` 显示中性空心待勾选；拒绝后人员不再出现在当前列表，但拒绝事件按原协议保留。前端更换入口可以准备待接受候选，正式 `ownerId` 仍只能按 owner-transfer Handoff 激活事务修改。

D-139 取消 Todo 的独立入口和 Task 详情投影，当前原型不再创建或操作 Todo；Task 是唯一行动对象。创建与详情仍不提供逐项 Responsibility 分配或勾选验收流程；完成标准的定义展示与编辑已按 D-143 / D-144 / D-149 / D-150 恢复。底层唯一 Task Owner、参与者、状态、活动、File、父子 Task、Handoff 与权限安全语义不因此改变。

### 任务详情

- 基础信息（D-144 / D-152）：紧凑展示名称与目标，完成标准按需展开；属性行继续维护负责人、参与人、状态、截止时间与标签。标准优先读取任务当前字段，明确清空不回填，定义编辑沿用 D-149 / D-150，不恢复勾选验收流程或概览页签。
- 当前情况（D-152 / D-190；D-168 / D-170 为历史呈现）：所有 Task 在首屏、Tab 之前按“当前情况／下一步建议／完成进度”三列呈现。第一列连续容纳摘要、已完成事实、差距、近期变化和风险／阻塞；第二列只给可追溯的候选行动，不形成指派；第三列在同一列上下展示账本完成百分比、细进度条和燃起图。TaskStatus 只在上方属性行维护，右侧不再重复状态或预计人类工时。来源与截至时间可见，示例与当前字段分开，证据变化后旧结论标过期并回退可核事实，没有证据时明确未知。
- 预计人类工时（D-153 / D-171 / D-190）：底层父任务和中间任务仍只汇总范围内叶子 EWD，不与自身重复累计；创建阶段与数据契约不变，但任务详情首屏不再展示预计人类工时、说明图标或子任务工时分布。当前 `multi-team-v15-mock-effort-coverage` 含 215 条 Task，团队分布 59／50／51／55，159 个叶子均有有效 Mock EWD；所有 Mock 工时仍显式标“演示估算”，本地合成记录不冒充模型估算、实际工时、生产验收或真实 AI。
- 完成进度与辅助燃起图（D-144 / D-152 / D-170 / D-171 / D-190）：第三列仅在存在子任务且任务显式提供历史时出现，完成百分比只取当前账本的“已验收 EWD／当前范围 EWD”，细进度条与范围／已验收双线上下排列；不得按 TaskStatus、任务个数或预计工时分布推算。示例标记放在完成进度标题旁并约束整列；顶部已完成状态与未完成账本冲突时只提示待核对，不重复状态值。普通任务、末梢子任务和无历史父任务不补图、不留空列、不显示 0%。目标 Mock `weekly-retro-notes` 继续使用 3 个叶子、7h `mock` 范围和 2h `example` 已验收量，显示 28.6% 并明确“示例”；底层 v14→v15 迁移与真实历史未接入边界不变。
- 讨论：默认页签；成员发言和回复按线程呈现，保留 @、原文引用、原 ID 与文件跳转。讨论计数为人的消息总数（含回复），不包含系统变更或自动 AI 建议。
- 子任务（D-190）：直接子任务每项只展示图标、名称和负责人；名称进入子任务详情。正式负责人优先于待接受变更提议，只有尚无正式负责人时才展示提议人并标“待接受”。状态、截止时间、完成标准、依赖、箭头、更多菜单及行内操作不在列表重复。Tab 头部保留数量、整体 AI 调整与新增入口，父任务继续通过顶部路径逐层返回。
- 文件：展示当前 Task 有权可见的文件与引用，不按协作人员切换；文件层级、引用、FileVersion 与 ACL 仍读取同一真相。
- 活动：独立保留的只读任务变更时间线；数量不计入讨论。新操作保存实际时间及前后值，无变化不记。负责人提议、参与邀请必须写明待接受，不表达正式责任已转移。

当前 React 原型把新增讨论与变更按 taskId 保存在浏览器本地；任务切换与刷新后可继续查看，不扩展可见范围，也不代表生产审计或跨端同步。旧 AI 通知可按需展开来源记录，来源失效时明确提示；D-152 的基本现状呈现不等于开放独立 AI 诊断，不恢复概览或新增诊断页。D-154 / D-156 的个人 Dashboard 从任务列表上方“我的工作”进入，不是详情页签。完整布局、数据与边界状态见 [任务详情当前情况设计](../task-design-kit/08-task-detail-current-situation.md)。重新审视 D-142 的触发条件：真实后端事件接入、日志与讨论出现权限分歧、需要精确日期分组或任务诊断获得独立确认。

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

设置 Dialog 是当前成员查看本人信息和团队投影的统一入口，不是第二套 Member、Team 或 Responsibility 真相：头像菜单依次提供主题切换、普通“设置”和危险动作“退出登录”，主题项固定在“设置”上方，顶栏不再重复主题入口；菜单不展示个人信息卡，展开时也不增加蓝色装饰外框。当前本地原型的退出入口不表示真实会话已经撤销，也不清除本机任务数据。Dialog 身份区只保留头像与姓名。左侧按“个人设置 / 团队设置”分组：个人设置依次为“个人信息 / 我的责任”，团队设置为“团队信息 / 成员”。该导航归组不改变数据归属：个人信息跨团队稳定，我的责任仍是一份 Team-bound 责任说明。应用级 TeamSwitcher 与责任页标题区右侧的紧凑 Team Select 复用同一 `activeTeamId`，后者切换时经过未保存责任草稿保护，不创建第二套团队状态；触发器完整显示 Team Logo、当前团队名和下拉箭头，选项以同构 Logo、团队名和当前项勾选呈现，长名称可以视觉省略但可访问名称保留全文。它不是右侧团队面板或内容第二栏。团队信息以“通用”设置展示当前 Team Logo，允许显式保存现有 Team 名称，并在二次确认后离开或删除本机 Team 投影；至少保留一个 Team。成员以“用户 / 角色”两列展示本机 membership，角色表头与角色 Select 共用右侧固定列，支持邀请链接复制与重新生成、邮箱邀请和管理员 / 成员角色切换；在职管理员至少保留一位。我的责任承接该 Team 的纯文本责任说明及就地新增／更新提议，不设独立观察建议区。上述成员和危险操作只构成本机可持久化的功能原型，不表示真实邮件、生产 Team membership、服务端 ACL、审计或组织删除已经接入；工作角色也不改变个人工作身份、Owner、Task Responsibility 或 AuthorizationGrant。阅读态把责任正文投影为使用内容区可用宽度的同权重陈述列表；页面不设整表“编辑”按钮，每条已有责任在行尾提供带完整可访问名称的 Pencil，一次只把该行切换为 Textarea 与保存／取消。保存仍序列化回同一份纯文本并推进 revision，取消不写入，人工新增／删除能力继续保留，不要求成员手工输入空行。

团队责任说明由本人和该 Team 的管理员编辑，每次写入保留 actor、revision 和更新时间；该编辑权不允许改变 Owner、Task Responsibility、AuthorizationGrant 或历史证据。AI 只允许生成带证据引用、Coverage、规则版本和 actor / on-behalf-of 的观察提议。更新提议默认不展开，只在目标责任行尾显示 Sparkles 图标与可见“AI 建议”的推断黄色展开按钮；用户触发后才在原行下方显示只读替换文本、逐行依据、忽略与“更新”，该入口本身不表示重新生成或已经写入。每条依据显示一个摘要和来源／时间等 meta；只有 `evidence.id` 能定位真实来源或打开真实只读来源详情时，才显示带 ChevronRight 的“查看”动作与“查看依据：{摘要}”可访问名称。新增提议是列表末尾的只读候选行，使用虚线标记、轻量推断底色和行尾加号区分，行尾加号以“添加责任”可访问名提供一次确认写入；具体依据仍可就地展开。提议候选文本不就地编辑，需要改写时使用对应责任行尾的 Pencil 单条编辑。更新或加号动作同次写入可见候选文本、更新 revision、记录前后值并把提议标记为 accepted；忽略标记为 hidden。更新还必须校验提议基准 revision、目标段落位置和原文快照；仅版本变化而同一位置原文仍精确未变时可安全重绑定，目标变化时不得写入或追加。AI 不得自行触发添加、更新或忽略；责任行处于编辑状态时继续暂停提议写入。

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
