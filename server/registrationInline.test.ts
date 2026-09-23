import assert from "node:assert/strict";
import test from "node:test";
import { createOnboardingPreview, transitionOnboarding, getPreviewCodeResendDelay, restoreOnboardingPreview } from "../src/lib/onboardingPreview.ts";
const initial = () => transitionOnboarding(createOnboardingPreview("invited"), { type: "auth-mode", mode: "register" });
const send = (state = initial(), now = 1000, code = "123456") => transitionOnboarding(state, { type: "request-registration-code", email: "lin@example.com", code, now });
const submit = (state: ReturnType<typeof initial>, code = "123456", now = 2000, email = "lin@example.com") => transitionOnboarding(state, { type: "complete-registration", name: "林晓", email, passwordDigest: "a".repeat(64), passwordLength: 10, code, now });
test("发送验证码无需姓名密码，停留表单且不创建账号", () => {
  const state = send();
  assert.equal(state.step, "email");
  assert.equal(state.accounts["lin@example.com"], undefined);
  assert.equal(getPreviewCodeResendDelay(state, 1000), 60);
  assert.equal(getPreviewCodeResendDelay(state, 60000), 1);
  assert.equal(getPreviewCodeResendDelay(state, 61000), 0);
  assert.equal(submit(state).step, "invite");
  assert.equal(submit(state).accounts["lin@example.com"].name, "林晓");
  assert.equal(submit(submit(state)).accounts["lin@example.com"].name, "林晓");
});
test("Mock 固定验证码，无需发码且不检查过期或邮箱绑定", () => {
  const sent = send();
  assert.equal(sent.registrationCode, "111111");
  assert.equal(send(sent, 61000, "654321").registrationCode, "111111");
  for (const state of [submit(initial(), "111111"), submit(sent, "111111", 601000), submit(sent, "111111", 2000, "other@example.com")]) {
    assert.equal(state.verified, true);
    assert.equal(state.step, "invite");
  }
});

 test("新注册账号默认使用邮箱前缀作为称呼", () => {
  let state = transitionOnboarding(transitionOnboarding(createOnboardingPreview(), {type: "auth-mode", mode: "register"}), {type: "complete-registration", name: "", email: "new@example.com", passwordDigest: "a".repeat(64), passwordLength: 8, code: "111111", now: 1000});
  assert.equal(state.verified, true);
  assert.equal(state.name, "new");
  assert.deepEqual(restoreOnboardingPreview(JSON.stringify(state)), JSON.parse(JSON.stringify(state)));
  assert.equal(state.step, "create");
  state = transitionOnboarding(state, {type: "create-team", name: "Design", profileName: "Alex"});
  assert.equal(state.step, "workspace");
  assert.equal(state.accounts["new@example.com"].name, "new");
 });
 test("受邀新用户默认称呼可直接确认加入", () => {
  let state = transitionOnboarding(initial(), {type: "complete-registration", name: "", email: "new@example.com", passwordDigest: "a".repeat(64), passwordLength: 8, code: "111111", now: 1000});
  assert.equal(state.step, "invite");
  state = transitionOnboarding(state, {type: "accept-invite", profileName: "Alex"});
  assert.equal(state.step, "workspace");
  assert.equal(state.name, "new");
 });
