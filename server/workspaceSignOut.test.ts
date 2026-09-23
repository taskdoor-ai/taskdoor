import test from 'node:test';
import assert from 'node:assert/strict';
import { signOutWorkspace, workspaceSessionKey, onboardingStorageKey } from '../src/lib/workspaceSession';
import { createOnboardingPreview, transitionOnboarding, restoreOnboardingPreview } from '../src/lib/onboardingPreview';

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
