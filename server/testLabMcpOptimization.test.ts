import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {loadSkill,productionSnapshot} from './test-lab/skills.ts';
import {executeMcpEvaluation,constrainToolCall} from './test-lab/mcp-execution.ts';
import {createLabStore} from './test-lab/store.ts';
import {seedLab} from './test-lab/seeds.ts';
import {createRunner} from './test-lab/runner.ts';
const options={apiKey:'test',endpoint:'https://example.test/responses',model:'test',timeoutMs:1000,maxOutputTokens:1000};
test('production instructions select frozen files; missing references fail rather than loading current files',()=>{
 const current=loadSkill('agentdoor-task-planner');assert.equal(current.outputMode,'preview');
 assert.equal(current.productionInstructions,current.instructions);assert.ok(current.previewSchema);
 assert.match(current.instructions,/taskdoor.task-preview.v1/);assert.doesNotMatch(current.instructions,/真实 MCP 执行，按工具契约创建/);
 const old='--- FILE: skills/agentdoor-task-planner/SKILL.md ---\nold entry';
 assert.equal(productionSnapshot('agentdoor-task-planner',old),old);
 const manifest='\n--- FILE: skills/agentdoor-task-planner/references/production-runtime.json ---\n'+JSON.stringify({version:1,files:['skills/agentdoor-task-planner/SKILL.md']});
 assert.equal(productionSnapshot('agentdoor-task-planner',old+manifest).trim(),old);
 assert.throws(()=>productionSnapshot('agentdoor-task-planner',old+manifest.replace('SKILL.md"]','missing.md","skills/agentdoor-task-planner/SKILL.md"]')),/缺少冻结文件/);
});
test('member preflight is visible to the model; independent tasks parallelize, final read cache invalidates after writes',async()=>{
 let turn=0,active=0,max=0;const counts:Record<string,number>={};const taskData=new Map<string,any>();
 const call=(name:string,args:unknown,i:number)=>({type:'function_call',name,arguments:JSON.stringify(args),call_id:String(i)});
 const a=(taskId:string)=>({workspaceId:'w',taskId});
 const response=await executeMcpEvaluation({url:'https://example.test/mcp',token:'t',workspaceId:'w',memberContext:{source:'confirmed',members:[{id:'m',name:'Member',responsibilities:['copy']}] }},options,'skill','create','r',new AbortController().signal,()=>{},async()=>({listTools:async()=>({tools:['list_workspace_members','create_task','get_task','set_task_criteria'].map(name=>({name,inputSchema:{type:'object'}}))}),close:async()=>{},callTool:async({name,arguments:args})=>{
  counts[name]=(counts[name]??0)+1;active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,5));active--;
  let data:any;
  if(name==='list_workspace_members')data={items:[{id:'m',status:'ACTIVE',user:{displayName:'Member'}}],page:{hasMore:false}};
  if(name==='create_task'){data={id:String(args.title),workspaceId:'w',goal:'deliver',criteria:{version:0,items:[]}};taskData.set(data.id,data);}
  if(name==='get_task')data=structuredClone(taskData.get(String(args.taskId)));
  if(name==='set_task_criteria'){taskData.get(String(args.taskId)).criteria={version:1,items:args.criteria};data={version:1};}
  return {structuredContent:data,content:[{type:'text',text:JSON.stringify(data)}]};
 }}),async(_url,init)=>{
  const request=JSON.parse(String(init?.body));assert.equal(request.parallel_tool_calls,true);assert.ok(request.tools.every((tool:any)=>!['list_workspaces','list_workspace_members'].includes(tool.name)));assert.match(JSON.stringify(request.input),/Member/);
  if(turn>0)for(const output of request.input.filter((o:any)=>o.type==='function_call_output'))assert.equal(JSON.parse(output.output).content,undefined);
  const sequence=[
   [call('list_workspace_members',{workspaceId:'w',status:'ACTIVE'},0),...['a','b'].map((title,i)=>call('create_task',{workspaceId:'w',ownerMemberId:'m',title},i+1))],
   ['a','b'].map((id,i)=>call('get_task',a(id),i+3)),
   ['a','b'].map((id,i)=>call('set_task_criteria',{...a(id),version:0,criteria:[{text:'deliver'}]},i+5)),
   ['a','b'].map((id,i)=>call('get_task',a(id),i+7)),
   [{type:'message',content:[{type:'output_text',text:'done'}]}]
  ];return Response.json({output:sequence[turn++],usage:{input_tokens:2,output_tokens:1}});
 });
 const result=JSON.parse(response.rawOutput);assert.equal(counts.list_workspace_members,1);assert.equal(counts.get_task,4);assert.equal(max,2);assert.equal(result.tasks.length,2);assert.ok(result.tasks.every((t:any)=>t.criteria.version===1));assert.equal(result.metrics.modelRounds.length,5);
 assert.throws(()=>constrainToolCall('set_task_dependencies',{workspaceId:'w',taskId:'a',dependsOnTaskIds:['old']},'w',new Set(['a']),'r'),/依赖/);
});
test('run journals restore receipts and revision without rewriting history; checkpoint ignores stale journal',async()=>{
 const path=join(mkdtempSync(join(tmpdir(),'mcp-journal-')),'state.json');const store=createLabStore(path,seedLab());
 const runner=createRunner(store,options,async()=>({rawOutput:'invalid',usage:{inputTokens:1,outputTokens:2,totalTokens:3}}));
 const base=readFileSync(path,'utf8');const [run]=runner.enqueue(['case-status'],'journal');await runner.idle();
 assert.equal(readFileSync(path,'utf8'),base);
 const restored=createLabStore(path,seedLab());assert.equal(restored.getRun(run.id)?.steps[0].rawOutput,'invalid');assert.equal(restored.get().revision,store.get().revision);
 const state=restored.get();restored.save(state.revision,state.teams,state.cases);
 assert.equal(createLabStore(path,seedLab()).get().revision,restored.get().revision);
});
test('two batches share generation capacity; a slow judge does not hold generation slots',async()=>{
 const seed=seedLab();seed.judgeEnabled=true;const store=createLabStore(join(mkdtempSync(join(tmpdir(),'mcp-fair-')),'state.json'),seed);
 let active=0,max=0;let releaseJudge:()=>void=()=>{};
 const gate=new Promise<void>(resolve=>{releaseJudge=resolve;});let judged=false;
 const engine={check(){},close(){},async run(runs:any[],execute:(id:string)=>Promise<unknown>){await Promise.all(runs.map(run=>execute(run.id)));}};
 const runner=createRunner(store,options,async()=>{active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,5));active--;return {rawOutput:'invalid',usage:{inputTokens:1,outputTokens:1,totalTokens:2}};},engine,{model:'judge',configured:true,review:async id=>{judged=true;await gate;return store.getRun(id)!;}});
 const first=runner.enqueue(['case-status','case-responsibility'],'batch-a',{judgeModel:'judge'});
 const second=runner.enqueue(['case-status'],'batch-b');
 for(let i=0;i<100&&!store.getRun(second[0].id)?.finishedAt;i++)await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(judged,true);assert.ok(store.getRun(second[0].id)?.finishedAt);assert.equal(max,2);assert.ok(first.every(run=>store.getRun(run.id)?.finishedAt));releaseJudge();await runner.idle();runner.close();
});
test('receipt validation reports missing criteria and wrong participants instead of claiming creation is complete',async()=>{
 const {checkMcpReceipts}=await import('./test-lab/mcp-receipt-check.ts');
 const task={id:'t',workspaceId:'w',title:'copy',goal:'deliver',ownerMemberId:'m',criteria:{items:[{text:'deliver'}]}};
 const trace:any[]=[{name:'create_task',arguments:{},status:'completed',result:{structuredContent:task}},{name:'set_task_member',arguments:{taskId:'t',memberId:'reviewer',role:'MEMBER'},status:'completed',result:{structuredContent:{}}}];
 assert.throws(()=>checkMcpReceipts([{...task,criteria:{items:[]}}],{},trace),/未保存可回读的完成标准/);
 assert.throws(()=>checkMcpReceipts([task],{t:{items:[]}},trace),/参与者未正确保存/);
 assert.doesNotThrow(()=>checkMcpReceipts([task],{t:{items:[{memberId:'reviewer',role:'MEMBER'}]}},trace));
});
