import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import type { Plugin } from "vite";
import { z } from "zod";

export const AI_CONNECTION_PROMPT_MAX_BYTES = 1024 * 1024;
export const AI_CONNECTION_ANNOTATION_MAX_BYTES = 20 * 1024 * 1024;
const MAX_REQUEST_BYTES = (AI_CONNECTION_PROMPT_MAX_BYTES + AI_CONNECTION_ANNOTATION_MAX_BYTES) * 2 + 8192;
const prefix = "/api/ai-connections";
const identifier = z.string().trim().min(1).max(200).refine(value => !/[\u0000-\u001f]/.test(value));
const connectionId = z.string().regex(/^aic_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const sourceType = z.enum(["TASK", "DISCUSSION", "FILE_ANNOTATION"]);
const annotationFile = z.object({
  name: z.string().min(1).max(180).refine(value => value.trim().length > 0 && !value.startsWith(".") && !/[\\/:*?"<>|\u0000-\u001f]/.test(value) && /\.html$/i.test(value)),
  mimeType: z.literal("text/html"),
  content: z.string().refine(value => value.trim().length > 0),
}).strict();
const payload = z.object({ prompt: z.string().refine(value => value.trim().length > 0), annotationFile: annotationFile.optional() }).strict();
const inputSchema = z.object({
  idempotencyKey: identifier, sourceType, accountId: identifier, teamId: identifier, taskId: identifier, payload,
}).strict().refine(value => (value.sourceType === "FILE_ANNOTATION") === Boolean(value.payload.annotationFile), "只有文件标注连接携带标注 HTML，且必须提供 HTML。");
const providedSchema = z.object({
  responseCount: z.number().int().nonnegative(), payloadCount: z.number().int().nonnegative(), annotationCount: z.number().int().nonnegative(),
  lastProvidedAt: z.iso.datetime().optional(),
}).strict();
const recordSchema = z.object({
  connectionId, sourceType, accountId: identifier, teamId: identifier, taskId: identifier,
  createdAt: z.iso.datetime(), payload, provided: providedSchema,
}).strict();
const storedSchema = z.object({
  formatVersion: z.literal(1), records: z.array(z.object({ idempotencyKey: identifier, inputDigest: z.string().regex(/^[a-f0-9]{64}$/), record: recordSchema }).strict()),
}).strict();

export type AiConnectionInput = z.infer<typeof inputSchema>;
export type AiConnectionRecord = z.infer<typeof recordSchema>;
export type AiConnectionMetadata = Omit<AiConnectionRecord, "payload">;
export type AiConnectionErrorCode = "INVALID_INPUT" | "INVALID_ID" | "LOCAL_ONLY" | "NOT_FOUND" | "ANNOTATION_NOT_FOUND" | "IDEMPOTENCY_CONFLICT" | "PAYLOAD_TOO_LARGE" | "METHOD_NOT_ALLOWED" | "STORAGE_ERROR";
export class AiConnectionError extends Error {
  constructor(public code: AiConnectionErrorCode, message: string, public status: number) { super(message); }
}
type StoredConnections = z.infer<typeof storedSchema>;
const queues = new Map<string, Promise<unknown>>();

function validateInput(value: unknown): AiConnectionInput {
  const parsed = inputSchema.safeParse(value);
  if (!parsed.success) throw new AiConnectionError("INVALID_INPUT", "需要有效的本次业务连接信息；不接受整任务快照、文件路径或产品安装连接。", 400);
  if (Buffer.byteLength(parsed.data.payload.prompt) > AI_CONNECTION_PROMPT_MAX_BYTES
    || parsed.data.payload.annotationFile && Buffer.byteLength(parsed.data.payload.annotationFile.content) > AI_CONNECTION_ANNOTATION_MAX_BYTES) {
    throw new AiConnectionError("PAYLOAD_TOO_LARGE", "提示文本不得超过 1MiB，标注 HTML 不得超过 20MiB。", 413);
  }
  return parsed.data;
}
function validateId(value: string) {
  if (!connectionId.safeParse(value).success) throw new AiConnectionError("INVALID_ID", "连接 ID 无效。", 400);
}

/** Local PM demo only. Scope IDs are UI-supplied labels, not authenticated identities or production ACLs. */
export function createAiConnectionStore(storagePath: string) {
  const path = resolve(storagePath);
  const serialized = <T>(work: () => Promise<T>): Promise<T> => {
    const next = (queues.get(path) ?? Promise.resolve()).catch(() => {}).then(work);
    queues.set(path, next);
    void next.finally(() => { if (queues.get(path) === next) queues.delete(path); }).catch(() => {});
    return next;
  };
  const load = async (): Promise<StoredConnections> => {
    let text: string;
    try { text = await readFile(path, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { formatVersion: 1, records: [] };
      throw new AiConnectionError("STORAGE_ERROR", "本地连接记录无法读取，原记录未被覆盖。", 500);
    }
    try {
      const state = storedSchema.parse(JSON.parse(text));
      const ids = new Set<string>();
      const keys = new Set<string>();
      for (const entry of state.records) {
        const { connectionId: _id, createdAt: _createdAt, provided: _provided, ...fields } = entry.record;
        validateInput({ ...fields, idempotencyKey: entry.idempotencyKey });
        const key = JSON.stringify([entry.record.accountId, entry.record.teamId, entry.record.taskId, entry.idempotencyKey]);
        if (ids.has(entry.record.connectionId) || keys.has(key)
          || entry.record.provided.responseCount !== entry.record.provided.payloadCount + entry.record.provided.annotationCount) throw new Error("Invalid stored connection");
        ids.add(entry.record.connectionId); keys.add(key);
      }
      return state;
    } catch { throw new AiConnectionError("STORAGE_ERROR", "本地连接记录损坏，原记录未被覆盖。", 500); }
  };
  const save = async (state: StoredConnections) => {
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      await writeFile(temporary, JSON.stringify(state), { encoding: "utf8", mode: 0o600, flag: "wx" });
      await rename(temporary, path);
    } catch {
      await rm(temporary, { force: true }).catch(() => {});
      throw new AiConnectionError("STORAGE_ERROR", "本地连接记录未能保存，请保留内容后重试。", 500);
    }
  };
  return {
    create(value: unknown) {
      return serialized(async () => {
        const input = validateInput(value);
        const state = await load();
        const inputDigest = createHash("sha256").update(JSON.stringify(input)).digest("hex");
        const existing = state.records.find(entry => entry.idempotencyKey === input.idempotencyKey
          && entry.record.accountId === input.accountId && entry.record.teamId === input.teamId && entry.record.taskId === input.taskId);
        if (existing) {
          if (existing.inputDigest !== inputDigest) throw new AiConnectionError("IDEMPOTENCY_CONFLICT", "同次连接的材料已变化，请使用新的创建标识。", 409);
          return { record: structuredClone(existing.record), created: false };
        }
        const { idempotencyKey, ...fields } = input;
        const record: AiConnectionRecord = { ...fields, connectionId: `aic_${randomUUID()}`, createdAt: new Date().toISOString(), provided: { responseCount: 0, payloadCount: 0, annotationCount: 0 } };
        state.records.push({ idempotencyKey, inputDigest, record });
        await save(state);
        return { record: structuredClone(record), created: true };
      });
    },
    get(id: string): Promise<AiConnectionRecord | null> {
      return serialized(async () => { validateId(id); return structuredClone((await load()).records.find(entry => entry.record.connectionId === id)?.record ?? null); });
    },
    /** A finished HTTP response is a server provision fact, never evidence of model/tool verification or reading. */
    recordProvided(id: string, part: "payload" | "annotation") {
      return serialized(async () => {
        validateId(id);
        const state = await load();
        const entry = state.records.find(item => item.record.connectionId === id);
        if (!entry) throw new AiConnectionError("NOT_FOUND", "连接记录不存在。", 404);
        if (part === "annotation" && !entry.record.payload.annotationFile) throw new AiConnectionError("ANNOTATION_NOT_FOUND", "这次连接没有标注 HTML。", 404);
        const provided = entry.record.provided;
        provided.responseCount++;
        if (part === "payload") provided.payloadCount++; else provided.annotationCount++;
        provided.lastProvidedAt = new Date().toISOString();
        await save(state);
      });
    },
  };
}

export type AiConnectionStore = ReturnType<typeof createAiConnectionStore>;
function guardRequest(req: IncomingMessage) {
  const host = req.headers.host ?? "";
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "")
    || !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host)
    || req.headers["sec-fetch-site"] === "cross-site"
    || req.headers.origin && req.headers.origin !== `http://${host}` && req.headers.origin !== `https://${host}`
    || req.method !== "GET" && req.headers["x-agentdoor-local-check"] !== "1") {
    throw new AiConnectionError("LOCAL_ONLY", "业务连接原型仅允许本机同源访问。", 403);
  }
}
async function readBody(req: IncomingMessage): Promise<unknown> {
  if (!req.headers["content-type"]?.startsWith("application/json")) throw new AiConnectionError("INVALID_INPUT", "创建连接需要 JSON。", 400);
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_REQUEST_BYTES) throw new AiConnectionError("PAYLOAD_TOO_LARGE", "连接请求超过大小限制。", 413);
    chunks.push(bytes);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new AiConnectionError("INVALID_INPUT", "请求不是有效 JSON。", 400); }
}
function sendJson(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
  res.end(JSON.stringify(value));
}
async function sendMaterial(res: ServerResponse, content: string, headers: Record<string, string>): Promise<boolean> {
  return new Promise(done => {
    const complete = (finished: boolean) => { res.off("finish", finish); res.off("close", close); res.off("error", fail); done(finished); };
    const finish = () => complete(true);
    const close = () => complete(res.writableFinished);
    const fail = () => complete(false);
    res.once("finish", finish); res.once("close", close); res.once("error", fail);
    res.writeHead(200, { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ...headers });
    res.end(content);
  });
}

export function createAiConnectionMiddleware(store: AiConnectionStore) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const route = req.url?.split("?")[0] ?? "";
    if (route !== prefix && !route.startsWith(`${prefix}/`)) return next();
    try {
      guardRequest(req);
      if (req.url?.includes("?")) throw new AiConnectionError("INVALID_INPUT", "连接接口不接受查询参数或文件路径。", 400);
      if (route === prefix && req.method === "POST") {
        const result = await store.create(await readBody(req));
        sendJson(res, result.created ? 201 : 200, result.record); return;
      }
      if (req.method !== "GET") throw new AiConnectionError("METHOD_NOT_ALLOWED", "此连接接口不支持该操作。", 405);
      const match = route.match(/^\/api\/ai-connections\/([^/]+)(?:\/(status|annotation))?$/);
      if (!match) throw new AiConnectionError("NOT_FOUND", "连接接口不存在。", 404);
      const record = await store.get(match[1]);
      if (!record) throw new AiConnectionError("NOT_FOUND", "连接记录不存在。", 404);
      if (match[2] === "status") {
        const { payload: _payload, ...metadata } = record;
        sendJson(res, 200, metadata); return;
      }
      const part = match[2] === "annotation" ? "annotation" : "payload";
      if (part === "annotation" && !record.payload.annotationFile) throw new AiConnectionError("ANNOTATION_NOT_FOUND", "这次连接没有标注 HTML。", 404);
      const file = record.payload.annotationFile;
      const finished = part === "annotation"
        ? await sendMaterial(res, file!.content, { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="annotation.html"; filename*=UTF-8''${encodeURIComponent(file!.name)}`, "Content-Security-Policy": "sandbox; default-src 'none'; img-src data:" })
        : await sendMaterial(res, JSON.stringify(record), { "Content-Type": "application/json; charset=utf-8" });
      if (finished) await store.recordProvided(record.connectionId, part);
    } catch (error) {
      const known = error instanceof AiConnectionError ? error : new AiConnectionError("STORAGE_ERROR", "业务连接请求失败，请保留内容后重试。", 500);
      if (!res.headersSent && !res.destroyed) sendJson(res, known.status, { error: { code: known.code, message: known.message } });
    }
  };
}

/** Only the development server exposes this local prototype; it is not installed in preview or production. */
export function aiConnectionPlugin(): Plugin {
  return {
    name: "taskdoor-business-ai-connections", apply: "serve",
    configureServer(server) { server.middlewares.use(createAiConnectionMiddleware(createAiConnectionStore(resolve(server.config.root, "data/ai-connections/records.json")))); },
  };
}
