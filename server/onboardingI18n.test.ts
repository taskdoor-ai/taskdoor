import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { localizeOnboardingMessage, onboardingEn, onboardingTranslator, onboardingZh } from '../src/i18n/onboardingMessages.ts';
import { createOnboardingPreview, restoreOnboardingPreview, transitionOnboarding } from '../src/lib/onboardingPreview.ts';

test('auth catalogs preserve placeholders and cover every transition error and notice', () => {
  for (const [key, english] of Object.entries(onboardingEn)) {
    assert.ok(english.trim());
    assert.doesNotMatch(english, /[\u3400-\u9fff]/);
    assert.deepEqual(english.match(/\{\w+\}/g)?.sort() ?? [], key.match(/\{\w+\}/g)?.sort() ?? []);
    assert.equal(onboardingZh[key as keyof typeof onboardingEn], key);
  }
  const source = readFileSync(new URL('../src/lib/onboardingPreview.ts', import.meta.url), 'utf8');
  for (const match of source.matchAll(/(?:fail\(|notice: )"([^"]+)"/g)) {
    assert.ok(Object.hasOwn(onboardingEn, match[1]), `Untranslated transition message: ${match[1]}`);
  }
});

test('validation can change languages without changing persisted auth state', () => {
  const state = transitionOnboarding(createOnboardingPreview(), { type: 'login', email: 'invalid', passwordDigest: 'a'.repeat(64) });
  const serialized = JSON.stringify(state);
  assert.equal(localizeOnboardingMessage('en', state.error), 'Enter a valid email address.');
  assert.equal(localizeOnboardingMessage('zh-CN', state.error), '请输入有效的邮箱地址。');
  assert.equal(state.errorField, 'email');
  assert.equal(JSON.stringify(state), serialized);
  assert.deepEqual(restoreOnboardingPreview(serialized), state);
  assert.equal(localizeOnboardingMessage('en', 'Custom service error #42'), 'Custom service error #42');
});

test('registration and team creation preserve user names across localized display', () => {
  const pending = transitionOnboarding(createOnboardingPreview(), { type: 'register', name: '林晓', email: 'lin@example.com', passwordDigest: 'a'.repeat(64), passwordLength: 10, now: 1000 });
  const verified = transitionOnboarding(pending, { type: 'verify-code', code: '123456', now: 2000 });
  const workspace = transitionOnboarding(verified, { type: 'create-team', name: '星河设计 {team}' });
  const team = workspace.teams[0];
  assert.equal(workspace.name, '林晓');
  assert.equal(team.name, '星河设计 {team}');
  assert.equal(onboardingTranslator('en')('加入「{team}」', { team: team.name }), 'Join 星河设计 {team}');
  assert.equal(onboardingTranslator('zh-CN')('加入「{team}」', { team: team.name }), '加入「星河设计 {team}」');
  assert.equal(onboardingTranslator('en')('{seconds} 秒后重新获取', { seconds: 15 }), 'Resend in 15s');
});

test('password reset success and revoked invitation errors translate at display boundary', () => {
  let state = createOnboardingPreview();
  state = transitionOnboarding(state, { type: 'forgot-password', email: 'zhoulan@example.com', now: 1000 });
  state = transitionOnboarding(state, { type: 'verify-code', code: '123456', now: 2000 });
  state = transitionOnboarding(state, { type: 'reset-password', passwordDigest: 'b'.repeat(64), passwordLength: 10 });
  assert.equal(localizeOnboardingMessage('en', state.notice), 'Your password has been updated. Please log in again.');
  state = transitionOnboarding(state, { type: 'login', email: 'zhoulan@example.com', passwordDigest: 'b'.repeat(64) });
  state = transitionOnboarding({ ...state, step: 'invite', inviteToken: 'demo-revoked' }, { type: 'accept-invite' });
  assert.equal(localizeOnboardingMessage('en', state.error), 'This invitation was revoked. Ask the administrator for a new link.');
});
