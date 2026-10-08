import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import {connectMcp,type McpConfig,type McpPeer} from './mcp-execution.ts';
import type {McpTool,McpDebugCall} from '../../src/test-lab/types.ts';
export async function listMcpTools(client:McpPeer):Promise<McpTool[]>{
 const tools:McpTool[]=[];const seen=new Set<string>();let cursor:string|undefined;
 do{const page=await client.listTools(cursor?{cursor}:undefined);tools.push(...page.tools);cursor=page.nextCursor;if(cursor){if(seen.has(cursor)||seen.size>=100)throw Error('工具分页游标异常');seen.add(cursor);}}while(cursor);
 return tools;
}
export function validateMcpArguments(tool:McpTool,args:Record<string,unknown>,workspaceId:string){
 if(tool.inputSchema.properties?.workspaceId&&args.workspaceId!==workspaceId)throw Error('workspaceId 必须为已配置的测试工作区');
 if(!tool.inputSchema.properties?.workspaceId&&tool.name!=='list_workspaces'&&tool.annotations?.readOnlyHint!==true)throw Error('该工具不限定工作区；当前调试模块仅允许工作区内操作或只读工具');
 const Validator=String(tool.inputSchema.$schema??'').includes('2020-12')?Ajv2020:Ajv;
 const validate=new Validator({strict:false,allErrors:true}).compile(tool.inputSchema);
 if(!validate(args))throw Error('参数不符合工具结构：'+new Ajv().errorsText(validate.errors,{separator:'；'}));
}
export function createMcpDebugger(config:McpConfig,directory:string,connect=connectMcp){
 const missing=()=>Object.entries({TASKDOOR_MCP_URL:config.url,TASKDOOR_MCP_TOKEN:config.token,TASKDOOR_MCP_WORKSPACE_ID:config.workspaceId}).filter(([,v])=>!v).map(([k])=>k);
 const clean=<T>(value:T):T=>config.token?JSON.parse(JSON.stringify(value).split(config.token).join('[redacted]')):value;
 const requireConfig=()=>{if(missing().length)throw Error('缺少配置：'+missing().join('、'));};
 const active=new Map<string,{signature:string;promise:Promise<McpDebugCall>}>();
 return {
  status(){return {configured:missing().length===0,missing:missing(),workspaceId:config.workspaceId,endpoint:config.url?(()=>{try{const u=new URL(config.url);return u.origin+u.pathname;}catch{return '地址格式无效';}})():null};},
  async list(){requireConfig();let client:McpPeer|undefined;try{client=await connect(config);return {tools:clean(await listMcpTools(client)),fetchedAt:new Date().toISOString()};}catch{throw Error('MCP 连接或 tools/list 失败，请检查地址、凭据与服务状态');}finally{await client?.close();}},
  async call(id:string,name:string,args:Record<string,unknown>):Promise<McpDebugCall>{
   if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('请求 ID 无效');requireConfig();
   const signature=JSON.stringify({name,args:clean(args)});
   const running=active.get(id);if(running){if(running.signature!==signature)throw Error('同一请求 ID 不能用于不同参数');return running.promise;}
   mkdirSync(directory,{recursive:true});const path=resolve(directory,id+'.json');
   if(existsSync(path)){const previous=JSON.parse(readFileSync(path,'utf8')) as McpDebugCall;if(previous.name!==name||JSON.stringify(previous.arguments)!==JSON.stringify(clean(args)))throw Error('同一请求 ID 不能用于不同参数');return previous;}
   const operation=(async()=>{
    const started=Date.now();let client:McpPeer|undefined;
    const record:McpDebugCall={id,name,arguments:clean(args),workspaceId:config.workspaceId,at:new Date().toISOString(),status:'pending',result:null,durationMs:0};
    const save=()=>{writeFileSync(path+'.tmp',JSON.stringify(clean(record),null,2),{mode:0o600});renameSync(path+'.tmp',path);};
    try{client=await connect(config);const tool=(await listMcpTools(client)).find(t=>t.name===name);if(!tool)throw Error('工具不在当前 tools/list 中');validateMcpArguments(tool,args,config.workspaceId);}
    catch(e){await client?.close();throw Error(e instanceof Error&&/参数不符合|workspaceId|工具不在|不限定工作区/.test(e.message)?e.message:'MCP 连接或获取结构失败；尚未调用工具');}
    try{save();}catch(e){await client!.close();throw e;}
    try{record.result=clean(await client!.callTool({name,arguments:args}));record.status='completed';}
    catch{record.status='uncertain';record.error='未收到完整回执，操作可能已生效；请核查目标记录，未自动重试。';}
    finally{record.durationMs=Date.now()-started;save();await client!.close();}
    return record;
   })();active.set(id,{signature,promise:operation});try{return await operation;}finally{active.delete(id);}
  },
 };
}
