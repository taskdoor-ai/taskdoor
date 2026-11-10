export type NotificationAudience = "direct" | "activity";

type NotificationScopeItem = { kind: string; audience?: NotificationAudience };
const fileEventKinds = new Set(["file-added", "file-version-added", "file-deleted"]);

// Relationship events must be tagged for this recipient, rather than inferred from their wording.
export function isRelatedNotification(item: NotificationScopeItem): boolean {
  if (fileEventKinds.has(item.kind)) return false;
  if (item.audience) return item.audience === "direct";
  return ["mention", "reply", "invitation", "handoff", "like"].includes(item.kind);
}

export function notificationsInScope<T extends NotificationScopeItem>(items: readonly T[], onlyRelated: boolean): T[] {
  // File changes remain activity records, regardless of notification scope or recipient role.
  return items.filter(item => !fileEventKinds.has(item.kind) && (!onlyRelated || isRelatedNotification(item)));
}
