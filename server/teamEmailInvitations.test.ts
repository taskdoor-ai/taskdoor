import assert from "node:assert/strict";
import test from "node:test";
import { initialPersonalCenterState, isPersonalCenterState } from "../src/data/memberProfiles.ts";
import { acceptTeamEmailInvitation, createTeamEmailInvitation, getInvitationDraft, getTeamPeople, invitationEmailTemplate, normalizeInvitationEmail, resolveTeamEmailInvitation } from "../src/lib/teamInvitations.ts";
import { createOnboardingPreview, getPreviewInvitation, transitionOnboarding } from "../src/lib/onboardingPreview.ts";

const initial = () => structuredClone(initialPersonalCenterState);
const teamId = initialPersonalCenterState.teams[0].id;
const now = Date.UTC(2026, 8, 13);
const invite = (state = initial(), email = "new@example.com", extra = {}) => createTeamEmailInvitation(state, { teamId, email, now, ...extra });

test("搜索名称或邮箱分别预填邀请表单，未完成的邮箱留在邮箱字段", () => {
  assert.deepEqual(getInvitationDraft("  新同事  "), { name: "新同事", email: "" });
  assert.deepEqual(getInvitationDraft("  NEW@Example.com "), { name: "", email: "NEW@Example.com" });
  assert.deepEqual(getInvitationDraft("new@"), { name: "", email: "new@" });
  assert.deepEqual(getInvitationDraft(""), { name: "", email: "" });
});

test("邀请名称持久化并显示在待加入人员中，重邀不丢失、加入后使用账号名称", () => {
  const first = invite(initial(), "new@example.com", { name: "  小林  " });
  assert.equal(first.membership.name, "小林");
  const restored = JSON.parse(JSON.stringify(first.state));
  assert.equal(isPersonalCenterState(restored), true);
  assert.equal(getTeamPeople(restored.teams[0], []).find(p => p.id === first.person.id)?.name, "小林");
  const duplicate = invite(first.state, "NEW@example.com", { name: "另一名称" });
  assert.equal(duplicate.state, first.state);
  assert.equal(duplicate.person.name, "小林");
  const renewed = invite(first.state, "new@example.com", { renew: true });
  assert.equal(renewed.person.name, "小林");
  const joined = acceptTeamEmailInvitation(renewed.state, renewed.membership.emailInvitation!.token, { email: "new@example.com", name: "林晓", verified: true }, now + 1000);
  assert.equal(getTeamPeople(joined.teams[0], []).find(p => p.id === first.person.id)?.name, "林晓");
  assert.equal(invite(initial(), "only@example.com", { name: "  " }).person.name, "only@example.com");
});

test("邮箱邀请规范化、校验及管理员权限，失败时不创建人员", () => {
  assert.equal(normalizeInvitationEmail("  NEW@Example.com  "), "new@example.com");
  for (const email of ["", "陈默", "new@", "a b@example.com", "a@example.com,b@example.com"]) assert.equal(normalizeInvitationEmail(email), null);
  const state = initial();
  assert.throws(() => invite(state, "a@"), /有效.*邮箱/);
  state.teams[0].memberships[0].role = "member";
  assert.throws(() => invite(state), /管理员/);
  assert.equal(state.teams[0].memberships.length, initial().teams[0].memberships.length);
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
