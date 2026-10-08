import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {loadEnv} from 'vite';
import {createMcpTokenConfig} from '../../server/test-lab/mcp-config.ts';
import {executeMcpEvaluation} from '../../server/test-lab/mcp-execution.ts';
import {loadSkill,hash} from '../../server/test-lab/skills.ts';

// A separate invocation intentionally creates a new run. Never silently resume writes.
const promptPath=process.argv[2];
if(!promptPath){console.error('用法：npm run eval:mcp -- ./request.txt [报告目录]');process.exit(1);}
const env={...loadEnv('development',process.cwd(),''),...process.env};
const config=createMcpTokenConfig(resolve('data/mcp-debug/config.json'),{url:env.TASKDOOR_MCP_URL||'',token:env.TASKDOOR_MCP_TOKEN||'',workspaceId:env.TASKDOOR_MCP_WORKSPACE_ID||''}).current();
if(!config.url||!config.token||!config.workspaceId||!env.PPIO_API_KEY){console.error('请配置 TASKDOOR_MCP_URL、TASKDOOR_MCP_TOKEN、TASKDOOR_MCP_WORKSPACE_ID 和 PPIO_API_KEY');process.exit(1);}
const directory=resolve(process.argv[3]||'data/mcp-evaluations');mkdirSync(directory,{recursive:true});
const runId=randomUUID();const path=resolve(directory,runId+'.json');
if(existsSync(path))throw Error('报告已存在，不覆盖');
const prompt=readFileSync(resolve(promptPath),'utf8');
if(!prompt.trim())throw Error('创建请求不能为空');
const controller=new AbortController();process.once('SIGINT',()=>controller.abort());
const model=env.PPIO_MODEL||'deepseek/deepseek-v4.1-flash';
const report:any={runId,executionMode:'mcp',workspaceId:config.workspaceId,model,request:prompt,status:'running',startedAt:new Date().toISOString(),createdTaskIds:[],toolTrace:[]};
const save=()=>{writeFileSync(path+'.tmp',JSON.stringify(report,null,2),{mode:0o600});renameSync(path+'.tmp',path);};save();
try{
 const skill=loadSkill('agentdoor-task-planner');report.skillHash=hash(skill.productionInstructions);report.skillSnapshot=skill.productionInstructions;save();
 const response=await executeMcpEvaluation(config,{apiKey:env.PPIO_API_KEY,model,endpoint:(env.PPIO_BASE_URL||'https://api.ppinfra.com/openai/v1').replace(/\/$/,'').replace(/\/responses$/,'')+'/responses',maxOutputTokens:16000,timeoutMs:600000},skill.productionInstructions,prompt,runId,controller.signal,(toolTrace,createdTaskIds)=>{report.toolTrace=toolTrace;report.createdTaskIds=createdTaskIds;save();});
 report.output=JSON.parse(response.rawOutput);report.usage=response.usage;report.status='created_and_read_back';
}catch(error){report.status=controller.signal.aborted?'cancelled':'failed';report.error=error instanceof Error?error.message:'运行失败';process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();save();console.log(JSON.stringify({status:report.status,report:path,createdTaskIds:report.createdTaskIds}));}
