import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageRecycledTask, RECYCLE_BIN_KEY, RETENTION_MS, recycleTask, changeRecycledTasks, readRecycleBin } from '../src/lib/taskRecycleBin.ts';
import { getTaskDeletionPreview, getTaskDeletionWrites, type SubtaskWorkspaceState } from '../src/lib/workspaceSubtaskEditing.ts';
import { commitTaskAiStorage } from '../src/lib/taskAiAdjustmentStorage.ts';
import type { TeamResponsibilityProfile } from '../src/data/memberProfiles.ts';
import type { TaskNode } from '../src/data/workspaceNodes.ts';
const task = (id: string, props: Partial<TaskNode> = {}): TaskNode => ({ id, name:id, kind:'task', teamId:'team', parentId:'workspace-root', ownerId:'owner', status:'进行中', updatedAt:'昨天', ...props });
const team = { id:'team', memberships:[{memberId:'team-owner',status:'active',role:'owner'}, {memberId:'owner', status:'active',role:'member'}, {memberId:'admin',status:'active',role:'admin'}, {memberId:'other',status:'active',role:'member'}] } as TeamResponsibilityProfile;
const state = (): SubtaskWorkspaceState => ({ nodes:[task('parent'),task('root',{parentTaskId:'parent'}),task('child',{parentTaskId:'root',ownerId:'former',participantIds:['other','former']})], activities:{root:[]},detailSeeds:[],ownerProposals:{},participantInvitations:{},periodOverrides:{root:{start:'2026-09-01',end:'2026-09-02'}},legacySnapshots:{},latestLegacySnapshot:null });
const storage = () => { const map = new Map<string,string>(); return { getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);} }; };
const archive = (s = state()) => recycleTask(s,'root',getTaskDeletionPreview(s.nodes,'root').signature,team,'owner','Owner',storage(),1000);
test('delete archives whole branch and restoration preserves hierarchy, status and period',()=>{
 const {next,entries}=archive(); assert.deepEqual(next.nodes.map(n=>n.id),['parent']); assert.equal(entries[0].tasks.length,2);
 const restored=changeRecycledTasks(next,entries,[entries[0].id],'restore',team,'owner','other',1001);
 const child=restored.next.nodes.find(n=>n.id==='child') as TaskNode;
 assert.equal(child.parentTaskId,'root'); assert.equal(child.ownerId,'other'); assert.deepEqual(child.participantIds,['other']); assert.equal(child.status,'进行中'); assert.equal(restored.next.periodOverrides.root?.end,'2026-09-02'); assert.equal(restored.entries.length,0);
});
test('missing parent restores at top level; missing owner blocks whole selection',()=>{
 const {next,entries}=archive(); next.nodes=[];
 assert.throws(()=>changeRecycledTasks(next,entries,[entries[0].id],'restore',team,'team-owner','',1001),/新.*负责人/);
 const r=changeRecycledTasks(next,entries,[entries[0].id],'restore',team,'team-owner','other',1001);
 assert.equal((r.next.nodes.find(n=>n.id==='root') as TaskNode).parentTaskId,undefined); assert.equal(next.nodes.length,0);
});
test('permission, expiry, collisions and stale selections fail closed',()=>{
 const {next,entries}=archive(); const ids=[entries[0].id];
 assert.throws(()=>changeRecycledTasks(next,entries,ids,'purge',team,'other','',1001),/无权/);
 assert.throws(()=>changeRecycledTasks(next,entries,ids,'restore',team,'team-owner','other',1000+RETENTION_MS),/保留期/);
 assert.throws(()=>changeRecycledTasks({...next,nodes:[...next.nodes,task('root')]},entries,ids,'restore',team,'team-owner','other',1001),/冲突/);
 assert.throws(()=>changeRecycledTasks(next,entries,['missing'],'purge',team,'team-owner','',1001),/变化/);
 assert.throws(()=>changeRecycledTasks(next,entries,ids,'restore',{...team,id:'other'},'team-owner','other',1001),/无权/);
});
test('administrators cannot archive another owners live task',()=>{
 const s=state(); assert.throws(()=>recycleTask(s,'root',getTaskDeletionPreview(s.nodes,'root').signature,team,'admin','Admin',storage()),/负责人/);
});
test('archive participates in atomic storage transaction and purge cannot be restored',()=>{
 const s=storage(); const {next,entries}=archive(); s.setItem('agentdoor-workspace-nodes','before');
 const fail={...s,setItem:(k:string,v:string)=>{if(k===RECYCLE_BIN_KEY)throw Error('quota');s.setItem(k,v);}};
 assert.throws(()=>commitTaskAiStorage(fail,[...getTaskDeletionWrites(next),[RECYCLE_BIN_KEY,JSON.stringify(entries)]]));
 assert.equal(s.getItem('agentdoor-workspace-nodes'),'before'); assert.equal(s.getItem(RECYCLE_BIN_KEY),null);
 const r=changeRecycledTasks(next,entries,[entries[0].id],'purge',team,'team-owner','',1001); assert.equal(r.entries.length,0); assert.equal(r.next.nodes,next.nodes);
});
test('malformed storage is reported instead of an empty bin',()=>{assert.throws(()=>readRecycleBin({getItem:()=>'{bad'}));});

test('only active team owner or actual deleter can view, restore and purge recycled branches',()=>{
 const {next,entries}=archive(); const entry=entries[0]; const ids=[entry.id];
 assert.equal(canManageRecycledTask(entry,team,'team-owner'),true);
 assert.equal(canManageRecycledTask(entry,team,'owner'),true);
 for (const actor of ['admin','other','outsider']) {
  assert.equal(canManageRecycledTask(entry,team,actor),false);
  for (const action of ['restore','purge'] as const)
   assert.throws(()=>changeRecycledTasks(next,entries,ids,action,team,actor,'other',1001),/无权/);
 }
 const adminEntry={...entry,deletedBy:'admin'};
 assert.equal(canManageRecycledTask(adminEntry,team,'admin'),true);
 assert.equal(canManageRecycledTask(adminEntry,team,'owner'),false);
 for (const action of ['restore','purge'] as const)
  assert.equal(changeRecycledTasks(next,[adminEntry],ids,action,team,'admin','other',1001).entries.length,0);
 const demoted={...team,memberships:team.memberships.map(m=>m.memberId==='team-owner'?{...m,role:'admin' as const}:m)};
 assert.equal(canManageRecycledTask(entry,demoted,'team-owner'),false);
 const departed={...team,memberships:team.memberships.filter(m=>m.memberId!=='owner'&&m.memberId!=='team-owner')};
 assert.equal(canManageRecycledTask(entry,departed,'owner'),false);
 assert.equal(canManageRecycledTask(entry,departed,'team-owner'),false);
 const mixed=[entry,{...entry,id:'other-record',deletedBy:'other'}];
 assert.throws(()=>changeRecycledTasks(next,mixed,mixed.map(e=>e.id),'purge',team,'owner','',1001),/无权/);
 assert.equal(mixed.length,2);
});
test('team owners cannot delete live tasks unless they are the task owner',()=>{
 const s=state();
 assert.throws(()=>recycleTask(s,'root',getTaskDeletionPreview(s.nodes,'root').signature,team,'team-owner','Team owner',storage()),/负责人/);
});
