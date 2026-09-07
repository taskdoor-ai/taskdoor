import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLabStore } from './test-lab/store.ts';
import { seedLab } from './test-lab/seeds.ts';
import { importLibrary } from './test-lab/library.ts';
import { guardRequest } from './test-lab/plugin.ts';
test('历史库幂等迁移 60 单轮与 4 多轮，默认启用八个跨行业典型团队',()=>{
  const store=createLabStore(join(mkdtempSync(join(tmpdir(),'lab-library-')),'state.json'),seedLab());
  const result=importLibrary(store);assert.equal(result.imported,64);assert.ok(result.state.cases.filter(c=>c.origin).every(c=>!c.enabled&&c.legacyInput));
  const active=result.state.teams.filter(team=>!team.archived);assert.equal(active.length,8);assert.equal(new Set(active.map(team=>team.industry)).size,8);
  assert.deepEqual(active.map(team=>team.id).sort(),['lab-content','lab-legal','lab-short-video','import-REAL-A-ECOM-01','import-REAL-A-SAAS-01','import-REAL-A-REL-01','import-REAL-A-CS-01','import-REAL-C-03'].sort());
  assert.equal(importLibrary(store).imported,0);
});
test('本地守卫拒绝跨站、伪造 Host 和缺少 CSRF 的写入',()=>{
  const headers={host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173','x-test-lab-csrf':'token','content-type':'application/json'};
  assert.doesNotThrow(()=>guardRequest('POST',headers,'127.0.0.1','token'));
  assert.throws(()=>guardRequest('POST',{...headers,origin:'https://evil.example'},'127.0.0.1','token'));
  assert.throws(()=>guardRequest('GET',{host:'evil.example'},'127.0.0.1','token'));
  assert.throws(()=>guardRequest('POST',{...headers,'x-test-lab-csrf':''},'127.0.0.1','token'));
  assert.throws(()=>guardRequest('GET',headers,'192.168.0.2','token'));
});
