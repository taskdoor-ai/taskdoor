# AgentDoor 任务 REST API 与 MCP 工具契约

> 文档类型：接口候选设计  
> 版本：`agentdoor.task-mcp.v0.1`  
> 日期：2026-09-02  
> 状态：Proposal，待产品与技术评审；不是当前生产接口  
> 范围：Task、子 Task、讨论、文件、提交和活动的增删改查，以及 REST API 与 MCP Tool 的对应关系

## 0. 本次要解决的问题

个人 AI、MCP App 和普通客户端都需要读取、创建和更新同一组任务事实。如果各端自行决定字段、状态和回传方式，会产生三类问题：

1. 相同动作在 REST、MCP 和前端中具有不同语义，例如“提交成功”无法区分候选已保存、文件已传输和正式数据已生效。
2. Agent 只能解析自然语言回执，无法可靠判断幂等重试、版本冲突、部分失败和正式对象状态。
3. 讨论、系统活动、文件版本和正式提交互相混用，导致客户端能够伪造活动、覆盖历史或把报告完成写成正式验收。

本契约希望达到以下结果：

- REST API 和 MCP Tool 调用同一套身份、权限、幂等、版本及事务服务。
- 每个写操作都返回机器可解析的正式回执；自然语言只用于向人解释。
- Task、讨论、文件、提交和 Activity 保持单一事实来源。
- Agent 可以执行明确授权的动作，但不能通过通用更新接口改变 Owner、权限、验收或 Handoff 事实。

成功证据不是“接口能返回 200”，而是同一动作从 REST 或 MCP 发起时得到相同的业务结果、资源版本、ChangeSet 和 Activity；重复调用不会重复创建，并发冲突不会覆盖其他成员的更新。

## 1. 总体架构

REST 与 MCP 是同一领域能力的两种入口：

```text
REST Controller ─┐
                 ├→ Command / Query Gateway
MCP Tool Adapter ┘     → Principal 与委托校验
                       → ACL / PolicyDecision
                       → 幂等与版本校验
                       → 领域规则
                       → 原子事务
                       → Domain Event / ChangeSet
                       → Activity 与查询投影
```

约束：

- MCP Tool 不直接写数据库，也不另存一份 Task。
- REST Controller 不自行生成 Activity。
- REST 与 MCP 不互相复制业务校验；它们只做协议转换。
- 部署上 MCP Server 可以调用 REST API，也可以与 REST Controller 共同调用 Application Service；无论采用哪种部署，领域结果必须一致。
- 不提供万能 `agentdoor_http_request` 或任意数据库读写工具。MCP 使用语义化、参数受限的 Tool。

## 2. 领域对象与操作能力

RESTful 不意味着所有资源都机械支持完整 CRUD。对象允许哪些方法由业务不变量决定。

| 对象 | 业务含义 | 允许的操作 |
| --- | --- | --- |
| `Task` | 唯一行动对象 | 创建、读取、局部更新、逻辑删除、受控状态转换 |
| 子 Task | `parentTaskId` 非空的 Task | 复用 Task，不建立第二套 Subtask Schema |
| `DiscussionMessage` | 人的讨论、回复、@ 与文件引用 | 创建、读取、编辑、逻辑删除 |
| `File` | 文件身份和元数据 | 创建、读取、更新元数据、受控逻辑删除 |
| `FileVersion` | 不可变文件内容版本 | 创建、读取；禁止原地更新 |
| `TaskFilePlacement` | Task 对 File 的引用、位置和版本策略 | 创建、读取、更新、移除 |
| `TaskCommitDraft` | 正式提交前可编辑的提交草稿 | 创建、读取、更新、删除 |
| `TaskCommit` | 已正式提交的结果说明与文件版本集合 | 创建、读取；不可修改或删除 |
| `Activity` | 系统根据正式变更生成的事实记录 | 只读 |

### 2.1 全局不变量

1. 子 Task 仍是 Task，具有稳定 Task ID；后续读取、更新和删除使用 Task 的规范 URI。
2. Task 正式 Owner 为 `0..1`；已有 Owner 的变化不能通过普通 PATCH 完成。
3. `DiscussionMessage` 是人的交流；`Activity` 是已经发生的系统变更事实，两者不能共用写入接口。
4. File 内容更新创建新 `FileVersion`，不覆盖旧版本。
5. Task 引用 File 不复制内容、不自动扩大权限。
6. 正式 `TaskCommit` 不可改写；更正通过新的 Commit 和 `supersedesCommitId` 表达。
7. Agent 报告“完成”、文件上传成功或 Commit 创建成功都不自动等于 Task 已完成或结果已验收。
8. 未知不是零，无权限不是不存在，异步受理不是正式生效。
9. 所有写操作记录实际 Principal、代表的成员、授权依据、幂等记录和服务端提交时间。

## 3. REST 通用规范

### 3.1 基础约定

```text
Base URL: /api/v1
Media type: application/json
Patch type: application/json-patch+json
Error type: application/problem+json
Timestamp: ISO 8601 UTC
Business date: YYYY-MM-DD
Field naming: camelCase
ID: opaque string
```

列表使用 `cursor + limit`；不使用会因并发插入漂移的页码。默认 `limit=50`，最大值由服务端配置并在响应中回显实际值。

### 3.2 通用请求头

```http
Authorization: Bearer <access-token>
X-Request-Id: <client-correlation-id>
Idempotency-Key: <stable-write-key>
If-Match: "<resource-etag>"
```

- 所有创建、更新、删除和状态转换都必须带 `Idempotency-Key`。
- 修改已有资源必须带 `If-Match`；缺失返回 `428 Precondition Required`。
- GET 单资源返回 `ETag`；调用方把该值用于后续条件更新。
- 相同幂等键和相同规范化载荷只生效一次，重试返回原业务结果。
- 相同幂等键配不同载荷返回 `409 IDEMPOTENCY_KEY_REUSED`。
- 幂等重试仍重新鉴权；撤权后不能借旧回执读取已无权内容。

### 3.3 读取响应

```ts
type ApiResponse<T> = {
  data: T;
  meta: {
    requestId: string;
    asOf: string;
    nextCursor?: string;
    limit?: number;
  };
};
```

### 3.4 写入响应

```ts
type MutationResponse<T> = {
  data: T;
  receipt: MutationReceipt;
  meta: {
    requestId: string;
    asOf: string;
  };
};

type MutationReceipt = {
  schemaVersion: "agentdoor.write-receipt.v0.1";
  operationId: string;
  outcome:
    | "succeeded"
    | "no_change"
    | "accepted_async"
    | "needs_confirmation";
  effect: "none" | "proposed" | "applied";
  replayed: boolean;
  atomic: boolean;
  affectedResources: Array<{
    resourceType:
      | "task"
      | "discussion_message"
      | "file"
      | "file_version"
      | "task_file_placement"
      | "task_commit_draft"
      | "task_commit"
      | "activity";
    resourceId: string;
    action: "created" | "updated" | "linked" | "unlinked" | "deleted" | "appended";
    beforeVersion: number | null;
    afterVersion: number | null;
  }>;
  changeSetId?: string;
  changeDigest?: string;
  generatedActivityIds: string[];
  committedAt: string;
};
```

`outcome=succeeded` 只说明该命令成功；只有 `effect=applied` 才表示正式业务对象已经生效。值没有变化时返回 `no_change`，不得生成伪 Activity。

### 3.5 错误响应

错误遵循 Problem Details：

```json
{
  "type": "https://agentdoor.example/problems/version-conflict",
  "title": "资源版本已变化",
  "status": 412,
  "code": "VERSION_MISMATCH",
  "detail": "任务已经被其他成员更新，请读取最新版本后重新提交。",
  "requestId": "req-001",
  "retryable": true,
  "recoveryAction": "reload_resource"
}
```

| HTTP 状态 | 使用场景 |
| --- | --- |
| `200` | 查询、更新、带回执删除、无变化 |
| `201` | 创建资源；同时返回 `Location` |
| `202` | 文件扫描等异步处理已受理 |
| `304` | 条件读取未变化 |
| `400` | JSON、字段类型或请求结构错误 |
| `401` | 未认证 |
| `403` | 对已知对象无此操作权限，且策略允许暴露对象存在 |
| `404` | 不存在或不可发现；不区分两者 |
| `409` | 业务冲突、依赖循环、幂等键被不同载荷复用 |
| `412` | `If-Match` 与当前版本不一致 |
| `413` | 文件或请求超过限制 |
| `422` | 字段结构合法但违反领域规则 |
| `428` | 修改请求缺少 `If-Match` |
| `429` | 频率限制 |
| `503` | 服务暂不可用或投影尚不可读取 |

初版不提供非原子批量写入，也不使用 `207 Multi-Status`。需要一次修改多项资源时，由明确的领域命令在同一事务中执行；不能把部分成功包装成整体成功。

## 4. Task 与子 Task

### 4.1 Task 资源

```ts
type Task = {
  id: string;
  teamId: string;
  version: number;
  name: string;
  goal: string;
  completionCriteria: string[];
  ownerId: string | null;
  proposedOwnerId: string | null;
  participantIds: string[];
  parentTaskId: string | null;
  dependsOnTaskIds: string[];
  plannedStartOn: string | null;
  plannedEndOn: string | null;
  status: "open" | "in_progress" | "blocked" | "completed" | "cancelled";
  labels: string[];
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
```

接口统一使用 `name`，不同时维护 `title`。界面可以显示“任务名称”，但协议中只有一个字段真相。

### 4.2 REST 路由

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/tasks` | 查询有权可见的 Task |
| `POST` | `/tasks` | 创建根 Task |
| `GET` | `/tasks/{taskId}` | 获取 Task |
| `PATCH` | `/tasks/{taskId}` | 更新允许修改的字段 |
| `GET` | `/tasks/{taskId}/deletion-impact` | 查询删除影响与确认摘要 |
| `DELETE` | `/tasks/{taskId}` | 逻辑删除 Task |
| `POST` | `/tasks/{taskId}/status-transitions` | 执行正式状态转换 |
| `GET` | `/tasks/{taskId}/subtasks` | 查询直属子 Task |
| `POST` | `/tasks/{taskId}/subtasks` | 创建直属子 Task |

查询参数建议：

```text
teamId, status, ownerId, parentTaskId, label, query, updatedAfter, cursor, limit
```

父 Task 的可读权限不自动授予隐藏子 Task 的标题、数量或状态。服务端不能把完整集合返回浏览器后再隐藏。

### 4.3 创建根 Task

```http
POST /api/v1/tasks
Idempotency-Key: create-task-001
```

```json
{
  "name": "设计 MCP 任务接口",
  "goal": "形成供客户端和 Agent 共用的正式接口契约",
  "completionCriteria": [
    "Task、讨论、文件、提交和子任务接口均有定义"
  ],
  "ownerId": null,
  "participantIds": [],
  "plannedStartOn": "2026-09-02",
  "plannedEndOn": "2026-09-05",
  "dependsOnTaskIds": [],
  "labels": ["产品设计"]
}
```

创建者不自动成为 Owner。若 `ownerId` 指向其他成员，服务端必须按正式责任规则处理；不能通过该字段冒充成员已经接受。

### 4.4 创建子 Task

```http
POST /api/v1/tasks/task-parent/subtasks
Idempotency-Key: create-subtask-001
```

请求体与根 Task 创建相同，但不接收 `parentTaskId`；服务端从路径写入父级。创建后返回的对象仍是 `Task`，规范读取 URI 是 `/tasks/{childTaskId}`。

### 4.5 更新 Task

```http
PATCH /api/v1/tasks/task-123
If-Match: "task-123:v7"
Idempotency-Key: update-task-009
Content-Type: application/json-patch+json
```

```json
[
  {
    "op": "replace",
    "path": "/goal",
    "value": "形成已经通过接口评审的 API 与 MCP 契约"
  },
  {
    "op": "replace",
    "path": "/labels",
    "value": ["产品设计", "MCP"]
  }
]
```

普通 PATCH 只允许以下路径：

```text
/name
/goal
/completionCriteria
/participantIds
/dependsOnTaskIds
/plannedStartOn
/plannedEndOn
/labels
```

以下内容使用受控命令，不能普通 PATCH：

- `ownerId`、`proposedOwnerId`
- `parentTaskId`
- `status`
- 团队和 ACL
- 正式验收、实际投入、Handoff 和 Consent
- 创建人、版本和审计时间

数组在 v0.1 中整体替换；`If-Match` 防止用旧集合覆盖并发更新。后续若确实需要高频成员并发编辑，再增加专门的集合成员资源，不先引入复杂协议。

### 4.6 状态转换

```http
POST /api/v1/tasks/task-123/status-transitions
If-Match: "task-123:v8"
Idempotency-Key: status-transition-001
```

```json
{
  "toStatus": "blocked",
  "reason": "等待接口安全边界确认",
  "evidenceRefs": ["discussion-message-27"]
}
```

状态转换服务校验当前状态、完成标准版本、依赖、权限和其他领域约束。Agent 的执行报告或 Commit 不自动调用该接口。

### 4.7 删除

删除前读取影响：

```http
GET /api/v1/tasks/task-child/deletion-impact
```

```ts
type TaskDeletionImpact = {
  taskId: string;
  taskVersion: number;
  descendantTaskIds: string[];
  dependentTaskIds: string[];
  activeFilePlacementIds: string[];
  openCommitDraftIds: string[];
  impactDigest: string;
  requiresExplicitCascade: boolean;
};
```

有后代时：

```http
DELETE /api/v1/tasks/task-child?cascade=descendants
If-Match: "task-child:v3"
X-Impact-Digest: sha256:...
Idempotency-Key: delete-task-child-001
```

删除是逻辑删除。讨论、正式 Commit、Activity 和审计记录保留；TaskFilePlacement 失效，但共享 File 不随 Task 删除。影响摘要变化时返回 `409 DELETION_IMPACT_CHANGED`，要求重新预览。

## 5. 讨论与 Activity

### 5.1 DiscussionMessage

```ts
type DiscussionMessage = {
  id: string;
  taskId: string;
  version: number;
  parentMessageId: string | null;
  authorPrincipalId: string;
  body: string;
  attachmentRefs: Array<{
    fileId: string;
    fileVersionId: string;
  }>;
  mentionedPrincipalIds: string[];
  visibilityPolicyDigest: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};
```

根讨论和回复使用同一对象，通过 `parentMessageId` 区分。

### 5.2 讨论 REST 路由

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/tasks/{taskId}/discussion-messages` | 查询讨论与回复 |
| `POST` | `/tasks/{taskId}/discussion-messages` | 创建根讨论或回复 |
| `GET` | `/discussion-messages/{messageId}` | 获取消息 |
| `PATCH` | `/discussion-messages/{messageId}` | 编辑消息 |
| `DELETE` | `/discussion-messages/{messageId}` | 逻辑删除消息 |

创建根讨论：

```json
{
  "body": "需要确认文件上传完成后何时生成 Activity。",
  "parentMessageId": null,
  "attachmentRefs": [],
  "mentionedPrincipalIds": ["principal-27"]
}
```

创建回复仍向同一集合 POST：

```json
{
  "body": "建议 FileVersion 可用后再生成正式 Activity。",
  "parentMessageId": "message-100",
  "attachmentRefs": [],
  "mentionedPrincipalIds": []
}
```

编辑只允许 `/body`、`/attachmentRefs` 和 `/mentionedPrincipalIds`。普通成员只能编辑自己的消息；删除后保留 tombstone，已有回复不消失。回复成功和通知成功分开，通知失败不能把已保存回复回滚成不存在。

### 5.3 Activity

Activity 是领域写入的只读投影：

```ts
type Activity = {
  id: string;
  taskId: string;
  sequence: number;
  type: string;
  actorPrincipalId: string;
  representedMemberId: string | null;
  summary: string;
  changeSetId: string;
  affectedResourceRefs: string[];
  committedAt: string;
};
```

只提供：

| 方法 | 路径 |
| --- | --- |
| `GET` | `/tasks/{taskId}/activities` |
| `GET` | `/activities/{activityId}` |

不提供 `POST /activities`、`PATCH /activities/{id}` 或 `DELETE /activities/{id}`。用户回复的是 `DiscussionMessage`，不是 Activity。界面隐藏一条 Activity 也不能删除正式审计事实。

## 6. 文件

### 6.1 文件对象

```ts
type File = {
  id: string;
  teamId: string;
  version: number;
  name: string;
  mimeType: string;
  scope: "task" | "team";
  currentFileVersionId: string;
  maintainerMemberId: string | null;
  visibilityPolicyId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type FileVersion = {
  id: string;
  fileId: string;
  ordinal: number;
  sizeBytes: number;
  mimeType: string;
  contentDigest: string;
  scanStatus: "pending" | "passed" | "rejected";
  availability: "processing" | "available" | "quarantined" | "failed";
  createdByPrincipalId: string;
  createdAt: string;
};

type TaskFilePlacement = {
  id: string;
  version: number;
  taskId: string;
  fileId: string;
  folderId: string | null;
  versionMode: "pin_version" | "follow_latest";
  pinnedFileVersionId: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### 6.2 REST 路由

上传会话：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `POST` | `/file-upload-sessions` | 准备新 File 或新 FileVersion 上传 |
| `GET` | `/file-upload-sessions/{uploadId}` | 查询上传状态 |
| `PUT` | `/file-upload-sessions/{uploadId}/content` | 上传字节；也可由服务端返回受控预签名地址 |
| `POST` | `/file-upload-sessions/{uploadId}/completions` | 校验并完成入库 |

文件与引用：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/tasks/{taskId}/file-placements` | 查询 Task 内文件引用 |
| `POST` | `/tasks/{taskId}/file-placements` | 引用已有 File |
| `GET` | `/task-file-placements/{placementId}` | 获取引用 |
| `PATCH` | `/task-file-placements/{placementId}` | 修改位置或版本策略 |
| `DELETE` | `/task-file-placements/{placementId}` | 从 Task 移除引用 |
| `GET` | `/files/{fileId}` | 获取 File 元数据 |
| `PATCH` | `/files/{fileId}` | 更新允许的 File 元数据 |
| `GET` | `/files/{fileId}/versions` | 查询版本历史 |
| `GET` | `/file-versions/{fileVersionId}` | 获取版本元数据 |
| `GET` | `/file-versions/{fileVersionId}/content` | 读取或下载版本内容 |
| `GET` | `/files/{fileId}/deletion-impact` | 查询规范 File 删除影响 |
| `DELETE` | `/files/{fileId}` | 受控逻辑删除规范 File |

### 6.3 准备上传

新文件：

```json
{
  "target": {
    "kind": "new_file",
    "taskId": "task-123",
    "folderId": "folder-1"
  },
  "fileName": "mcp-api-design.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 284391,
  "contentDigest": "sha256:..."
}
```

已有 File 的新版本：

```json
{
  "target": {
    "kind": "new_file_version",
    "fileId": "file-123",
    "expectedFileVersionOrdinal": 4
  },
  "fileName": "mcp-api-design.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 301822,
  "contentDigest": "sha256:..."
}
```

准备结果：

```ts
type PreparedFileUpload = {
  uploadId: string;
  expiresAt: string;
  maxBytes: number;
  allowedMimeTypes: string[];
  targetKind: "new_file" | "new_file_version";
};
```

上传地址和临时令牌不进入模型可见的 REST 日志或 MCP `structuredContent`；它们只交给受信 App。

### 6.4 完成上传

`POST /file-upload-sessions/{uploadId}/completions` 校验：

- 实际大小、MIME 和内容摘要；
- 上传会话是否过期、是否属于当前 Principal；
- 目标 Task、File 和文件夹权限；
- 新 FileVersion 的基准版本；
- 安全扫描和内容处理状态。

字节已传输不等于 File 已可用。扫描仍在进行时返回 `202 + outcome=accepted_async`；只有 `FileVersion.availability=available` 才能显示为可用版本。

新 File、首个 FileVersion、TaskFilePlacement、ChangeSet 和 Activity 必须在一个受控事务中形成；不能出现“Activity 已成功但 File 不存在”。若异步扫描发生在事务后，FileVersion 先保持 `processing`，可用投影在扫描通过后由后续领域事件推进。

### 6.5 引用与删除

引用已有文件：

```json
{
  "fileId": "file-123",
  "folderId": "folder-evidence",
  "versionMode": "pin_version",
  "pinnedFileVersionId": "file-version-4"
}
```

“从 Task 移除文件”和“删除规范 File”是不同动作：

- 删除 `TaskFilePlacement` 只解除当前 Task 引用。
- 删除 `File` 会影响所有引用者，必须先读取 deletion impact，并绑定最新影响摘要。
- 删除 File 不静默删除历史 FileVersion、Commit 引用或 Activity；无权读取正文的用户也不能从影响结果获得隐藏任务名称和数量。

## 7. 提交

### 7.1 为什么拆成草稿与正式 Commit

如果一个“提交”既可编辑又被当作正式历史，更新和删除会改写团队已经依赖的事实。因此 v0.1 使用两个对象：

- `TaskCommitDraft`：尚未正式提交，可以增删改查。
- `TaskCommit`：正式提交后不可变，只能创建和读取。

正式 Commit 只表示成员或 Agent 已提交结果，不自动表示结果已验收或 Task 已完成。

### 7.2 Schema

```ts
type TaskCommitDraft = {
  id: string;
  taskId: string;
  version: number;
  status: "draft" | "committed";
  message: string;
  resultSummary: string;
  fileVersionRefs: string[];
  evidenceRefs: string[];
  basedOnTaskVersion: number;
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
  committedAsCommitId: string | null;
  committedAt: string | null;
};

type TaskCommit = {
  id: string;
  taskId: string;
  ordinal: number;
  message: string;
  resultSummary: string;
  fileVersionRefs: string[];
  evidenceRefs: string[];
  basedOnTaskVersion: number;
  supersedesCommitId: string | null;
  committedByPrincipalId: string;
  committedAt: string;
};
```

### 7.3 REST 路由

草稿：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/tasks/{taskId}/commit-drafts` | 查询提交草稿 |
| `POST` | `/tasks/{taskId}/commit-drafts` | 创建草稿 |
| `GET` | `/task-commit-drafts/{draftId}` | 获取草稿 |
| `PATCH` | `/task-commit-drafts/{draftId}` | 更新草稿 |
| `DELETE` | `/task-commit-drafts/{draftId}` | 删除草稿 |

正式 Commit：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/tasks/{taskId}/commits` | 查询正式 Commit |
| `POST` | `/tasks/{taskId}/commits` | 将草稿提交为正式 Commit |
| `GET` | `/task-commits/{commitId}` | 获取正式 Commit |

正式提交：

```http
POST /api/v1/tasks/task-123/commits
If-Match: "task-123:v8"
Idempotency-Key: submit-commit-001
```

```json
{
  "draftId": "commit-draft-10",
  "expectedDraftVersion": 3,
  "supersedesCommitId": null
}
```

同一事务中：

1. 重验 Task、草稿、FileVersion 和证据引用权限。
2. 校验 Task 与草稿基准版本。
3. 创建不可变 `TaskCommit`。
4. 把草稿标记为已消费，防止再次提交。
5. 记录 ChangeSet 和 Activity。

只有 `status=draft` 的草稿允许 PATCH 或 DELETE。正式提交后草稿记录 `committedAsCommitId`，不再接受修改。正式 Commit 不提供 `PATCH /task-commits/{id}` 或 `DELETE /task-commits/{id}`；需要更正时创建新的草稿和 Commit，并引用 `supersedesCommitId`。

## 8. MCP Tool 通用契约

### 8.1 命名与职责

- 工具统一使用 `agentdoor_` 前缀和 `snake_case`。
- Tool 名使用业务动作，不暴露 HTTP 方法，例如 `agentdoor_update_task`。
- 一个 Tool 只做一个清楚动作；不提供 `agentdoor_manage_task` 等多用途工具。
- 查询 Tool 不产生副作用。
- 删除、正式提交和状态转换必须在描述及 annotations 中明确影响。
- 所有写 Tool 接收稳定 `idempotency_key`；修改已有资源还接收 `expected_version`。
- MCP Tool 输入使用显式字段枚举，不接收任意 JSON Pointer 或 SQL-like 条件。

### 8.2 MCP 返回结构

```ts
type AgentDoorMcpResult<T> = {
  content: Array<{
    type: "text";
    text: string;
  }>;
  structuredContent: {
    data?: T;
    receipt?: MutationReceipt;
    problem?: {
      code: string;
      message: string;
      retryable: boolean;
      recoveryAction?: string;
    };
  };
  isError?: boolean;
  _meta?: Record<string, unknown>;
};
```

- `content` 是给人的一至两句摘要，不是业务真相来源。
- `structuredContent` 是 Agent 和协调层消费的规范结果。
- 上传地址、临时令牌和只供组件使用的信息放在 App-only `_meta`，不得写入 `content`。
- 可恢复的版本冲突、权限错误和校验失败设置 `isError=true`，同时提供结构化 `problem`。
- `accepted_async` 不是错误；协调方使用查询 Tool 继续读取状态。

### 8.3 回传压缩

| 级别 | 用途 | 规则 |
| --- | --- | --- |
| `compact` | 写操作默认回执、轮询状态 | 返回结果、ID、版本、状态、摘要、错误和详情引用；建议不超过 4 KB |
| `standard` | 冲突处理、确认预览、完整字段差异 | 返回本轮完整差异与警告；建议不超过 16 KB |
| `full` | 审计、长讨论和文件历史 | 不直接内联，通过 `detailRef + cursor` 分页获取 |

无论怎样压缩，不得省略：schema version、request/operation ID、outcome、effect、资源 ID、前后版本、幂等重放、正式状态、change digest、错误和恢复动作。文件正文、长讨论、未变化字段和证据正文使用引用，不复制进回执。

## 9. MCP Tool 清单与 REST 映射

### 9.1 Task 与子 Task

| MCP Tool | REST 映射 | 关键输入 |
| --- | --- | --- |
| `agentdoor_list_tasks` | `GET /tasks` | filters、cursor、limit |
| `agentdoor_get_task` | `GET /tasks/{id}` | task_id |
| `agentdoor_create_task` | `POST /tasks` | Task 创建字段、idempotency_key |
| `agentdoor_update_task` | `PATCH /tasks/{id}` | task_id、expected_version、updates、idempotency_key |
| `agentdoor_get_task_deletion_impact` | `GET /tasks/{id}/deletion-impact` | task_id |
| `agentdoor_delete_task` | `DELETE /tasks/{id}` | task_id、expected_version、impact_digest、cascade、idempotency_key |
| `agentdoor_change_task_status` | `POST /tasks/{id}/status-transitions` | task_id、expected_version、to_status、reason、evidence_refs、idempotency_key |
| `agentdoor_list_subtasks` | `GET /tasks/{id}/subtasks` | parent_task_id、cursor、limit |
| `agentdoor_create_subtask` | `POST /tasks/{id}/subtasks` | parent_task_id、Task 创建字段、idempotency_key |

子 Task 的获取、更新和删除复用 `agentdoor_get_task`、`agentdoor_update_task` 和 `agentdoor_delete_task`，避免第二套语义漂移。

`agentdoor_update_task` 输入建议：

```ts
type UpdateTaskToolInput = {
  task_id: string;
  expected_version: number;
  updates: Array<
    | { field: "name"; value: string }
    | { field: "goal"; value: string }
    | { field: "completionCriteria"; value: string[] }
    | { field: "participantIds"; value: string[] }
    | { field: "dependsOnTaskIds"; value: string[] }
    | { field: "plannedStartOn"; value: string | null }
    | { field: "plannedEndOn"; value: string | null }
    | { field: "labels"; value: string[] }
  >;
  idempotency_key: string;
};
```

### 9.2 讨论

| MCP Tool | REST 映射 | 关键输入 |
| --- | --- | --- |
| `agentdoor_list_task_discussions` | `GET /tasks/{id}/discussion-messages` | task_id、cursor、limit |
| `agentdoor_get_discussion` | `GET /discussion-messages/{id}` | message_id |
| `agentdoor_create_discussion` | `POST /tasks/{id}/discussion-messages` | task_id、body、attachments、mentions、idempotency_key |
| `agentdoor_reply_discussion` | 同上，带 `parentMessageId` | task_id、parent_message_id、body、attachments、mentions、idempotency_key |
| `agentdoor_update_discussion` | `PATCH /discussion-messages/{id}` | message_id、expected_version、updates、idempotency_key |
| `agentdoor_delete_discussion` | `DELETE /discussion-messages/{id}` | message_id、expected_version、idempotency_key |

回复 Tool 独立于创建根讨论，便于 Agent 正确选择行为；服务端仍写入同一 `DiscussionMessage` 集合。

### 9.3 文件

| MCP Tool | REST 映射 | 关键输入 |
| --- | --- | --- |
| `agentdoor_list_task_files` | `GET /tasks/{id}/file-placements` | task_id、cursor、limit |
| `agentdoor_get_file` | `GET /files/{id}` | file_id |
| `agentdoor_get_file_version` | `GET /file-versions/{id}` | file_version_id |
| `agentdoor_read_file_version_content` | `GET /file-versions/{id}/content` | file_version_id、purpose、cursor、limit |
| `agentdoor_prepare_file_upload` | `POST /file-upload-sessions` | target、file_name、mime_type、size_bytes、content_digest、idempotency_key |
| `agentdoor_get_file_upload_status` | `GET /file-upload-sessions/{id}` | upload_id |
| `agentdoor_complete_file_upload` | `POST /file-upload-sessions/{id}/completions` | upload_id、idempotency_key |
| `agentdoor_attach_file_to_task` | `POST /tasks/{id}/file-placements` | task_id、file_id、folder_id、version_mode、version_id、idempotency_key |
| `agentdoor_update_task_file_placement` | `PATCH /task-file-placements/{id}` | placement_id、expected_version、updates、idempotency_key |
| `agentdoor_remove_file_from_task` | `DELETE /task-file-placements/{id}` | placement_id、expected_version、idempotency_key |
| `agentdoor_update_file_metadata` | `PATCH /files/{id}` | file_id、expected_version、updates、idempotency_key |
| `agentdoor_get_file_deletion_impact` | `GET /files/{id}/deletion-impact` | file_id |
| `agentdoor_delete_file` | `DELETE /files/{id}` | file_id、expected_version、impact_digest、idempotency_key |

`agentdoor_read_file_version_content` 必须重新校验 Agent Principal、委托、用途和正文权限；长内容按受控分段返回，不把完整文件塞进一次工具回包。MCP 不接受模型任意指定的本地绝对路径。用户选文件和字节传输由受信 App 或 Connector 完成；模型只获得受控 `uploadId` 和安全元数据。

### 9.4 提交

| MCP Tool | REST 映射 | 关键输入 |
| --- | --- | --- |
| `agentdoor_list_task_commit_drafts` | `GET /tasks/{id}/commit-drafts` | task_id、cursor、limit |
| `agentdoor_get_task_commit_draft` | `GET /task-commit-drafts/{id}` | draft_id |
| `agentdoor_create_task_commit_draft` | `POST /tasks/{id}/commit-drafts` | task_id、message、result_summary、file_version_refs、evidence_refs、idempotency_key |
| `agentdoor_update_task_commit_draft` | `PATCH /task-commit-drafts/{id}` | draft_id、expected_version、updates、idempotency_key |
| `agentdoor_delete_task_commit_draft` | `DELETE /task-commit-drafts/{id}` | draft_id、expected_version、idempotency_key |
| `agentdoor_submit_task_commit` | `POST /tasks/{id}/commits` | task_id、expected_task_version、draft_id、expected_draft_version、supersedes_commit_id、idempotency_key |
| `agentdoor_list_task_commits` | `GET /tasks/{id}/commits` | task_id、cursor、limit |
| `agentdoor_get_task_commit` | `GET /task-commits/{id}` | commit_id |

### 9.5 Activity

| MCP Tool | REST 映射 | 关键输入 |
| --- | --- | --- |
| `agentdoor_list_task_activities` | `GET /tasks/{id}/activities` | task_id、cursor、limit |
| `agentdoor_get_activity` | `GET /activities/{id}` | activity_id |

不提供创建、更新或删除 Activity 的 MCP Tool。

## 10. MCP annotations

建议按下表设置 Tool annotations；实际字段名称服从所采用的 MCP SDK 版本。

| Tool 类型 | `readOnlyHint` | `destructiveHint` | `idempotentHint` | `openWorldHint` |
| --- | --- | --- | --- | --- |
| list / get / impact preview | `true` | `false` | `true` | `false` |
| create / update / attach / reply | `false` | `false` | `true` | `false` |
| delete / remove | `false` | `true` | `true` | `false` |
| submit Commit / change status | `false` | 依据状态影响设置并在描述中说明 | `true` | `false` |
| prepare / complete upload | `false` | `false` | `true` | 由存储边界决定；第一方受控存储为 `false` |

annotations 是客户端提示，不产生授权。服务端不能因为 Tool 声称 read-only 或 idempotent 就跳过实际校验。

## 11. 并发、幂等与故障恢复

### 11.1 版本冲突

- GET 返回资源 `ETag` 和对象 `version`。
- REST 写入用 `If-Match`；MCP 写入用 `expected_version`。
- MCP Adapter 把 `expected_version` 转成对应条件命令，不由模型自行生成 ETag。
- 版本不一致返回当前可公开版本和恢复动作，不自动合并高影响字段。
- 无权读取当前对象时，不在冲突响应中回显旧值、新值或对象名称。

### 11.2 幂等

- 幂等键绑定 tenant、Principal、operation、规范化载荷摘要和业务结果。
- 创建 Task、Discussion、FileVersion、Commit 和状态转换均要求幂等键。
- 相同键相同载荷返回同一资源 ID、版本和回执，并标记 `replayed=true`。
- 网络超时后先查询原 operation 或重试原幂等键；不能换新键盲目再建。
- `requestId` 用于追踪一次传输，不能代替业务幂等键。

### 11.3 原子事务与投影延迟

- 业务对象、ChangeSet、领域事件和幂等结果在一个事务中提交。
- Activity 是领域事件的可重建投影；投影延迟不回滚已经成功的业务事务。
- 投影未追上时返回业务提交成功及 `projectionState=updating`，不能显示旧 Activity 后宣称没有变化。
- 文件扫描属于异步阶段时，回执清楚区分 `processing`、`available`、`quarantined` 和 `failed`。

## 12. 权限与信息泄露边界

每次 API 或 Tool 调用都以实际 Agent Principal 为 actor，并记录其代表的成员。实际权限是成员授权、Agent 委托、对象 ACL、Task scope 和具体用途的交集。

必须防止：

- 通过列表总数、删除影响、冲突详情或错误差异泄露隐藏 Task。
- 通过 TaskFilePlacement 自动获得 File 正文权限。
- 通过 Discussion 附件或 @ 自动扩大可见范围。
- 通过 Commit 引用读取无权 FileVersion。
- 通过普通 Task PATCH 改 Owner、ACL、验收、Handoff 或 Consent。
- 通过旧幂等回执在撤权后继续读取敏感内容。
- 通过 MCP Tool 参数读取任意本地路径。

无权对象在接收者侧只返回必要的抽象缺口，例如“必要上下文尚未就绪”；不得返回隐藏对象 ID、标题、状态、数量或缓存摘要。

## 13. 验收场景

| ID | 场景 | 预期结果 |
| --- | --- | --- |
| MCP-01 | REST 与 MCP 分别读取同一 Task | ID、版本、正式状态和权限过滤一致 |
| MCP-02 | 相同幂等键重复创建 Task | 只创建一个 Task；第二次返回同一 ID 且 `replayed=true` |
| MCP-03 | 相同幂等键配不同载荷 | 返回 `409 IDEMPOTENCY_KEY_REUSED`，不产生第二次写入 |
| MCP-04 | 两人基于同一 Task 版本更新 | 首个成功；后一个返回 412，不覆盖首个结果 |
| MCP-05 | 更新字段值与当前值完全相同 | 返回 `no_change`，不生成 Activity |
| MCP-06 | 通过普通 PATCH 修改 Owner 或状态 | 返回 422 或 403；正式字段不变 |
| MCP-07 | 创建子 Task | 返回规范 Task，`parentTaskId` 由服务端路径绑定 |
| MCP-08 | 删除含后代的子 Task但未绑定影响摘要 | 拒绝删除并要求预览 |
| MCP-09 | 创建讨论回复 | 生成 DiscussionMessage，不生成伪任务变更 Activity |
| MCP-10 | 删除根讨论且已有回复 | 根消息成为 tombstone，回复保留 |
| MCP-11 | 上传字节完成但扫描未结束 | 返回 202/accepted_async，不显示 File 已可用 |
| MCP-12 | 完成上传请求重复发送 | 返回同一 FileVersion，不生成重复版本 |
| MCP-13 | 从一个 Task 移除共享 File | 只删除 Placement，其他 Task 的 File 引用仍有效 |
| MCP-14 | 编辑 File 内容 | 创建新 FileVersion，旧版本仍可按权限读取 |
| MCP-15 | 正式提交 Commit | 创建不可变 Commit 和 Activity，但不自动完成 Task |
| MCP-16 | 尝试 PATCH 或 DELETE 正式 Commit | 方法不允许，历史不变 |
| MCP-17 | Activity 写工具调用 | MCP Server 不暴露该 Tool；REST 返回 405 |
| MCP-18 | REST 更新成功但 Activity 投影延迟 | 回执仍为 applied，并明确投影更新中 |
| MCP-19 | 撤权后重放旧幂等调用 | 重新鉴权，不回显已无权内容 |
| MCP-20 | 无权用户查询删除影响 | 不泄露隐藏后代、依赖、文件或数量 |

## 14. 当前实现差距

当前本地实现不能证明该契约已经落地：

- `mcp/server.ts` 只有准备 Task 草案和确认创建两个演示 Tool，草稿主要保存在进程内 Map，返回结构尚无统一版本、ChangeSet 和错误协议。
- 当前 React Mock 中人的讨论、回复、AI 建议和任务变更仍投影在相近的 Activity 数据结构中；生产模型必须按本契约拆开。
- 当前 `TaskCommitMock` 只支持展示，尚没有 CommitDraft、不可变 Commit 和服务端事务。
- 文件上传、FileVersion、ACL、扫描、幂等及真实持久化均未形成生产闭环。
- 当前 `/api/task-assistant` 是任务规划助手接口，不是本契约中的 Task 资源 API。

因此，文档中的接口名称和 Schema 是候选契约，不得在产品文案、测试报告或对外说明中声称已经可用。

## 15. 建议实施顺序

1. 固定 Principal、ACL、Problem Details、幂等记录、ETag 和统一回执。
2. 实现 Task / 子 Task Query 与 Command，接入 ChangeSet 和 Activity 投影。
3. 拆分 DiscussionMessage 与只读 Activity。
4. 实现 File、FileVersion、UploadSession 和 TaskFilePlacement。
5. 实现 TaskCommitDraft 与不可变 TaskCommit。
6. 让 REST Controller 与 MCP Tool Adapter 接入同一 Application Service。
7. 用第 13 节场景进行契约测试，再接 UI 与外部 Agent。

初版不同时实现 Handoff、Result Return、Owner Transfer、团队动态信息流、非原子批量更新和硬删除。这些能力会改变责任、权限或协作状态机，应在各自产品决定确认后扩展本契约。

## 16. 待确认事项

以下内容仍是 Proposal，进入生产实现前需要产品与技术共同确认：

1. 正式对象命名是否采用 `TaskCommitDraft / TaskCommit`，以及现有界面“提交”的准确用户文案。
2. Task 和 File 逻辑删除后的恢复期限、保留期与管理员能力。
3. Task 状态允许的转换图，以及完成状态与结果确认的正式关系。
4. File 上传使用服务端直传还是对象存储预签名地址；App-only 元数据的具体 MCP SDK 承载方式。
5. Activity 投影延迟的可接受时限及查询一致性等级。
6. API 与 MCP Schema 的发布、弃用和兼容窗口。

在这些事项确认前，可以实现不会改变产品语义的基础设施和只读查询，但不能把候选状态机、权限效果或硬删除当成已批准能力。
