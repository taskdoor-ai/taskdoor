import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { z } from "zod";
import { taskAssistantRequestSchema, taskAssistantResponseSchema, type TaskAssistantApiError, type TaskAssistantMember, type TaskAssistantRequest, type TaskAssistantResponse } from "../src/lib/taskAssistantProtocol.ts";
import { normalizePersonalTagNames } from "../src/lib/personalTags.ts";

const ppioBaseUrl = "https://api.ppinfra.com/openai/v1/responses";
const requestBodyLimit = 256 * 1024;
const requestTimeoutMs = 150_000;
const maxOutputTokens = 8_000;
const responseJsonSchema = z.toJSONSchema(taskAssistantResponseSchema);

type PluginOptions = {
  apiKey?: string;
  model: string;
};

type UpstreamMessage = { content: string; role: "assistant" | "user" };

class TaskAssistantError extends Error {
  code: TaskAssistantApiError["code"];
  status: number;

  constructor(code: TaskAssistantApiError["code"], message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const sanitizeMembers = (members: Array<TaskAssistantMember & Record<string, unknown>>) => members.map((member) => ({
  availability: member.availability,
  currentWork: member.currentWork,
  dynamicResponsibility: member.dynamicResponsibility,
  id: member.id,
  name: member.name,
  recentActivity: member.recentActivity,
  role: member.role,
}));

export const extractJsonText = (content: string) => content
  .trim()
  .replace(/^```(?:json)?\s*/i, "")
  .replace(/\s*```$/, "")
  .trim();

const systemPrompt = `你是 AgentDoor 的任务创建助手。你的职责是通过对话帮助用户形成高质量、可执行、人员安排合理的任务计划。

你必须同时完成三件事：
1. 主动追问缺失信息：每轮最多提出 2 个最关键问题。
2. 判断任务质量：检查范围、目标可验证性、排期与风险；范围过大时拆分子任务。
3. 推荐人员：只能从 members 中选择，结合职责、动态责任、可用时间与当前工作说明理由。推荐不等于成员已接受。

只返回一个 JSON 对象，不要 Markdown，不要解释 JSON。字段必须完整：
{
  "assistantMessage": "面向用户的简短回复",
  "resultSummary": "本轮完成了什么",
  "missingInformation": [{"field":"字段名","question":"问题","reason":"为什么需要"}],
  "qualityAssessment": {
    "scope": {"level":"good|needs-attention|blocked","summary":"判断"},
    "goal": {"level":"good|needs-attention|blocked","summary":"判断"},
    "schedule": {"level":"good|needs-attention|blocked","summary":"判断"},
    "risks": ["有依据的风险"]
  },
  "peopleRecommendations": [{"memberId":"成员内部 ID","role":"owner|participant","reason":"职责或负载依据"}],
  "draft": {
    "mainTask": {"title":"","goal":"","ownerId":"","participantIds":[],"startDate":"","endDate":"","labels":[]},
    "subtasks": [{"title":"","goal":"","ownerId":"","participantIds":[],"startDate":"","endDate":"","labels":[]}],
    "dependencies": [{"subtaskIndex":1,"dependsOnSubtaskIndexes":[0]}]
  },
  "readyToCreate": false
}

规则：
- 每次返回 draft 的完整当前快照，结合 currentDraft 增量修改，不要丢失用户已确认的信息。
- title 和 goal 可以在信息不足时先给合理草案。负责人不是创建阻断项：没有足够责任依据时 ownerId 保持空字符串，并在回复中明确“暂不分配”；不要默认回填创建者或首位成员。
- 日期只能是空字符串或 YYYY-MM-DD，截止时间不得早于开始时间。
- ownerId、participantIds、memberId 必须使用 members 中的 id；找不到合适人员时保持空字符串并说明未分配。
- tags 是当前用户维护的个人可选标签。labels 优先复用已有名称；没有合适标签时可以创建简短、可复用的新标签（1–24 字），避免重复或近义标签。
- 你有权维护当前用户的个人标签库。需要调整时在 draft.tagOperations 返回操作数组：upsert（name，可选 icon、color）用于新增或修改外观；rename（name、newName）用于改名；delete（name）用于移出个人可选列表。没有维护需求时返回空数组。仅根据当前需求维护，删除或改名须有用户明确意图，不因本次没用到就清理。历史任务上的标签保留；这些操作在确认创建任务时与任务一起保存。
- 子任务只在确有独立交付结果或推进阶段时拆分，通常 2–6 个；简单任务保持空数组。
- dependencies 只记录真实的前置依赖。可并行子任务不需要记录；索引从 0 开始，不得自我依赖或引用不存在的子任务。
- participantIds 不得包含该任务 ownerId。
- 不编造成员、职责、可用时间、现有任务或日期。`;

const buildContext = (request: TaskAssistantRequest) => ({
  currentDate: request.currentDate,
  currentUserId: request.currentUserId,
  currentDraft: request.draft,
  existingTasks: request.existingTasks,
  members: sanitizeMembers(request.members),
  messages: request.messages,
  tags: request.tags,
  timezone: request.timezone,
});

export const normalizeAssistantResponse = (response: TaskAssistantResponse, request: TaskAssistantRequest): TaskAssistantResponse => {
  const memberIds = new Set(request.members.map((member) => member.id));
  const normalizeTask = (task: TaskAssistantResponse["draft"]["mainTask"]) => ({
    ...task,
    // Model output is a proposal, never evidence of a human confirmation.
    ...(task.effortEstimate ? { effortEstimate: { ...task.effortEstimate, basis: "model" as const, confirmed: false } } : {}),
    labels: normalizePersonalTagNames(task.labels),
    ownerId: memberIds.has(task.ownerId) ? task.ownerId : "",
    participantIds: task.participantIds.filter((id) => memberIds.has(id) && id !== task.ownerId),
  });
  const draft = {
    ...(response.draft.tagOperations ? { tagOperations: response.draft.tagOperations } : {}),
    dependencies: (response.draft.dependencies ?? []).flatMap(({ dependsOnSubtaskIndexes, subtaskIndex }) => {
      if (subtaskIndex < 0 || subtaskIndex >= response.draft.subtasks.length) return [];
      const validIndexes = [...new Set(dependsOnSubtaskIndexes.filter((index) => index >= 0 && index < response.draft.subtasks.length && index !== subtaskIndex))];
      return validIndexes.length ? [{ dependsOnSubtaskIndexes: validIndexes, subtaskIndex }] : [];
    }),
    mainTask: normalizeTask(response.draft.mainTask),
    subtasks: response.draft.subtasks.map(normalizeTask),
  };
  return {
    ...response,
    draft,
    peopleRecommendations: response.peopleRecommendations.filter((item) => memberIds.has(item.memberId)),
    readyToCreate: response.readyToCreate,
  };
};

const extractUpstreamContent = (payload: unknown) => {
  if (!payload || typeof payload !== "object") throw new TaskAssistantError("UPSTREAM", "AI 服务返回了无法识别的结果。", 502);
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output) || !output.length) throw new TaskAssistantError("UPSTREAM", "AI 服务没有返回内容。", 502);
  const text = output.flatMap((item) => typeof item === "object" && item && "content" in item && Array.isArray((item as { content: unknown }).content) ? (item as { content: unknown[] }).content : [])
    .map((item) => typeof item === "object" && item && "type" in item && (item as { type: unknown }).type === "output_text" && "text" in item ? String((item as { text: unknown }).text) : "")
    .join("");
  if (text.trim()) return text;
  throw new TaskAssistantError("UPSTREAM", "AI 服务没有返回可用文本。", 502);
};

const requestModel = async (apiKey: string, model: string, messages: UpstreamMessage[]) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(ppioBaseUrl, {
      body: JSON.stringify({
        input: messages,
        instructions: systemPrompt,
        // GPT-5.5 Pro 的推理 token 也计入该上限。较大的上下文在 3.6k
        // 上限下偶尔会只返回 reasoning 而没有最终 output_text。
        max_output_tokens: maxOutputTokens,
        model,
        reasoning: { effort: "medium" },
        store: false,
        text: {
          format: { name: "task_assistant_response", schema: responseJsonSchema, strict: true, type: "json_schema" },
          verbosity: "low",
        },
      }),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      method: "POST",
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) throw new TaskAssistantError("AUTH", "本地 AI 配置不可用，请检查 PPIO Key。", 503);
    if (response.status === 429) throw new TaskAssistantError("RATE_LIMIT", "AI 服务当前请求较多，请稍后重试。", 429);
    if (!response.ok) throw new TaskAssistantError("UPSTREAM", "AI 服务暂时不可用，请稍后重试。", 502);
    return extractUpstreamContent(await response.json());
  } catch (error) {
    if (error instanceof TaskAssistantError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new TaskAssistantError("TIMEOUT", "AI 分析超时，请重试本轮。", 504);
    throw new TaskAssistantError("UPSTREAM", "无法连接 AI 服务，请稍后重试。", 502);
  } finally {
    clearTimeout(timeout);
  }
};

const parseAssistantContent = (content: string): TaskAssistantResponse => taskAssistantResponseSchema.parse(JSON.parse(extractJsonText(content)));

export const callTaskAssistant = async (request: TaskAssistantRequest, options: PluginOptions) => {
  if (!options.apiKey) throw new TaskAssistantError("NOT_CONFIGURED", "尚未配置本地 PPIO Key。", 503);
  const messages: UpstreamMessage[] = [{ content: JSON.stringify(buildContext(request)), role: "user" }];
  const firstContent = await requestModel(options.apiKey, options.model, messages);
  try {
    return normalizeAssistantResponse(parseAssistantContent(firstContent), request);
  } catch (firstError) {
    const repairMessages: UpstreamMessage[] = [
      ...messages,
      { content: firstContent, role: "assistant" },
      { content: `上一个 JSON 未通过协议校验。请重新输出完整 JSON；assistantMessage 必须继续面向用户回答，不得提到 JSON、协议、校验或重试。校验问题：${firstError instanceof Error ? firstError.message.slice(0, 1200) : "未知格式错误"}`, role: "user" },
    ];
    const repairedContent = await requestModel(options.apiKey, options.model, repairMessages);
    try {
      return normalizeAssistantResponse(parseAssistantContent(repairedContent), request);
    } catch {
      throw new TaskAssistantError("MODEL_FORMAT", "AI 返回格式异常，请重试本轮。", 502);
    }
  }
};

const readRequestBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > requestBodyLimit) throw new TaskAssistantError("INVALID_REQUEST", "请求内容过长。", 413);
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new TaskAssistantError("INVALID_REQUEST", "请求格式无效。", 400);
  }
};

const sendJson = (response: ServerResponse, status: number, payload: unknown) => {
  response.statusCode = status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const createRequestHandler = (options: PluginOptions) => async (request: IncomingMessage, response: ServerResponse) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { code: "INVALID_REQUEST", message: "仅支持 POST 请求。" });
    return;
  }
  try {
    const parsed = taskAssistantRequestSchema.safeParse(await readRequestBody(request));
    if (!parsed.success) throw new TaskAssistantError("INVALID_REQUEST", "任务创建上下文不完整。", 400);
    sendJson(response, 200, await callTaskAssistant(parsed.data, options));
  } catch (error) {
    const safeError = error instanceof TaskAssistantError
      ? error
      : new TaskAssistantError("UPSTREAM", "任务分析暂时失败，请重试。", 500);
    sendJson(response, safeError.status, { code: safeError.code, message: safeError.message });
  }
};

export const taskAssistantPlugin = (options: PluginOptions): Plugin => ({
  configurePreviewServer(server) {
    server.middlewares.use("/api/task-assistant", createRequestHandler(options));
  },
  configureServer(server) {
    server.middlewares.use("/api/task-assistant", createRequestHandler(options));
  },
  name: "agentdoor-task-assistant",
});
