import assert from "node:assert/strict";
import test from "node:test";
import { initialPersonalCenterState, isPersonalCenterState, loadPersonalCenterState, loadPersonalCenterDirectory, savePersonalCenterState, savePersonalCenterDirectory } from "../src/data/memberProfiles.ts";
import { getTeamWorkspaceNodes } from "../src/data/teamWorkspaceScenarios.ts";
import { createOnboardingPreview, transitionOnboarding } from "../src/lib/onboardingPreview.ts";
import { enterOnboardingWorkspace, prepareOnboardingWorkspace } from "../src/lib/onboardingWorkspace.ts";
import { readWorkspaceSession, workspaceSessionKey } from "../src/lib/workspaceSession.ts";
import { commitManualWorkspaceTask } from "../src/lib/workspaceTaskCreation.ts";

const register = (email = "new-owner@example.com", inviteToken = "") => {
  const pending = transitionOnboarding(createOnboardingPreview("new", inviteToken), { type: "register", email, name: "新成员", passwordDigest: "a".repeat(64), passwordLength: 10, now: 1000 });
  return transitionOnboarding(pending, { type: "verify-code", code: "111111", now: 2000 });
};

test("创建团队衔接工作区：新成员是管理员，任务为空且演示团队保留", () => {
  const created = transitionOnboarding(register(), { type: "create-team", name: "新的设计团队" });
  const result = prepareOnboardingWorkspace(created, initialPersonalCenterState);
  assert.equal(result.session.activeTeamId, created.activeTeamId);
  const team = result.directory.teams.find(team => team.id === created.activeTeamId)!;
  assert.equal(team.name, "新的设计团队");
  assert.deepEqual(team.memberships.map(member => [member.memberId, member.role, member.status]), [[result.session.userId, "admin", "active"]]);
  assert.equal(getTeamWorkspaceNodes(team.id).filter(node => node.kind === "task").length, 0);
  assert.equal(result.directory.teams.length, initialPersonalCenterState.teams.length + 1);
  assert.ok(isPersonalCenterState(result.directory));
  const again = prepareOnboardingWorkspace(created, result.directory);
  assert.equal(again.directory.teams.length, result.directory.teams.length);
  assert.equal(again.session.userId, result.session.userId);
});

test("通用邀请加入对应团队，不创建同名团队，不成为管理员", () => {
  const target = initialPersonalCenterState.teams[0];
  const checked = register("invited-user@example.com", target.inviteToken);
  assert.throws(() => prepareOnboardingWorkspace(checked, initialPersonalCenterState), /团队/);
  const joined = transitionOnboarding(checked, { type: "accept-invite" }, initialPersonalCenterState);
  const result = prepareOnboardingWorkspace(joined, initialPersonalCenterState);
  assert.equal(result.session.activeTeamId, target.id);
  assert.equal(result.directory.teams.length, initialPersonalCenterState.teams.length);
  const membership = result.directory.teams[0].memberships.find(member => member.email === joined.email)!;
  assert.equal(membership.role, "member");
  assert.equal(membership.status, "active");
  assert.equal(membership.memberId, result.session.userId);
  assert.ok(isPersonalCenterState(result.directory));
});

test("工作区按当前账号加载，保存和退出不会覆盖其他账号与团队", () => {
  const originalLocal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const originalSession = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const memoryStorage = () => {
    const values = new Map<string, string>();
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: memoryStorage() });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: memoryStorage() });
  try {
    savePersonalCenterDirectory(initialPersonalCenterState);
    const owner = transitionOnboarding(register(), { type: "create-team", name: "独立团队" });
    enterOnboardingWorkspace(owner);
    const session = readWorkspaceSession()!;
    const task = commitManualWorkspaceTask(localStorage, [], { teamId: session.activeTeamId, currentUserId: session.userId });
    assert.equal(task.createdNodes[0].teamId, owner.activeTeamId);
    assert.equal(task.createdNodes[0].createdBy, session.userId);
    const own = loadPersonalCenterState();
    assert.equal(own.profile.email, owner.email);
    assert.deepEqual(own.teams.map(team => team.id), [owner.activeTeamId]);
    assert.ok(savePersonalCenterState({ ...own, profile: { ...own.profile, name: "修改后的姓名" } }));
    assert.equal(loadPersonalCenterState().profile.name, "修改后的姓名");
    assert.equal(loadPersonalCenterDirectory().profile.name, initialPersonalCenterState.profile.name);
    assert.equal(loadPersonalCenterDirectory().teams.length, initialPersonalCenterState.teams.length + 1);
    sessionStorage.removeItem(workspaceSessionKey);
    assert.equal(loadPersonalCenterState().profile.name, initialPersonalCenterState.profile.name);
    sessionStorage.setItem(workspaceSessionKey, JSON.stringify(session));
    assert.equal(loadPersonalCenterState().teams[0].name, "独立团队");
    enterOnboardingWorkspace(owner);
    assert.deepEqual(JSON.parse(localStorage.getItem("agentdoor-workspace-nodes")!), task.nodes, "重新进入工作区保留用户已创建的任务");
  } finally {
    if (originalLocal) Object.defineProperty(globalThis, "localStorage", originalLocal); else Reflect.deleteProperty(globalThis, "localStorage");
    if (originalSession) Object.defineProperty(globalThis, "sessionStorage", originalSession); else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
