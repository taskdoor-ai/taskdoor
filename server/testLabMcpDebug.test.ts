import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createMcpDebugger,listMcpTools,validateMcpArguments} from './test-lab/mcp-debug.ts';
const config={url:'https://example.com/mcp',token:'test-secret',workspaceId:'w'};
const tool={name:'create_task',inputSchema:{type:'object',required:['workspaceId','title'],additionalProperties:false,properties:{workspaceId:{type:'string'},title:{type:'string',minLength:1},count:{type:'integer'}}}};
test('工具列表读取全部分页；循环游标失败',async()=>{
 let n=0;const peer={listTools:async()=>++n===1?{tools:[tool],nextCursor:'next'}:{tools:[{...tool,name:'get_task'}]},callTool:async()=>({}),close:async()=>{}};
 assert.equal((await listMcpTools(peer)).length,2);
 await assert.rejects(()=>listMcpTools({...peer,listTools:async()=>({tools:[],nextCursor:'same'})}),/游标/);
});
test('调用前按实际 schema 检查必填、类型、未知字段及工作区',()=>{
 assert.throws(()=>validateMcpArguments(tool,{workspaceId:'w'},'w'),/参数不符合/);
 assert.throws(()=>validateMcpArguments(tool,{workspaceId:'w',title:'t',count:'2'},'w'),/参数不符合/);
 assert.throws(()=>validateMcpArguments(tool,{workspaceId:'w',title:'t',extra:1},'w'),/参数不符合/);
 assert.throws(()=>validateMcpArguments(tool,{workspaceId:'other',title:'t'},'w'),/workspaceId/);
});
test('实际调用回执落盘，同请求重发不重复写入，返回错误不伪装成功',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'mcp-debug-'));let calls=0;const id=randomUUID();
 const debuggerApi=createMcpDebugger(config,directory,async()=>({listTools:async()=>({tools:[tool]}),close:async()=>{},callTool:async()=>{calls++;const pending=JSON.parse(readFileSync(join(directory,id+'.json'),'utf8'));assert.equal(pending.status,'pending');return {isError:true,content:[{type:'text',text:'test-secret rejected'}]};}}));
 const first=await debuggerApi.call(id,'create_task',{workspaceId:'w',title:'t'});const again=await debuggerApi.call(id,'create_task',{workspaceId:'w',title:'t'});
 assert.equal(calls,1);assert.deepEqual(first,again);assert.equal(first.result.isError,true);assert.ok(!JSON.stringify(first).includes('test-secret'));
 await assert.rejects(()=>debuggerApi.call(id,'create_task',{workspaceId:'w',title:'different'}),/同一请求/);
});
test('网络失联保留不确定结果且不重试；未配置时不连接',async()=>{
 let calls=0;const connect=async()=>({listTools:async()=>({tools:[tool]}),close:async()=>{},callTool:async()=>{calls++;throw Error('network');}});
 const api=createMcpDebugger(config,mkdtempSync(join(tmpdir(),'mcp-debug-')),connect);
 const result=await api.call(randomUUID(),'create_task',{workspaceId:'w',title:'t'});assert.equal(result.status,'uncertain');assert.equal(calls,1);
 const empty=createMcpDebugger({...config,token:''},'/unused',async()=>{throw Error('should not connect');});assert.equal(empty.status().configured,false);await assert.rejects(()=>empty.list(),/缺少配置/);
});
