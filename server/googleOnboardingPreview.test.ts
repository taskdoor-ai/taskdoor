import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnboardingPreview, transitionOnboarding, restoreOnboardingPreview } from '../src/lib/onboardingPreview';
const auth = { type: 'google-preview-complete', email: 'alex@example.com', name: 'Alex Morgan', subject: 'demo-alex' } as const;
test('Google preview creates once, restores and returns to team setup', () => {
  const first = transitionOnboarding(createOnboardingPreview(), auth);
  assert.equal(first.step, 'create');
  assert.equal(first.verified, true);
  assert.ok(restoreOnboardingPreview(JSON.stringify(first)));
  const again = transitionOnboarding(transitionOnboarding(first, {type:'switch-account'}), auth);
  assert.equal(again.step, 'choose');
  assert.equal(Object.keys(again.accounts).length, Object.keys(first.accounts).length);
});
test('Google preview preserves invitation and requires separate join confirmation', () => {
  const next = transitionOnboarding(createOnboardingPreview('invited'), auth);
  assert.equal(next.step, 'invite');
  assert.equal(next.inviteToken, 'demo-valid');
  assert.equal(next.teams.length, 0);
});
test('Google preview does not merge an existing password account', () => {
  const initial = createOnboardingPreview();
  const next = transitionOnboarding(initial, {...auth, email:'zhoulan@example.com'});
  assert.equal(next.verified, false);
  assert.ok(next.error);
  assert.deepEqual(next.accounts, initial.accounts);
});
test('Google preview retains existing team and blocks empty password login', () => {
  const created = transitionOnboarding(createOnboardingPreview(), auth);
  const team = transitionOnboarding(created, {type:'create-team', name:'Demo team'});
  const loggedOut = transitionOnboarding(team, {type:'switch-account'});
  assert.equal(transitionOnboarding(loggedOut, {type:'login', email:auth.email, passwordDigest:''}).verified, false);
  const returning = transitionOnboarding(loggedOut, auth);
  assert.equal(returning.step, 'workspace');
  assert.equal(returning.activeTeamId, team.activeTeamId);
});
