/** Browser-local prototype identity; not server authentication. */
export type WorkspaceSession = { userId: string; email: string; name: string; activeTeamId: string };
export const workspaceSessionKey = "agentdoor-workspace-session-v1";
export const onboardingStorageKey = "agentdoor-onboarding-design-preview-v3";
export const workspaceProfileKey = (userId: string) => `agentdoor-account-profile:${userId}`;

export function readWorkspaceSession(): WorkspaceSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(workspaceSessionKey) ?? "null");
    return value && [value.userId, value.email, value.name, value.activeTeamId].every(item => typeof item === "string" && item.trim()) ? value : null;
  } catch { return null; }
}

export function saveWorkspaceSession(session: WorkspaceSession) {
  sessionStorage.setItem(workspaceSessionKey, JSON.stringify(session));
}

export function currentWorkspaceUserId() {
  return readWorkspaceSession()?.userId ?? "周岚";
}

export function signOutWorkspace() {
  sessionStorage.removeItem(workspaceSessionKey);
  window.location.assign("/login");
}
