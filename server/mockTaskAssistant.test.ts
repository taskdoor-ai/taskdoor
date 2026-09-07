import assert from "node:assert/strict";
import test from "node:test";
import { creatorCommerceMembers, creatorCommercePrompt, creatorCommerceTags } from "../src/data/creatorCommerceScenario.ts";
import { createMockTaskAssistantResponse, createMockTaskAssistantResponseForDraft, requestMockTaskAssistant } from "../src/lib/mockTaskAssistant.ts";
import type { TaskAssistantRequest } from "../src/lib/taskAssistantProtocol.ts";

const creatorSubtaskTitles = [
  "筛选达人并确认商务合作",
  "完成卖点、脚本与直播素材",
  "完成直播彩排与上线执行",
  "确认价格机制、库存与履约",
  "制定投流计划并控制 ROI",
  "搭建数据看板并完成复盘",
  "完成素材宣称与合同合规审核",
];

const creatorSubtaskOwners = ["陈默", "林洁", "高远", "梁川", "许宁", "韩序", "苏禾"];
const creatorSubtaskGoals = [
  "完成达人筛选、建联、佣金谈判与合作档期确认。",
  "完成卖点提炼、短视频脚本、直播话术与素材交付。",
  "完成直播排期、场控清单、彩排和上线异常预案。",
  "锁定商品价格、赠品机制、库存数量和履约方案。",
  "确认投放预算、定向、人群包和 ROI 目标。",
  "统一 GMV 指标口径、渠道归因和项目复盘模板。",
  "审核广告法、素材宣称、达人合同和平台规则。",
];
const scenarioMembers: TaskAssistantRequest["members"] = creatorCommerceMembers.map((member) => ({
  availability: member.availability ?? "",
  currentWork: member.currentWork ?? [],
  dynamicResponsibility: member.dynamicResponsibility ?? "",
  id: member.id,
  name: member.name,
  recentActivity: member.recentActivity ?? "",
  role: member.role,
}));

const baseRequest = (
  messages: TaskAssistantRequest["messages"] = [{ content: creatorCommercePrompt, role: "user" }],
  members: TaskAssistantRequest["members"] = scenarioMembers,
): TaskAssistantRequest => ({
  currentDate: "2026-08-28",
  currentUserId: "周岚",
  draft: null,
  existingTasks: [],
  members,
  messages,
  tags: creatorCommerceTags.map((tag) => tag.name),
  timezone: "Asia/Shanghai",
});

test("first creator-commerce turn builds seven subtasks assigned by responsibility", async () => {
  const result = await requestMockTaskAssistant(baseRequest(), undefined, 0);

  assert.equal(result.draft.mainTask.ownerId, "周岚");
  assert.equal(result.draft.mainTask.title, "新品防晒衣抖音达人带货项目");
  assert.equal(result.readyToCreate, true);
  assert.equal(result.missingInformation.length, 0);
  assert.doesNotMatch(result.assistantMessage, /确认|吗？|请告诉我/);
  assert.equal(result.draft.subtasks.length, 7);
  assert.deepEqual(result.draft.subtasks.map((task) => task.title), creatorSubtaskTitles);
  assert.deepEqual(result.draft.subtasks.map((task) => task.goal), creatorSubtaskGoals);
  assert.deepEqual(result.draft.subtasks.map((task) => task.ownerId), creatorSubtaskOwners);
  assert.deepEqual(result.draft.mainTask.participantIds, creatorSubtaskOwners);
  assert.deepEqual(
    result.draft.subtasks.map((task) => task.labels),
    [["达人商务"], ["内容制作"], ["直播执行"], ["商品运营"], ["投流增长"], ["数据复盘"], ["合规审核"]],
  );
  assert.deepEqual(result.draft.dependencies, [
    { subtaskIndex: 2, dependsOnSubtaskIndexes: [0, 1, 3, 6] },
    { subtaskIndex: 4, dependsOnSubtaskIndexes: [0, 1] },
    { subtaskIndex: 5, dependsOnSubtaskIndexes: [2, 4] },
    { subtaskIndex: 6, dependsOnSubtaskIndexes: [0, 1] },
  ]);
  assert.equal(result.peopleRecommendations.length, 8);
  assert.ok(result.peopleRecommendations.every((item) => /责任命中/.test(item.reason)));
});

test("draft response derives summary recommendations and scope from the supplied draft", () => {
  const request = baseRequest();
  const complexDraft = createMockTaskAssistantResponse(request).draft;
  const complex = createMockTaskAssistantResponseForDraft(request, complexDraft, "场景草案已生成。");
  const ownerIds = new Set([complexDraft.mainTask, ...complexDraft.subtasks].map((task) => task.ownerId).filter(Boolean));

  assert.equal(complex.resultSummary, "已生成 1 个主任务、7 个子任务");
  assert.match(complex.qualityAssessment.scope.summary, /7 个子任务/);
  assert.ok(complex.peopleRecommendations.length > 0);
  assert.ok(complex.peopleRecommendations.every((recommendation) => ownerIds.has(recommendation.memberId)));

  const singleDraft = { ...complexDraft, dependencies: [], mainTask: { ...complexDraft.mainTask, startDate: "", endDate: "" }, subtasks: [] };
  const single = createMockTaskAssistantResponseForDraft(request, singleDraft);
  assert.equal(single.resultSummary, "已生成 1 个主任务、0 个子任务");
  assert.match(single.qualityAssessment.scope.summary, /单任务/);
  assert.equal(single.qualityAssessment.schedule.summary, "当前未设置任务时间，可在草案中补充。");
  assert.ok(single.peopleRecommendations.every((recommendation) => recommendation.memberId === singleDraft.mainTask.ownerId));

  const clarifiedDraft = { ...singleDraft, mainTask: { ...singleDraft.mainTask, startDate: "2026-08-28", endDate: "2026-08-31" } };
  const clarified = createMockTaskAssistantResponseForDraft(request, clarifiedDraft);
  assert.equal(clarified.qualityAssessment.schedule.summary, "任务时间为 2026-08-28 至 2026-08-31。");

  const startOnly = createMockTaskAssistantResponseForDraft(request, { ...singleDraft, mainTask: { ...singleDraft.mainTask, startDate: "2026-08-28" } });
  const endOnly = createMockTaskAssistantResponseForDraft(request, { ...singleDraft, mainTask: { ...singleDraft.mainTask, endDate: "2026-08-31" } });
  assert.equal(startOnly.qualityAssessment.schedule.summary, "任务开始时间为 2026-08-28，结束时间未设置。");
  assert.equal(endOnly.qualityAssessment.schedule.summary, "任务结束时间为 2026-08-31，开始时间未设置。");
});

test("creator-commerce assignments follow responsibility text after member identities change", () => {
  const renamedMembers = scenarioMembers.map((member, index) => ({
    ...member,
    id: `member-${index}`,
    name: `协作者 ${index}`,
  }));
  const result = createMockTaskAssistantResponse({
    ...baseRequest(undefined, renamedMembers),
    currentUserId: "member-0",
  });

  assert.equal(result.draft.mainTask.ownerId, "member-0");
  assert.deepEqual(result.draft.subtasks.map((task) => task.ownerId), [
    "member-1", "member-2", "member-3", "member-4", "member-5", "member-6", "member-7",
  ]);
});

test("second creator-commerce turn enables creation and preserves valid manual owner overrides", () => {
  const first = createMockTaskAssistantResponse(baseRequest());
  const editedDraft = {
    ...first.draft,
    mainTask: { ...first.draft.mainTask, title: "用户编辑后的项目名称" },
    subtasks: first.draft.subtasks.map((task, index) => index === 0 ? { ...task, ownerId: "周岚" } : task),
  };
  const result = createMockTaskAssistantResponse({
    ...baseRequest([
      { content: creatorCommercePrompt, role: "user" },
      { content: "确认，按这版创建", role: "user" },
    ]),
    draft: editedDraft,
  });

  assert.equal(result.readyToCreate, true);
  assert.equal(result.missingInformation.length, 0);
  assert.equal(result.draft.mainTask.title, "用户编辑后的项目名称");
  assert.equal(result.draft.subtasks[0]?.ownerId, "周岚");
  assert.deepEqual(result.draft.dependencies, first.draft.dependencies);
});

test("the creator-commerce demo never requires an explicit confirmation reply", () => {
  const first = createMockTaskAssistantResponse(baseRequest());
  for (const reply of ["不确认，请先保持待定", "请先补充风险说明", "请确认风险口径"]) {
    const result = createMockTaskAssistantResponse({
      ...baseRequest([
        { content: creatorCommercePrompt, role: "user" },
        { content: reply, role: "user" },
      ]),
      draft: first.draft,
    });

    assert.equal(result.readyToCreate, true);
    assert.equal(result.missingInformation.length, 0);
    assert.match(result.assistantMessage, /可以直接创建/);
    assert.doesNotMatch(result.assistantMessage, /确认|吗？|请告诉我/);
  }
});

test("main-task title and owner edits survive follow-up by stable position", () => {
  const first = createMockTaskAssistantResponse(baseRequest());
  const result = createMockTaskAssistantResponse({
    ...baseRequest([
      { content: creatorCommercePrompt, role: "user" },
      { content: "确认，按这版创建", role: "user" },
    ]),
    draft: {
      ...first.draft,
      mainTask: { ...first.draft.mainTask, title: "用户重命名的防晒衣项目", ownerId: "陈默" },
      subtasks: first.draft.subtasks.map((task, index) => index === 1
        ? { ...task, title: "用户重命名的内容交付", ownerId: "周岚" }
        : task),
    },
  });

  assert.equal(result.draft.mainTask.title, "用户重命名的防晒衣项目");
  assert.equal(result.draft.mainTask.ownerId, "陈默");
  assert.equal(result.draft.subtasks[1]?.title, "用户重命名的内容交付");
  assert.equal(result.draft.subtasks[1]?.ownerId, "周岚");
  assert.ok(result.peopleRecommendations.some((item) => item.memberId === "陈默" && /手动指定/.test(item.reason)));
  assert.ok(result.peopleRecommendations.some((item) => item.memberId === "周岚" && /手动指定/.test(item.reason)));
});

test("invalid incoming owners are reassigned from current responsibilities", () => {
  const first = createMockTaskAssistantResponse(baseRequest());
  const result = createMockTaskAssistantResponse({
    ...baseRequest([
      { content: creatorCommercePrompt, role: "user" },
      { content: "确认", role: "user" },
    ]),
    draft: {
      ...first.draft,
      subtasks: first.draft.subtasks.map((task, index) => index === 0 ? { ...task, ownerId: "removed-member" } : task),
    },
  });

  assert.equal(result.draft.subtasks[0]?.ownerId, "陈默");
  assert.equal(result.readyToCreate, true);
});

test("incoming members are validated while personal tag names are preserved and deduplicated", () => {
  const first = createMockTaskAssistantResponse(baseRequest());
  const result = createMockTaskAssistantResponse({
    ...baseRequest([
      { content: creatorCommercePrompt, role: "user" },
      { content: "确认", role: "user" },
    ]),
    draft: {
      ...first.draft,
      mainTask: {
        ...first.draft.mainTask,
        ownerId: "陈默",
        participantIds: ["陈默", "林洁", "removed-member", "林洁"],
        labels: ["达人商务", "旧标签", "达人商务"],
      },
    },
  });

  assert.deepEqual(result.draft.mainTask.participantIds, ["林洁"]);
  assert.deepEqual(result.draft.mainTask.labels, ["达人商务", "旧标签"]);
});

test("missing compliance responsibility leaves the compliance task unassigned and exposes a risk", () => {
  const membersWithoutCompliance = scenarioMembers.filter((member) => member.id !== "苏禾");
  const result = createMockTaskAssistantResponse(baseRequest(undefined, membersWithoutCompliance));
  const complianceTask = result.draft.subtasks.find((task) => task.title === "完成素材宣称与合同合规审核");

  assert.ok(complianceTask);
  assert.equal(complianceTask.ownerId, "");
  assert.equal(result.readyToCreate, true);
  assert.equal(result.qualityAssessment.scope.level, "needs-attention");
  assert.ok(result.qualityAssessment.risks.some((risk) => risk.includes("合规责任缺口")));
});

test("a valid manual owner closes a generated responsibility gap", () => {
  const membersWithoutCompliance = scenarioMembers.filter((member) => member.id !== "苏禾");
  const first = createMockTaskAssistantResponse(baseRequest(undefined, membersWithoutCompliance));
  const result = createMockTaskAssistantResponse({
    ...baseRequest([
      { content: creatorCommercePrompt, role: "user" },
      { content: "确认，按这版创建", role: "user" },
    ], membersWithoutCompliance),
    draft: {
      ...first.draft,
      subtasks: first.draft.subtasks.map((task, index) => index === 6 ? { ...task, ownerId: "周岚" } : task),
    },
  });

  assert.equal(result.draft.subtasks[6]?.ownerId, "周岚");
  assert.equal(result.readyToCreate, true);
  assert.ok(result.qualityAssessment.risks.every((risk) => !risk.includes("合规责任缺口")));
  assert.ok(result.peopleRecommendations.some((item) => item.memberId === "周岚" && /手动指定/.test(item.reason)));
});

test("every missing specialist creates a data-driven responsibility gap", () => {
  const cases = [
    ["陈默", 0, "达人商务责任缺口"],
    ["林洁", 1, "内容制作责任缺口"],
    ["高远", 2, "直播执行责任缺口"],
    ["梁川", 3, "商品运营责任缺口"],
    ["许宁", 4, "投流增长责任缺口"],
    ["韩序", 5, "数据复盘责任缺口"],
    ["苏禾", 6, "合规责任缺口"],
  ] as const;

  for (const [missingMemberId, subtaskIndex, riskText] of cases) {
    const members = scenarioMembers.filter((member) => member.id !== missingMemberId);
    const result = createMockTaskAssistantResponse({
      ...baseRequest([
        { content: creatorCommercePrompt, role: "user" },
        { content: "确认", role: "user" },
      ], members),
    });
    assert.equal(result.draft.subtasks[subtaskIndex]?.ownerId, "", `${missingMemberId} should leave its task unassigned`);
    assert.ok(result.qualityAssessment.risks.some((risk) => risk.includes(riskText)), `${missingMemberId} should expose ${riskText}`);
    assert.equal(result.readyToCreate, true);
    assert.match(result.assistantMessage, /可以先创建/);
  }
});

test("a missing coordination owner creates a main-task responsibility gap", () => {
  const result = createMockTaskAssistantResponse({
    ...baseRequest([
      { content: creatorCommercePrompt, role: "user" },
      { content: "确认", role: "user" },
    ], scenarioMembers.filter((member) => member.id !== "周岚")),
    currentUserId: "陈默",
  });

  assert.equal(result.draft.mainTask.ownerId, "");
  assert.ok(result.qualityAssessment.risks.some((risk) => risk.includes("统筹责任缺口")));
  assert.equal(result.readyToCreate, true);
  assert.equal(result.qualityAssessment.scope.level, "needs-attention");
});

test("dates remain valid when the current date is after this year's September 15", () => {
  const result = createMockTaskAssistantResponse({ ...baseRequest(), currentDate: "2026-10-01" });

  assert.equal(result.draft.mainTask.endDate, "2027-09-15");
  assert.ok([result.draft.mainTask, ...result.draft.subtasks].every((task) => task.endDate >= task.startDate));
});

test("staged subtask dates remain valid when starting immediately before September 15", () => {
  const result = createMockTaskAssistantResponse({ ...baseRequest(), currentDate: "2026-09-14" });

  assert.equal(result.draft.mainTask.endDate, "2027-09-15");
  assert.ok([result.draft.mainTask, ...result.draft.subtasks].every((task) => task.endDate >= task.startDate));
});

test("creator draft with an empty title and invalid due date cannot become ready", () => {
  const first = createMockTaskAssistantResponse(baseRequest());
  const result = createMockTaskAssistantResponse({
    ...baseRequest([
      { content: creatorCommercePrompt, role: "user" },
      { content: "确认", role: "user" },
    ]),
    draft: {
      ...first.draft,
      subtasks: first.draft.subtasks.map((task, index) => index === 2
        ? { ...task, title: "", startDate: "2026-09-10", endDate: "2026-09-99" }
        : task),
    },
  });

  assert.equal(result.readyToCreate, false);
  assert.ok(result.missingInformation.some((item) => item.field.includes("title")));
  assert.ok(result.missingInformation.some((item) => item.field.includes("date")));
  assert.doesNotMatch(result.assistantMessage, /可以创建/);
});

test("generic input stays on the generic mock path", () => {
  const result = createMockTaskAssistantResponse(baseRequest([{ content: "整理下周例会纪要", role: "user" }]));

  assert.equal(result.draft.subtasks.length, 0);
  assert.equal(result.qualityAssessment.schedule.summary, "任务时间为 2026-08-28 至 2026-08-31。");
  assert.ok(result.draft.subtasks.every((task) => !creatorSubtaskTitles.includes(task.title)));
  assert.match(result.draft.mainTask.title, /例会纪要/);
  assert.equal(result.readyToCreate, true);
  assert.equal(result.missingInformation.length, 0);
  assert.match(result.assistantMessage, /无需拆分.*可以创建/);
});

test("quick mocks cover serial, cross-functional and parallel task structures", () => {
  const serial = createMockTaskAssistantResponse(baseRequest([{ content: "筛选适合新品防晒衣的抖音达人", role: "user" }]));
  assert.equal(serial.draft.mainTask.title, "新品防晒衣抖音达人筛选");
  assert.equal(serial.draft.subtasks.length, 2);
  assert.deepEqual(serial.draft.dependencies, [{ subtaskIndex: 1, dependsOnSubtaskIndexes: [0] }]);
  assert.deepEqual(serial.peopleRecommendations.map((item) => item.memberId), ["陈默"]);
  assert.ok(serial.peopleRecommendations.some((item) => item.memberId === "陈默" && /责任命中/.test(item.reason)));
  assert.notEqual(serial.draft.mainTask.title, "新品防晒衣抖音达人带货项目");

  const crossFunctional = createMockTaskAssistantResponse(baseRequest([{ content: "拆分直播、投流与数据复盘计划", role: "user" }]));
  assert.equal(crossFunctional.draft.subtasks.length, 3);
  assert.deepEqual(crossFunctional.draft.subtasks.map((task) => task.ownerId), ["高远", "许宁", "韩序"]);
  assert.deepEqual(crossFunctional.draft.dependencies, [{ subtaskIndex: 2, dependsOnSubtaskIndexes: [0, 1] }]);
  assert.deepEqual(crossFunctional.peopleRecommendations.map((item) => item.memberId), ["韩序", "高远", "许宁"]);

  const parallel = createMockTaskAssistantResponse(baseRequest([{ content: "检查素材宣称与达人合同合规", role: "user" }]));
  assert.equal(parallel.draft.subtasks.length, 2);
  assert.deepEqual(parallel.draft.dependencies, []);
  assert.deepEqual(parallel.draft.subtasks.map((task) => task.ownerId), ["林洁", "苏禾"]);
  assert.deepEqual(parallel.peopleRecommendations.map((item) => item.memberId), ["苏禾", "林洁"]);
});

test("all five shortcuts return request-specific structures and explain every selected owner", () => {
  const shortcuts = [
    [creatorCommercePrompt, 7],
    ["整理下周例会纪要", 0],
    ["筛选适合新品防晒衣的抖音达人", 2],
    ["拆分直播、投流与数据复盘计划", 3],
    ["检查素材宣称与达人合同合规", 2],
  ] as const;

  for (const [content, subtaskCount] of shortcuts) {
    const result = createMockTaskAssistantResponse(baseRequest([{ content, role: "user" }]));
    const selectedOwnerIds = [...new Set([result.draft.mainTask, ...result.draft.subtasks].map((task) => task.ownerId).filter(Boolean))];
    assert.equal(result.draft.subtasks.length, subtaskCount, content);
    assert.deepEqual(result.peopleRecommendations.map((item) => item.memberId), selectedOwnerIds, content);
    assert.ok(result.peopleRecommendations.every((item) => item.reason.length > 12), content);
  }
});

test("generic follow-up normalizes stale members and allows an unassigned owner", () => {
  const first = createMockTaskAssistantResponse(baseRequest([{ content: "整理下周例会纪要", role: "user" }]));
  const result = createMockTaskAssistantResponse({
    ...baseRequest([
      { content: "整理下周例会纪要", role: "user" },
      { content: "确认", role: "user" },
    ]),
    draft: {
      ...first.draft,
      mainTask: {
        ...first.draft.mainTask,
        ownerId: "removed-member",
        participantIds: ["removed-member", "周岚", "周岚"],
        labels: ["未知标签", "达人商务", "达人商务"],
      },
    },
  });

  assert.equal(result.draft.mainTask.ownerId, "");
  assert.deepEqual(result.draft.mainTask.participantIds, ["周岚"]);
  assert.deepEqual(result.draft.mainTask.labels, ["未知标签", "达人商务"]);
  assert.equal(result.readyToCreate, true);
  assert.ok(result.missingInformation.every((item) => !item.field.includes("owner")));
  assert.match(result.assistantMessage, /可以创建/);
});

test("mock request can be aborted", async () => {
  const controller = new AbortController();
  const pending = requestMockTaskAssistant(baseRequest(), controller.signal, 10_000);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});
