import test from 'node:test';
import assert from 'node:assert/strict';
import { signOutWorkspace, workspaceSessionKey, workspaceSignedOutKey, onboardingStorageKey } from '../src/shared/lib/workspace-session';
import { createOnboardingPreview, previewDemoEmail, transitionOnboarding, restoreOnboardingPreview } from '../src/features/auth/lib/onboarding-preview';
import * as workspace from '../src/features/auth/lib/onboarding-workspace';

test('logout clears authentication, keeps accounts and teams, and navigates to login', () => {
  const storage = new Map<string,string>();
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let destination = '';
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)}});
  Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{assign:(url:string)=>{destination=url;}}}});
  try {
    let state = transitionOnboarding(createOnboardingPreview(), {type:'google-preview-complete',email:'alex@example.com',name:'Alex',subject:'demo-alex'});
    state = transitionOnboarding(state,{type:'create-team',name:'My team'});
    storage.set(onboardingStorageKey,JSON.stringify(state));
    storage.set(workspaceSessionKey,'session');
    signOutWorkspace();
    assert.equal(destination,'/login');
    assert.equal(storage.has(workspaceSessionKey),false);
    const loggedOut = restoreOnboardingPreview(storage.get(onboardingStorageKey)! )!;
    assert.equal(loggedOut.verified,false);
    assert.equal(loggedOut.step,'email');
    assert.deepEqual(loggedOut.accounts,state.accounts);
    const back = transitionOnboarding(loggedOut,{type:'google-preview-complete',email:'alex@example.com',name:'Alex',subject:'demo-alex'});
    assert.equal(back.step,'workspace');
    assert.equal(back.activeTeamId,state.activeTeamId);
  } finally {
    if(previousStorage) Object.defineProperty(globalThis,'sessionStorage',previousStorage); else Reflect.deleteProperty(globalThis,'sessionStorage');
    if(previousWindow) Object.defineProperty(globalThis,'window',previousWindow); else Reflect.deleteProperty(globalThis,'window');
  }
});

test('changing the signed-in account password saves only after verification and clears its workspace session', (t) => {
  assert.equal(typeof workspace.readWorkspacePasswordChange, 'function');
  const email = 'alex@example.com';
  const oldDigest = 'a'.repeat(64);
  const newDigest = 'b'.repeat(64);
  const initial = createOnboardingPreview();
  initial.accounts[email] = { name: 'Alex', passwordDigest: oldDigest, teams: [], activeTeamId: '' };
  const session = JSON.stringify({ userId: 'alex', email, name: 'Alex', activeTeamId: '' });
  const saved = JSON.stringify(initial);
  const storage = new Map([[workspaceSessionKey, session], [onboardingStorageKey, saved]]);
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  let failSave = false;
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failSave && key === onboardingStorageKey) throw new Error('Storage unavailable');
      storage.set(key, value);
    },
    removeItem: (key: string) => storage.delete(key),
  } });
  t.after(() => {
    if (previousStorage) Object.defineProperty(globalThis, 'sessionStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  });

  const recovery = workspace.readWorkspacePasswordChange()!;
  assert.equal(recovery.email, email);
  const sent = transitionOnboarding(recovery, { type: 'forgot-password', email, now: 1000 });
  assert.throws(() => workspace.saveWorkspacePasswordChange(sent, newDigest, 8));
  const checked = transitionOnboarding(sent, { type: 'verify-code', code: '654321', now: 2000 });
  storage.set(workspaceSessionKey, JSON.stringify({ userId: 'other', email: previewDemoEmail, name: 'Other', activeTeamId: '' }));
  assert.throws(() => workspace.saveWorkspacePasswordChange(checked, newDigest, 8), /账号或验证状态已变化/);
  assert.equal(storage.get(onboardingStorageKey), saved);
  storage.set(workspaceSessionKey, session);
  const short = workspace.saveWorkspacePasswordChange(checked, newDigest, 7);
  assert.match(short.error, /8/);
  failSave = true;
  assert.throws(() => workspace.saveWorkspacePasswordChange(checked, newDigest, 8));
  assert.equal(storage.get(workspaceSessionKey), session);
  assert.equal(storage.get(onboardingStorageKey), saved);
  assert.equal(storage.has(workspaceSignedOutKey), false);

  failSave = false;
  workspace.saveWorkspacePasswordChange(checked, newDigest, 8);
  const loggedOut = restoreOnboardingPreview(storage.get(onboardingStorageKey)!)!;
  assert.equal(loggedOut.verified, false);
  assert.match(loggedOut.notice, /重新登录/);
  assert.equal(storage.has(workspaceSessionKey), false);
  assert.equal(storage.get(workspaceSignedOutKey), '1');
  assert.equal(workspace.readWorkspacePasswordChange(), null);
  assert.deepEqual(loggedOut.accounts, { ...initial.accounts, [email]: { ...initial.accounts[email], passwordDigest: newDigest } });
  assert.equal(transitionOnboarding(loggedOut, { type: 'login', email, passwordDigest: oldDigest }).verified, false);
  assert.equal(transitionOnboarding(loggedOut, { type: 'login', email, passwordDigest: newDigest }).verified, true);
});
