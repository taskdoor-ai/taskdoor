import { countCreatedTeams, MAX_CREATED_TEAMS, MAX_TEAM_MEMBERS, occupiedTeamSeats } from "./teamLimits";
import { mockWorkspaceEmail, mockWorkspaceUserId } from "./mockWorkspaceAccount";
import { loadPersonalCenterDirectory, savePersonalCenterDirectory, type PersonalCenterState, type TeamMembership, type TeamResponsibilityProfile } from "../data/memberProfiles";
import type { OnboardingState } from "./onboardingPreview";
import { onboardingStorageKey, saveWorkspaceSession, type WorkspaceSession } from "./workspaceSession";

export function prepareOnboardingWorkspace(state: OnboardingState, directory: PersonalCenterState) {
  if (!state.verified || state.step !== "workspace" || !state.teams.some(team => team.id === state.activeTeamId)) throw new Error("请先创建或确认加入团队。");
  const existingMember = directory.teams.flatMap(team => team.memberships).find(member => member.email.toLowerCase() === state.email);
  const userId = state.email === mockWorkspaceEmail ? mockWorkspaceUserId : existingMember?.memberId ?? `preview-user:${state.email}`;
  const session: WorkspaceSession = { userId, email: state.email, name: state.name, activeTeamId: state.activeTeamId };
  const teams = [...directory.teams];
  for (const preview of state.teams) {
    const index = teams.findIndex(team => team.id === preview.id);
    const existing = teams[index];
    const member = existing?.memberships.find(item => item.email.toLowerCase() === state.email || (state.email === mockWorkspaceEmail && item.memberId === mockWorkspaceUserId));
    if (!existing && preview.role === "admin" && countCreatedTeams(teams, session) >= MAX_CREATED_TEAMS) throw new Error(`最多可创建 ${MAX_CREATED_TEAMS} 个团队`);
    if (existing && !member && occupiedTeamSeats(existing) >= MAX_TEAM_MEMBERS) throw new Error("团队人数已达 50 人上限");
    const membership: TeamMembership = { ...member, id: member?.id ?? `${preview.id}:${userId}`, memberId: userId, email: state.email, name: state.name, role: member?.role ?? preview.role, status: "active", responsibility: member?.responsibility ?? "" };
    const team: TeamResponsibilityProfile = existing ? {
      ...existing,
      memberships: member ? existing.memberships.map(item => item.id === member.id ? membership : item) : [...existing.memberships, membership],
    } : {
      createdBy: preview.role === "admin" ? userId : undefined,
      id: preview.id, name: preview.name, role: preview.role === "admin" ? "管理员" : "成员",
      coverage: "尚未填写", missingSources: "暂无任务资料", lastSyncedAt: "刚刚", inviteToken: crypto.randomUUID(),
      memberships: preview.role === "admin" ? [membership] : [
        { id: `${preview.id}:owner`, memberId: `${preview.id}:owner`, name: "周岚", email: `owner-${preview.id}@agentdoor.local`, role: "admin", status: "active" }, membership,
      ],
      responsibilityDocument: { content: "", updatedAt: new Date().toISOString(), updatedBy: state.name, revisionId: crypto.randomUUID() }, observedClaims: [],
    };
    if (index < 0) teams.push(team); else teams[index] = team;
  }
  return { directory: { ...directory, teams }, session };
}

export function enterOnboardingWorkspace(state: OnboardingState) {
  const result = prepareOnboardingWorkspace(state, loadPersonalCenterDirectory());
  if (!savePersonalCenterDirectory(result.directory)) throw new Error("团队未能保存，请检查浏览器存储后重试。");
  sessionStorage.setItem(onboardingStorageKey, JSON.stringify(state));
  saveWorkspaceSession(result.session);
}
