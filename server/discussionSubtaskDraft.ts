import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadEnv, type Plugin, type ResolvedConfig } from "vite";
import { z } from "zod";
import { discussionSubtaskRequestSchema, parseDiscussionSubtaskDraft, type DiscussionSubtaskRequest, type DiscussionSubtaskResult } from "../src/features/tasks/lib/discussion-subtask-draft.ts";
import { subtaskDraftRequestSchema, validateSubtaskDraftResult, type SubtaskDraftRequest } from "../src/features/tasks/lib/task-subtask-draft.ts";
import { callModel, type ModelCall, type ModelOptions } from "./test-lab/model.ts";

const subtaskDraftInstructions = () => ["SKILL.md", "references/output-contract.md", "references/task-planning.md"].map(path => readFileSync(new URL(`../skills/taskdoor-discussion-subtask/${path}`, import.meta.url), "utf8")).join("\n");
const draftRequestSchema = z.union([discussionSubtaskRequestSchema, subtaskDraftRequestSchema]);
type ModelRequest = ({ mode: "discussion" } & DiscussionSubtaskRequest) | ({ mode: "prompt" } & SubtaskDraftRequest);

async function runSubtaskDraftModel(request: ModelRequest, options: ModelOptions, call: ModelCall, signal: AbortSignal): Promise<unknown> {
  if (!options.apiKey) throw new Error("尚未配置草稿生成服务。");
  if (signal.aborted) throw new Error("草稿生成已取消。");
  const response = await call(options, subtaskDraftInstructions(), request, signal);
  if (signal.aborted) throw new Error("草稿生成已取消。");
  try {
    return JSON.parse(response.rawOutput.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch (error) {
    if (request.mode === "discussion") return null;
    throw error;
  }
}

export async function callDiscussionSubtaskDraftModel(request: DiscussionSubtaskRequest, options: ModelOptions, call: ModelCall = callModel, signal: AbortSignal): Promise<DiscussionSubtaskResult> {
  const parsed = discussionSubtaskRequestSchema.parse(request);
  const result = await runSubtaskDraftModel({ mode: "discussion", ...parsed }, options, call, signal);
  return parseDiscussionSubtaskDraft(result, parsed);
}

const send = (res: ServerResponse, status: number, payload: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(payload));
};
export function createDiscussionSubtaskDraftHandler(options: ModelOptions, call: ModelCall = callModel) {
  let pending = 0;
  return async (req: IncomingMessage, res: ServerResponse) => {
    const host = req.headers.host ?? "";
    if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "") || !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host) || req.headers["sec-fetch-site"] === "cross-site" || req.headers.origin && ![`http://${host}`, `https://${host}`].includes(req.headers.origin) || req.headers["x-taskdoor-subtask-draft"] !== "1") return send(res, 403, { error: "仅允许本机同源生成草稿。" });
    if (req.method !== "POST") return send(res, 405, { error: "仅支持POST。" });
    if (!req.headers["content-type"]?.startsWith("application/json")) return send(res, 400, { error: "需要 JSON 子任务上下文。" });
    if (pending >= 2) return send(res, 429, { error: "正在整理草稿，请稍后重试。" });
    pending++;
    const controller = new AbortController();
    res.once("close", () => { if (!res.writableEnded) controller.abort(); });
    try {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) {
        const part = Buffer.from(chunk); size += part.byteLength;
        if (size > 256 * 1024) return send(res, 413, { error: "子任务上下文过长。" });
        chunks.push(part);
      }
      let input: unknown;
      try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return send(res, 400, { error: "子任务上下文无效。" }); }
      const parsed = draftRequestSchema.safeParse(input);
      if (!parsed.success) return send(res, 400, { error: "子任务上下文不完整或已失效。" });
      if (!options.apiKey) return send(res, 503, { error: "草稿生成暂不可用，可手动填写。" });
      const request = parsed.data;
      const result = "prompt" in request
        ? validateSubtaskDraftResult(await runSubtaskDraftModel({ mode: "prompt", ...request }, options, call, controller.signal), request)
        : await callDiscussionSubtaskDraftModel(request, options, call, controller.signal);
      if (!controller.signal.aborted) send(res, 200, result);
    } catch {
      if (!controller.signal.aborted) send(res, 502, { error: "暂时未能整理草稿，可重试或手动填写。" });
    } finally { pending--; }
  };
}

export function discussionSubtaskDraftPlugin(): Plugin {
  let config: ResolvedConfig;
  const attach = (server: { middlewares: { use: (handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) => {
    const env = { ...loadEnv(config.mode, config.root, ""), ...process.env };
    const handler = createDiscussionSubtaskDraftHandler({ apiKey: env.PPIO_API_KEY, endpoint: `${(env.PPIO_BASE_URL || "https://api.ppinfra.com/openai/v1").replace(/\/$/, "").replace(/\/responses$/, "")}/responses`, model: env.PPIO_SUBTASK_DRAFT_MODEL || env.PPIO_MODEL || "pa/gpt-5.5-pro", maxOutputTokens: 1600, timeoutMs: 60_000, reasoningEffort: "low" });
    server.middlewares.use((req, res, next) => {
      const path = req.url?.split("?")[0];
      if (path === "/api/subtask-draft" || path === "/api/discussion-subtask-draft") void handler(req, res);
      else next();
    });
  };
  return { name: "taskdoor-discussion-subtask-draft", configResolved(value) { config = value; }, configureServer: attach, configurePreviewServer: attach };
}
