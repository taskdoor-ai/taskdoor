import test from 'node:test';import assert from 'node:assert/strict';
import {constrainToolCall,executeMcpEvaluation} from './test-lab/mcp-execution.ts';
test('MCP writes stay in the configured workspace and on newly created tasks',()=>{
 assert.throws(()=>constrainToolCall('create_task',{workspaceId:'other'},'w',new Set(),'r'),/工作区/);
 assert.throws(()=>constrainToolCall('update_task',{workspaceId:'w',taskId:'old'},'w',new Set(),'r'),/本次/);
 assert.throws(()=>constrainToolCall('delete_task',{workspaceId:'w',taskId:'new'},'w',new Set(['new']),'r'),/不允许/);
 const a={workspaceId:'w',title:'task',ownerMemberId:'m'};
 assert.deepEqual(constrainToolCall('create_task',a,'w',new Set(),'r'),constrainToolCall('create_task',a,'w',new Set(),'r'));
});
test('Real execution consumes tool calls and reads the returned task ID, not the model summary',async()=>{
 let turn=0;const called:string[]=[];let saved:any;
 const output=await executeMcpEvaluation({url:'https://example.com/mcp',token:'secret',workspaceId:'w'},{apiKey:'key',endpoint:'https://example.com/responses',model:'test',maxOutputTokens:1000,timeoutMs:1000},'skill','create a task','run',new AbortController().signal,(trace,ids)=>{saved={trace,ids};},async()=>({listTools:async()=>({tools:['create_task','get_task'].map(name=>({name,inputSchema:{type:'object'}}))}),callTool:async({name,arguments:a})=>{called.push(name);if(name==='get_task')assert.equal(a.taskId,'real-id');return {isError:false,structuredContent:{id:'real-id',workspaceId:'w',title:'task'}};},close:async()=>{}}),async()=>Response.json({usage:{input_tokens:1,output_tokens:1},output:turn++===0?[{type:'function_call',name:'create_task',call_id:'c',arguments:JSON.stringify({workspaceId:'w',title:'task',ownerMemberId:'m'})}]:[{type:'message',content:[{type:'output_text',text:'{"summary":"done"}'}]}]}));
 assert.deepEqual(called,['create_task','get_task']);assert.deepEqual(saved.ids,['real-id']);assert.equal(JSON.parse(output.rawOutput).tasks[0].id,'real-id');
});
test('uncertain create is journaled before dispatch and is never automatically retried',async()=>{
 let saved:any;let calls=0;
 await assert.rejects(()=>executeMcpEvaluation({url:'https://example.com/mcp',token:'secret',workspaceId:'w'},{apiKey:'key',endpoint:'https://example.com/responses',model:'test',maxOutputTokens:1000,timeoutMs:1000},'skill','create','r',new AbortController().signal,(trace,ids)=>{saved={trace,ids};},async()=>({listTools:async()=>({tools:['create_task','get_task'].map(name=>({name,inputSchema:{type:'object'}}))}),callTool:async()=>{calls++;assert.equal(saved.trace[0].status,'pending');throw Error('connection lost');},close:async()=>{}}),async()=>Response.json({output:[{type:'function_call',name:'create_task',call_id:'c',arguments:JSON.stringify({workspaceId:'w',title:'task',ownerMemberId:'m'})}]})),/不要重复创建/);
 assert.equal(calls,1);assert.equal(saved.trace[0].status,'pending');assert.match(saved.trace[0].arguments.idempotencyKey,/^eval-/);assert.deepEqual(saved.ids,[]);
});
