import assert from "node:assert/strict";
import test from "node:test";
import { initialPersonalCenterState } from "../src/ai/mock/data/memberProfiles";
import { allTeamWorkspaceNodes } from "../src/ai/mock/data/teamWorkspaceScenarios";
import { demoAccessTokens, demoAuditEvents, demoGovernanceTasks, demoTokenTasks } from "../src/ai/settings-demo";
import { archiveRows, filterAuditEvents, governanceWrites, rowsOf, summarize, tallyOutcomes, type GovernanceTask } from "../src/features/members/governance/lib/governance";
import { dayFromToday, demoTokenSecret, expiryOf } from "../src/features/credentials/lib/pat";

const now = Date.parse("2026-09-02T10:00:00+08:00");
const row = (id: string, extra: Partial<GovernanceTask> = {}): GovernanceTask => ({ id, title: id, status: "进行中", ownership: "OWNED", ownerMemberId: "陈默", subtreeSize: 1, createdAt: "2026-08-01T00:00:00Z", lastActivityAt: "2026-09-01T00:00:00Z", ...extra });

test("governance views split live, inactive, unowned and deleted rows", () => {
  const rows = [row("fresh"), row("still", { lastActivityAt: "2026-07-01T00:00:00Z" }), row("pool", { ownership: "UNOWNED", ownerMemberId: null, ownerClearedReason: "CLAIM_POOL" }), row("left", { ownership: "UNOWNED", ownerClearedReason: "MEMBER_EXIT" }), row("gone", { deletedAt: "2026-08-30T00:00:00Z" })];
  assert.deepEqual(rowsOf("all", rows, now).map(r => r.id), ["fresh", "still", "pool", "left"]);
  assert.deepEqual(rowsOf("inactive", rows, now).map(r => r.id), ["still"]);
  assert.deepEqual(rowsOf("claimPool", rows, now).map(r => r.id), ["pool"]);
  assert.deepEqual(rowsOf("memberExit", rows, now).map(r => r.id), ["left"]);
  assert.deepEqual(rowsOf("trash", rows, now).map(r => r.id), ["gone"]);
  assert.deepEqual(summarize(rows, now), { total: 4, unowned: 2, stale: 0 });
});

test("bulk archive reports applied, already archived and refused rows", () => {
  const rows = [row("a"), row("b"), row("gone", { deletedAt: "2026-08-30T00:00:00Z" })];
  const tally = tallyOutcomes(archiveRows(rows, ["a", "b", "gone", "missing"], new Set(["b"])));
  assert.equal(tally.applied, 1);
  assert.equal(tally.already, 1);
  assert.deepEqual(tally.failed.map(f => [f.taskId, f.outcome, f.refusalCode ?? null]), [["gone", "REFUSED", "TASK_DELETED"], ["missing", "NOT_FOUND", null]]);
});

test("demo team tasks come from the team's top-level tasks with subtree sizes and real owners", () => {
  const team = initialPersonalCenterState.teams.find(t => t.id === "creator-commerce")!;
  const { rows, asOf } = demoGovernanceTasks({ team, nodes: allTeamWorkspaceNodes, recycleBin: [], locale: "zh-CN" });
  assert.ok(rows.length > 0);
  assert.ok(rows.every(r => !r.deletedAt && Number.isFinite(Date.parse(r.lastActivityAt))));
  assert.ok(rows.some(r => r.subtreeSize > 1));
  const members = new Set(team.memberships.map(m => m.memberId));
  assert.ok(rows.filter(r => r.ownership === "OWNED").every(r => members.has(r.ownerMemberId!)));
  assert.ok(rowsOf("inactive", rows, Date.parse(asOf)).length < rows.length);
});

test("demo audit events and tokens are well formed", () => {
  const team = initialPersonalCenterState.teams.find(t => t.id === "platform")!;
  const events = demoAuditEvents(team, allTeamWorkspaceNodes, "en");
  const tasks = new Set(allTeamWorkspaceNodes.filter(n => n.kind === "task" && n.teamId === team.id).map(n => n.id));
  assert.ok(events.filter(e => /^(task|file)\./.test(e.action)).every(e => e.taskId));
  assert.ok(events.filter(e => /^(member|invitation|credential)\./.test(e.action) || e.action === "governance.bulk-archived.v1").every(e => !e.taskId));
  assert.ok(events.filter(e => e.taskTitle).every(e => tasks.has(e.taskId!)));
  assert.equal(events.find(e => e.action === "task.purged.v1")?.taskTitle, undefined);
  assert.ok(events.length > 10);
  assert.ok(filterAuditEvents(events, { actions: governanceWrites }).every(e => e.action.startsWith("governance.") && e.action !== "governance.read.v1"));
  assert.ok(events.some(e => e.actorType === "SYSTEM"));
  const tokens = demoAccessTokens(allTeamWorkspaceNodes);
  const titled = demoTokenTasks(allTeamWorkspaceNodes, "creator-commerce", "en");
  assert.ok(tokens.find(t => t.taskIds.length)!.taskIds.every(id => titled.some(task => task.id === id)));
  assert.match(demoTokenSecret(), /^tdp_[A-Za-z0-9]{40}$/);
  assert.equal(new Date(expiryOf(dayFromToday(1))).getHours(), 23);
});
