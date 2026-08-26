import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { z } from "zod/v4";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const viewPath = path.join(here, "ui", "task-card.html");
const storePath = process.env.AGENTDOOR_TASK_STORE ?? path.join(projectRoot, "data", "mcp-tasks.json");
const resourceUri = "ui://agentdoor/task-confirmation.html";

type Source = { id: string; title: string; summary?: string };
type Task = {
  draftId: string; status: "draft" | "created"; title: string; goal: string; owner: string;
  participants: string[]; startDate: string; dueDate: string; sources: Source[]; taskId?: string; createdAt?: string;
};
const drafts = new Map<string, Task>();

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
const textResult = (task: Task, message: string) => ({ content: [{ type: "text" as const, text: message }], structuredContent: { task } });

async function persist(task: Task) {
  await mkdir(path.dirname(storePath), { recursive: true });
  let tasks: Task[] = [];
  try { tasks = JSON.parse(await readFile(storePath, "utf8")) as Task[]; } catch { /* first task */ }
  const index = tasks.findIndex((item) => item.draftId === task.draftId);
  if (index >= 0) tasks[index] = task; else tasks.push(task);
  await writeFile(storePath, JSON.stringify(tasks, null, 2) + "\n", "utf8");
}

export function createServer() {
  const server = new McpServer({ name: "agentdoor-mcp-server", version: "1.0.0" });

  registerAppTool(server, "agentdoor_prepare_task", {
    title: "准备 AgentDoor 任务",
    description: "根据用户需求生成可编辑前的任务草案，并显示确认卡片。此工具不会创建任务；必须由用户在卡片中点击“确认并创建任务”。",
    inputSchema: {
      request: z.string().min(3).max(4000).describe("用户的原始需求与任务背景"),
      title: z.string().min(2).max(120).describe("从需求提炼出的行动型任务名称"),
      goal: z.string().min(3).max(600).describe("明确、可验收的任务目标"),
      owner: z.string().min(1).max(80).describe("任务拥有者；未知时使用‘待指定’"),
      participants: z.array(z.string().min(1).max(80)).max(20).default([]).describe("任务参与者"),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("开始日期 YYYY-MM-DD"),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("截止日期 YYYY-MM-DD"),
      sources: z.array(z.object({ id: z.string(), title: z.string(), summary: z.string().optional() })).max(12).default([]).describe("支撑任务的文档或信息来源"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri, visibility: ["model", "app"] } },
  }, async (input) => {
    const task: Task = {
      draftId: randomUUID(), status: "draft", title: input.title, goal: input.goal, owner: input.owner,
      participants: input.participants, startDate: input.start_date ?? today(), dueDate: input.due_date ?? plusDays(7), sources: input.sources,
    };
    if (task.dueDate < task.startDate) return { isError: true, content: [{ type: "text", text: "截止日期不能早于开始日期，请修正日期后重新准备草案。" }] };
    drafts.set(task.draftId, task);
    return textResult(task, `任务草案已准备：${task.title}。请用户在嵌入卡片中确认后创建。`);
  });

  registerAppTool(server, "agentdoor_create_task", {
    title: "确认创建 AgentDoor 任务",
    description: "仅供嵌入卡片在用户点击确认按钮后调用，将指定草案写入 AgentDoor 任务存储。",
    inputSchema: {
      draft_id: z.string().uuid().describe("待确认草案 ID"),
      title: z.string().min(2).max(120).optional().describe("用户在卡片内确认或修改后的任务名称"),
      goal: z.string().min(3).max(600).optional().describe("用户在卡片内确认或修改后的任务目标"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { resourceUri, visibility: ["app"] } },
  }, async ({ draft_id, title, goal }) => {
    const draft = drafts.get(draft_id);
    if (!draft) return { isError: true, content: [{ type: "text", text: "草案不存在或服务已重启，请重新生成任务草案。" }] };
    if (draft.status === "created") return textResult(draft, `任务 ${draft.taskId} 已创建，无需重复操作。`);
    const task: Task = { ...draft, ...(title ? { title } : {}), ...(goal ? { goal } : {}), status: "created", taskId: `AD-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString() };
    drafts.set(draft_id, task);
    await persist(task);
    return textResult(task, `已确认并创建任务 ${task.taskId}：${task.title}`);
  });

  registerAppResource(server, "AgentDoor 任务确认卡片", resourceUri, { mimeType: RESOURCE_MIME_TYPE, description: "用于审核并确认创建任务的交互卡片" }, async () => ({
    contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: await readFile(viewPath, "utf8") }],
  }));
  return server;
}

async function main() {
  if (process.argv.includes("--http")) {
    const app = createMcpExpressApp();
    const allowedOrigins = new Set((process.env.AGENTDOOR_ALLOWED_ORIGINS ?? "http://127.0.0.1:8090,http://localhost:8090").split(","));
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin && allowedOrigins.has(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-protocol-version, mcp-session-id");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");
        res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
      }
      if (req.method === "OPTIONS") { res.sendStatus(204); return; }
      next();
    });
    app.post("/mcp", async (req, res) => {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => { void transport.close(); void server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });
    const port = Number(process.env.PORT ?? 8787);
    app.listen(port, "127.0.0.1", () => console.error(`AgentDoor MCP listening on http://127.0.0.1:${port}/mcp`));
    // Keep the standalone HTTP process alive after main() resolves. Some Node
    // runtimes unref the Express listener created by the SDK helper.
    await new Promise<void>(() => { setInterval(() => undefined, 2_147_000_000); });
  } else {
    const server = createServer();
    await server.connect(new StdioServerTransport());
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
