import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnboardingPreview, transitionOnboarding, restoreOnboardingPreview } from '../src/lib/onboardingPreview';
import { prepareOnboardingWorkspace } from '../src/lib/onboardingWorkspace';
import { initialPersonalCenterState } from '../src/data/memberProfiles';
const email = 'bjfwww@gmail.com';
test('designated preview account opens all existing example teams without duplicating members', () => {
 const state = createOnboardingPreview();
 assert.ok(state.accounts[email]);
 const login = transitionOnboarding(state, {type:'login',email,passwordDigest:state.accounts[email].passwordDigest});
 assert.equal(login.step,'workspace');
 assert.deepEqual(login.teams.map(t=>t.id),initialPersonalCenterState.teams.map(t=>t.id));
 const result = prepareOnboardingWorkspace(login, structuredClone(initialPersonalCenterState));
 assert.equal(result.session.userId,'周岚');
 assert.equal(result.session.email,email);
 for (const team of result.directory.teams) {
  assert.equal(team.memberships.filter(m=>m.memberId==='周岚').length,1);
  assert.equal(team.memberships.find(m=>m.memberId==='周岚')?.email,email);
 }
 assert.deepEqual(prepareOnboardingWorkspace(login,result.directory),result);
 const wrong = transitionOnboarding(state,{type:'login',email,passwordDigest:'0'.repeat(64)});
 assert.equal(wrong.verified,false);
});
test('existing browser state gets preview access while preserving other accounts', () => {
 const old = createOnboardingPreview();
 delete old.accounts[email];
 delete (old as unknown as Record<string,unknown>).mockAccessVersion;
 old.accounts['someone@example.com']={name:'Someone',passwordDigest:'a'.repeat(64),teams:[],activeTeamId:''};
 const restored = restoreOnboardingPreview(JSON.stringify(old))!;
 assert.ok(restored.accounts[email]);
 assert.deepEqual(restored.accounts['someone@example.com'],old.accounts['someone@example.com']);
});
