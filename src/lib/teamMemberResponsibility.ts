import type { PersonalCenterState, TeamMembership } from "../data/memberProfiles";
import type { PersonOption } from "../data/sharedTypes";

export function resolveTeamMemberResponsibility(membership: Pick<TeamMembership, "responsibility">, member?: Pick<PersonOption, "dynamicResponsibility">) {
  if (membership.responsibility !== undefined) return membership.responsibility.trim() || "未填写责任";
  return member?.dynamicResponsibility?.trim() || "加入后补充责任";
}

export function updateTeamMemberResponsibility(state: PersonalCenterState, teamId: string, membershipId: string, responsibility: string) {
  const team = state.teams.find((item) => item.id === teamId);
  const membership = team?.memberships.find((item) => item.id === membershipId);
  if (!team || !membership) return { changed: false, state };
  const nextResponsibility = responsibility.trim();
  if (membership.responsibility === nextResponsibility) return { changed: false, state };
  return {
    changed: true,
    state: {
      ...state,
      teams: state.teams.map((item) => item.id !== teamId ? item : {
        ...item,
        memberships: item.memberships.map((entry) => entry.id === membershipId
          ? { ...entry, responsibility: nextResponsibility }
          : entry),
      }),
    },
  };
}
