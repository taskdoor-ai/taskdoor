import { MAX_TEAM_MEMBERS, occupiedTeamSeats } from "./teamLimits";
import type { PersonalCenterState, TeamAccessRole, TeamMembership, TeamResponsibilityProfile } from "../data/memberProfiles";
import type { PersonOption } from "../data/sharedTypes";

/** Local invitation prototype. Delivery remains explicitly marked as preview. */
export function normalizeInvitationEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email) ? email : null;
}

export function getInvitationDraft(query: string) {
  const value = query.trim();
  return value.includes("@") ? { name: "", email: value } : { name: value, email: "" };
}

export function canInviteTeamMembers(state: PersonalCenterState, teamId: string) {
  return Boolean(state.teams.find(team => team.id === teamId)?.memberships.some(member =>
    member.email.toLowerCase() === state.profile.email.toLowerCase() && member.status === "active" && member.role === "admin"));
}

function personFromMembership(membership: TeamMembership, known?: PersonOption): PersonOption {
  return {
    ...known, id: membership.memberId ?? membership.id, email: membership.email,
    name: membership.name ?? (membership.status === "invited" ? membership.email : known?.name ?? membership.email),
    role: known?.role ?? (membership.role === "admin" ? "管理员" : "成员"),
    membershipStatus: membership.status,
  };
}

export function getTeamPeople(team: TeamResponsibilityProfile | undefined, known: PersonOption[]): PersonOption[] {
  if (!team) return known;
  const people = new Map(known.map(person => [person.id, person]));
  for (const membership of team.memberships) {
    const existing = known.find(person => person.id === membership.memberId || person.email.toLowerCase() === membership.email.toLowerCase());
    const person = personFromMembership(membership, existing);
    if (existing && existing.id !== person.id) people.delete(existing.id);
    people.set(person.id, person);
  }
  return [...people.values()];
}

export function createTeamEmailInvitation(state: PersonalCenterState, input: {
  teamId: string; email: string; name?: string; role?: TeamAccessRole; now?: number; renew?: boolean; members?: PersonOption[];
}) {
  const email = normalizeInvitationEmail(input.email);
  if (!email) throw new Error("请输入有效的邮箱地址");
  const name = input.name?.trim();
  if (name && name.length > 100) throw new Error("名称不能超过 100 个字符");
  const team = state.teams.find(team => team.id === input.teamId);
  if (!team || !canInviteTeamMembers(state, team.id)) throw new Error("只有团队管理员可以邀请新成员");
  const existing = team.memberships.find(member => member.email.toLowerCase() === email);
  const known = input.members?.find(member => member.email.toLowerCase() === email);
  if (existing && (existing.status === "active" || (existing.emailInvitation && !input.renew))) {
    return { state, membership: existing, person: personFromMembership(existing, known) };
  }
  const now = input.now ?? Date.now();
  const alreadyReserved = existing?.status === "invited" && (!existing.emailInvitation || existing.emailInvitation.expiresAt > now);
  if (!alreadyReserved && occupiedTeamSeats(team, now) >= MAX_TEAM_MEMBERS) throw new Error("团队人数已达 50 人上限");
  const id = existing?.id ?? `${team.id}-invite-${crypto.randomUUID()}`;
  const membership: TeamMembership = {
    ...existing, id, email, name: existing?.name ?? (name || undefined), memberId: existing?.memberId ?? known?.id ?? id,
    role: existing?.role ?? input.role ?? "member", status: "invited",
    invitedAt: new Date(now).toLocaleString("zh-CN"),
    emailInvitation: { token: crypto.randomUUID(), inviter: state.profile.name, createdAt: now, expiresAt: now + 7 * 86400000, delivery: "preview" },
  };
  const updatedTeam = { ...team, memberships: existing ? team.memberships.map(member => member.id === id ? membership : member) : [...team.memberships, membership] };
  return { state: { ...state, teams: state.teams.map(item => item.id === team.id ? updatedTeam : item) }, membership, person: personFromMembership(membership, known) };
}

export function resolveTeamEmailInvitation(state: PersonalCenterState, token: string, now = Date.now()) {
  if (!token) return null;
  for (const team of state.teams) {
    const membership = team.memberships.find(member => member.emailInvitation?.token === token);
    if (membership?.emailInvitation) return {
      team: { id: team.id, name: team.name, role: membership.role },
      inviter: membership.emailInvitation.inviter, email: membership.email, membership,
      status: membership.status === "invited" && now >= membership.emailInvitation.expiresAt ? "expired" as const : "valid" as const,
    };
  }
  return null;
}

export function acceptTeamEmailInvitation(state: PersonalCenterState, token: string, identity: { email: string; name: string; verified: boolean }, now = Date.now()): PersonalCenterState {
  if (!identity.verified || !identity.name.trim()) throw new Error("请先完成邮箱验证并登录");
  const invitation = resolveTeamEmailInvitation(state, token, now);
  if (!invitation) throw new Error("邀请不存在或已失效，请联系管理员");
  if (normalizeInvitationEmail(identity.email) !== invitation.email) throw new Error("当前邮箱与受邀邮箱不符，请切换账号");
  if (invitation.status === "expired") throw new Error("邀请已过期，请联系管理员重新邀请");
  if (invitation.membership.status === "active") return state;
  const team = state.teams.find(team => team.id === invitation.team.id)!;
  if (occupiedTeamSeats(team, now) > MAX_TEAM_MEMBERS) throw new Error("团队人数已达 50 人上限");
  return { ...state, teams: state.teams.map(team => team.id === invitation.team.id ? {
    ...team, memberships: team.memberships.map(member => member.id === invitation.membership.id
      ? { ...member, status: "active", name: identity.name.trim(), responsibility: member.responsibility ?? "" } : member),
  } : team) };
}

export function invitationEmailTemplate(team: Pick<TeamResponsibilityProfile, "name">, membership: TeamMembership, origin: string) {
  if (!membership.emailInvitation) throw new Error("请先生成邮箱邀请");
  const url = new URL("/signup", origin);
  url.searchParams.set("invite", membership.emailInvitation.token);
  const subject = `${membership.emailInvitation.inviter} 邀请你加入「${team.name}」｜TaskDoor`;
  const intro = `${membership.emailInvitation.inviter} 邀请你以${membership.role === "admin" ? "管理员" : "成员"}身份加入「${team.name}」，在 TaskDoor 一起协作。`;
  const instruction = `请使用 ${membership.email} 注册并验证邮箱；已有 TaskDoor 账号可直接登录，然后确认加入团队。`;
  const footer = "链接自生成起 7 天内有效。过期后请联系邀请人重新邀请。如果你不认识邀请人，可以忽略此邮件。";
  return { to: membership.email, subject, intro, instruction, footer, url: url.toString(), text: `${intro}\n\n${instruction}\n\n接受邀请并加入：${url}\n\n${footer}` };
}
