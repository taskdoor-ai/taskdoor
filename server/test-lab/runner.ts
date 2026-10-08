import {mcpConfigForCase} from './mcp-member-context.ts';
import {executeMcpEvaluation,type McpConfig} from './mcp-execution.ts';
import { MAX_BATCH_CASES, MAX_QUEUED_RUNS } from "../../src/test-lab/run-limits.ts";
import { randomUUID } from 'node:crypto';
import type { LabRun, LabStepResult, LabRunSelection } from '../../src/test-lab/types.ts';
import type { LabStore } from './store.ts';
import { buildModelInput, applyEvents, buildView } from './context.ts';
import { callModel, ModelResponseError, type ModelOptions, type ModelCall } from './model.ts';
import { hash, resolveSkill } from './skills.ts';
import { validateOutput } from './validation.ts';
import { evaluateAssertions } from './assertions.ts';
import { runSelectionSchema } from './schema.ts';
import type { EvaluationEngine } from './evaluation-engine.ts';
import { preflightWorkflow } from './workflows.ts';

export function createRunner(store:LabStore,options:ModelOptions,modelCall:ModelCall=callModel,engine?:EvaluationEngine,judge?:{model:string;models?:string[];configured:boolean;review:(id:string)=>Promise<LabRun>},mcp?:McpConfig,mcpCall:typeof executeMcpEvaluation=executeMcpEvaluation){
  const queue:string[]=[];
  const snapshots=new Map<string,ReturnType<typeof resolveSkill>[]>();
  const controllers=new Map<string,AbortController>();
  let worker:Promise<void>|null=null;
  if(store.get().runs.some(r=>r.status==='running'||r.status==='queued'))store.updateRuns(runs=>{for(const r of runs)if(r.status==='running'||r.status==='queued'){r.status='interrupted';r.finishedAt=new Date().toISOString();r.error='本地服务已重启，未自动重试；上游已发生的用量可能仍计费。';}});
  if(store.get().runs.some(r=>r.judgeStatus==='running'))store.updateRuns(runs=>{for(const r of runs)if(r.judgeStatus==='running'){r.judgeStatus='failed';r.judgeError='服务已重启，判断中断；未自动重试。';}});
  const get=(id:string)=>{const run=store.getRun(id);if(!run)throw new Error('运行记录不存在');return run;};
  const update=(id:string,fn:(r:LabRun)=>void)=>{store.updateRun(id,fn);};
  async function execute(id:string){
    const run=get(id);if(run.status!=='queued')return;
    const controller=new AbortController();controllers.set(id,controller);
    update(id,r=>{r.status='running';r.startedAt=new Date().toISOString();});
    let sandbox=structuredClone(run.teamSnapshot);
    try{
      for(const [index,step] of run.caseSnapshot.steps.entries()){
        if(controller.signal.aborted)break;
        const skill=snapshots.get(id)![index];const started=Date.now();
        const result:LabStepResult={stepId:step.id,skillId:step.skillId,input:null,output:null,rawOutput:'',error:null,assertions:[],structure:'unknown',structureErrors:[],durationMs:0,usage:{inputTokens:null,outputTokens:null,totalTokens:null},skillVersionId:skill.versionId,skillVersionLabel:skill.versionLabel,skillHash:skill.hash,promptHash:'',skillSnapshot:skill.snapshot,before:structuredClone(sandbox),after:structuredClone(sandbox)};
        try{
          if(run.selection?.executionMode==='mcp'){
            const instructions=skill.productionInstructions;result.skillSnapshot=instructions;result.skillHash=hash(instructions);
            const executionConfig=mcpConfigForCase(mcp!,run.teamSnapshot,run.caseSnapshot);
            result.input={executionMode:'mcp',workspaceId:mcp!.workspaceId,request:step.prompt,...(executionConfig.memberContext?{memberContext:executionConfig.memberContext}:{})};result.promptHash=hash(instructions+'\n'+JSON.stringify(result.input));
            update(id,r=>{r.steps.push(structuredClone(result));});
            const response=await mcpCall(executionConfig,{...options,model:run.model},instructions,step.prompt,id,controller.signal,(toolTrace,createdTaskIds)=>{
              result.mcp={workspaceId:mcp!.workspaceId,toolTrace,createdTaskIds};result.rawOutput=JSON.stringify(result.mcp);
              update(id,r=>{r.steps[index]=structuredClone(result);});
            });
            result.rawOutput=response.rawOutput;result.usage=response.usage;result.output=JSON.parse(response.rawOutput);result.structure='passed';
          }else{
          sandbox=applyEvents(sandbox,step);result.after=structuredClone(sandbox);
          const input=buildModelInput(sandbox,run.caseSnapshot,step,id,get(id).steps);result.input=input;result.promptHash=hash(skill.instructions+'\n'+JSON.stringify(input));
          const response=await modelCall({...options,model:run.model},skill.instructions,input,controller.signal);result.rawOutput=response.rawOutput;result.usage=response.usage;
          if(controller.signal.aborted)throw new Error('运行已取消');
          try{result.output=JSON.parse(response.rawOutput);}catch{throw new Error('模型输出不是有效 JSON；原文已保留，未自动修复或重试');}
          result.structureErrors=validateOutput(step.skillId,result.output,input);result.structure=result.structureErrors.length?'failed':'passed';
          result.assertions=evaluateAssertions(result.output,run.caseSnapshot.assertions.filter(a=>a.stepId===step.id));
          }
        }catch(error){if(error instanceof ModelResponseError){result.rawOutput=error.response.rawOutput;result.usage=error.response.usage;}result.error=error instanceof Error?error.message:'运行失败';result.structure='failed';}
        result.durationMs=Date.now()-started;
        update(id,r=>{r.steps[index]=result;});
        if(result.error||result.structure==='failed')break;
      }
      update(id,r=>{
        if(r.status==='interrupted')return;
        r.finishedAt=new Date().toISOString();
        if(controller.signal.aborted){r.status='cancelled';r.error='本地运行已取消；已发出的 API 请求可能仍计费。';return;}
        if(r.steps.some(s=>s.error||s.structure==='failed'||s.assertions.some(a=>a.status==='failed'))){r.status='failed';r.error=r.steps.find(s=>s.error)?.error??'结构或自动断言未通过；未执行步骤不计为通过';}
        else r.status=r.caseSnapshot.reviewChecklist.length||!r.caseSnapshot.assertions.length||r.steps.some(s=>s.assertions.some(a=>a.status==='unknown'))?'needs_review':'passed';
      });
    }catch(error){update(id,r=>{if(r.status==='interrupted')return;r.status=controller.signal.aborted?'cancelled':'failed';r.error=error instanceof Error?error.message:'运行异常';r.finishedAt=new Date().toISOString();});}
    finally{controllers.delete(id);snapshots.delete(id);}
    if(run.selection?.judgeModel&&judge&&!['cancelled','interrupted'].includes(get(id).status)){
      update(id,r=>{r.judgeStatus='running';r.judgeStartedAt=new Date().toISOString();});
      try{await judge.review(id);update(id,r=>{r.judgeStatus='completed';r.judgeFinishedAt=new Date().toISOString();});}
      catch(error){update(id,r=>{r.judgeStatus='failed';r.judgeFinishedAt=new Date().toISOString();r.judgeError=error instanceof Error?error.message:'判断模型调用失败';});}
    }
  }
  // Let the HTTP acceptance response flush before starting any engine/model work.
  const start=()=>{if(worker)return;worker=new Promise<void>(resolve=>setImmediate(resolve)).then(async()=>{while(queue.length){
      if(!engine){await execute(queue.shift()!);continue;}
      const batchId=get(queue[0]).batchId;
      const ids=queue.filter(id=>get(id).batchId===batchId);
      queue.splice(0,ids.length);
      const active:Promise<void>[]=[];
      try{await engine.run(ids.map(get),async id=>{const task=execute(id);active.push(task);await task;return get(id);},(evalId,completed)=>{store.updateBatch(batchId,r=>{r.evaluation={engine:'promptfoo',id:evalId,completed:completed??r.evaluation?.completed};});});}
      catch(error){for(const id of ids)update(id,r=>{r.evaluationError=error instanceof Error?error.message:'评测引擎失败';if(r.status==='queued'||r.status==='running'){controllers.get(id)?.abort();r.status='interrupted';r.finishedAt=new Date().toISOString();r.error=r.evaluationError;}});await Promise.allSettled(active);for(const id of ids)snapshots.delete(id);}
    }}).finally(()=>{worker=null;if(queue.length)start();});};
  return {
    enqueue(caseIds:string[],requestId:string,selection:LabRunSelection={}){
      const selected=runSelectionSchema.parse(selection);
      if(selected.executionMode==='mcp'&&(!mcp?.url||!mcp.token||!mcp.workspaceId))throw Error('请配置 TASKDOOR_MCP_URL、TASKDOOR_MCP_TOKEN 和 TASKDOOR_MCP_WORKSPACE_ID');
      const models=selected.models??[selected.model||options.model];const versionIds=selected.skillVersionIds??[selected.skillVersionId];
      if(!requestId||requestId.length>100||!Array.isArray(caseIds)||!caseIds.length||caseIds.length>MAX_BATCH_CASES||new Set(caseIds).size!==caseIds.length)throw new Error(`每批请选择 1–${MAX_BATCH_CASES} 个不同用例，并提供有效请求标识`);
      const state=store.getLibrary();const existing=store.getRuns(r=>r.requestId===requestId);
      if(existing.length){if(JSON.stringify([...new Set(existing.map(r=>r.caseId))])!==JSON.stringify(caseIds)||JSON.stringify(existing[0].selection??{})!==JSON.stringify(selected))throw new Error('同一请求标识不能用于不同用例');return existing;}
      if(judge&&models.includes(judge.model))throw new Error('Jev 只能作为判断模型选择，不能作为生成模型');
      if(state.models!==undefined&&models.some(model=>!state.models!.includes(model)))throw new Error('所选模型未启用，请到模型管理开启后再新建评测');
      if(selected.judgeModel&&(!state.judgeEnabled||!judge?.configured||![judge.model,...(judge.models??[])].includes(selected.judgeModel)))throw new Error('判断模型未启用或未配置');
      if(selected.workflowId){
        const checked=preflightWorkflow(state,selected.workflowId);
        if(JSON.stringify(checked.workflow.caseIds)!==JSON.stringify(caseIds))throw new Error('用例列表与测试流程不一致');
        if(selected.actorId)throw new Error('成组流程使用各场景保存的人员；切换人员请编辑场景或单独运行用例');
        if(!checked.ready)throw new Error(`流程预检未通过：${checked.cases.flatMap(c=>c.checks.filter(check=>check.status==='failed').map(check=>`${c.name}：${check.label}`)).slice(0,2).join('；')}`);
      }
      if(!options.apiKey)throw new Error('未配置服务端 PPIO API Key');
      const capacity=MAX_QUEUED_RUNS;
      if(store.getRuns(r=>r.status==='queued'||r.status==='running').length+caseIds.length*models.length*versionIds.length>capacity)throw new Error(`运行队列最多 ${capacity} 个用例与模型组合，请等待或取消已有运行`);
      engine?.check();
      const evaluatedAt=new Date().toISOString();
      const cases=versionIds.flatMap(versionId=>caseIds.map(id=>{const c=state.cases.find(c=>c.id===id);if(!c||c.archived||!c.enabled)throw new Error('用例不存在、已归档或待审核启用');const team=state.teams.find(t=>t.id===c.teamId);if(!team||team.archived)throw new Error('用例团队不存在或已归档');if(selected.skillId&&(!c.steps.length||c.steps.some(s=>s.skillId!==selected.skillId)))throw new Error('用例与所选 Skill 不匹配，请选择该 Skill 对应的测试用例');const executionCase={...c,steps:c.steps.map(s=>({...s,...(selected.skillId?{skillVersionId:versionId}:{}),evaluatedAt:s.evaluatedAt||evaluatedAt})),actorId:selected.actorId||c.actorId};const view=buildView(team,executionCase.actorId);if(c.steps.some(s=>s.taskId&&!view.team.tasks.some(t=>t.id===s.taskId)))throw new Error('当前人员无权查看用例目标任务');return {c:executionCase,team};}));
      if(selected.executionMode==='mcp'&&cases.some(({c})=>c.steps.length!==1||c.steps.some(s=>s.skillId!=='agentdoor-task-planner'||s.taskId||s.events.length||s.usePreviousOutput)||c.assertions.length||(c.verification?.fixtureChecks.length??0)>0||c.workload||c.contextMode))throw Error('真实 MCP 评测请使用单步骤任务创建用例：不引用沙箱任务、事件、负荷、前序输出或 JSON 路径断言；验收条件按真实回执填写');
      for(const {c,team} of cases)for(const rule of c.verification?.fixtureChecks??[]){
        const collection=rule.subject==='task'?team.tasks:rule.subject==='member'?team.members:team.evidence;
        if(evaluateAssertions(collection.find(item=>item.id===rule.subjectId),[{...rule,stepId:'preflight'}])[0].status!=='passed')throw new Error(`用例前置条件未满足：${c.name} / ${rule.label}；尚未调用模型`);
      }
      if(selected.judgeModel&&cases.some(({c})=>!c.expectedOutput?.checks.length&&!c.reviewChecklist.some(item=>item.trim())&&!c.verification?.expectedResults.some(item=>item.criteria.some(text=>text.trim()))))throw new Error('使用判断模型的用例必须填写人工验收条件或预期结果');
      if(selected.executionMode==='mcp')for(const {c,team} of cases)mcpConfigForCase(mcp!,team,c);
      const frozen=cases.map(({c})=>c.steps.map(s=>resolveSkill(state,s.skillId,s.skillVersionId)));
      const batchId=randomUUID();const runs:LabRun[]=models.flatMap(model=>cases.map(({c,team})=>({id:randomUUID(),batchId,requestId,caseId:c.id,caseName:c.name,actorId:c.actorId,teamId:c.teamId,status:'queued',createdAt:new Date().toISOString(),startedAt:null,finishedAt:null,model,skillVersionId:c.steps[0]?.skillVersionId??undefined,skillVersionNumber:state.skillVersions?.find(v=>v.id===c.steps[0]?.skillVersionId)?.versionNumber,selection:selected,endpoint:options.endpoint,caseSnapshot:structuredClone(c),teamSnapshot:structuredClone(team),steps:[],error:null,review:null})));
      store.appendRuns(runs);
      runs.forEach((r,i)=>{snapshots.set(r.id,frozen[i%cases.length]);queue.push(r.id);});start();return runs;
    },
    cancel(id:string){const r=get(id);if(r.status==='queued'){update(id,r=>{r.status='cancelled';r.finishedAt=new Date().toISOString();r.error='已在发出 API 请求前取消';});snapshots.delete(id);}else if(r.status==='running')controllers.get(id)?.abort();return get(id);},
    resumeUnstarted(batchId:string){
      const pending=store.getRuns(r=>r.batchId===batchId&&r.status==='interrupted'&&!r.startedAt&&!r.steps.length);
      const library=store.getLibrary();
      const frozen=pending.map(run=>run.caseSnapshot.steps.map(step=>resolveSkill(library,step.skillId,step.skillVersionId)));
      const ids=new Set(pending.map(r=>r.id));
      if(pending.length)store.updateBatch(batchId,r=>{if(ids.has(r.id)){r.status='queued';r.finishedAt=null;r.error=null;}});
      for(const [i,run] of pending.entries()){
        snapshots.set(run.id,frozen[i]);queue.push(run.id);
      }
      if(pending.length)start();
      return store.getRuns(r=>r.batchId===batchId);
    },
    review(id:string,verdict:'passed'|'failed',note:string){const r=get(id);if(r.status==='running'||r.status==='queued')throw new Error('请等待运行结束再评审');if(!['passed','failed'].includes(verdict)||!note.trim()||note.length>5000)throw new Error('请选择评审结论并填写依据（最多 5000 字）');update(id,r=>{r.review={verdict,note,at:new Date().toISOString()};});return get(id);},
    async idle(){while(worker)await worker;},
    close(){engine?.close();for(const controller of controllers.values())controller.abort();for(const id of queue){if(get(id).status==='queued')update(id,r=>{r.status='interrupted';r.finishedAt=new Date().toISOString();r.error='服务关闭，未发出 API 请求';});}queue.length=0;},
  };
}
