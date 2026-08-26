# AgentDoor 协作内核产品改造 Technical Assessment

> 状态：pre-decision
> 绑定 Decision Revision：`2026-08-26-collaboration-product-implementation-decision.md` Revision 2
> 结论：技术上可行；当前因 Git baseline 与产品决定未确认而 blocked，不能进入 C2 / C3 功能实现

## 一、结论

- **可行性**：现有 Vite / React / TypeScript 架构足以完成高保真交互 Demo；TaskDetail、列表、文件树和基础组件可保留并逐步接入统一模型。
- **建议最小改动**：先建立统一 DemoRepository 和命令接口，跑通“默认我负责 → 真正创建新 Task → 列表 / 详情 / 刷新一致”；不要先增加孤立的团队文件页、人员卡或 Handoff 弹窗。
- **首个用户可见纵切**：Slice 0 + Slice 1；不包含邀请、Owner Transfer、真实 ACL、不可改写审计或外部写入。
- **完整协作纵切**：在相关 Q 项确认后，复用现有 POS 场景完成“找人 → 反提范围 → 子 Task → Result Return → 父 Owner 验收”。
- **阻断决定**：Git baseline；Q-03、Q-05、Q-06、Q-07、Q-08、Q-09、Q-10–Q-19；团队文件发布与团队动态另受 Q-01、Q-04 影响。

## 二、当前实现事实

| 事实 | 证据路径 / 命令 | 与目标差距 |
| --- | --- | --- |
| 根状态与创建逻辑集中在 565 行 `App.tsx` | `wc -l src/App.tsx`；`src/App.tsx:113-565` | 页面、领域、持久化和路由耦合，任何新模块都会继续复制状态 |
| 创建只按三个关键词分流 | `src/App.tsx:184-219` | 没有工作结构、协作缺口和风险三轴判断 |
| 复杂分支自动放入 Owner、两位参与者、文件与全部 Todo | `src/App.tsx:187-194` | 违反默认自己、主动协作与渐进披露 |
| 普通分支将 Owner 清空 | `src/App.tsx:189` | 正式 Task 可能没有 Owner |
| 创建按钮只校验名称 | `src/App.tsx:497-520` | 没有 Owner、revision、幂等和状态不变量 |
| `StoredTask.id` 固定为 `coupon-fix` | `src/App.tsx:36-47,503-514` | 不会创建真实新对象 |
| 任务、Todo、文件和成员均有多套 Mock | `src/data/workspaceNodes.ts`、`src/data/taskDetailMocks.ts`、`src/data/demoTodos.ts`、`src/App.tsx:78-111` | 页面之间状态和引用无法一致 |
| Workspace 树统一混合 Folder / Task / File | `src/data/workspaceNodes.ts:3-30` | 任务层级、任务组织目录和团队文件目录语义混淆 |
| 左侧只递归 Folder，Task 实际均挂在 Folder 下 | `src/components/WorkspaceSidebar.tsx:37-50`、`src/data/workspaceNodes.ts:35-53` | `Task.parentTaskId` 没有端到端递归投影 |
| TaskDetail 的“子任务”读取 `TaskTodoMock` | `src/components/TaskDetail.tsx:75-88`、`src/data/taskDetailMocks.ts:13` | 子 Task 和 Todo 未分开 |
| TaskDetail 文件树是真正递归 | `src/components/TaskDetail.tsx:33-37,50-57,86` | 值得保留，但数据仍是每任务复制 Mock |
| Task 详情可直接修改 Owner、参与者与状态 | `src/components/TaskDetail.tsx:40-72` | 绕过邀请、Consent、Handoff 和 Command Gateway |
| Team File 预览组件不可达 | `src/App.tsx:334-335`、`src/components/WorkspaceSidebar.tsx:28-33` | 可以复用，但必须先接统一 File 真相和导航 |
| Todo 在两个页面各自 `useState` | `src/components/TaskDetail.tsx:46,88`、`src/components/MyTodosPage.tsx:8-23` | 完成、计数、筛选和刷新不同步 |
| 创建成功使用 100 个 confetti 与循环视觉 | `src/components/TaskCreationSuccess.tsx:17-36`、`src/components/TaskOverviewCard.tsx:82-84` | 与安静、可接续的工作产品基调冲突 |
| 全局 CSS 与页面私有 CSS 债务很高 | `npm run design:check` | 当前虽未突破基线，但不能继续追加第四套页面语言 |
| 本地 design check 通过 | `npm run design:check`，2026-08-26 | 只证明未新增已登记债务，不证明视觉或流程质量 |
| `shadcn info` 无法访问官方 registry | `node_modules/.bin/shadcn info --json` | 网络代理拒绝；本轮不能依赖 registry 安装结果 |
| Git 没有 HEAD，全部项目文件未跟踪 | `git rev-parse --verify HEAD`、`git status --short` | 无法形成可靠 diff、回退或独立 Review 基线 |

### Design check 当前读数

```text
microFontDeclarations:        824（基线 841）
rawFontSizeDeclarations:      994（基线 996）
rawSpacingDeclarations:      1934（基线 1936）
rawRadiusDeclarations:        432（基线 433）
arbitraryTailwindPixels:        9（基线 9）
hardcodedColorsInSource:      479（基线 516）
nativeSelectElements:           4（基线 4）
nativeDialogElements:           2（基线 2）
pagePrimitiveStyleOverrides:  469（基线 491）
duplicateUiExports:             5（基线 5）
globalStylesLines:           7665（基线 7765）
```

结论：自动检查是债务天花板，不是“当前设计已经合格”的证明。新功能必须减少或保持这些读数，并优先拆分共享模式与隔离旧 CSS。

## 三、目标领域与不变量

### 第一层：首个创建纵切必须具备

```ts
type TaskProposal = {
  id: string;
  teamId: string;
  proposedParentTaskId?: string;
  proposedOwnerId?: string;
  recipientId?: string;
  revision: number;
  revisionDigest: string;
  title: string;
  goal?: string;
  status: "editing" | "offered" | "scope-proposed" | "accepted" | "materialized" | "declined" | "cancelled" | "expired";
  createdForMemberId: string;
  acceptedRevision?: number;
  materializedTaskId?: string;
};

type TaskFolder = {
  id: string;
  teamId: string;
  parentFolderId?: string;
  name: string;
};

type Task = {
  id: string;
  teamId: string;
  parentTaskId?: string;
  folderId?: string;
  ownerId: string;
  title: string;
  goal: string;
  participantIds: string[];
  status: "active" | "waiting" | "review" | "completed" | "cancelled" | "archived";
};

type Todo = {
  id: string;
  taskId: string;
  assigneeId?: string;
  title: string;
  status: "open" | "doing" | "completed" | "converted";
};

type TaskAcceptanceCriterion = {
  id: string;
  taskId: string;
  text: string;
  status: "open" | "met" | "waived";
  evidenceRefs: string[];
};

type TaskCommitment = {
  id: string;
  taskId: string;
  kind: "target" | "agreed-window";
  startAt?: string;
  dueAt?: string;
  source: "explicit-user" | "accepted-offer" | "legacy-import";
};

type TagIconName = "tag" | "folder" | "flag" | "layers" | "package" | "shopping" | "users" | "building" | "coins" | "shield" | "wrench" | "sparkles";
type TagColorName = "gray" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "red" | "purple" | "pink";
type TagGroup = { id: string; teamId: string; name: string; order: number };
type Tag = { id: string; groupId: string; name: string; icon: TagIconName; color: TagColorName };
type TaskTagAssignment = { taskId: string; tagId: string };

type File = {
  id: string;
  teamId: string;
  name: string;
  source: "upload" | "connector" | "agent-output" | "native";
  lifecycle: "draft" | "published" | "archived";
  scope:
    | { kind: "task"; taskId: string }
    | { kind: "team"; teamFolderId: string };
  currentVersionId: string;
  permissionPolicyId: string;
  derivedFromFileId?: string;
};

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

type TaskFilePlacement = {
  id: string;
  taskId: string;
  fileId: string;
  taskFolderId?: string;
  versionMode: "pin-version" | "follow-latest";
  versionId?: string;
  purpose?: "input" | "evidence" | "working" | "delivery";
};

type ChangeSet = {
  id: string;
  taskId: string;
  actorPrincipalId: string;
  summary: string;
  changedObjectRefs: string[];
  createdAt: string;
  assurance: "demo-simulated" | "server-recorded";
};
```

这里有三棵不同的树，不能再次压回一个 `parentId`：

1. `TaskFolder.parentFolderId` 是任务导航分组，保留现有目录使用习惯。
2. `Task.parentTaskId` 是工作分解与结果回传关系，决定父子 Task 语义。
3. `TeamFileFolder` / `TaskFileFolder` 是文件组织视图；File 身份、版本与权限始终由同一 File 真相承载。

`TaskProposal.proposedOwnerId` 可以在编辑态为空；创建器在识别到当前用户是本团队有效人类 Member 时，默认把他作为可编辑建议。若物化时仍为空，`MaterializeTask` 只能在确认预览中把当前有效人类创建者写成正式唯一 Owner。没有可验证的当前 Member 时，界面只保留当前会话内的本地输入缓冲，不创建 repository Proposal、不读取团队候选 / 受限上下文，也不允许物化；身份恢复后再由用户明确提交。`createdForMemberId` 因此保持必填，系统绝不自动造 Member 或 Owner。Proposal 本身从不产生 Owner 责任。自有创建可以从 `editing` 经本人确认直接 `materialized`；指定同事为 Owner 时才进入 `offered → accepted → materialized`。Slice 2 前仍需确认短咨询 / Reviewer 是否复用该 Proposal 超集，还是使用独立 `CollaborationOffer`。

### 第二层：协作纵切再启用

- Member / Principal。
- Responsibility / ResponsibilityClaim / Evidence / Coverage。
- CollaborationOffer 或已确认的等价 Proposal 合同。
- Handoff / Revision / Consent / Effect。
- Activity / Decision / ChangeSet。
- AuthorizationGrant / PolicyDecision。

### 必须保持的不变量

1. 正式 Task 在任何完成事务点恰好一位 Owner。
2. 父 Task Owner 不因子 Task Owner 或协作者变化而自动改变。
3. Proposal 接受最多物化一个 Task；重复命令幂等。
4. Todo 与子 Task 是不同对象；Todo 升级后保留来源关系。
5. Task、Todo、File、Activity 的所有页面读取同一 repository。
6. Placement、Responsibility、邀请和 Handoff 都不自动授予权限。
7. 普通邀请不能修改既有 Task Owner、Todo assignee 或 active Responsibility holder。
8. Owner 变化只能通过确认后的 owner-transfer Handoff 激活；首个 Task 物化是唯一创建例外。
9. 已交付、已验收、子 Task 完成、父 Task 整合分开记录。
10. 邀请、拒绝、回复速度、在线与消息量不生成能力证据。

## 四、建议前端架构

当前阶段按“高保真交互 Demo”实施，但接口形状不应阻止后续服务端替换。

```text
src/
├─ domain/
│  ├─ task.ts
│  ├─ todo.ts
│  ├─ file.ts
│  ├─ collaboration.ts
│  ├─ handoff.ts
│  └─ member.ts
├─ application/
│  ├─ commands/
│  ├─ selectors/
│  └─ policies/
├─ repositories/
│  ├─ demo-repository.ts
│  ├─ local-storage-adapter.ts
│  └─ repository-context.tsx
├─ fixtures/
│  ├─ retail/
│  └─ later: payment / marketing / film / manufacturing
├─ features/
│  ├─ task-creation/
│  ├─ tasks/
│  ├─ todos/
│  ├─ team-files/
│  ├─ collaboration/
│  ├─ team-activity/
│  └─ member-profile/
└─ components/ui/
```

精确目录可在 implementation-ready 阶段按现有工程约定收敛，但边界必须成立：

- **domain** 不依赖 React。
- **commands** 是唯一写入入口；页面不能直接改领域对象数组。
- **selectors** 为列表、树、详情和首页生成一致投影。
- **repository adapter** 隔离 localStorage Demo 与未来 API。
- **fixtures** 表达相互关联的真实数据，不在组件里硬编码人名和理由。
- **features** 组合产品语义；`components/ui` 不认识 Owner、Handoff 或 PolicyDecision。

## 五、统一 DemoRepository

### 目标

首轮不是直接实现完整后端，而是结束当前“每个页面一套 Mock”的状态。

```ts
type DemoSnapshot = {
  schemaVersion: number;
  teams: Team[];
  members: Member[];
  taskFolders: TaskFolder[];
  tasks: Task[];
  proposals: TaskProposal[];
  todos: Todo[];
  tagGroups: TagGroup[];
  tags: Tag[];
  taskTagAssignments: TaskTagAssignment[];
  acceptanceCriteria: TaskAcceptanceCriterion[];
  taskCommitments: TaskCommitment[];
  teamFileFolders: TeamFileFolder[];
  taskFileFolders: TaskFileFolder[];
  files: File[];
  fileVersions: FileVersion[];
  taskFilePlacements: TaskFilePlacement[];
  activities: Activity[];
  changeSets: ChangeSet[];
};
```

Repository 至少提供：

```ts
interface AgentDoorRepository {
  getSnapshot(): DemoSnapshot;
  subscribe(listener: () => void): () => void;
  execute(command: AgentDoorCommand): CommandResult;
}
```

### 为什么不继续直接 `setState`

- 保证新 Task 同时出现在树、列表和详情。
- 保证 Todo 完成同步更新侧栏、详情和我的待办。
- 保证 File 在团队文件与任务引用中保持同一 ID。
- 让 Demo 的所有写入先经过同一命令合同，后续能替换为服务端 Gateway。
- 能集中加入 schema migration、幂等键、失败模拟和恢复。

### Demo 边界

localStorage adapter 只能证明交互与对象语义：

- 不能证明跨 tenant 隔离。
- 不能证明权限在服务端执行。
- 不能证明 ChangeSet 不可改写。
- 不能证明并发 CAS 或事务原子性。
- 不能把前端隐藏或禁用按钮称为安全控制。

开发 / 演示环境应有低打扰但明确的环境说明，例如“交互演示 · 权限与审计为模拟策略”。

## 六、页面影响范围

### `src/App.tsx`

- 移出成员、文件、Task 和 Todo fixture。
- 移出所有创建与持久化规则。
- 保留应用 shell 和路由选择职责，逐步改成 feature composition。
- 删除固定 `coupon-fix` 创建回跳。

### `src/components/TaskDetail.tsx`

- 保留外壳、标题区、标签、Tab 和文件双栏结构。
- Props 改为 Task ID + selectors / commands，不再接多组覆盖值。
- Owner 改只读；提供“移交任务负责人”入口占位，未确认 Handoff 前不伪造动作。
- 子 Task 与 Todo 拆成两个 Tab / section。
- 新增协作、决定、变更投影；未实现能力明确空状态。
- 日期降级为可选承诺信息。

#### TaskDetail 能力迁移矩阵

| 当前视觉 / 信息 | 目标数据真相 | 处理 | 写入边界 |
| --- | --- | --- | --- |
| 面包屑 `pathLabels` | `TaskFolder` 路径 + `Task.parentTaskId` 祖先 selector | 保留样式；目录与父子 Task 分段表达 | 移动目录 / 移动 Task 分别走命令，均防循环 |
| 标题、目标 | `Task.title / goal` | 保留 | `UpdateTaskBrief`；记录 ChangeSet |
| 标签与 TagGroup | `TagGroup` + `Tag` + `TaskTagAssignment`，保留 icon / color Token | 保留；从 App 私有状态迁出 | `AssignTaskTag / RemoveTaskTag`；标签定义变更走独立管理命令 |
| Owner | `Task.ownerId` | 保留展示，改只读 | 只能由 Handoff / Steward 合同改变，不再直接 select |
| Participants | 已接受的 Responsibility / 协作关系投影；迁移期保留 `participantIds` | 保留位置但改语义；旧 fixture 标为 legacy import，不据此生成责任画像 | 只能由接受、结束或撤销协作命令改变 |
| 状态 | `Task.status` | 保留 Badge；AI 可建议，用户确认后写入 | `ChangeTaskStatus`，校验子 Task 和验收证据 |
| 日期范围 / due | `TaskCommitment` | 降级为“明确承诺”；无承诺时不显示空日期控件 | `Set / RemoveTaskCommitment`；必须记录来源 |
| 概览 summary | selector 生成的 `TaskSummary`，附来源与 freshness | 保留版式，不把 AI 文案当字段真相 | 只读投影；从 Activity / Evidence 重算 |
| 验收条件 | `TaskAcceptanceCriterion` | 保留并补证据状态 | 独立命令；met / waived 需操作者与证据 |
| 当前所谓“子任务” | 当前 `TaskTodoMock` 迁为 `Todo` | 改名为“待办”；另加真实子 Task Tab | Todo 与 Task 各自命令；Todo 升级 Task 时保留来源 |
| 递归文件树 / 预览 | `TaskFileFolder` + Placement + File + FileVersion | 保留整体结构和阅读密度 | 移动 placement、固定版本、发布团队文件分别确认 |
| 动态与评论 | `Activity` | 保留；AI / 人 / 系统事件有明确类型 | `PostActivity`；按 audience 与对象权限过滤 |
| “提交记录” | `ChangeSet` 投影 | 改名“变更”；Demo 标记 `demo-simulated` | 页面不可直接追加审计记录，由 command 结果生成 |

这张矩阵是“保留 TaskDetail”的验收清单：字段未迁入统一 snapshot 前，不得以新空状态替换旧信息，也不得只保留 CSS 外壳。

### `WorkspaceSidebar` / `WorkspaceList`

- 保留现有任务目录的视觉与导航价值，迁移为独立 `TaskFolder`；它只负责分组，不代表父子任务、责任或状态继承。
- 任务树使用 `Task.parentTaskId` 表达真正的多层级工作关系；selector 可把目录分组和父子 Task 组合成导航投影，但底层不再混为一个对象。
- File 从任务导航节点中退出，改由 `TeamFileFolder`、`TaskFileFolder` 与 `TaskFilePlacement` 投影；这不是删除任务内文件树，而是统一它的数据真相。
- 列表仅展示 Task；团队文件使用独立数据投影。
- 保留现有展开、筛选、分页和密度。
- 循环、孤儿和深层递归由 selector 防护。

### `CollaborationBrief`

- 旧实现退出主流程。
- 由 `NeedLedProposal`、`CollaborationGapCard`、`CandidateComparison` 和 `CollaborationOfferDialog` 组合替代。
- 任何候选与判断从 fixture / selector 输入，不在组件内写人名。

### `MyTodosPage`

- 改读统一 Todo。
- 接同一完成 command；TaskDetail、侧栏和列表即时一致。
- “完成后交给下一责任人”在 Handoff 合同确认前移除或禁用，不用文案冒充真实交接。

### `ResourceLibrary`

- 复用预览与文档阅读结构，升级为团队文件详情。
- 补文件夹树、主列表、版本、维护责任、权限状态和 Task 引用。
- `selectedResourceId` 由真实路由 / 选择产生。

### `PersonalWorkbench`

- 不延续精确个人容量、完成率和委派象限。
- 复用主要布局思想，改为对象队列：待决定、待接收、待验收 / 整合、等待依赖、AI 洞察。
- 移除在线、最后活跃和个人节奏推断。

### CSS 与设计系统

- 新组件只消费 `--ad-*` Token。
- 不在 `personal-workbench-v3.css` 或 `styles.css` 继续追加孤立视觉体系。
- 优先把 Proposal、Insight、Candidate、Handoff、File Tree 和 Activity 抽成共享 pattern class / component。
- 每个切片要求 design check 不恶化，并逐步清理硬编码与微小字号。

## 七、权限、隐私与审计

### UI Demo 阶段

- 使用不同 viewer fixture 验证 hidden / metadata / read / edit 的界面投影。
- 所有权限结果由模拟 PolicyDecision selector 返回，而不是散落的布尔值。
- 前台明确“模拟策略”，不得声称服务端安全。
- 候选窗口只来自 `source=self-published` 且带 `audience` / `expiresAt`。
- 推荐理由只引用当前 viewer 有权发现的安全摘要。

### 生产实现前必须补齐

- 统一 Principal、Member、AgentConnection 与 on-behalf-of。
- 服务端 AuthorizationGrant / PolicyDecision。
- Command Gateway、tenant 校验、幂等与事务。
- append-only ChangeSet 与补偿操作。
- FileVersion / PermissionPolicyVersion 不可变。
- Handoff activation 的 CAS / 行锁 / 串行化检查。

### 负面测试

- 用猜测 ID 发现跨 tenant Task / File。
- 发起人看见候选人的受限 Task 标题或文件名。
- 候选未公开窗口时系统从任务数推断“空闲”。
- 普通邀请直接更新 Owner。
- recipient B 接受却把责任写给 C。
- Handoff 关键版本漂移后旧 Consent 仍可激活。
- 用户撤销 Agent 委托后下一请求仍能读取。
- 私密拒绝原因进入 Activity、画像或管理员下钻。

## 八、实施顺序

### Slice 0：基线与统一真相

1. 人类批准本地 Git 初始 baseline 或等效不可变快照与恢复验证。
2. 在触碰新的 Task / 导航 UI 前完成 `DS-V2-01`，并验证现行设计系统正文不再包含旧固定阶段、看板和导航强制语义。
3. 建领域类型、DemoSnapshot、Repository、commands、selectors 和 schemaVersion。
4. 把现有任务目录迁成 `TaskFolder`，把 `Task.parentTaskId` 作为独立工作层级；迁移零售 fixture 为一个相互引用的数据集。
5. 同时建立 `TeamFileFolder`、`TaskFileFolder`、File / FileVersion / Placement 与权限引用，禁止悬空 `folderId`。
6. 为旧 localStorage key 设计一次性 migration；无法迁移时保留导出 / 清除说明。
7. App、任务列表、TaskDetail、MyTodos 先只读接同一 snapshot。

### Slice 1：默认自己负责的真实创建

1. `NeedLedProposal`：一句复述、0–1 个问题、最小可编辑 Proposal。
2. UI 默认 `proposedOwnerId=currentMemberId`，但 Proposal 编辑态允许暂时为空；物化命令必须在确认后补成当前人类创建者且验证唯一 Owner。
3. 没有关键缺口时不渲染候选比较。
4. 有缺口时显示解释，但用户可“先由我推进”。
5. `materializeTask` 通过 idempotency key 创建真实 ID。
6. 导航到新对象；树、列表、详情与刷新一致。
7. TaskDetail 明确分开子 Task、Todo 和 File placement。

### Slice 2：候选比较与邀请

1. 建 Evidence / Coverage / public collaboration window fixture。
2. Policy selector 先做可发现与授权硬过滤。
3. CandidateComparison 展示 0–4 位有证据的差异候选，不凑数、不预选、无总分；0 位与 1 位都有专门说明和替代路径。
4. 定稿协作 Offer 合同；发送前预览 scope、文件与权限。
5. 接收者接受 / 改范围 / 推荐他人 / 私密拒绝。
6. 新独立结果在同 Revision 接受后幂等创建子 Task。

### Slice 3：Handoff 与 Result Return

1. 确认 Q-10–Q-19 和必要的 Profile invariants；若 Q-10 未确认，首版明确不做 Owner 不可用时的 Steward 应急接管。
2. 实现 Handoff Revision / Consent / preflight / activation 投影。
3. TaskDetail 加“协作”区；首页加待我接收和待我验收。
4. 完成 POS 子 Task Result Return 闭环。
5. 结果验收后生成可纠正的责任证据草稿。

### Slice 4：团队文件与团队动态

1. 团队文件入口、Folder Tree、Table、详情、版本与引用。
2. 任务自产文件发布协议依 Q-04 实现。
3. help-request Activity、脱敏预览、定向范围、响应与收敛。
4. 响应与责任、参与者、权限严格分离。

### Slice 5：画像、洞察与五行业

1. Member profile、EvidenceCoverage、纠正 / 隐藏 / disputed。
2. 全平台 CollaborationInsight selectors。
3. 依次增加支付、营销、影视、零售和制造团队 fixture。
4. 每个行业复用同一命令、对象、权限和共享组件，不复制页面。

## 九、首个纵切 Evidence Spec

### 自动检查

- `npm run design:check`
- `npm run build`
- 新增领域层单元测试命令（具体测试框架需 implementation-ready 时确认）。
- 新增 repository / command contract tests。

### 正常场景

1. 轻任务输入后没有候选、步骤树和预分 Todo。
2. Proposal 默认显示当前用户为 Owner 建议。
3. 点击创建生成非固定、唯一 Task ID。
4. 新 Task 出现在正确父层级、列表和详情。
5. 刷新后 title / goal / owner / parentTaskId / File placement 一致。
6. 同一 materialize command 重放不创建第二个 Task。

### 缺口场景

1. 信息缺口只显示“找资料 / 继续自己”，不强迫找人。
2. 权限硬约束能阻止具体高风险动作，但不阻止用户创建准备工作 Task。
3. 用户关闭协作建议后仍可创建。

### 空 / 错误 / 恢复

- 空名称、空目标、无当前用户、repository 写入失败、storage quota、schema migration 失败。
- 写入失败时 Proposal 保留，界面解释哪些内容安全、怎样重试或导出。
- 深层 parentTaskId 循环和孤儿数据被拒绝或进入可恢复隔离区。

### 视觉与无障碍

- 1440px、960px、640px 和触屏 44px 目标。
- 键盘完成输入、编辑、继续自己、创建、树导航和返回。
- Focus ring、读屏名称、错误关联、live region 不重复播报。
- reduced-motion 下没有路径绘制、位移、confetti 和循环动画。
- 与 WorkspaceList、TaskDetail、MyTodos 至少两个相邻页面截图比较。

### 当前尚未能证明

- 服务端 ACL、tenant 隔离、撤权实时生效。
- append-only 审计。
- 并发物化和事务原子性。
- Handoff CAS、同 Revision Consent 与权限漂移。
- 多人协作的心理安全与推荐有效性。

这些必须标为“未验证”，不能用前端 Demo 跑通替代。

## 十、风险与恢复

| 风险 | 后果 | 控制 | 恢复 |
| --- | --- | --- | --- |
| 没有 baseline 就重构 | 无法区分用户已有改动与本轮改动 | 当前停止代码实施 | 人类批准 baseline 或等效快照 |
| 一次迁移所有页面 | 大范围视觉与行为回归 | 先只读接 repository，再逐个切写入 | 每切片独立 diff 与回退 |
| localStorage schema 变化 | 旧 Demo 数据丢失或无法打开 | schemaVersion、migration、导出 | 保留旧 key 只读备份直到验收 |
| 先做找人 UI | 推荐继续依赖无来源字段 | Slice 1 不做候选，Slice 2 先建 Evidence / Coverage | 回退到继续自己 / 找信息 |
| 直接复制 21st 组件 | 许可、依赖、无障碍和视觉体系失控 | 逐项 research，优先现有 Base UI / Radix | 删除外部视觉层，保留共享行为 API |
| 把 Demo 权限当生产权限 | 产生错误安全承诺 | 环境标识、文案和测试明确模拟 | 禁止外部真实数据与高风险动作 |
| 清理旧组件过早 | 删除用户仍要保留的设计成果 | 先隔离、记录调用图，再清理 | 恢复旧 route / component |

## 十一、进入 implementation-ready 的条件

1. 产品负责人确认 Decision Brief Revision 2 或给出明确修订。
2. 产品负责人批准 Git 初始 baseline，或书面选择等效 before / after、不可变存储和恢复验证。
3. Slice 0 + Slice 1 至少确认 Q-03、Q-08、Q-09；若 Todo 允许无 assignee 再确认 Q-02。
4. 如果首轮同时包含人员比较，必须确认 Q-05、Q-06、Q-07、Q-17。
5. 如果首轮同时包含 Handoff / Result Return / Owner Transfer，必须确认 Q-10–Q-19 及协作 Offer / Responsibility fulfillment 合同；未确认 Q-10 时不得实现 Steward 应急接管。
6. 明确本轮是高保真交互 Demo，还是同步建设真实后端；两者的验收和安全承诺不可混用。
7. Reviewer 独立核对本 Assessment、代码影响范围和 Evidence Spec。
8. 完成 `DS-V2-01`，现行设计系统正文不再把旧 Work Request、固定阶段、看板或固定导航作为新 Task UI 的强制依据。

## 十二、当前判定

- 状态：`pre-decision`。
- Review 建议结论：`blocked-pending-decision`。
- 已授权动作：只读审计、组件研究、Decision Brief 与 Technical Assessment。
- 未授权动作：功能代码修改、依赖安装、创建 Git 初始 commit、确认 Q-01–Q-19、对外发布或声称生产安全。
