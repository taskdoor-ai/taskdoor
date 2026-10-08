import test from 'node:test';
import assert from 'node:assert/strict';
import {addPlanningCoreCases} from './test-lab/planning-core-cases.ts';
import {mcpConfigForCase} from './test-lab/mcp-member-context.ts';
import {executeMcpEvaluation} from './test-lab/mcp-execution.ts';
import type {LabState} from '../src/test-lab/types.ts';

test('核心用例30条分别覆盖自主拆解、成员匹配和组合，输入不泄漏工具规则',()=>{
 const state={teams:[{id:'lab-content',members:['zhou','lin','xu'].map((id,i)=>({id,name:['卜佳菲','林洁','tiger huang'][i],responsibilities:['职责'],version:1}))}],cases:[]} as unknown as LabState;
 assert.equal(addPlanningCoreCases(state),true);assert.equal(state.cases.length,30);
 for(const category of ['任务拆解','成员分配','拆解与分工'])assert.equal(state.cases.filter(c=>c.name.startsWith(category+' · ')).length,10);
 for(const c of state.cases){assert.ok(c.requiresMemberContext);assert.ok(!/MCP|工具|memberId|负责人是我/.test(c.steps[0].prompt));assert.ok(c.expectedOutput!.checks.length>=2);}
 const cfg={url:'https://example.com/mcp',token:'secret',workspaceId:state.teams[0].mcpWorkspaceId!};
 const config=mcpConfigForCase(cfg,state.teams[0],state.cases[0]);assert.equal(config.memberContext?.members.length,3);
 assert.throws(()=>mcpConfigForCase({...cfg,workspaceId:'other'},state.teams[0],state.cases[0]),/不一致/);
 assert.equal(addPlanningCoreCases(state),false);
});

test('职责在执行上下文中，用户原文保持自然；真实成员核对后允许分给非当前用户',async()=>{
 let turn=0;const cfg={url:'https://example.com/mcp',token:'secret',workspaceId:'w',memberContext:{source:'用户确认的评测职责',members:[{id:'writer',name:'林洁',responsibilities:['负责内容制作']}]}};
 const output=await executeMcpEvaluation(cfg,{apiKey:'key',endpoint:'https://example.com/responses',model:'test',maxOutputTokens:1000,timeoutMs:1000},'skill','帮我写一份新品文案，按职责安排。','r',new AbortController().signal,()=>{},async()=>({listTools:async()=>({tools:['create_task','get_task','list_workspace_members'].map(name=>({name,inputSchema:{type:'object'}}))}),callTool:async({name})=>({isError:false,structuredContent:name==='list_workspace_members'?{items:[{id:'writer',status:'ACTIVE',user:{displayName:'林洁'}}],page:{hasMore:false}}:{id:'real-task',workspaceId:'w',ownerMemberId:'writer'}}),close:async()=>{}}),async(_url,init)=>{
  const request=JSON.parse(String(init?.body));assert.equal(request.input[0].content,'帮我写一份新品文案，按职责安排。');assert.ok(request.instructions.includes('负责内容制作'));assert.ok(!request.input[0].content.includes('writer'));
  return Response.json({output:turn++===0?[{type:'function_call',name:'create_task',call_id:'c',arguments:JSON.stringify({workspaceId:'w',ownerMemberId:'writer',title:'新品文案'})}]:[{type:'message',content:[{type:'output_text',text:'{"summary":"已创建"}'}]}]});
 });
 assert.deepEqual(JSON.parse(output.rawOutput).createdTaskIds,['real-task']);
});

test('绑定成员未加入时，在模型调用及写入之前停止',async()=>{
 let modelCalls=0;let writes=0;
 await assert.rejects(()=>executeMcpEvaluation({url:'https://example.com/mcp',token:'secret',workspaceId:'w',memberContext:{source:'配置',members:[{id:'invited',name:'林洁',responsibilities:['制作']}] }},{apiKey:'key',endpoint:'https://example.com/responses',model:'test',maxOutputTokens:1000,timeoutMs:1000},'skill','创建','r',new AbortController().signal,()=>{},async()=>({listTools:async()=>({tools:['create_task','get_task','list_workspace_members'].map(name=>({name,inputSchema:{type:'object'}}))}),callTool:async({name})=>{if(name!=='list_workspace_members')writes++;return {isError:false,structuredContent:{items:[],page:{hasMore:false}}};},close:async()=>{}}),async()=>{modelCalls++;return Response.json({});}),/未加入/);
 assert.equal(modelCalls,0);assert.equal(writes,0);
});
