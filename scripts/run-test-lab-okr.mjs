import {parseArgs,isDeepStrictEqual} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {pathToFileURL} from 'node:url';

export const SKILL_ID='agentdoor-task-planner';
export const PRODUCTION_FILES=['SKILL.md','references/task-planning.md','references/management-playbook.md','references/goal-and-criteria.md','references/task-scheduling.md','references/task-preview.md','references/task-preview.schema.json'];
const FORMAT='taskdoor.okr-lab-run.v1';
const digest=value=>createHash('sha256').update(value).digest('hex');
const now=()=>new Date().toISOString();

export function localOrigin(value='http://127.0.0.1:5173'){
  const url=new URL(value);
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('仅支持无凭据的本机 HTTP 测试平台根地址');
  return url.origin;
}

// File bodies, including the installed name, stay unchanged. Only lab paths wrap them.
export function buildInstalledSnapshot(contents){
  const prefix=`skills/${SKILL_ID}/`;
  const files=PRODUCTION_FILES.map(relative=>{
    const content=contents[relative];
    if(typeof content!=='string'||!content.trim())throw Error(`Skill 缺少文件：${relative}`);
    if(/^--- FILE: /m.test(content))throw Error(`Skill 文件包含包边界：${relative}`);
    if(relative.endsWith('.json'))JSON.parse(content);
    return {path:prefix+relative,content};
  });
  const manifest={version:1,mode:'preview',files:files.map(file=>file.path)};
  files.push({path:prefix+'references/production-runtime.json',content:JSON.stringify(manifest,null,2)+'\n'});
  const snapshot=files.map(file=>`--- FILE: ${file.path} ---\n${file.content}${file.content.endsWith('\n')?'':'\n'}`).join('\n').trim();
  if(snapshot.length>300000)throw Error('Skill 包超过实验室 300,000 字符限制');
  return {snapshot,hash:digest(snapshot),files:files.map(file=>({path:file.path,hash:digest(file.content),bytes:Buffer.byteLength(file.content)}))};
}

export function createLabClient(origin,transport=fetch){
  const base=localOrigin(origin);
  async function request(path,{method='GET',body,token}={}){
    let response;
    try{response=await transport(new URL('/api/test-lab'+path,base),{method,redirect:'error',signal:AbortSignal.timeout(60000),headers:{Accept:'application/json',...(method==='GET'?{}:{'Content-Type':'application/json',Origin:base,'x-test-lab-csrf':token})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
    catch{throw Error(`本地实验室请求未确认（${method} ${path.split('?')[0]}）；未自动重试`);}
    let data;try{data=await response.json();}catch{throw Error(`本地实验室返回非 JSON（HTTP ${response.status}）`);}
    if(!response.ok)throw Error(`本地实验室拒绝请求（HTTP ${response.status}）`);
    return data;
  }
  return {
    get:path=>request(path),
    async mutate(path,bodyFor,method='POST'){
      const bootstrap=await request('/bootstrap');
      if(typeof bootstrap.csrfToken!=='string'||!Number.isInteger(bootstrap.state?.revision))throw Error('实验室会话无效，请检查本地服务');
      return request(path,{method,token:bootstrap.csrfToken,body:bodyFor(bootstrap)});
    },
  };
}

function validateSelection(bootstrap,record){
  const {state,config}=bootstrap;
  if(!config.configured)throw Error('本地实验室尚未配置 PPIO');
  if(!state.models?.includes(record.selection.model))throw Error('生成模型未在实验室启用');
  if(!state.judgeEnabled||!config.jev?.configured||!config.jev.models?.includes(record.selection.judgeModel)||record.selection.judgeModel==='jev-1.13.0'||!state.models?.includes(record.selection.judgeModel))throw Error('请选择实验室已启用的 PPIO 判断模型');
  for(const id of record.caseIds){
    const item=state.cases.find(item=>item.id===id);
    if(!item||!item.enabled||item.archived||!state.teams.some(team=>team.id===item.teamId&&!team.archived))throw Error(`用例不可运行：${id}`);
    if(!item.steps.length||item.steps.some((step,index)=>step.skillId!==SKILL_ID||step.taskId||step.events.length||(index===0&&step.usePreviousOutput))||item.assertions.length||item.verification?.fixtureChecks?.length||item.workload||item.contextMode)throw Error(`用例不符合无写入预览评测：${id}`);
    if(!item.expectedOutput?.checks?.length&&!item.reviewChecklist.some(text=>text.trim())&&!item.verification?.expectedResults?.some(result=>result.criteria.some(text=>text.trim())))throw Error(`用例缺少业务完成标准：${id}`);
  }
}

export function summarizeRuns(runs){
  const rows=runs.map(run=>{
    const steps=run.steps??[];
    const complete=steps.length===run.caseSnapshot.steps.length;
    const structure=steps.some(step=>step.error||step.structure==='failed')?'failed':complete&&steps.every(step=>step.structure==='passed')?'passed':'incomplete';
    const latest=run.jevReviews?.at(-1);
    const items=(latest?.items??[]).map(item=>({id:item.id,stepId:item.stepId,label:item.label,choice:item.choice,note:item.note??'',source:item.source}));
    const judging=run.judgeStatus;
    const business=judging==='failed'?'judge_failed':judging!=='completed'||!items.length?'pending':items.some(item=>item.choice==='unmet')?'failed':items.some(item=>item.choice!=='met')?'insufficient':'passed';
    const tokens={};for(const field of ['inputTokens','outputTokens','totalTokens'])tokens[field]=steps.length&&steps.every(step=>typeof step.usage?.[field]==='number')?steps.reduce((sum,step)=>sum+step.usage[field],0):null;
    return {id:run.id,caseId:run.caseId,name:run.caseName,status:run.status,model:run.model,skillVersionId:run.skillVersionId,structure,business,judgeStatus:judging??'not_started',judgeModel:latest?.model??run.selection?.judgeModel,judgeError:run.judgeError??null,judgeTokens:latest?.usage??null,generationTokens:tokens,attempts:steps.map(step=>({stepId:step.stepId,count:step.previewAttempts?.length??0,kinds:step.previewAttempts?.map(attempt=>attempt.kind)??[]})),items,structureErrors:steps.flatMap(step=>step.structureErrors??[]),error:run.error??null,manualReview:run.review??null};
  });
  const running=rows.some(row=>['queued','running'].includes(row.status)||row.judgeStatus==='running');
  const failed=rows.some(row=>row.structure==='failed'||['failed','judge_failed'].includes(row.business)||['failed','cancelled','interrupted'].includes(row.status));
  const automaticVerdict=!rows.length?'not_run':running?'running':failed?'failed':rows.every(row=>row.structure==='passed'&&row.business==='passed')?'passed':'needs_review';
  const generationTokens={};for(const field of ['inputTokens','outputTokens','totalTokens'])generationTokens[field]=rows.length&&rows.every(row=>typeof row.generationTokens[field]==='number')?rows.reduce((sum,row)=>sum+row.generationTokens[field],0):null;
  return {automaticVerdict,manualAcceptanceWritten:false,counts:{total:rows.length,structurePassed:rows.filter(row=>row.structure==='passed').length,businessPassed:rows.filter(row=>row.business==='passed').length,businessFailed:rows.filter(row=>row.business==='failed').length,insufficient:rows.filter(row=>row.business==='insufficient').length,judgeFailed:rows.filter(row=>row.business==='judge_failed').length},generationTokens,rows};
}

async function saveJson(path,value){await mkdir(dirname(path),{recursive:true});const temp=`${path}.${process.pid}.tmp`;await writeFile(temp,JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(temp,path);}
async function readRecord(path){const record=JSON.parse(await readFile(path,'utf8'));if(record.schemaVersion!==FORMAT||record.selection?.executionMode!=='preview'||record.selection?.skillId!==SKILL_ID||!record.requestId||!Array.isArray(record.caseIds)||!record.caseIds.length||new Set(record.caseIds).size!==record.caseIds.length||digest(record.skill?.snapshot??'')!==record.skill?.hash)throw Error('运行记录格式或冻结包校验失败');localOrigin(record.origin);return record;}
function sameRuns(runs,record){
  if(!isDeepStrictEqual([...new Set(runs.map(run=>run.caseId))].sort(),[...record.caseIds].sort())||runs.some(run=>run.requestId!==record.requestId||!isDeepStrictEqual(run.selection,record.selection)))throw Error('请求 ID 已存在，但用例或模型选择不同；未提交任何请求');
}

export async function submitRecordedRun(client,record,persist){
  const existing=await client.get('/runs?'+new URLSearchParams({requestId:record.requestId}));
  if(existing.length){sameRuns(existing,record);return existing;}
  record.execution={status:'submitting',attemptedAt:now()};await persist(record);
  try{return await client.mutate('/runs',bootstrap=>{
    validateSelection(bootstrap,record);
    const version=bootstrap.state.skillVersions?.find(version=>version.id===record.selection.skillVersionId&&version.skillId===SKILL_ID);
    if(!version||version.hash!==record.skill.hash)throw Error('冻结 Skill 版本缺失或内容已改变');
    return {caseIds:record.caseIds,requestId:record.requestId,selection:record.selection};
  });}catch(error){record.execution={...record.execution,status:'submission_unknown'};await persist(record);throw error;}
}

export async function main(args=process.argv.slice(2),{transport=fetch,print=console.log}={}){
  const command=args[0];
  const {values}=parseArgs({args:args.slice(1),options:{help:{type:'boolean'},record:{type:'string'},cases:{type:'string'},model:{type:'string'},judge:{type:'string'},'skill-dir':{type:'string'},origin:{type:'string'},label:{type:'string'},notes:{type:'string'}}});
  if(values.help||!['prepare','run','status'].includes(command)){
    print('prepare --record <JSON> --cases <ID,ID> --model <PPIO生成模型> --judge <PPIO判断模型> [--notes <本版优化说明>] [--skill-dir <目录>] [--origin http://127.0.0.1:5173]\nrun --record <JSON>\nstatus --record <JSON>\nprepare 只冻结 Skill，不调用模型。run 幂等提交一次，status 只查询一次；不自动轮询、重试或写人工通过。');return 0;
  }
  if(!values.record)throw Error('请使用 --record 指定本轮记录 JSON');
  const path=resolve(values.record);
  let record;
  if(command==='prepare'){
    try{record=await readRecord(path);}catch(error){if(error.code!=='ENOENT')throw error;}
    if(!record){
      const caseIds=(values.cases??'').split(',').map(id=>id.trim()).filter(Boolean);
      if(!caseIds.length||caseIds.length>1000||new Set(caseIds).size!==caseIds.length)throw Error('请提供 1–1000 个不同用例 ID');
      if(!values.model||!values.judge)throw Error('请显式指定 --model 和 --judge');
      if((values.notes??'').trim().length>2000)throw Error('优化说明最多 2000 字符');
      const skillDir=resolve(values['skill-dir']??join(homedir(),'.agents/skills/taskdoor-create-task'));
      const contents=Object.fromEntries(await Promise.all(PRODUCTION_FILES.map(async file=>[file,await readFile(join(skillDir,file),'utf8')])));
      const skill=buildInstalledSnapshot(contents);
      record={schemaVersion:FORMAT,createdAt:now(),origin:localOrigin(values.origin),requestId:randomUUID(),caseIds,selection:{executionMode:'preview',skillId:SKILL_ID,model:values.model,judgeModel:values.judge},skill:{...skill,sourceDir:skillDir,label:values.label??`OKR 目标标准日期 · ${now().replace(/[:.]/g,'-')}`,notes:(values.notes??'').trim(),notesProvided:values.notes!==undefined},execution:{status:'not_started'}};
      await saveJson(path,record);
    }else if(values.cases||values.model||values.judge||values['skill-dir']||values.label||values.origin||values.notes!==undefined){throw Error('记录已存在；继续 prepare 只传 --record，新的选择请使用新记录路径');}
    const client=createLabClient(record.origin,transport);
    const bootstrap=await client.get('/bootstrap');validateSelection(bootstrap,record);
    let version=bootstrap.state.skillVersions?.find(version=>version.skillId===SKILL_ID&&version.hash===record.skill.hash);
    if(!version){
      const state=await client.mutate('/skill-versions',fresh=>{
        validateSelection(fresh,record);
        return {expectedRevision:fresh.state.revision,version:{skillId:SKILL_ID,label:record.skill.label,notes:record.skill.notes??'',baseVersionId:null,snapshot:record.skill.snapshot}};
      });
      version=state.skillVersions?.find(version=>version.skillId===SKILL_ID&&version.hash===record.skill.hash);
    }
    if(!version)throw Error('未确认冻结版本；记录已保存，可再次 prepare 查询并继续');
    if(record.skill.notesProvided&&version.notes!==record.skill.notes){
      const state=await client.mutate(`/skill-versions/${encodeURIComponent(version.id)}/notes`,fresh=>({expectedRevision:fresh.state.revision,notes:record.skill.notes}),'PUT');
      version=state.skillVersions?.find(item=>item.id===version.id);
      if(!version)throw Error('未确认优化说明保存结果，请再次 prepare 查询');
    }
    record.skill.notes=version.notes??'';
    record.selection.skillVersionId=version.id;record.skill.versionId=version.id;record.skill.versionNumber=version.versionNumber;record.preparedAt=now();await saveJson(path,record);
    print(JSON.stringify({prepared:true,modelCalled:false,record:path,requestId:record.requestId,caseCount:record.caseIds.length,skillVersionId:version.id,skillHash:record.skill.hash},null,2));return 0;
  }
  record=await readRecord(path);
  if(values.origin&&localOrigin(values.origin)!==record.origin)throw Error('运行地址与冻结记录不同');
  if(!record.selection.skillVersionId)throw Error('先完成 prepare，再运行或查询');
  const client=createLabClient(record.origin,transport);
  const runs=command==='run'?await submitRecordedRun(client,record,value=>saveJson(path,value)):await client.get('/runs?'+new URLSearchParams({requestId:record.requestId}));
  if(runs.length)sameRuns(runs,record);
  const summary={requestId:record.requestId,batchId:runs[0]?.batchId??null,checkedAt:now(),...summarizeRuns(runs)};
  const stem=path.replace(/\.json$/i,'');await saveJson(stem+'.runs.json',runs);await saveJson(stem+'.summary.json',summary);
  record.execution={status:runs.length?'submitted':'not_started',batchId:summary.batchId,runIds:runs.map(run=>run.id),lastCheckedAt:summary.checkedAt};await saveJson(path,record);
  print(JSON.stringify({...summary,fullOutput:stem+'.runs.json'},null,2));
  return command==='run'?0:summary.automaticVerdict==='passed'?0:summary.automaticVerdict==='failed'?1:2;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().then(code=>{process.exitCode=code;}).catch(error=>{console.error(error.message);process.exitCode=1;});
