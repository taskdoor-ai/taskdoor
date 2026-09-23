import { restoreOnboardingPreview, transitionOnboarding } from "./onboardingPreview";
/** Browser-local prototype identity; not server authentication. */
export type WorkspaceSession = { userId: string; email: string; name: string; activeTeamId: string };
export const workspaceSignedOutKey = "agentdoor-workspace-signed-out";
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
  sessionStorage.removeItem(workspaceSignedOutKey);
}

export function currentWorkspaceUserId() {
  return readWorkspaceSession()?.userId ?? "周岚";
}

export function signOutWorkspace() {
  sessionStorage.removeItem(workspaceSessionKey);
  const saved = restoreOnboardingPreview(sessionStorage.getItem(onboardingStorageKey));
  if (saved) {
    const signedOut = transitionOnboarding(saved, { type: "switch-account" });
    sessionStorage.setItem(onboardingStorageKey, JSON.stringify({ ...signedOut, inviteToken: "" }));
  }
  sessionStorage.setItem(workspaceSignedOutKey, "1");
  window.location.assign("/login");
}

export function hasExplicitlySignedOut() {
  try { return !readWorkspaceSession() && sessionStorage.getItem(workspaceSignedOutKey) === "1"; }
  catch { return false; }
}
