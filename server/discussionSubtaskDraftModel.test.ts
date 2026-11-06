import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { callDiscussionSubtaskDraftModel, createDiscussionSubtaskDraftHandler } from "./discussionSubtaskDraft.ts";
import { buildDiscussionSubtaskRequest } from "../src/features/tasks/lib/discussion-subtask-draft.ts";
const request = buildDiscussionSubtaskRequest({ locale: "zh-CN", currentDate: "2026-11-04", task: { id: "parent", title: "准备发布", goal: "掌握发布条件", completionCriteria: [] }, sourceMessageId: "reply", messages: [{ id: "root", author: "lead", type: "member-post", time: "今天", message: "请核对发布材料" }, { id: "reply", author: "reviewer", type: "member-reply", time: "今天", replyToActivityId: "root", message: "收到，我会核对并回传结论。" }], members: [{ id: "reviewer", name: "陈默", email: "", role: "" }], labels: [] });
const options = { apiKey: "test-only", endpoint: "https://example.test/responses", model: "fixture", maxOutputTokens: 1024, timeoutMs: 1000 };
const expected = { draft: { title: "核对发布材料并回传结论", goal: "让发布负责人掌握材料是否可用。", ownerId: "reviewer", endDate: "", labels: [] }, message: "" };

function postTo(handler: ReturnType<typeof createDiscussionSubtaskDraftHandler>) {
  return async (body = JSON.stringify(request), overrides: Record<string, string> = {}) => {
    const headers = new Headers({ "Content-Type": "application/json", "X-TaskDoor-Subtask-Draft": "1", Origin: "http://127.0.0.1:5173", ...overrides });
    const req = Object.assign(Readable.from([Buffer.from(body)]), {
      method: "POST",
      headers: { host: "127.0.0.1:5173", ...Object.fromEntries(headers) },
      socket: { remoteAddress: "127.0.0.1" },
    });
    let status: number;
    let responseHeaders: Record<string, string>;
    let response: Response | undefined;
    const res = Object.assign(new EventEmitter(), {
      writableEnded: false,
      writeHead(code: number, values: Record<string, string>) {
        status = code;
        responseHeaders = values;
      },
      end(text: string) {
        this.writableEnded = true;
        response = new Response(text, { status, headers: responseHeaders });
      },
    });
    await handler(req as unknown as IncomingMessage, res as unknown as ServerResponse);
    assert.ok(response, "处理器应返回实际响应");
    return response;
  };
}
test("使用选中讨论及同段上下文调用模型，返回单个可审阅草稿", async () => {
  let payload: unknown; let prompt = "";
  const result = await callDiscussionSubtaskDraftModel(request, options, async (_options, instructions, input) => { payload = input; prompt = instructions; return { rawOutput: JSON.stringify(expected), usage: { inputTokens: null, outputTokens: null, totalTokens: null } }; }, new AbortController().signal);
  assert.deepEqual(payload, { mode: "discussion", ...request }); assert.deepEqual(result, expected);
  assert.match(prompt, /一个/); assert.match(prompt, /不执行/); assert.match(prompt, /收到/);
});
test("未配置或已取消时不调用模型，不返回伪造草稿", async () => {
  let calls = 0;
  const model = async () => { calls++; return { rawOutput: JSON.stringify(expected), usage: { inputTokens: null, outputTokens: null, totalTokens: null } }; };
  await assert.rejects(callDiscussionSubtaskDraftModel(request, { ...options, apiKey: undefined }, model, new AbortController().signal), /配置/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(callDiscussionSubtaskDraftModel(request, options, model, controller.signal), /取消/);
  assert.equal(calls, 0);
});

test("草稿接口拒绝跨站和无效来源，生成失败后仍可重试且不泄露模型错误", async () => {
  let calls = 0;
  let fail = false;
  const handler = createDiscussionSubtaskDraftHandler(options, async () => {
    calls++;
    if (fail) throw new Error("private provider error");
    return { rawOutput: JSON.stringify(expected), usage: { inputTokens: null, outputTokens: null, totalTokens: null } };
  });
  const post = postTo(handler);
  const rejectedHeaders: Record<string, string>[] = [{ Origin: "https://unrelated.test" }, { "X-TaskDoor-Subtask-Draft": "" }, { "Sec-Fetch-Site": "cross-site" }];
  for (const headers of rejectedHeaders) {
    const response = await post(undefined, headers);
    assert.equal(response.status, 403); await response.json();
  }
  for (const body of ["{invalid", JSON.stringify({ ...request, source: { ...request.source, body: "来源已变更" } })]) {
    const response = await post(body);
    assert.equal(response.status, 400); await response.json();
  }
  assert.equal(calls, 0);
  fail = true;
  const failed = await post();
  assert.equal(failed.status, 502);
  assert.doesNotMatch(await failed.text(), /private provider error/);
  fail = false;
  const success = await post();
  assert.equal(success.status, 200);
  assert.equal(success.headers.get("cache-control"), "no-store");
  assert.deepEqual(await success.json(), expected);
  assert.equal(calls, 2);
});

test("两个入口使用相同 Skill 并将来源模式与父定义传入模型", async () => {
  const prompt = {
    locale: "zh-CN", currentDate: "2026-11-04", timeZone: "Asia/Shanghai",
    prompt: "整理退款记录，按渠道汇总差异", parentTask: { id: "parent", title: "准备发布", goal: "掌握发布条件", completionCriteria: ["记录发布审核结果"] },
    members: [], labels: [],
  };
  const listDraft = { draft: { title: "汇总各渠道退款差异", goal: "定位需要进一步核对的渠道。", completionCriteria: ["按渠道汇总退款记录与差异。"], ownerId: "", participantIds: [], endDate: "", labels: [] }, message: "" };
  const calls: { instructions: string; input: unknown }[] = [];
  const handler = createDiscussionSubtaskDraftHandler(options, async (_options, instructions, input) => {
    calls.push({ instructions, input });
    const output = calls.length === 1 ? expected : calls.length === 2 ? listDraft : { draft: null, message: "请补充要核对的记录。" };
    return { rawOutput: JSON.stringify(output), usage: { inputTokens: null, outputTokens: null, totalTokens: null } };
  });
  const handlerPost = postTo(handler);
  const post = (input: unknown) => handlerPost(JSON.stringify(input));
  const discussionResponse = await post(request);
  assert.equal(discussionResponse.status, 200);
  assert.deepEqual(await discussionResponse.json(), expected);
  const listResponse = await post(prompt);
  assert.equal(listResponse.status, 200);
  assert.deepEqual(await listResponse.json(), listDraft);
  assert.deepEqual(calls[0].input, { mode: "discussion", ...request });
  assert.deepEqual(calls[1].input, { mode: "prompt", ...prompt });
  assert.equal(calls[0].instructions, calls[1].instructions);
  const clarification = await post({ ...prompt, prompt: "处理一下" });
  assert.equal(clarification.status, 200);
  assert.deepEqual(await clarification.json(), { draft: null, message: "请补充要核对的记录。" });
});
