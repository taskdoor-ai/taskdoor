export type NotificationPreferences = { onlyRelated: boolean; email: boolean; browser: boolean };

export const DEFAULT_NOTIFICATION_PREFERENCES: Readonly<NotificationPreferences> = { onlyRelated: true, email: false, browser: false };
export const NOTIFICATION_PREFERENCES_CHANGED_EVENT = "taskdoor-notification-preferences-changed";

export function notificationPreferencesKey(userId: string): string {
  if (!userId.trim()) throw new Error("Notification preferences require a user");
  return `agentdoor:notification-preferences:v1:${encodeURIComponent(userId)}`;
}

export function readNotificationPreferences(
  storage: Pick<Storage, "getItem">,
  userId: string,
): NotificationPreferences {
  const raw = storage.getItem(notificationPreferencesKey(userId));
  if (raw === null) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid notification preferences");
  const saved = value as Record<string, unknown>;
  if (saved.version !== 1 || typeof saved.onlyRelated !== "boolean") throw new Error("Invalid notification preferences");
  for (const key of ["email", "browser"] as const) {
    if (saved[key] !== undefined && typeof saved[key] !== "boolean") throw new Error("Invalid notification preferences");
  }
  return {
    onlyRelated: saved.onlyRelated,
    email: saved.email === true,
    browser: saved.browser === true,
  };
}

/** Persists first; only a successful save announces this account's change in the current window. */
export function saveNotificationPreferences(
  storage: Pick<Storage, "setItem">,
  userId: string,
  preferences: NotificationPreferences,
): void {
  for (const key of ["onlyRelated", "email", "browser"] as const) {
    if (typeof preferences[key] !== "boolean") throw new Error("Invalid notification preferences");
  }
  storage.setItem(notificationPreferencesKey(userId), JSON.stringify({ version: 1, ...preferences }));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_PREFERENCES_CHANGED_EVENT, { detail: { userId } }));
  }
}
