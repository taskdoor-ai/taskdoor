# 侧边栏新建对话与任务创建 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在左侧窄栏新增“新建对话”入口，通过独立对话页生成、编辑并确认创建任务。

**Architecture:** `WorkspaceSidebar` 只发出导航事件；新组件 `TaskCreationConversation` 管理消息、草案和成功态；`App` 是正式任务写入的唯一边界。对话采用确定性的本地演示逻辑，未确认内容不写入 `workspaceNodes`。

**Tech Stack:** React、TypeScript、Vite、Lucide React、现有 TaskDoor CSS tokens 与基础组件。

---

## 文件结构

- Create `src/components/TaskCreationConversation.tsx`：对话消息、输入区、草案编辑、校验和成功回执。
- Modify `src/components/WorkspaceSidebar.tsx`：新增 `conversation` 一级区段和侧边栏入口。
- Modify `src/App.tsx`：渲染对话页、把确认后的草案转换为 `TaskNode`、打开新任务详情。
- Modify `src/styles.css`：对话页、消息、草案卡、响应式和深色主题样式。
- Modify `docs/superpowers/plans/2026-08-28-sidebar-new-conversation-task-creation.md`：勾选执行进度。

### Task 1: 新建对话导航入口

**Files:**
- Modify: `src/components/WorkspaceSidebar.tsx`
- Modify: `src/App.tsx`

- [x] **Step 1: 扩展一级区段类型**

```tsx
export type PrimarySection = "conversation" | "home" | "tasks" | "ai" | "settings";
```

- [x] **Step 2: 在团队切换器与普通导航之间加入入口**

```tsx
<button
  aria-label="新建对话"
  className={`rail-item rail-new-conversation ${activeSection === "conversation" ? "active" : ""}`}
  onClick={() => onSectionChange("conversation")}
  title="新建对话"
  type="button"
>
  <MessageSquarePlus size={19} />
</button>
```

- [x] **Step 3: 运行构建确认导航类型无误**

Run: `npm run build`
Expected: Vite build succeeds without TypeScript errors.

### Task 2: 对话与草案组件

**Files:**
- Create: `src/components/TaskCreationConversation.tsx`

- [x] **Step 1: 定义清晰的草案接口和创建回调**

```tsx
export type TaskCreationDraft = {
  title: string;
  goal: string;
  ownerId: string;
  participantIds: string[];
  startDate: string;
  endDate: string;
  labels: string[];
};

type TaskCreationConversationProps = {
  currentUserId: string;
  members: Member[];
  tags: TagDefinition[];
  onCreateTask: (draft: TaskCreationDraft) => string;
  onOpenTask: (taskId: string) => void;
};
```

- [x] **Step 2: 实现确定性的对话阶段**

初始阶段显示引导；第一次发送把用户消息加入记录并生成草案；后续发送作为调整说明并更新目标；草案卡始终可直接编辑。使用现有 `InputBar`，设置 `onSend` 后获得 Enter 发送和 Shift+Enter 换行语义。

```tsx
const handleSend = (content: string) => {
  setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content }]);
  setDraft((current) => current ?? createDraftFromIntent(content, currentUserId));
};
```

- [x] **Step 3: 实现字段校验与成功态**

```tsx
const titleError = submitted && !draft.title.trim() ? "请输入任务名称" : "";
const goalError = submitted && !draft.goal.trim() ? "请输入任务目标" : "";
const dateError = draft.startDate && draft.endDate && draft.endDate < draft.startDate
  ? "截止时间不能早于开始时间"
  : "";
```

确认时过滤负责人自身、锁定提交、调用 `onCreateTask`，随后展示包含“查看任务”按钮的成功回执。

- [x] **Step 4: 运行构建确认组件类型正确**

Run: `npm run build`
Expected: Vite build succeeds without TypeScript errors.

### Task 3: 正式任务写入与详情跳转

**Files:**
- Modify: `src/App.tsx`

- [x] **Step 1: 在页面分支中渲染对话组件**

```tsx
{activeSection === "conversation" ? (
  <TaskCreationConversation
    currentUserId="周岚"
    members={collaborationMembers}
    tags={tagDefinitions}
    onCreateTask={createTaskFromConversation}
    onOpenTask={(taskId) => {
      setSelectedTaskId(taskId);
      setActiveSection("tasks");
    }}
  />
) : /* existing branches */}
```

- [x] **Step 2: 只在确认回调中创建正式 TaskNode**

```tsx
const createTaskFromConversation = (draft: TaskCreationDraft) => {
  const id = `task-${Date.now()}`;
  const node: TaskNode = {
    id,
    kind: "task",
    name: draft.title.trim(),
    goal: draft.goal.trim(),
    ownerId: draft.ownerId,
    parentId: workspaceRootId,
    status: "待开始",
    dueAt: draft.endDate ? formatDateLabel(draft.endDate) : "—",
    labels: draft.labels,
    iconName: "sparkles",
    iconTone: "blue",
    updatedAt: "刚刚",
  };
  setWorkspaceNodes((nodes) => [...nodes, node]);
  return id;
};
```

- [x] **Step 3: 运行构建验证完整数据流**

Run: `npm run build`
Expected: Vite build succeeds and generated assets are emitted to `dist/`.

### Task 4: 视觉、响应式与回归验证

**Files:**
- Modify: `src/styles.css`

- [x] **Step 1: 添加入口、单列消息流、草案卡和底部输入区样式**

使用现有 `--ad-*` tokens；主容器采用 `min-height: calc(100dvh - var(--ad-topbar-height))`，消息列最大宽度约 880px，草案表单桌面两列、窄屏单列。

```css
.task-conversation-page { min-height: calc(100dvh - var(--ad-topbar-height)); background: var(--ad-canvas); }
.task-conversation-column { width: min(100%, 880px); margin: 0 auto; }
.task-draft-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--ad-space-4); }
@media (max-width: 720px) { .task-draft-grid { grid-template-columns: 1fr; } }
```

- [x] **Step 2: 运行设计检查**

Run: `npm run design:check`
Expected: design baseline check passes or only reports pre-existing accepted drift.

- [x] **Step 3: 运行最终构建**

Run: `npm run build`
Expected: TypeScript and Vite build both pass.

- [x] **Step 4: 手工验证关键路径**

验证桌面与窄屏：红框位置入口、自动聚焦、Enter/Shift+Enter、草案七类字段、空标题/目标、日期倒置、确认只创建一次、成功后查看任务、现有导航回归。
