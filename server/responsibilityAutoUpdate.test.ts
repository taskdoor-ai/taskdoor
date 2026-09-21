import assert from "node:assert/strict";
import test from "node:test";
import { initialPersonalCenterState, isPersonalCenterState, loadPersonalCenterState, personalCenterStorageKey, savePersonalCenterState, type PersonalCenterState } from "../src/data/memberProfiles";
import * as proposals from "../src/lib/responsibilityProposals";

const now = "2026-09-10T08:00:00.000Z";
const createState = () => structuredClone(initialPersonalCenterState);
const run = (state: PersonalCenterState, pausedTeamId?: string): PersonalCenterState => {
  assert.equal(typeof proposals.applyAutomaticResponsibilityUpdates, "function", "应提供责任自动更新能力");
  return proposals.applyAutomaticResponsibilityUpdates(state, { now, pausedTeamId });
};

test("自动更新兼容旧设置，但拒绝非布尔配置", () => {
  const state = createState();
  assert.equal(isPersonalCenterState(state), true);
  assert.equal(state.teams.some((team) => team.responsibilityAutoUpdate === true), false);
  for (const value of [true, false, "true", 1, null]) {
    const candidate = { ...state, teams: state.teams.map((team, index) => index ? team : { ...team, responsibilityAutoUpdate: value }) };
    assert.equal(isPersonalCenterState(candidate), typeof value === "boolean");
  }
});

test("未勾选时不应用建议；开启后按团队应用新增和更新，并记录自动操作", () => {
  const state = createState();
  assert.equal(run(state), state);
  state.teams[0].responsibilityAutoUpdate = true;
  const before = structuredClone(state);
  const next = run(state);
  const team = next.teams[0];
  assert.deepEqual(state, before, "不能修改传入的状态");
  assert.deepEqual(proposals.splitResponsibilityContent(team.responsibilityDocument.content), state.teams[0].observedClaims.map((claim) => claim.description));
  assert.notEqual(team.responsibilityDocument.revisionId, state.teams[0].responsibilityDocument.revisionId);
  assert.match(team.responsibilityDocument.updatedBy, /自动更新/);
  assert.ok(team.observedClaims.every((claim) => claim.reviewState === "accepted"));
  assert.ok(team.observedClaims.every((claim) => claim.changeHistory?.at(-1)?.actor.includes("自动更新")));
  assert.equal(team.observedClaims[0].changeHistory?.at(-1)?.previousText, before.teams[0].responsibilityDocument.content);
  assert.ok(team.observedClaims.every((claim) => claim.changeHistory?.at(-1)?.resultRevisionId));
  assert.equal(next.teams[1], state.teams[1], "其他团队保持原状");
  assert.equal(run(next), next, "重复执行不能重复添加正文或历史");
});

test("已开启的团队自动处理后续建议，关闭后停止", () => {
  const state = createState();
  state.teams[0].responsibilityAutoUpdate = true;
  const updated = run(state);
  updated.teams[0].observedClaims.push({ ...updated.teams[0].observedClaims[1], id: "later", description: "维护新的项目节奏。", reviewState: "active", changeHistory: [] });
  assert.match(run(updated).teams[0].responsibilityDocument.content, /维护新的项目节奏/);
  updated.teams[0].responsibilityAutoUpdate = false;
  assert.equal(run(updated), updated);
});

test("正在编辑的团队暂停更新，其他已开启团队照常更新，结束编辑后恢复", () => {
  const state = createState();
  state.teams[0].responsibilityAutoUpdate = true;
  state.teams[1].responsibilityAutoUpdate = true;
  const paused = run(state, state.teams[0].id);
  assert.equal(paused.teams[0], state.teams[0]);
  assert.notEqual(paused.teams[1].responsibilityDocument.content, state.teams[1].responsibilityDocument.content);
  assert.notEqual(run(paused).teams[0].responsibilityDocument.content, state.teams[0].responsibilityDocument.content);
});

test("正文冲突或无效建议保持待处理，已忽略和有异议的建议不被自动接受", () => {
  const state = createState();
  const team = state.teams[0];
  team.responsibilityAutoUpdate = true;
  team.responsibilityDocument.content = "本人已修正责任。";
  const add = team.observedClaims[1];
  team.observedClaims = [team.observedClaims[0],
    { ...add, id: "hidden", reviewState: "hidden" },
    { ...add, id: "disputed", reviewState: "disputed" },
    { ...add, id: "invalid", description: "非法\n换行" },
    { ...add, id: "no-proposal", proposal: undefined },
  ];
  assert.equal(run(state), state);
});

test("同批不同段落更新可以衔接，同一旧段落的冲突建议不会覆盖先前更新", () => {
  const state = createState();
  const team = state.teams[0];
  team.responsibilityAutoUpdate = true;
  team.responsibilityDocument.content = "第一项\n\n第二项";
  const claim = team.observedClaims[0];
  team.observedClaims = [0, 1, 0].map((paragraphIndex, index) => ({
    ...claim,
    id: `update-${index}`,
    description: `更新 ${index}`,
    proposal: { operation: "update", baseRevisionId: "旧版本", target: { paragraphIndex, expectedText: paragraphIndex ? "第二项" : "第一项" } },
  }));
  const next = run(state).teams[0];
  assert.equal(next.responsibilityDocument.content, "更新 0\n\n更新 1");
  assert.deepEqual(next.observedClaims.map((item) => item.reviewState), ["accepted", "accepted", "active"]);
});

test("重复新增只处理建议，不改正文版本", () => {
  const state = createState();
  const team = state.teams[0];
  team.responsibilityAutoUpdate = true;
  team.observedClaims = [{ ...team.observedClaims[1], description: team.responsibilityDocument.content }];
  const next = run(state).teams[0];
  assert.equal(next.responsibilityDocument, team.responsibilityDocument);
  assert.equal(next.observedClaims[0].reviewState, "accepted");
  assert.equal(next.observedClaims[0].changeHistory?.at(-1)?.resultRevisionId, team.responsibilityDocument.revisionId);
});

test("自动更新配置和正文一起持久化，刷新后恢复；存储失败不覆盖旧值", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  let fail = false;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (fail) throw new Error("quota"); values.set(key, value); },
  } });
  try {
    const state = createState();
    state.teams[0].responsibilityAutoUpdate = true;
    const next = run(state);
    assert.equal(savePersonalCenterState(next), true);
    const restored = loadPersonalCenterState();
    assert.equal(restored.teams[0].responsibilityAutoUpdate, true);
    assert.deepEqual(restored.teams[0].responsibilityDocument, next.teams[0].responsibilityDocument);
    const saved = values.get(personalCenterStorageKey);
    fail = true;
    next.teams[0].responsibilityAutoUpdate = false;
    assert.equal(savePersonalCenterState(next), false);
    assert.equal(values.get(personalCenterStorageKey), saved);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
