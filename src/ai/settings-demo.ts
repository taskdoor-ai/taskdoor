import { getTeamWorkspaceScenario } from "@/ai/mock/data/teamWorkspaceScenarios";
import { mockTaskField } from "@/ai/mock/i18n/mockContent";
import type { TeamResponsibilityProfile } from "@/ai/mock/data/memberProfiles";
import type { PersonalAccessToken } from "@/features/credentials/lib/pat";
import type { AuditEvent, GovernanceTask } from "@/features/members/governance/lib/governance";
import type { RecycledTask } from "@/features/tasks/lib/task-recycle-bin";
import type { Locale } from "@/shared/i18n/core";
import type { TaskNode, WorkspaceNode } from "@/shared/model/task-model";

/**
 * The demo's stand-in for the production settings APIs (access tokens, team tasks, audit log).
 * It reads the demo's own tasks and recycle bin and answers in the production shapes; nothing it
 * returns is ever written back.
 */
const DAY_MS = 86400000;
const tasksOf = (nodes: readonly WorkspaceNode[], teamId: string) => nodes.filter((node): node is TaskNode => node.kind === "task" && node.teamId === teamId);
const hash = (value: string) => [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);

/** The instant the team's demo world stands at. */
export function demoAsOf(teamId: string) {
  return getTeamWorkspaceScenario(teamId)?.asOf ?? new Date().toISOString();
}

/** A task's last activity as an instant: its "updated" text read against the team's as-of time. */
function lastActivity(task: TaskNode, asOf: number) {
  const text = task.updatedAt ?? "";
  const ago = text.match(/^(\d+)\s*(分钟|小时|天)前$/);
  if (text === "刚刚" || text === "今天") return asOf;
  if (text === "昨天") return asOf - DAY_MS;
  if (ago) return asOf - Number(ago[1]) * (ago[2] === "分钟" ? 60000 : ago[2] === "小时" ? 3600000 : DAY_MS);
  const day = text.match(/^(\d+)\s*月\s*(\d+)\s*日$/);
  if (day) return new Date(new Date(asOf).getFullYear(), Number(day[1]) - 1, Number(day[2]), 10).getTime();
  const created = Date.parse(task.createdAt ?? "");
  if (Number.isFinite(created)) return created;
  // No date in the demo data: a steady spread over the last four months.
  return asOf - (hash(task.id) % 120) * DAY_MS;
}

/** The team's top-level tasks and recycle bin branches as governance rows. */
export function demoGovernanceTasks({ team, nodes, recycleBin, locale }: { team: TeamResponsibilityProfile; nodes: readonly WorkspaceNode[]; recycleBin: readonly RecycledTask[]; locale: Locale }) {
  const asOf = Date.parse(demoAsOf(team.id));
  const tasks = tasksOf(nodes, team.id);
  const members = new Set(team.memberships.filter((m) => m.status === "active" && m.memberId).map((m) => m.memberId!));
  const childrenOf = new Map<string, TaskNode[]>();
  for (const task of tasks) if (task.parentTaskId) childrenOf.set(task.parentTaskId, [...(childrenOf.get(task.parentTaskId) ?? []), task]);
  const size = (task: TaskNode): number => 1 + (childrenOf.get(task.id) ?? []).reduce((sum, child) => sum + size(child), 0);
  const title = (task: TaskNode) => mockTaskField(locale, task.id, "title", task.name);
  const rows: GovernanceTask[] = tasks.filter((task) => !task.parentTaskId || !tasks.some((other) => other.id === task.parentTaskId)).map((task) => {
    const owned = Boolean(task.ownerId) && members.has(task.ownerId);
    const at = lastActivity(task, asOf);
    return {
      id: task.id, title: title(task), status: task.status,
      ownership: owned ? "OWNED" : "UNOWNED",
      ownerMemberId: owned ? task.ownerId : null,
      ownerClearedReason: owned ? null : task.ownerId ? "MEMBER_EXIT" : "CLAIM_POOL",
      subtreeSize: size(task),
      createdAt: new Date(Math.min(at, Date.parse(task.createdAt ?? "") || at)).toISOString(),
      lastActivityAt: new Date(at).toISOString(),
    };
  });
  for (const entry of recycleBin.filter((item) => item.teamId === team.id)) {
    const root = entry.tasks.find((task) => !entry.tasks.some((other) => other.id === task.parentTaskId)) ?? entry.tasks[0];
    rows.push({
      id: root.id, title: title(root), status: root.status, ownership: root.ownerId ? "OWNED" : "UNOWNED", ownerMemberId: root.ownerId || null,
      subtreeSize: entry.tasks.length, createdAt: new Date(entry.deletedAt).toISOString(), lastActivityAt: new Date(entry.deletedAt).toISOString(),
      deletedAt: new Date(entry.deletedAt).toISOString(),
    });
  }
  return { rows, asOf: new Date(asOf).toISOString() };
}

/** What happened in the team lately, in the audit log's words: who did what, newest first. */
export function demoAuditEvents(team: TeamResponsibilityProfile, nodes: readonly WorkspaceNode[], locale: Locale): AuditEvent[] {
  const asOf = Date.parse(demoAsOf(team.id));
  const active = team.memberships.filter((m) => m.status === "active" && m.memberId);
  const owner = active.find((m) => m.role === "owner") ?? active[0];
  const admin = active.find((m) => m.role === "admin") ?? owner;
  const others = active.filter((m) => m !== owner);
  const person = (index: number) => (others[index % Math.max(others.length, 1)] ?? owner)?.memberId ?? "";
  const plan: Array<[string, string | null, number]> = [
    ["task.status-changed.v1", person(0), 0.02], ["task.comment-created.v1", person(1), 0.05], ["file.version-created.v1", person(2), 0.1],
    ["governance.read.v1", owner?.memberId ?? null, 0.2], ["governance.owner-set.v1", owner?.memberId ?? null, 0.21], ["task.criterion-confirmed.v1", person(3), 0.4],
    ["task.created.v1", person(1), 0.8], ["task.assigned.v1", person(0), 0.82], ["credential.created.v1", owner?.memberId ?? null, 1.1],
    ["credential.first-used.v1", owner?.memberId ?? null, 1.12], ["task.member-added.v1", person(4), 1.5], ["governance.bulk-archived.v1", admin?.memberId ?? null, 2],
    ["task.deleted.v1", person(2), 2.4], ["invitation.created.v1", admin?.memberId ?? null, 3], ["member.joined.v1", person(5), 3.2],
    ["member.role-changed.v1", owner?.memberId ?? null, 4], ["task.owner-cleared.v1", null, 5], ["governance.access-granted.v1", admin?.memberId ?? null, 6],
    ["task.restored.v1", person(2), 7], ["file.node-created.v1", person(3), 8], ["task.updated.v1", person(4), 9], ["task.purged.v1", null, 30],
  ];
  // Events about one task point at one of the team's tasks; a purged one points at a task that is gone.
  const tasks = tasksOf(nodes, team.id);
  const aboutOneTask = (action: string) => /^(task|file)\./.test(action) || ["governance.owner-set.v1", "governance.access-granted.v1", "governance.restored.v1"].includes(action);
  return plan.map(([action, actorId, days], index) => {
    const task = action === "task.purged.v1" ? undefined : tasks[(index * 7) % Math.max(tasks.length, 1)];
    return {
      id: `${team.id}:audit:${index}`, action, actorId: actorId ?? "system", actorType: actorId ? "MEMBER" : "SYSTEM",
      occurredAt: new Date(asOf - days * DAY_MS).toISOString(),
      ...(aboutOneTask(action) ? { taskId: task?.id ?? `${team.id}:purged-task`, ...(task ? { taskTitle: mockTaskField(locale, task.id, "title", task.name) } : {}) } : {}),
    };
  });
}

/** The demo account's tokens: one for every team, one for two tasks of one team, one expired. */
export function demoAccessTokens(nodes: readonly WorkspaceNode[]): PersonalAccessToken[] {
  const now = Date.now();
  const at = (days: number) => new Date(now + days * DAY_MS).toISOString();
  const named = tasksOf(nodes, "creator-commerce").filter((task) => !task.parentTaskId).slice(0, 2).map((task) => task.id);
  return [
    { id: "demo-token-local-agent", name: "Claude Code · MacBook", workspaces: { mode: "ALL", workspaceIds: [] }, taskWorkspaceId: null, taskIds: [], scopes: ["tasks:read", "tasks:write", "comments:write", "files:read"], status: "ACTIVE", createdAt: at(-21), expiresAt: at(69), lastUsedAt: at(-0.1) },
    { id: "demo-token-weekly-report", name: "周报导出脚本", workspaces: { mode: "LISTED", workspaceIds: ["creator-commerce"] }, taskWorkspaceId: named.length ? "creator-commerce" : null, taskIds: named, scopes: ["tasks:read", "files:read"], status: "ACTIVE", createdAt: at(-40), expiresAt: at(140), lastUsedAt: at(-3) },
    { id: "demo-token-old-ci", name: "CI · release checks", workspaces: { mode: "LISTED", workspaceIds: ["platform"] }, taskWorkspaceId: null, taskIds: [], scopes: ["tasks:read", "audit:read"], status: "EXPIRED", createdAt: at(-200), expiresAt: at(-10), lastUsedAt: null },
  ];
}

/** The tasks a token may be limited to in one team, titled in the viewer's language. */
export function demoTokenTasks(nodes: readonly WorkspaceNode[], teamId: string, locale: Locale) {
  return tasksOf(nodes, teamId).map((task) => ({ id: task.id, title: mockTaskField(locale, task.id, "title", task.name) }));
}
