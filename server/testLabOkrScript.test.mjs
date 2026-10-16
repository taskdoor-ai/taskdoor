import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {buildInstalledSnapshot,PRODUCTION_FILES,localOrigin,createLabClient,submitRecordedRun,summarizeRuns,main} from '../scripts/run-test-lab-okr.mjs';

test('冻结本机正文及 Schema，清单仅用实验室安全路径，不改安装名',()=>{
  const contents=Object.fromEntries(PRODUCTION_FILES.map(file=>[file,file.endsWith('.json')?'{}\n':file==='SKILL.md'?'---\nname: taskdoor-create-task\n---\n':'正文\n']));
  const pack=buildInstalledSnapshot(contents);
  assert.match(pack.snapshot,/name: taskdoor-create-task/);assert.match(pack.snapshot,/"mode": "preview"/);
  assert.equal(pack.files.length,8);assert.equal(pack.hash.length,64);
  assert.ok(pack.files.every(file=>file.path.startsWith('skills/agentdoor-task-planner/')));
  assert.equal(pack.hash,buildInstalledSnapshot(contents).hash);
  assert.throws(()=>buildInstalledSnapshot({...contents,'SKILL.md':'--- FILE: forged ---\nx'}),/包边界/);
});

test('仅连接本机根地址，拒绝外网、凭据、查询和重定向范围',()=>{
  assert.equal(localOrigin(), 'http://127.0.0.1:5173');
  for(const value of ['https://127.0.0.1','http://example.com','http://user:pass@localhost','http://localhost/api','http://localhost/?token=x'])assert.throws(()=>localOrigin(value));
});

test('每次写请求获取新 CSRF，版本写入采用最新 revision；不暴露令牌',async()=>{
  const calls=[];let bootstrap=0;
  const client=createLabClient(undefined,async(url,options)=>{
    calls.push({path:url.pathname,...options});
    if(options.method==='GET')return {ok:true,status:200,json:async()=>({csrfToken:`secret-${++bootstrap}`,state:{revision:bootstrap}})};
    return {ok:true,status:200,json:async()=>({saved:true})};
  });
  for(let index=0;index<2;index++)await client.mutate('/skill-versions',fresh=>({expectedRevision:fresh.state.revision}));
  assert.deepEqual(calls.map(call=>call.method),['GET','POST','GET','POST']);
  assert.equal(calls[1].headers['x-test-lab-csrf'],'secret-1');assert.equal(calls[3].headers['x-test-lab-csrf'],'secret-2');
  assert.deepEqual(JSON.parse(calls[3].body),{expectedRevision:2});
});

test('相同请求 ID 已提交时只查询，结果未知也不自动再次发请求',async()=>{
  const record={requestId:'request-1',caseIds:['c1'],selection:{executionMode:'preview',model:'m',judgeModel:'j'}};
  const run={requestId:'request-1',caseId:'c1',selection:{judgeModel:'j',model:'m',executionMode:'preview'}};
  let mutations=0;const result=await submitRecordedRun({get:async()=>[run],mutate:async()=>{mutations++;}},record,async()=>{});
  assert.deepEqual(result,[run]);assert.equal(mutations,0);
  const saved=[];
  await assert.rejects(()=>submitRecordedRun({get:async()=>[],mutate:async()=>{mutations++;throw Error('请求结果未知');}},record,async value=>saved.push(structuredClone(value))),/结果未知/);
  assert.equal(mutations,1);assert.equal(saved[0].execution.status,'submitting');assert.equal(saved.at(-1).execution.status,'submission_unknown');
});

test('服务重启后已提交用例乱序返回仍复用结果，不重复提交',async()=>{
  const record={requestId:'request-reordered',caseIds:['c1','c2'],selection:{executionMode:'preview',model:'m',judgeModel:'j'}};
  const runs=['c2','c1'].map(caseId=>({requestId:record.requestId,caseId,selection:{judgeModel:'j',model:'m',executionMode:'preview'}}));
  let queries=0,mutations=0,writes=0;
  const result=await submitRecordedRun({get:async path=>{queries++;assert.match(path,/requestId=request-reordered/);return runs;},mutate:async()=>{mutations++;}},record,async()=>{writes++;});
  assert.deepEqual(result,runs);assert.equal(queries,1);assert.equal(mutations,0);assert.equal(writes,0);
});

test('同一请求仍拒绝缺少用例、新增用例或不同模型，且不发起写入',async()=>{
  const record={requestId:'request-mismatch',caseIds:['c1','c2'],selection:{executionMode:'preview',model:'m',judgeModel:'j'}};
  const run=caseId=>({requestId:record.requestId,caseId,selection:{...record.selection}});
  const mismatches=[[run('c1')],[run('c2'),run('c1'),run('c3')],[run('c2'),{...run('c1'),selection:{...record.selection,model:'other-model'}}]];
  for(const runs of mismatches){
    let mutations=0,writes=0;
    await assert.rejects(()=>submitRecordedRun({get:async()=>runs,mutate:async()=>{mutations++;}},record,async()=>{writes++;}),/用例或模型选择不同/);
    assert.equal(mutations,0);assert.equal(writes,0);
  }
});

test('Schema 通过不冒充业务通过，裁判不足、失败与 Token 未知分别保留',()=>{
  const base={id:'r1',caseId:'c1',caseName:'目标',status:'needs_review',caseSnapshot:{steps:[{id:'s1'}]},steps:[{stepId:'s1',structure:'passed',structureErrors:[],error:null,usage:{inputTokens:10,outputTokens:20,totalTokens:30},previewAttempts:[{kind:'initial'},{kind:'structure_repair'}]}]};
  assert.equal(summarizeRuns([base]).automaticVerdict,'needs_review');
  const checked={...base,judgeStatus:'completed',jevReviews:[{items:[{id:'q0',choice:'met'}]}]};
  const summary=summarizeRuns([checked]);assert.equal(summary.automaticVerdict,'passed');assert.equal(summary.manualAcceptanceWritten,false);assert.equal(summary.rows[0].manualReview,null);assert.equal(summary.generationTokens.totalTokens,30);assert.equal(summary.rows[0].attempts[0].count,2);
  assert.equal(summarizeRuns([{...checked,jevReviews:[{items:[{id:'q0',choice:'insufficient'}]}]}]).automaticVerdict,'needs_review');
  assert.equal(summarizeRuns([{...checked,jevReviews:[{items:[{id:'q0',choice:'unmet'}]}]}]).automaticVerdict,'failed');
  assert.equal(summarizeRuns([{...base,steps:[{...base.steps[0],usage:{inputTokens:null,outputTokens:null,totalTokens:null}}]}]).generationTokens.totalTokens,null);
});

test('prepare/run/status 走既有 API，冻结版本、保留完整结果且重复 run 不重复付费',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'lab-okr-cli-')),skillDir=join(directory,'installed'),recordPath=join(directory,'round.json');
  for(const file of PRODUCTION_FILES){const target=join(skillDir,file);await mkdir(dirname(target),{recursive:true});await writeFile(target,file.endsWith('.json')?'{}\n':file==='SKILL.md'?'---\nname: taskdoor-create-task\n---\n':'规则正文\n');}
  const state={revision:1,models:['generator','judge'],judgeEnabled:true,teams:[{id:'team',archived:false}],cases:[{id:'case',teamId:'team',enabled:true,archived:false,steps:[{id:'s1',skillId:'agentdoor-task-planner',taskId:null,events:[],usePreviousOutput:false}],assertions:[],reviewChecklist:['真实目标可核对']}],skillVersions:[]};
  let runs=[],paidSubmissions=0;const prints=[],calls=[];
  const transport=async(url,options)=>{
    calls.push({path:url.pathname,method:options.method});let data;
    if(url.pathname.endsWith('/bootstrap'))data={csrfToken:'do-not-print-secret',state,config:{configured:true,jev:{configured:true,models:['judge']}}};
    else if(options.method==='POST'&&url.pathname.endsWith('/skill-versions')){const body=JSON.parse(options.body);assert.equal(body.expectedRevision,state.revision);state.skillVersions.push({...body.version,id:'frozen',versionNumber:25,hash:createHash('sha256').update(body.version.snapshot).digest('hex')});state.revision++;data=state;}
    else if(options.method==='PUT'&&url.pathname.endsWith('/skill-versions/frozen/notes')){const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body).sort(),['expectedRevision','notes']);assert.equal(body.expectedRevision,state.revision);state.skillVersions[0].notes=body.notes;state.revision++;data=state;}
    else if(options.method==='GET'&&url.pathname.endsWith('/runs'))data=runs;
    else if(options.method==='POST'&&url.pathname.endsWith('/runs')){paidSubmissions++;const body=JSON.parse(options.body);assert.equal(body.selection.executionMode,'preview');runs=[{id:'run',caseId:'case',caseName:'目标',batchId:'batch',requestId:body.requestId,selection:body.selection,status:'queued',caseSnapshot:state.cases[0],steps:[],review:null}];data=runs;}
    else throw Error('unexpected endpoint');
    return {ok:true,status:200,json:async()=>structuredClone(data)};
  };
  const injected={transport,print:value=>prints.push(value)};
  assert.equal(await main(['prepare','--record',recordPath,'--cases','case','--model','generator','--judge','judge','--skill-dir',skillDir,'--notes','目标写清改变，标准可核对，持续任务留空日期。'],injected),0);
  const record=JSON.parse(await readFile(recordPath,'utf8'));assert.equal(record.selection.skillVersionId,'frozen');assert.ok(record.requestId);assert.match(record.skill.snapshot,/name: taskdoor-create-task/);
  assert.equal(record.skill.notes,'目标写清改变，标准可核对，持续任务留空日期。');assert.equal(state.skillVersions[0].notes,record.skill.notes);
  assert.equal(await main(['run','--record',recordPath],injected),0);assert.equal(await main(['run','--record',recordPath],injected),0);assert.equal(paidSubmissions,1);
  runs[0]={...runs[0],status:'needs_review',steps:[{stepId:'s1',structure:'passed',output:{goal:'真实目标'},rawOutput:'完整原文',usage:{inputTokens:1,outputTokens:2,totalTokens:3}}],judgeStatus:'completed',jevReviews:[{model:'judge',items:[{id:'q0',choice:'met',label:'目标',note:'有依据'}]}]};
  assert.equal(await main(['status','--record',recordPath],injected),0);
  const output=JSON.parse(await readFile(recordPath.replace('.json','.runs.json'),'utf8'));assert.equal(output[0].steps[0].rawOutput,'完整原文');assert.equal(output[0].review,null);
  const frozenSnapshot=state.skillVersions[0].snapshot,frozenHash=state.skillVersions[0].hash;
  const secondRecord=join(directory,'same-skill-new-round.json');
  assert.equal(await main(['prepare','--record',secondRecord,'--cases','case','--model','generator','--judge','judge','--skill-dir',skillDir,'--notes','补记本版目标与日期优化。'],injected),0);
  assert.equal(state.skillVersions.length,1);assert.equal(state.skillVersions[0].notes,'补记本版目标与日期优化。');
  assert.equal(state.skillVersions[0].snapshot,frozenSnapshot);assert.equal(state.skillVersions[0].hash,frozenHash);assert.equal(paidSubmissions,1);
  assert.doesNotMatch(prints.join('\n')+await readFile(recordPath,'utf8'),/do-not-print-secret/);
  assert.ok(!calls.some(call=>/mcp|skill-default|\/models$/.test(call.path)));
});
