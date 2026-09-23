import type { PersonalCenterState, TeamResponsibilityProfile } from '../data/memberProfiles';
export const MAX_CREATED_TEAMS = 10;
export const MAX_TEAM_MEMBERS = 50;
type Creator = { userId: string; email: string; name: string };
export function countCreatedTeams(teams: TeamResponsibilityProfile[], identity: Pick<Creator, 'userId' | 'email'>) {
  return teams.filter(team => team.createdBy ? team.createdBy === identity.userId : (() => {
    // Legacy teams predate creator metadata: retain the original first administrator.
    const creator = team.memberships.find(member => member.role === 'admin');
    return creator?.memberId === identity.userId || creator?.email.toLowerCase() === identity.email.toLowerCase();
  })()).length;
}
export function occupiedTeamSeats(team: Pick<TeamResponsibilityProfile, 'memberships'>, now = Date.now()) {
  return team.memberships.filter(member => member.status === 'active' || (member.status === 'invited' && (!member.emailInvitation || member.emailInvitation.expiresAt > now))).length;
}
export function prepareCreatedTeam(directory: PersonalCenterState, identity: Creator, input: string) {
  const name = input.trim();
  if (!name || name.length > 60) throw new Error('团队名称需要 1–60 个字符');
  if (countCreatedTeams(directory.teams, identity) >= MAX_CREATED_TEAMS) throw new Error(`最多可创建 ${MAX_CREATED_TEAMS} 个团队`);
  const id = `preview-team-${crypto.randomUUID()}`;
  const team: TeamResponsibilityProfile = {
    id, name, createdBy: identity.userId, role: '管理员', coverage: '', missingSources: '', lastSyncedAt: '刚刚', inviteToken: crypto.randomUUID(),
    memberships: [{ id: `${id}:${identity.userId}`, memberId: identity.userId, email: identity.email, name: identity.name, role: 'admin', status: 'active', responsibility: '' }],
    responsibilityDocument: { content: '', updatedAt: new Date().toISOString(), updatedBy: identity.name, revisionId: crypto.randomUUID() }, observedClaims: [],
  };
  return { team, directory: { ...directory, teams: [...directory.teams, team] } };
}
