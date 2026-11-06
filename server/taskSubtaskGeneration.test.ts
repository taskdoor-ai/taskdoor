import assert from "node:assert/strict";
import test from "node:test";
import { generateSubtaskFromPrompt } from "../src/ai/subtask-creation.ts";
import { buildSubtaskDraftRequest, parseSubtaskDraftResult } from "../src/features/tasks/lib/task-subtask-draft.ts";

const requirement = "计划在11月开展防晒衣带货，面向通勤和户外人群整理商品卖点，核对防晒参数和尺码信息，安排短视频与直播素材，并在发布前形成可核对的执行方案。";
const input = {
  prompt: requirement, locale: "zh-CN" as const, currentDate: "2026-11-05", timeZone: "Asia/Shanghai",
  parentTask: { id: "parent", title: "筹备秋冬新品带货", goal: "明确新品内容与发布条件", completionCriteria: ["产品信息与内容计划均有依据"] },
  members: [
    { id: "member", name: "成员甲", email: "private@example.com", role: "", dynamicResponsibility: "商品信息核对", membershipStatus: "active" as const },
    { id: "invited", name: "待加入成员", email: "invited@example.com", role: "", membershipStatus: "invited" as const },
  ], labels: ["商品", "内容"],
};
const result = { draft: { title: "制定防晒衣带货执行方案", goal: "明确可使用的商品卖点与内容安排，供发布准备核对。", completionCriteria: ["核对防晒参数、尺码与适用人群", "整理短视频与直播素材安排"], ownerId: "", participantIds: [], labels: ["商品"], endDate: "" }, message: "" };
test("请求保留任意需求和父定义，只收集有效成员及已有标签", () => {
  const request = buildSubtaskDraftRequest(input);
  assert.equal(request.prompt, requirement);
  assert.deepEqual(request.parentTask, input.parentTask);
  assert.equal(request.timeZone, "Asia/Shanghai");
  assert.deepEqual(request.members, [{ id: "member", name: "成员甲", responsibility: "商品信息核对" }]);
  assert.doesNotMatch(JSON.stringify(request), /private@example|invited@example|待加入成员/);
  assert.deepEqual(request.labels, ["商品", "内容"]);
});

test("草稿包含独立名称目标与本次标准，未知人员标签和无效日期均不落库", () => {
  const request = buildSubtaskDraftRequest(input);
  const parsed = parseSubtaskDraftResult({ ...result, draft: { ...result.draft, ownerId: "outsider", participantIds: ["member", "outsider", "member"], labels: ["商品", "未知标签", "商品"], endDate: "2026-02-31" } }, request);
  assert.equal(parsed.title, result.draft.title);
  assert.notEqual(parsed.title, requirement);
  assert.notEqual(parsed.goal, parsed.title);
  assert.deepEqual(parsed.completionCriteria, result.draft.completionCriteria);
  assert.equal(parsed.ownerId, "");
  assert.deepEqual(parsed.participantIds, ["member"]);
  assert.deepEqual(parsed.labels, ["商品"]);
  assert.equal(parsed.endDate, "");
  assert.equal(parseSubtaskDraftResult({ ...result, draft: { ...result.draft, endDate: "2026-11-04" } }, request).endDate, "");
});

test("没有明确事项、长段落标题或额外拆分结果被拒绝，不回退保存原始需求", () => {
  const request = buildSubtaskDraftRequest(input);
  assert.throws(() => parseSubtaskDraftResult({ draft: null, message: "请补充本次要交付的内容" }, request), /补充/);
  assert.throws(() => parseSubtaskDraftResult({ ...result, draft: { ...result.draft, title: `${requirement}\n${requirement}` } }, request));
  assert.throws(() => parseSubtaskDraftResult({ ...result, subtasks: [{ title: "额外任务" }] }, request));
  assert.throws(() => parseSubtaskDraftResult({ ...result, draft: { ...result.draft, goal: result.draft.title } }, request), /名称.*目标|目标.*名称/);
  assert.throws(() => parseSubtaskDraftResult({ ...result, draft: { ...result.draft, completionCriteria: [] } }, request), /标准/);
});

test("列表将本轮需求与父定义交给共享生成接口，并使用返回的单个子任务", async t => {
  const prompt = "为新品防晒衣策划抖音达人带货，11 月 15 日上线，目标 GMV 50 万，需要完成达人筛选、脚本素材、直播执行、库存价格、投流、数据复盘和合规审核。";
  const parentTask = { id: "status-template", title: "补齐状态页多语言故障模板", goal: "维护系统状态展示", completionCriteria: ["服务状态准确显示"] };
  const controller = new AbortController();
  const fetch = t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(url, "/api/subtask-draft");
    assert.equal(init?.signal, controller.signal);
    assert.deepEqual(JSON.parse(String(init?.body)), buildSubtaskDraftRequest({ ...input, prompt, parentTask }));
    return Response.json(result);
  });
  const draft = await generateSubtaskFromPrompt({ ...input, prompt, parentTask }, controller.signal);
  assert.equal(fetch.mock.callCount(), 1);
  assert.deepEqual(draft, result.draft);
});

test("列表显示模型要求补充的信息，不能把需求原文保存为子任务", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ draft: null, message: "请补充本次要交付的内容" }));
  await assert.rejects(generateSubtaskFromPrompt(input, new AbortController().signal), /补充本次要交付的内容/);
});

test("取消生成会中止共享请求，不返回可保存的草稿", async t => {
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    });
  });
  const controller = new AbortController();
  const pending = generateSubtaskFromPrompt(input, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});
