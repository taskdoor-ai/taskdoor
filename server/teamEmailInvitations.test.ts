import assert from "node:assert/strict";
import test from "node:test";
import { initialPersonalCenterState, isPersonalCenterState } from "../src/ai/mock/data/memberProfiles.ts";
import { acceptTeamEmailInvitation, canInviteTeamMembers, createTeamEmailInvitation, createTeamEmailInvitations, getInvitationDraft, getTeamPeople, invitationEmailTemplate, normalizeInvitationEmail, normalizeInvitationRecipients, resolveTeamEmailInvitation } from "../src/features/members/lib/team-invitations.ts";
import { createOnboardingPreview, getPreviewInvitation, transitionOnboarding } from "../src/features/auth/lib/onboarding-preview.ts";

const initial = () => structuredClone(initialPersonalCenterState);
const teamId = initialPersonalCenterState.teams[0].id;
const now = Date.UTC(2026, 8, 13);
const invite = (state = initial(), email = "new@example.com", extra = {}) => createTeamEmailInvitation(state, { teamId, email, now, ...extra });

test("搜索时只预填邮箱，保留原输入供逐行校验", () => {
  assert.deepEqual(getInvitationDraft("  新同事  "), { email: "" });
  assert.deepEqual(getInvitationDraft("  NEW@Example.com，next@example.com "), { email: "NEW@Example.com，next@example.com" });
  assert.deepEqual(getInvitationDraft("new@"), { email: "new@" });
});

test("邀请行校验忽略空白行并区分无效邮箱和角色冲突", () => {
  assert.deepEqual(normalizeInvitationRecipients([{ email: " ", role: "member" }]), { recipients: [] });
  assert.deepEqual(normalizeInvitationRecipients([{ email: "invalid", role: "member" }]), { error: "invalidEmail" });
  assert.deepEqual(normalizeInvitationRecipients([
    { email: " same@example.com", role: "member" },
    { email: "SAME@example.com ", role: "admin" },
  ]), { error: "conflictingRoles" });
});

test("已有邀请的名称仍可显示，重邀不丢失、加入后使用账号名称", () => {
  const first = invite();
  first.membership.name = "小林";
  const restored = JSON.parse(JSON.stringify(first.state));
  assert.equal(isPersonalCenterState(restored), true);
  assert.equal(getTeamPeople(restored.teams[0], []).find(p => p.id === first.person.id)?.name, "小林");
  const duplicate = invite(first.state, "NEW@example.com");
  assert.equal(duplicate.state, first.state);
  assert.equal(duplicate.person.name, "小林");
  const renewed = invite(first.state, "new@example.com", { renew: true });
  assert.equal(renewed.person.name, "小林");
  const joined = acceptTeamEmailInvitation(renewed.state, renewed.membership.emailInvitation!.token, { email: "new@example.com", name: "林晓", verified: true }, now + 1000);
  assert.equal(getTeamPeople(joined.teams[0], []).find(p => p.id === first.person.id)?.name, "林晓");
});

test("批量邀请分别使用每位受邀人的角色，并跳过重复和已有的邮箱", () => {
  const { state, membership } = invite(initial(), "pending@example.com");
  state.teams[0].memberships.find(member => member.email === state.profile.email)!.role = "owner";
  const result = createTeamEmailInvitations(state, {
    teamId, now, recipients: [
      { email: " A@example.com ", role: "admin" },
      { email: " b@example.com ", role: "member" },
      { email: "a@EXAMPLE.COM", role: "admin" },
      { email: state.profile.email, role: "member" },
      { email: " PENDING@example.com ", role: "member" },
      { email: " ", role: "member" },
    ],
  });
  assert.equal(result.sentCount, 2);
  assert.deepEqual(result.people.map(person => person.email), ["a@example.com", "b@example.com", state.profile.email, "pending@example.com"]);
  const added = result.state.teams[0].memberships.slice(state.teams[0].memberships.length);
  assert.deepEqual(added.map(member => [member.email, member.name, member.role, member.status]), [
    ["a@example.com", undefined, "admin", "invited"],
    ["b@example.com", undefined, "member", "invited"],
  ]);
  assert.notEqual(added[0].emailInvitation?.token, added[1].emailInvitation?.token);
  assert.equal(result.state.teams[0].memberships.find(member => member.id === membership.id), membership);
});

test("批量中含无效邮箱或超出剩余席位时，整批不创建邀请", () => {
  const state = initial();
  const team = state.teams[0];
  const actor = team.memberships.find(member => member.email === state.profile.email)!;
  team.memberships = Array.from({ length: 49 }, (_, index) => index === 0 ? actor : {
    ...actor, id: `m${index}`, memberId: `u${index}`, email: `u${index}@example.com`,
  });
  const snapshot = structuredClone(state);
  const batch = (...emails: string[]) => createTeamEmailInvitations(state, {
    teamId, now, recipients: emails.map(email => ({ email, role: "member" })),
  });
  assert.throws(() => batch(" "), /有效.*邮箱/);
  assert.throws(() => batch("one@example.com", "invalid"), /有效.*邮箱/);
  assert.throws(() => batch("one@example.com", "two@example.com"), /50/);
  assert.deepEqual(state, snapshot);
  assert.equal(batch("one@example.com", actor.email).state.teams[0].memberships.length, 50);
});

test("同一邮箱指定不同角色时拒绝整批邀请", () => {
  const state = initial();
  const snapshot = structuredClone(state);
  assert.throws(() => createTeamEmailInvitations(state, {
    teamId, now, recipients: [
      { email: "same@example.com", role: "member" },
      { email: " SAME@example.com ", role: "admin" },
    ],
  }), /同一邮箱.*角色/);
  assert.deepEqual(state, snapshot);
});

test("普通成员在批量中邀请管理员时整批失败", () => {
  const state = initial();
  state.teams[0].memberships.find(member => member.email === state.profile.email)!.role = "member";
  const snapshot = structuredClone(state);
  assert.throws(() => createTeamEmailInvitations(state, {
    teamId, now, recipients: [
      { email: "member@example.com", role: "member" },
      { email: "admin@example.com", role: "admin" },
    ],
  }), /只有拥有者和管理员/);
  assert.deepEqual(state, snapshot);
});

test("邮箱邀请规范化及校验，失败时不创建人员", () => {
  assert.equal(normalizeInvitationEmail("  NEW@Example.com  "), "new@example.com");
  for (const email of ["", "陈默", "new@", "a b@example.com", "a@example.com,b@example.com", "a@example.com，b@example.com"]) assert.equal(normalizeInvitationEmail(email), null);
  const state = initial();
  assert.throws(() => invite(state, "a@"), /有效.*邮箱/);
  assert.equal(state.teams[0].memberships.length, initial().teams[0].memberships.length);
});

test("所有有效团队成员都能邀请普通成员，待加入和非成员不能邀请", () => {
  for (const role of ["owner", "admin", "member"] as const) {
    const state = initial();
    state.teams[0].memberships.find(member => member.email === state.profile.email)!.role = role;
    assert.equal(canInviteTeamMembers(state, teamId), true);
    assert.equal(invite(state).membership.role, "member");
  }
  const pending = initial();
  pending.teams[0].memberships.find(member => member.email === pending.profile.email)!.status = "invited";
  assert.equal(canInviteTeamMembers(pending, teamId), false);
  assert.throws(() => invite(pending), /已加入团队/);
  const outsider = initial();
  outsider.profile.email = "outsider@example.com";
  assert.equal(canInviteTeamMembers(outsider, teamId), false);
  assert.throws(() => invite(outsider), /已加入团队/);
});

test("邀请按当前成员 ID 识别身份，资料邮箱变化不影响权限且未知 ID 不回退", () => {
  const state = initial();
  const actorMemberId = state.teams[0].memberships[0].memberId!;
  state.profile.email = "updated@example.com";
  state.teams[0].memberships[0].role = "member";
  assert.equal(canInviteTeamMembers(state, teamId, actorMemberId), true);
  assert.equal(invite(state, "new@example.com", { actorMemberId }).membership.role, "member");
  const original = initial();
  assert.equal(canInviteTeamMembers(original, teamId, "unknown-member"), false);
  assert.throws(() => invite(original, "new@example.com", { actorMemberId: "unknown-member" }), /已加入团队/);
});

test("拥有者和管理员均能邀请或重邀管理员，按当前成员 ID 校验权限", () => {
  for (const role of ["owner", "admin"] as const) {
    const state = initial();
    const actor = state.teams[0].memberships[0];
    actor.role = role;
    const actorMemberId = actor.memberId!;
    state.profile.email = "updated@example.com";
    const first = invite(state, "admin@example.com", { actorMemberId, role: "admin" });
    assert.equal(first.membership.role, "admin");
    const renewed = invite(first.state, "admin@example.com", { actorMemberId, renew: true, now: now + 1000 });
    assert.equal(renewed.membership.role, "admin");
    assert.equal(renewed.membership.id, first.membership.id);
    assert.notEqual(renewed.membership.emailInvitation?.token, first.membership.emailInvitation?.token);
  }
});

test("普通成员不能邀请或重邀管理员", () => {
  const state = initial();
  const actor = state.teams[0].memberships[0];
  actor.role = "admin";
  const actorMemberId = actor.memberId!;
  const first = invite(state, "admin@example.com", { actorMemberId, role: "admin" });
  const restricted = structuredClone(first.state);
  restricted.teams[0].memberships[0].role = "member";
  const snapshot = structuredClone(restricted);
  assert.throws(() => invite(restricted, "other@example.com", { actorMemberId, role: "admin" }), /只有拥有者和管理员/);
  assert.throws(() => invite(restricted, "admin@example.com", { actorMemberId, renew: true }), /只有拥有者和管理员/);
  assert.deepEqual(restricted, snapshot);
});

test("所有角色都不能通过邀请分配拥有者", () => {
  for (const role of ["owner", "admin", "member"] as const) {
    const state = initial();
    const actor = state.teams[0].memberships[0];
    actor.role = role;
    const actorMemberId = actor.memberId!;
    const snapshot = structuredClone(state);
    assert.throws(() => invite(state, "owner@example.com", { actorMemberId, role: "owner" }), /拥有者身份须通过转让获得/);
    assert.deepEqual(state, snapshot);
  }
});

test("生成可选择的待加入人员；刷新所用的持久化校验接受新结构", () => {
  const result = invite();
  assert.equal(result.person.name, "new@example.com");
  assert.equal(result.person.membershipStatus, "invited");
  assert.equal(result.membership.memberId, result.person.id);
  assert.equal(result.membership.emailInvitation?.delivery, "preview");
  assert.equal(isPersonalCenterState(JSON.parse(JSON.stringify(result.state))), true);
  assert.equal(getTeamPeople(result.state.teams[0], []).find(p => p.id === result.person.id)?.membershipStatus, "invited");
});

test("重复邀请复用同一人员和邀请，重建邮件只刷新 token", () => {
  const first = invite();
  const again = invite(first.state, " NEW@EXAMPLE.COM ");
  assert.equal(again.person.id, first.person.id);
  assert.equal(again.state, first.state);
  const renewed = invite(first.state, "new@example.com", { renew: true, now: now + 1000 });
  assert.equal(renewed.person.id, first.person.id);
  assert.notEqual(renewed.membership.emailInvitation?.token, first.membership.emailInvitation?.token);
  assert.equal(renewed.state.teams[0].memberships.length, first.state.teams[0].memberships.length);
  assert.equal(resolveTeamEmailInvitation(renewed.state, first.membership.emailInvitation!.token, now + 1000), null);
});

test("现有正式成员不重复生成；相同邮箱在不同团队有独立的邀请", () => {
  const state = initial();
  const existing = invite(state, state.profile.email);
  assert.equal(existing.state, state);
  assert.equal(existing.person.membershipStatus, "active");
  const first = invite(state);
  const other = createTeamEmailInvitation(first.state, { teamId: state.teams[1].id, email: "new@example.com", now });
  assert.notEqual(first.membership.id, other.membership.id);
  assert.notEqual(first.membership.emailInvitation?.token, other.membership.emailInvitation?.token);
});

test("受邀邮箱验证并明确接受后更新原记录；保留关联使用的人员 ID", () => {
  const result = invite();
  const token = result.membership.emailInvitation!.token;
  const identity = { email: "new@example.com", name: "新同事", verified: true };
  const joined = acceptTeamEmailInvitation(result.state, token, identity, now + 1000);
  const person = getTeamPeople(joined.teams[0], []).find(p => p.id === result.person.id)!;
  assert.equal(person.name, "新同事");
  assert.equal(person.membershipStatus, "active");
  assert.equal(joined.profile.name, result.state.profile.name);
  assert.equal(joined.teams[0].memberships.length, result.state.teams[0].memberships.length);
  assert.equal(acceptTeamEmailInvitation(joined, token, identity, now + 2000), joined);
});

test("错误邮箱、未验证和过期邀请不能激活人员", () => {
  const result = invite();
  const token = result.membership.emailInvitation!.token;
  assert.throws(() => acceptTeamEmailInvitation(result.state, token, { email: "other@example.com", name: "新同事", verified: true }, now), /邮箱.*不符/);
  assert.throws(() => acceptTeamEmailInvitation(result.state, token, { email: "new@example.com", name: "新同事", verified: false }, now), /验证/);
  assert.throws(() => acceptTeamEmailInvitation(result.state, token, { email: "new@example.com", name: "新同事", verified: true }, now + 8 * 86400000), /过期/);
  assert.equal(result.membership.status, "invited");
});

test("邮件模板明确邀请人、团队、受邀邮箱和注册承接，链接绑定当前站点", () => {
  const result = invite();
  const mail = invitationEmailTemplate(result.state.teams[0], result.membership, "http://localhost:5173");
  assert.equal(mail.to, "new@example.com");
  assert.match(mail.subject, /周岚.*邀请你加入/);
  assert.ok(mail.text.includes(result.state.teams[0].name));
  assert.match(mail.text, /已有.*账号.*登录/);
  assert.match(mail.text, /7 天/);
  const url = new URL(mail.url);
  assert.equal(url.origin, "http://localhost:5173");
  assert.equal(url.pathname, "/signup");
  assert.equal(url.searchParams.get("invite"), result.membership.emailInvitation!.token);
});

test("真实生成的本地邀请贯穿注册验证，接受前不会加入团队", () => {
  const result = invite(initial(), "new@example.com", { now: Date.now() });
  const token = result.membership.emailInvitation!.token;
  assert.equal(getPreviewInvitation(token, result.state)?.email, "new@example.com");
  const initialState = createOnboardingPreview("invited", token);
  const registered = transitionOnboarding(initialState, { type: "register", email: "new@example.com", name: "新同事", passwordDigest: "a".repeat(64), passwordLength: 10, now: 1000 }, result.state);
  const verified = transitionOnboarding(registered, { type: "verify-code", code: "888888", now: 2000 }, result.state);
  assert.equal(verified.step, "invite");
  assert.equal(verified.teams.length, 0);
  const joined = transitionOnboarding(verified, { type: "accept-invite" }, result.state);
  assert.equal(joined.step, "workspace");
  assert.equal(joined.activeTeamId, teamId);
  assert.equal(joined.teams[0].name, result.state.teams[0].name);
  assert.equal(result.membership.status, "invited");
});

test("团队通用邀请链接可以解析团队信息，并允许新账号确认加入", () => {
  const state = initial();
  const team = state.teams[0];
  const invitation = getPreviewInvitation(team.inviteToken, state);
  assert.equal(invitation?.team.name, team.name);
  assert.equal(invitation?.email, "");
  const registered = transitionOnboarding(createOnboardingPreview("invited", team.inviteToken), { type: "register", email: "link-member@example.com", name: "链接成员", passwordDigest: "a".repeat(64), passwordLength: 10, now: 1000 }, state);
  const checked = transitionOnboarding(registered, { type: "verify-code", code: "123456", now: 2000 }, state);
  assert.equal(checked.step, "invite");
  assert.equal(checked.teams.length, 0);
  const joined = transitionOnboarding(checked, { type: "accept-invite" }, state);
  assert.equal(joined.activeTeamId, team.id);
});
