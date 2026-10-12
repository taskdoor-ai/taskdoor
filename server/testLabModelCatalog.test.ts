import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fetchModelCatalog} from './test-lab/model-catalog.ts';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import {JUDGE_MODELS,evaluateWithFallback} from './test-lab/judge-fallback.ts';

test('服务目录使用 models 路径并验证、去重，不接受空目录',async()=>{
 for(const endpoint of ['https://example.com/v1/responses','https://example.com/v1/chat/completions']){
  const models=await fetchModelCatalog(endpoint,'key',async(url,init)=>{assert.equal(String(url),'https://example.com/v1/models');assert.equal((init?.headers as any).Authorization,'Bearer key');return Response.json({data:[{id:'qwen/current'},{id:'deepseek/current'},{id:'qwen/current'}]});});
  assert.deepEqual(models,['deepseek/current','qwen/current']);
 }
 for(const body of [{data:[]},{data:[{id:''}]},{}])await assert.rejects(()=>fetchModelCatalog('https://example.com/responses','key',async()=>Response.json(body)),/格式无效或为空/);
 await assert.rejects(()=>fetchModelCatalog('https://example.com/responses','key',async()=>new Response('SECRET',{status:401})),e=>e instanceof Error&&e.message.includes('原配置已保留')&&!e.message.includes('SECRET'));
});
test('同步权威目录停用下架型号，保留历史记录和 Skill；失败、旧修订不改变配置',()=>{
 const path=join(mkdtempSync(join(tmpdir(),'lab-models-')),'state.json');const store=createLabStore(path,seedLab());
 store.saveModels(store.getLibrary().revision,['qwen/old','qwen/current']);
 store.updateRuns(runs=>runs.push({id:'historical',model:'qwen/old',teamSnapshot:store.getLibrary().teams[0],steps:[]} as any));
 const before=store.get();const original=structuredClone({cases:before.cases,teams:before.teams,runs:before.runs,skillVersions:before.skillVersions});
 const result=store.syncModelCatalog(before.revision,['qwen/current','deepseek/current','qwen/current']);
 assert.deepEqual(result.removedModels,['qwen/old']);
 const after=store.get();assert.deepEqual(after.modelCatalog,['deepseek/current','qwen/current']);assert.deepEqual(after.models,['qwen/current']);assert.ok(after.modelCatalogSyncedAt);
 assert.deepEqual({cases:after.cases,teams:after.teams,runs:after.runs,skillVersions:after.skillVersions},original);
 assert.throws(()=>store.syncModelCatalog(before.revision,['qwen/old']),/版本/);
 assert.throws(()=>store.syncModelCatalog(after.revision,[]));
 assert.throws(()=>store.saveModels(after.revision,['qwen/old']),/可用目录/);
 assert.deepEqual(store.get(),after);
 assert.deepEqual(createLabStore(path,seedLab()).get().models,['qwen/current']);
});
test('判断模型移除旧 Qwen，无法调用不在可用目录里的裁判',async()=>{
 assert.ok(JUDGE_MODELS.includes('qwen/qwen3.7-plus'));assert.ok(!JUDGE_MODELS.includes('qwen/qwen3.6-plus'));
 let called=false;
 await assert.rejects(()=>evaluateWithFallback({selection:{judgeModel:'qwen/qwen3.7-plus'}} as any,{model:'jev',timeoutMs:1000},{apiKey:'test',endpoint:'https://example.com/responses',model:'qwen/qwen3.7-plus',maxOutputTokens:1000,timeoutMs:1000,availableModels:['deepseek/deepseek-v4.1-flash']},undefined,async()=>{called=true;throw Error('不应调用');}),/判断模型/);
 assert.equal(called,false);
});
