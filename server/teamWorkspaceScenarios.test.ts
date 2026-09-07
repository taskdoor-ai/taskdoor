import test from "node:test";
import assert from "node:assert/strict";
import {
  allTeamWorkspaceNodes,
  getTeamMembers,
  getTeamWorkspaceNodes,
  multiTeamTags,
  teamWorkspaceScenarios,
  validateTeamWorkspaceScenarios,
} from "../src/data/teamWorkspaceScenarios.ts";
import { getTaskEffortState } from "../src/lib/taskEffort.ts";
import { getWorkspaceEffortLeaves } from "../src/lib/taskEffortEditing.ts";
import { normalizeWorkspaceNodes, workspaceRootId, type TaskNode } from "../src/data/workspaceNodes.ts";
import { initialPersonalCenterState, isPersonalCenterState } from "../src/data/memberProfiles.ts";

const expectedLeafIds: Record<string, string[]> = {
  platform: ["platform-api-contract", "platform-ios-review", "platform-android-staged", "platform-observability-alerts", "platform-support-runbook", "platform-security-gate"],
  "supply-operations": ["factory-supplier-ppap", "factory-line-validation", "factory-quality-gate", "factory-operator-training", "factory-packaging-readiness", "factory-capacity-trial", "factory-label-rework"],
  "customer-success": ["service-traffic-mitigation", "service-data-repair", "service-customer-comms", "service-root-cause", "service-compensation-review", "service-runbook-update"],
};

test("four synthetic team scenarios are structurally valid and genuinely different", () => {
  const result = validateTeamWorkspaceScenarios();
  assert.deepEqual(result.issues, []);
  assert.equal(result.valid, true);
  assert.equal(teamWorkspaceScenarios.length, 4);
  assert.deepEqual(teamWorkspaceScenarios.map((scenario) => scenario.industry), ["内容电商", "企业 SaaS", "制造与供应链", "B2B 客户运营"]);
  for (const stat of result.stats) {
    assert.ok(stat.tasks >= 10, `${stat.teamId} should include a complex task set`);
    assert.ok(stat.members >= 8, `${stat.teamId} should have a credible cross-functional roster`);
    assert.ok(stat.maxDepth >= 1, `${stat.teamId} should include parent/child work`);
  }
  for (const stat of result.stats) assert.ok(stat.estimatedLeaves >= 30, `${stat.teamId} should include enough estimated leaf work`);
});

test("personal-center switcher exposes the same four team rosters", () => {
  assert.equal(isPersonalCenterState(initialPersonalCenterState), true);
  assert.deepEqual(initialPersonalCenterState.teams.map((team) => team.id), teamWorkspaceScenarios.map((scenario) => scenario.id));
  for (const scenario of teamWorkspaceScenarios) {
    const profile = initialPersonalCenterState.teams.find((team) => team.id === scenario.id)!;
    const activeMemberIds = profile.memberships.flatMap((membership) => membership.status === "active" && membership.memberId ? [membership.memberId] : []);
    assert.deepEqual(new Set(activeMemberIds), new Set(scenario.members.map((person) => person.id)));
    assert.match(profile.missingSources, /未覆盖|不含/u);
  }
});

test("team projections isolate nodes and return defensive copies", () => {
  const platform = getTeamWorkspaceNodes("platform");
  assert.equal(platform[0]?.id, workspaceRootId);
  assert.ok(platform.slice(1).every((node) => node.teamId === "platform"));
  assert.ok(!platform.some((node) => node.id.startsWith("factory-")));
  assert.ok(allTeamWorkspaceNodes.some((node) => node.id === "factory-pilot-ramp"));

  const firstTask = platform.find((node): node is TaskNode => node.kind === "task")!;
  firstTask.labels?.push("mutation-should-not-leak");
  const fresh = getTeamWorkspaceNodes("platform").find((node) => node.id === firstTask.id) as TaskNode;
  assert.ok(!fresh.labels?.includes("mutation-should-not-leak"));

  const members = getTeamMembers("customer-success");
  assert.equal(members[0]?.id, "周岚");
  members[0]!.currentWork?.push("mutation-should-not-leak");
  assert.ok(!getTeamMembers("customer-success")[0]?.currentWork?.includes("mutation-should-not-leak"));
  assert.deepEqual(getTeamMembers("unknown-team"), [], "an unknown team must not inherit another team's member data");
  assert.deepEqual(getTeamWorkspaceNodes("unknown-team").map((node) => node.id), [workspaceRootId]);
});

test("main task burn-up leaves use the agreed IDs and all carry current EWD estimates", () => {
  for (const scenario of teamWorkspaceScenarios.filter((item) => expectedLeafIds[item.id])) {
    const tasks = scenario.nodes.filter((node): node is TaskNode => node.kind === "task");
    const descendants = new Set<string>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const task of tasks) if (task.parentTaskId === scenario.mainTaskId || (task.parentTaskId && descendants.has(task.parentTaskId))) {
        if (!descendants.has(task.id)) { descendants.add(task.id); changed = true; }
      }
    }
    const parentIds = new Set(tasks.flatMap((task) => task.parentTaskId ? [task.parentTaskId] : []));
    const leaves = tasks.filter((task) => descendants.has(task.id) && !parentIds.has(task.id));
    assert.deepEqual(leaves.map((task) => task.id).sort(), [...expectedLeafIds[scenario.id]!].sort());
    assert.ok(leaves.every((task) => getTaskEffortState(getWorkspaceEffortLeaves(scenario.nodes, task.id)[0]!) === "proposed"));
    assert.ok(leaves.every((task) => task.effortEstimate?.basis === "mock" && task.effortEstimate.minutes! > 0));
  }
});

test("every Mock leaf, including waiting work, has a complete and valid inherited-scope estimate", () => {
  const tasks = allTeamWorkspaceNodes.filter((node): node is TaskNode => node.kind === "task");
  const parentIds = new Set(tasks.flatMap((task) => task.parentTaskId ? [task.parentTaskId] : []));
  const leaves = tasks.filter((task) => !parentIds.has(task.id));

  assert.equal(leaves.length, 159);
  assert.ok(leaves.some((task) => task.status === "待开始"));
  assert.ok(tasks.every((task) => task.completionCriteria?.length), "every synthetic task should define completion criteria");
  assert.ok(tasks.every((task) => task.executionTips?.length), "every synthetic task should define its execution boundary");
  for (const leaf of leaves) {
    const projected = getWorkspaceEffortLeaves(allTeamWorkspaceNodes, leaf.id);
    assert.equal(projected.length, 1, `${leaf.id} should project as one leaf`);
    assert.ok(leaf.completionCriteria?.length, `${leaf.id} should define completion criteria`);
    assert.ok(leaf.executionTips?.length, `${leaf.id} should define a work method boundary`);
    assert.equal(leaf.effortEstimate?.basis, "mock", `${leaf.id} should explicitly mark fixture effort as Mock`);
    assert.equal(getTaskEffortState(projected[0]!), "proposed", `${leaf.id} should stay valid under inherited task scope`);
  }

  const waitingLeaves = leaves.filter((task) => task.status === "待开始");
  assert.equal(waitingLeaves.length, 82);
  assert.ok(waitingLeaves.every((task) => getTaskEffortState(getWorkspaceEffortLeaves(allTeamWorkspaceNodes, task.id)[0]!) === "proposed"));
  assert.ok(tasks.filter((task) => parentIds.has(task.id)).every((task) => task.effortEstimate === undefined), "parent tasks aggregate leaves instead of double-counting direct effort");
});

test("labels, members, dependency edges and normalized team scope stay internally consistent", () => {
  const knownLabels = new Set(multiTeamTags.map((definition) => definition.name));
  assert.equal(knownLabels.size, multiTeamTags.length, "tag names should be globally unique");
  for (const scenario of teamWorkspaceScenarios) {
    const tasks = scenario.nodes.filter((node): node is TaskNode => node.kind === "task");
    const taskIds = new Set(tasks.map((task) => task.id));
    const memberIds = new Set(scenario.members.map((person) => person.id));
    for (const task of tasks) {
      assert.ok(memberIds.has(task.ownerId), `${task.id} owner should belong to ${scenario.id}`);
      assert.ok(task.participantIds?.every((id) => memberIds.has(id)) ?? true);
      assert.ok(task.dependsOnTaskIds?.every((id) => taskIds.has(id) && id !== task.id) ?? true);
      assert.ok(task.labels?.every((label) => knownLabels.has(label)) ?? true);
    }
  }

  const normalized = normalizeWorkspaceNodes(getTeamWorkspaceNodes("platform"));
  assert.equal(normalized.find((node) => node.id === workspaceRootId)?.teamId, "__all__");
  assert.ok(normalized.filter((node) => node.id !== workspaceRootId).every((node) => node.teamId === "platform"));
});
