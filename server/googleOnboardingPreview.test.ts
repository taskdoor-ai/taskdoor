import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnboardingPreview, transitionOnboarding, restoreOnboardingPreview, simplifyOnboardingEntry } from '../src/features/auth/lib/onboarding-preview';
const auth = { type: 'google-preview-complete', email: 'alex@example.com', name: 'Alex Morgan', subject: 'demo-alex' } as const;
const password = {type:'set-google-password',passwordDigest:'a'.repeat(64),passwordLength:8} as const;
test('Google first use requires password and survives refresh without granting workspace access', () => {
  const first = transitionOnboarding(createOnboardingPreview(), auth);
  assert.equal(first.step, 'google-password'); assert.equal(first.verified, false);
  assert.deepEqual(restoreOnboardingPreview(JSON.stringify(first)),JSON.parse(JSON.stringify(first)));
  assert.equal(simplifyOnboardingEntry(first).step,'google-password');
  assert.equal(transitionOnboarding(first,{type:'create-team',name:'Blocked'}).teams.length,0);
  assert.equal(transitionOnboarding(first,{...password,passwordLength:7}).errorField,'password');
  const ready=transitionOnboarding(first,password); assert.equal(ready.step,'create'); assert.equal(ready.verified,true);
  const again = transitionOnboarding(transitionOnboarding(ready,{type:'switch-account'}),auth);
  assert.equal(again.step,'choose'); assert.equal(Object.keys(again.accounts).length,Object.keys(first.accounts).length);
});
test('Google password setup preserves invitation before separate join confirmation',()=>{
  const pending=transitionOnboarding(createOnboardingPreview('invited'),auth);
  assert.equal(pending.step,'google-password'); assert.equal(pending.inviteToken,'demo-valid');
  const ready=transitionOnboarding(pending,password);
  assert.equal(ready.step,'invite'); assert.equal(ready.teams.length,0); assert.equal(ready.inviteToken,'demo-valid');
});
test('Google does not merge existing password account or accept password setup without verified Google return',()=>{
  const initial=createOnboardingPreview();
  const next=transitionOnboarding(initial,{...auth,email:'zhoulan@example.com'});
  assert.equal(next.verified,false); assert.ok(next.error); assert.deepEqual(next.accounts,initial.accounts);
  assert.deepEqual(transitionOnboarding(initial,password),initial);
});
test('Google and email password login reuse the same account and teams',()=>{
  const created=transitionOnboarding(transitionOnboarding(createOnboardingPreview(),auth),password);
  const team=transitionOnboarding(created,{type:'create-team',name:'Demo team'});
  const loggedOut=transitionOnboarding(team,{type:'switch-account'});
  assert.equal(transitionOnboarding(loggedOut,{type:'login',email:auth.email,passwordDigest:''}).verified,false);
  for(const action of [auth,{type:'login',email:auth.email,passwordDigest:password.passwordDigest}] as const){
    const returning=transitionOnboarding(loggedOut,action); assert.equal(returning.step,'workspace'); assert.equal(returning.activeTeamId,team.activeTeamId);
  }
});
test('legacy Google accounts without passwords must set one and retain their team',()=>{
  const pending=transitionOnboarding(createOnboardingPreview(),auth);
  const legacy={...pending,verified:true,step:'workspace' as const,teams:[{id:'old',name:'Old team',role:'member' as const}],activeTeamId:'old'};
  const restored=restoreOnboardingPreview(JSON.stringify(legacy))!;
  assert.equal(restored.step,'google-password'); assert.equal(restored.verified,false);
  assert.equal(simplifyOnboardingEntry(legacy).step,'google-password');
  const ready=transitionOnboarding(restored,password); assert.equal(ready.activeTeamId,'old'); assert.equal(ready.step,'workspace');
});
