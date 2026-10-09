/**
 * The team's tasks as the Owner and administrators govern them (W3-015), shaped as the production
 * app reads them: metadata only -- how many, how still, whose -- never what a task says. The PM
 * demo answers from its own data and keeps every action inside the settings page.
 */
export type GovernanceTask = {
  id: string;
  title: string;
  /** The task's status as the demo stores it. */
  status: string;
  ownership: 'OWNED' | 'UNOWNED';
  ownerMemberId?: string | null;
  ownerClearedReason?: 'CLAIM_POOL' | 'MEMBER_EXIT' | null;
  subtreeSize: number;
  createdAt: string;
  lastActivityAt: string;
  deletedAt?: string | null;
};
export type GovernanceSummary = { total: number; unowned: number; stale: number };
export type GovernanceOutcome = { taskId: string; outcome: 'APPLIED' | 'ALREADY' | 'NOT_FOUND' | 'REFUSED'; refusalCode?: string | null };

export const governanceViews = ['all', 'inactive', 'claimPool', 'memberExit', 'trash'] as const;
export type GovernanceView = (typeof governanceViews)[number];
/** Still for this long counts as inactive; for longer than the second, stale. */
export const INACTIVE_DAYS = 30;
export const STALE_DAYS = 90;
export const MAX_GOVERNANCE_REASON = 1000;
const DAY_MS = 86400000;

/** The rows a view shows, as of `now`: the trash view only the deleted, the others none of them. */
export function rowsOf(view: GovernanceView, rows: readonly GovernanceTask[], now: number) {
  return rows.filter((row) => {
    if (view === 'trash') return Boolean(row.deletedAt);
    if (row.deletedAt) return false;
    if (view === 'inactive') return now - Date.parse(row.lastActivityAt) >= INACTIVE_DAYS * DAY_MS;
    if (view === 'claimPool') return row.ownerClearedReason === 'CLAIM_POOL';
    if (view === 'memberExit') return row.ownerClearedReason === 'MEMBER_EXIT';
    return true;
  });
}

export function summarize(rows: readonly GovernanceTask[], now: number): GovernanceSummary {
  const live = rows.filter((row) => !row.deletedAt);
  return {
    total: live.length,
    unowned: live.filter((row) => row.ownership === 'UNOWNED').length,
    stale: live.filter((row) => now - Date.parse(row.lastActivityAt) >= STALE_DAYS * DAY_MS).length,
  };
}

/** Archives the chosen rows, one outcome each: a row already archived is not a failure. */
export function archiveRows(rows: readonly GovernanceTask[], ids: readonly string[], archived: ReadonlySet<string>): GovernanceOutcome[] {
  return ids.map((taskId) => {
    const row = rows.find((item) => item.id === taskId);
    if (!row) return { taskId, outcome: 'NOT_FOUND' };
    if (row.deletedAt) return { taskId, outcome: 'REFUSED', refusalCode: 'TASK_DELETED' };
    return { taskId, outcome: archived.has(taskId) ? 'ALREADY' : 'APPLIED' };
  });
}

export function tallyOutcomes(outcomes: readonly GovernanceOutcome[]) {
  return {
    applied: outcomes.filter((item) => item.outcome === 'APPLIED').length,
    already: outcomes.filter((item) => item.outcome === 'ALREADY').length,
    failed: outcomes.filter((item) => item.outcome === 'NOT_FOUND' || item.outcome === 'REFUSED'),
  };
}

/** Why a task was not archived: a known code in words, any other as "refused" with its code. */
export function outcomeLine(outcome: GovernanceOutcome): { key: 'governance.outcome.NOT_FOUND' | 'governance.outcome.REFUSED' | 'governance.refused.TASK_DELETED'; code?: string } {
  if (outcome.outcome === 'NOT_FOUND') return { key: 'governance.outcome.NOT_FOUND' };
  if (outcome.refusalCode === 'TASK_DELETED') return { key: 'governance.refused.TASK_DELETED' };
  return { key: 'governance.outcome.REFUSED', code: outcome.refusalCode ?? '' };
}

/** `taskId` is set when the event came from one task (its comments and files included); `taskTitle` only while that task can still be opened. */
export type AuditEvent = { id: string; actorId: string; actorType: 'MEMBER' | 'SYSTEM'; action: string; occurredAt: string; taskId?: string | null; taskTitle?: string };

/** Every audit action the production contract names, as values for the filter. */
export const auditActions = [
  'member.role-changed.v1', 'member.removed.v1', 'member.joined.v1', 'member.status-changed.v1', 'member.merged.v1',
  'invitation.created.v1', 'invitation.resent.v1', 'invitation.rejected.v1', 'invitation.revoked.v1', 'invitation.awaiting.approval.v1',
  'workspace.ownership-transferred.v1', 'workspace.deleted.v1', 'workspace.restored.v1', 'workspace.deletion-notified.v1', 'workspace.purged.v1',
  'credential.created.v1', 'credential.deleted.v1', 'credential.first-used.v1', 'credential.revoked.v1',
  'task.created.v1', 'task.updated.v1', 'task.status-changed.v1', 'task.moved.v1', 'task.owner-changed.v1', 'task.member-added.v1',
  'task.member-removed.v1', 'task.comment-created.v1', 'task.criterion-confirmed.v1', 'task.criterion-unconfirmed.v1',
  'task.comment-mentioned.v1', 'task.comment-thread-changed.v1', 'task.assigned.v1', 'task.owner-cleared.v1', 'task.deleted.v1',
  'task.restored.v1', 'task.access-lost.v1', 'task.access-gained.v1', 'task.purged.v1',
  'governance.read.v1', 'governance.bulk-archived.v1', 'governance.owner-set.v1', 'governance.restored.v1', 'governance.access-granted.v1',
  'file.node-created.v1', 'file.node-moved.v1', 'file.node-deleted.v1', 'file.version-created.v1', 'file.draft-conflicted.v1',
  'file.draft-committed.v1', 'preview.queued.v1', 'download.queued.v1',
] as const;
export type AuditAction = (typeof auditActions)[number];
export const isAuditAction = (action: string): action is AuditAction => (auditActions as readonly string[]).includes(action);
/** The governance writes, the "Governance actions" filter; `governance.read.v1` is a read. */
export const governanceWrites: readonly AuditAction[] = ['governance.bulk-archived.v1', 'governance.owner-set.v1', 'governance.restored.v1', 'governance.access-granted.v1'];
export const isGovernanceAction = (action: string) => action.startsWith('governance.');

/** Filters events as the production service does: by who, and by one action or the governance writes. */
export function filterAuditEvents(events: readonly AuditEvent[], filter: { actorId?: string; actions?: readonly string[] }) {
  return events.filter((event) => (!filter.actorId || event.actorId === filter.actorId) && (!filter.actions || filter.actions.includes(event.action)));
}
