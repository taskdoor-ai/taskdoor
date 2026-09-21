import assert from "node:assert/strict";
import test from "node:test";
import { createOnboardingPreview, getPreviewCodeResendDelay, previewDemoEmail, restoreOnboardingPreview, transitionOnboarding, type PreviewScenario } from "../src/lib/onboardingPreview.ts";

const digest = "a".repeat(64);
const otherDigest = "b".repeat(64);
const register = (scenario: PreviewScenario = "new") => transitionOnboarding(createOnboardingPreview(scenario), { type: "register", name: "林晓", email: "lin@example.com", passwordDigest: digest, passwordLength: 10, now: 1000 });
const verified = (scenario: PreviewScenario = "new") => transitionOnboarding(register(scenario), { type: "verify-code", code: "123456", now: 2000 });

test("登录不会自动注册，错误密码不能登录", () => {
  const missing = transitionOnboarding(createOnboardingPreview(), { type: "login", email: "missing@example.com", passwordDigest: digest });
  assert.equal(missing.verified, false);
  assert.match(missing.error, /邮箱或密码/);
  const signedOut = transitionOnboarding(verified(), { type: "switch-account" });
  assert.equal(transitionOnboarding(signedOut, { type: "login", email: "lin@example.com", passwordDigest: otherDigest }).verified, false);
});

test("注册验证后创建账号，姓名与密码凭据保留，再进入团队引导", () => {
  const pending = register();
  assert.equal(pending.step, "code");
  assert.equal(pending.accounts["lin@example.com"], undefined);
  const state = verified();
  assert.equal(state.step, "create");
  assert.equal(state.name, "林晓");
  assert.equal(state.accounts["lin@example.com"].passwordDigest, digest);
});

test("演示账号模拟新用户，登录后直接创建团队，也能选择加入", () => {
  const initial = createOnboardingPreview();
  const account = initial.accounts[previewDemoEmail];
  const signedIn = transitionOnboarding(initial, { type: "login", email: previewDemoEmail, passwordDigest: account.passwordDigest });
  assert.equal(signedIn.step, "create");
  assert.deepEqual(signedIn.teams, []);
  assert.equal(signedIn.activeTeamId, "");
  const joining = transitionOnboarding(signedIn, { type: "choose", step: "join" });
  assert.equal(joining.step, "join");
  assert.equal(joining.teams.length, 0);
  assert.equal(transitionOnboarding(joining, { type: "choose", step: "choose" }).step, "create");
});

test("旧预览中的演示团队只迁移一次，不影响其他账号及新建团队", () => {
  const registered = verified();
  const legacyTeam = { id: "ark", name: "方舟产品团队", role: "member" as const };
  const legacy = { ...registered, version: undefined, step: "workspace", email: previewDemoEmail, name: "周岚", teams: [legacyTeam], activeTeamId: "ark", accounts: { ...registered.accounts, [previewDemoEmail]: { ...registered.accounts[previewDemoEmail], teams: [legacyTeam], activeTeamId: "ark" } } };
  const migrated = restoreOnboardingPreview(JSON.stringify(legacy))!;
  assert.equal(migrated.step, "create");
  assert.deepEqual(migrated.teams, []);
  assert.equal(migrated.accounts["lin@example.com"].name, "林晓");
  const created = transitionOnboarding(migrated, { type: "create-team", name: "周岚的新团队" });
  const restored = restoreOnboardingPreview(JSON.stringify(created))!;
  assert.equal(restored.step, "workspace");
  assert.equal(restored.teams[0].name, "周岚的新团队");
  const signedOut = transitionOnboarding(restored, { type: "switch-account" });
  const signedIn = transitionOnboarding(signedOut, { type: "login", email: previewDemoEmail, passwordDigest: restored.accounts[previewDemoEmail].passwordDigest });
  assert.equal(signedIn.step, "workspace");
});

test("短密码与重复注册不能覆盖账号", () => {
  const short = transitionOnboarding(createOnboardingPreview(), { type: "register", name: "林晓", email: "lin@example.com", passwordDigest: digest, passwordLength: 4, now: 1000 });
  assert.match(short.error, /8/);
  const signedOut = transitionOnboarding(verified(), { type: "switch-account" });
  const duplicate = transitionOnboarding(signedOut, { type: "register", name: "别人", email: "lin@example.com", passwordDigest: otherDigest, passwordLength: 10, now: 3000 });
  assert.match(duplicate.error, /已注册/);
  assert.equal(duplicate.accounts["lin@example.com"].name, "林晓");
});

test("注册接受任意六位数字且不受过期限制，刷新和重发保留注册信息", () => {
  const state = register();
  for (const code of ["000000", "111111", "123456", "999999"]) {
    for (const now of [2000, 601000]) {
      const checked = transitionOnboarding(state, { type: "verify-code", code, now });
      assert.equal(checked.verified, true);
      assert.equal(checked.step, "create");
      assert.equal(checked.error, "");
    }
  }
  for (const code of ["", "12345", "1234567", "abcdef"]) {
    const checked = transitionOnboarding(state, { type: "verify-code", code, now: 2000 });
    assert.equal(checked.verified, false);
    assert.match(checked.error, /6 位数字/);
  }
  const restored = restoreOnboardingPreview(JSON.stringify(state))!;
  assert.equal(getPreviewCodeResendDelay(restored, 2000), 29);
  assert.equal(getPreviewCodeResendDelay(restored, 31000), 0);
  const resent = transitionOnboarding(restored, { type: "send-code", now: 31000 });
  assert.equal(resent.pendingPasswordDigest, digest);
  assert.equal(resent.name, "林晓");
});

test("邀请贯穿登录注册切换，确认前不加入，确认幂等", () => {
  const mode = transitionOnboarding(createOnboardingPreview("invited"), { type: "auth-mode", mode: "register" });
  assert.equal(mode.inviteToken, "demo-valid");
  const state = verified("invited");
  assert.equal(state.step, "invite");
  assert.equal(state.teams.length, 0);
  const joined = transitionOnboarding(state, { type: "accept-invite" });
  assert.equal(joined.step, "workspace");
  assert.equal(joined.teams[0].role, "member");
  assert.equal(transitionOnboarding(joined, { type: "accept-invite" }).teams.length, 1);
});

test("过期、邮箱不符及其他域名邀请不能加入", () => {
  assert.match(transitionOnboarding(verified("expired"), { type: "accept-invite" }).error, /过期/);
  const targeted = { ...verified(), step: "invite" as const, inviteToken: "demo-targeted" };
  assert.match(transitionOnboarding(targeted, { type: "accept-invite" }).error, /不符/);
  const wrong = transitionOnboarding(verified(), { type: "inspect-invite", link: "https://evil.example/t/ark/join/demo-valid" });
  assert.match(wrong.error, /无法识别/);
});

test("未登录不能建团队；创建者是管理员，重新登录恢复团队", () => {
  assert.equal(transitionOnboarding(createOnboardingPreview(), { type: "create-team", name: "测试" }).teams.length, 0);
  const creating = transitionOnboarding(verified(), { type: "choose", step: "create" });
  const created = transitionOnboarding(creating, { type: "create-team", name: "  星河设计  " });
  assert.equal(created.teams[0].name, "星河设计");
  assert.equal(created.teams[0].role, "admin");
  const signedOut = transitionOnboarding(created, { type: "switch-account" });
  const signedIn = transitionOnboarding(signedOut, { type: "login", email: " LIN@example.com ", passwordDigest: digest });
  assert.equal(signedIn.step, "workspace");
  assert.equal(signedIn.teams[0].name, "星河设计");
});

test("不同账号创建的第一个团队使用不同 ID，避免任务互相串入", () => {
  const first = transitionOnboarding(verified(), { type: "create-team", name: "第一团队" });
  const other = transitionOnboarding(verified(), { type: "create-team", name: "第二团队" });
  assert.notEqual(first.activeTeamId, other.activeTeamId);
});

test("重置密码需要验证，完成后回登录，旧密码失效", () => {
  const signedOut = transitionOnboarding(verified(), { type: "switch-account" });
  assert.equal(transitionOnboarding(signedOut, { type: "reset-password", passwordDigest: otherDigest, passwordLength: 10 }).accounts["lin@example.com"].passwordDigest, digest);
  const forgot = transitionOnboarding(signedOut, { type: "forgot-password", email: "lin@example.com", now: 3000 });
  const checked = transitionOnboarding(forgot, { type: "verify-code", code: "654321", now: 603000 });
  assert.equal(checked.step, "reset-password");
  const reset = transitionOnboarding(checked, { type: "reset-password", passwordDigest: otherDigest, passwordLength: 10 });
  assert.equal(reset.step, "email");
  assert.equal(reset.authMode, "login");
  assert.equal(transitionOnboarding(reset, { type: "login", email: "lin@example.com", passwordDigest: digest }).verified, false);
  assert.equal(transitionOnboarding(reset, { type: "login", email: "lin@example.com", passwordDigest: otherDigest }).verified, true);
});
