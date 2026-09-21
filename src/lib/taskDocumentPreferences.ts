export const taskDocumentPreferenceKey = (userId: string, teamId: string, taskId: string) =>
  `agentdoor-task-document-collapsed-v1:${encodeURIComponent(JSON.stringify([userId, teamId, taskId]))}`;

export function readTaskDocumentCollapsed(key: string): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

export function saveTaskDocumentCollapsed(key: string, collapsed: boolean): void {
  try {
    window.localStorage.setItem(key, String(collapsed));
  } catch {
    // A blocked preference store must not prevent opening or closing the panel.
  }
}
