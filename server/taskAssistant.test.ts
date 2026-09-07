import assert from "node:assert/strict";
import test from "node:test";
import { taskAssistantResponseSchema } from "../src/lib/taskAssistantProtocol.ts";
import { extractJsonText, normalizeAssistantResponse, sanitizeMembers } from "./taskAssistant.ts";

const validPayload = {
  assistantMessage: "我先确认任务目标。",
  resultSummary: "已形成主任务草案",
  missingInformation: [{ field: "goal", question: "什么结果代表完成？", reason: "当前目标不可验证" }],
  qualityAssessment: {
    goal: { level: "needs-attention", summary: "需要补充可验证结果" },
    risks: ["截止时间尚未确认"],
    schedule: { level: "needs-attention", summary: "缺少截止时间" },
    scope: { level: "good", summary: "范围适合单个主任务" },
  },
  peopleRecommendations: [{ memberId: "陈默", reason: "负责交易重试可靠性", role: "participant" }],
  draft: {
    mainTask: {
      endDate: "",
      goal: "完成退款规则确认并形成评审结论",
      labels: ["退款规则"],
      ownerId: "周岚",
      participantIds: ["陈默"],
      startDate: "",
      title: "确认退款规则",
    },
    subtasks: [],
  },
  readyToCreate: false,
};

test("parses a complete assistant payload", () => {
  assert.equal(taskAssistantResponseSchema.parse(validPayload).draft.mainTask.title, "确认退款规则");
});

test("rejects an incomplete assistant payload", () => {
  assert.throws(() => taskAssistantResponseSchema.parse({ readyToCreate: false }));
});

test("removes email and unknown fields from member context", () => {
  assert.deepEqual(sanitizeMembers([{
    availability: "本周可安排 2 小时",
    currentWork: ["支付重试"],
    dynamicResponsibility: "交易重试可靠性",
    email: "chenmo@example.com",
    id: "陈默",
    name: "陈默",
    privateNote: "不要发送",
    recentActivity: "近期完成支付链路稳定性复盘",
    role: "支付后端工程师",
  }]), [{
    availability: "本周可安排 2 小时",
    currentWork: ["支付重试"],
    dynamicResponsibility: "交易重试可靠性",
    id: "陈默",
    name: "陈默",
    recentActivity: "近期完成支付链路稳定性复盘",
    role: "支付后端工程师",
  }]);
});

test("extracts JSON from a markdown code fence", () => {
  assert.equal(extractJsonText("```json\n{\"readyToCreate\":false}\n```"), "{\"readyToCreate\":false}");
});

test("AI 返回的新标签与个人标签维护操作会保留在草案中", () => {
  const response = taskAssistantResponseSchema.parse({
    ...validPayload,
    draft: { ...validPayload.draft, mainTask: { ...validPayload.draft.mainTask, labels: [" 新标签 ", "新标签", ""] }, tagOperations: [{ action: "upsert", name: "新标签", color: "green" }] },
  });
  const normalized = normalizeAssistantResponse(response, {
    currentDate: "2026-09-03", currentUserId: "周岚", draft: null, existingTasks: [], members: [],
    messages: [{ content: "创建任务并添加新标签", role: "user" }], tags: [], timezone: "Asia/Shanghai",
  });
  assert.deepEqual(normalized.draft.mainTask.labels, ["新标签"]);
  assert.deepEqual(normalized.draft.tagOperations, [{ action: "upsert", name: "新标签", color: "green" }]);
});

test("负责人未分配不会被服务端归一化为创建阻断", () => {
  const response = taskAssistantResponseSchema.parse({
    ...validPayload,
    draft: { ...validPayload.draft, mainTask: { ...validPayload.draft.mainTask, ownerId: "" } },
    readyToCreate: true,
  });
  const normalized = normalizeAssistantResponse(response, {
    currentDate: "2026-09-02",
    currentUserId: "周岚",
    draft: null,
    existingTasks: [],
    members: [{ id: "周岚", name: "周岚", role: "项目负责人", availability: "", currentWork: [], dynamicResponsibility: "", recentActivity: "" }],
    messages: [{ content: "创建任务", role: "user" }],
    tags: ["退款规则"],
    timezone: "Asia/Shanghai",
  });

  assert.equal(normalized.draft.mainTask.ownerId, "");
  assert.equal(normalized.readyToCreate, true);
});
