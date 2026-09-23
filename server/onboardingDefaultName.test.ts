import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnboardingPreview, transitionOnboarding } from '../src/lib/onboardingPreview';
test('email registration uses email prefix when no name is provided', () => {
 const initial = transitionOnboarding(createOnboardingPreview('invited'), {type:'auth-mode', mode:'register'});
 const next = transitionOnboarding(initial,{type:'complete-registration',name:'',email:'alex.morgan@example.com',passwordDigest:'a'.repeat(64),passwordLength:8,code:'111111',now:1000});
 assert.equal(next.name,'alex.morgan');
 assert.equal(next.accounts[next.email].name,'alex.morgan');
});
test('email login prefers the saved name', () => {
 const initial = createOnboardingPreview();
 const next = transitionOnboarding(initial,{type:'login',email:'zhoulan@example.com',passwordDigest:initial.accounts['zhoulan@example.com'].passwordDigest});
 assert.equal(next.name,'周岚');
});

test('normal entry skips team forms and reuses the personal workspace', async () => {
 const { simplifyOnboardingEntry } = await import('../src/lib/onboardingPreview');
 const loggedIn = transitionOnboarding(createOnboardingPreview(),{type:'google-preview-complete',email:'alex@example.com',name:'Alex',subject:'demo-alex'});
 const next = simplifyOnboardingEntry(loggedIn);
 assert.equal(next.step,'workspace');
 assert.equal(next.teams.length,1);
 assert.equal(next.teams[0].role,'admin');
 assert.deepEqual(simplifyOnboardingEntry(next),next);
 const relogin = transitionOnboarding(transitionOnboarding(next,{type:'switch-account'}),{type:'google-preview-complete',email:'alex@example.com',name:'Alex',subject:'demo-alex'});
 assert.equal(relogin.activeTeamId,next.activeTeamId);
});
test('invitation entry keeps separate confirmation without creating a personal team', async () => {
 const { simplifyOnboardingEntry } = await import('../src/lib/onboardingPreview');
 const next = simplifyOnboardingEntry(transitionOnboarding(createOnboardingPreview('invited'),{type:'google-preview-complete',email:'alex@example.com',name:'Alex',subject:'demo-alex'}));
 assert.equal(next.step,'invite');
 assert.equal(next.teams.length,0);
});
