# 真实 AI 任务创建助手 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过 PPIO `pa/gpt-5.5-pro` 实现会主动追问、判断任务质量、推荐人员，并一次性创建主任务与全部子任务的真实 AI 创建助手。

**Architecture:** 浏览器只调用同源 `/api/task-assistant`；Vite 服务端中间件读取本地密钥并调用 PPIO。模型返回经过 Zod 校验的完整会话快照，React 用过程产出卡展示摘要、缺失信息、质量判断、人员建议与主子任务草案，`App` 是正式任务写入的唯一边界。

**Tech Stack:** React、TypeScript、Vite、Connect middleware、Zod、PPIO OpenAI-compatible Chat Completions API。

---

## 文件结构

- Create `src/lib/taskAssistantProtocol.ts`：请求、响应、主子任务草案的共享 Zod 协议与类型。
- Create `server/taskAssistant.ts`：请求解析、上下文裁剪、PPIO 调用、响应校验、一次格式重试和稳定错误映射。
- Create `server/taskAssistant.test.ts`：协议解析、敏感字段裁剪和模型文本提取测试。
- Modify `vite.config.ts`：注册同源 `/api/task-assistant` 服务端路由并加载非 `VITE_*` 环境变量。
- Modify `tsconfig.node.json`：纳入服务端文件。
- Modify `.gitignore`：忽略 `.env.local`。
- Create `.env.local`：保存本地 `PPIO_API_KEY` 与模型名；禁止提交。
- Modify `src/components/TaskCreationConversation.tsx`：真实请求循环、过程产出卡、错误重试和主子任务确认。
- Modify `src/App.tsx`：一次性创建主任务与所有子任务。
- Modify `src/styles.css`：过程产出卡与响应式样式。

### Task 1: 定义协议并测试解析边界

**Files:**
- Create: `src/lib/taskAssistantProtocol.ts`
- Create: `server/taskAssistant.test.ts`

- [x] **Step 1: 编写失败的协议测试**

测试合法完整响应可解析、缺少 `assistantMessage` 会失败、成员上下文不会保留 `email`、Markdown JSON fence 能被提取。

```ts
test("rejects incomplete assistant payload", () => {
  assert.throws(() => taskAssistantResponseSchema.parse({ readyToCreate: false }));
});
```

- [x] **Step 2: 运行测试确认失败**

Run: `node --test --experimental-strip-types server/taskAssistant.test.ts`
Expected: FAIL because protocol and server helpers do not exist.

- [x] **Step 3: 实现共享协议**

协议至少定义 `assistantMessage`、`resultSummary`、`missingInformation`、`qualityAssessment`、`peopleRecommendations`、`draft.mainTask`、`draft.subtasks` 与 `readyToCreate`。日期使用空字符串或 `YYYY-MM-DD`，成员通过内部 ID 引用。

```ts
export const taskAssistantResponseSchema = z.object({
  assistantMessage: z.string().min(1),
  resultSummary: z.string().min(1),
  missingInformation: z.array(missingInformationSchema),
  qualityAssessment: qualityAssessmentSchema,
  peopleRecommendations: z.array(peopleRecommendationSchema),
  draft: taskPlanDraftSchema,
  readyToCreate: z.boolean(),
});
```

- [x] **Step 4: 运行测试确认协议用例通过**

Run: `node --test --experimental-strip-types server/taskAssistant.test.ts`
Expected: protocol tests pass; server helper tests remain failing until Task 2.

### Task 2: PPIO 服务端代理与密钥隔离

**Files:**
- Create: `server/taskAssistant.ts`
- Modify: `vite.config.ts`
- Modify: `tsconfig.node.json`
- Modify: `.gitignore`
- Create: `.env.local`
- Test: `server/taskAssistant.test.ts`

- [x] **Step 1: 实现安全上下文裁剪与模型文本提取**

```ts
export const sanitizeMembers = (members: TaskAssistantMember[]) => members.map(({ id, name, role, dynamicResponsibility, availability, currentWork }) => ({ id, name, role, dynamicResponsibility, availability, currentWork }));
export const extractJsonText = (content: string) => content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
```

- [x] **Step 2: 实现 PPIO 调用与一次格式重试**

调用 `https://api.ppinfra.com/openai/v1/chat/completions`，模型为 `pa/gpt-5.5-pro`，只把经过裁剪的上下文放入请求。第一次 JSON 或 Zod 校验失败时追加校验问题并重试一次；鉴权、限流、超时和上游错误映射为不含密钥及上游正文的稳定 JSON 错误。

- [x] **Step 3: 注册同源 API 路由**

```ts
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return { plugins: [taskAssistantPlugin({ apiKey: env.PPIO_API_KEY, model: env.PPIO_MODEL || "pa/gpt-5.5-pro" }), react(), tailwindcss()] };
});
```

- [x] **Step 4: 写入本地密钥配置并验证 Git 忽略**

`.env.local` 包含 `PPIO_API_KEY` 和 `PPIO_MODEL=pa/gpt-5.5-pro`；`.gitignore` 增加 `.env.local`。

Run: `git check-ignore -v .env.local`
Expected: `.gitignore` matches `.env.local`.

- [x] **Step 5: 运行服务端测试与构建**

Run: `node --test --experimental-strip-types server/taskAssistant.test.ts && npm run build`
Expected: all server tests and TypeScript build pass.

### Task 3: 真实 AI 会话与过程产出卡

**Files:**
- Modify: `src/components/TaskCreationConversation.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: 用真实请求替换固定规则回复**

每次发送把当前消息、当前草案、成员职责/负载、标签和现有任务摘要提交到 `/api/task-assistant`。请求期间使用 `InputStatus="analyzing"` 锁定发送；失败时保留消息、输入与草案，并提供重试按钮。

```ts
const response = await fetch("/api/task-assistant", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

- [x] **Step 2: 展示单一当前产出物**

消息历史保留 AI 自然语言回复；当前产出区展示本轮摘要、缺失信息、质量判断、人员推荐、主任务卡和子任务列表，不堆叠旧草案。

- [x] **Step 3: 实现创建门槛与错误恢复**

只有 `readyToCreate` 且主子任务必填字段、负责人和日期顺序有效时启用“创建主任务和全部子任务”。错误卡提供“重试本轮”，连续点击由请求锁与提交锁共同阻止。

- [x] **Step 4: 添加桌面与移动端样式**

过程卡复用 `--ad-*` tokens；主任务摘要在上，子任务使用紧凑列表行，人员建议和风险使用图标加文字；720px 以下全部改为单列。

- [x] **Step 5: 运行构建与设计检查**

Run: `npm run design:check && npm run build`
Expected: no new registered design debt and build passes.

### Task 4: 原子创建主任务与全部子任务

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/data/workspaceNodes.ts`

- [x] **Step 1: 扩展确认回调为任务计划写入**

```ts
type CreatedTaskPlan = { mainTaskId: string; createdCount: number };
const createTaskPlanFromConversation = (draft: TaskPlanDraft): CreatedTaskPlan => {
  const mainTaskId = `task-${crypto.randomUUID()}`;
  const nodes = [toTaskNode(draft.mainTask, mainTaskId), ...draft.subtasks.map((task) => toTaskNode(task, `task-${crypto.randomUUID()}`, mainTaskId))];
  setWorkspaceNodes((current) => [...current, ...nodes]);
  return { mainTaskId, createdCount: nodes.length };
};
```

- [x] **Step 2: 显示创建结果并跳转主任务**

成功卡展示“已创建 1 个主任务和 N 个子任务”，列出创建后的任务名称；“查看主任务”进入主任务详情，任务详情的关联区可看到子任务。

- [x] **Step 3: 运行真实 PPIO 双轮对话验证**

启动开发服务器，发送一条范围不完整的需求，回答 AI 的追问，验证当前草案增量更新且模型能给出职责/负载依据。

- [x] **Step 4: 浏览器验证完整创建路径**

验证主任务与所有子任务一次性出现、子任务 `parentTaskId` 正确、重复确认不重复创建、移动端产出卡和错误重试可用。

- [x] **Step 5: 检查密钥泄漏并执行最终验证**

Run: `rg -l "PPIO_API_KEY|sk_" dist src server vite.config.ts --glob '!*.map' && npm run design:check && npm run build`
Expected: only server-side environment variable name may match; no key value appears in tracked source or `dist`，设计检查与构建通过。
