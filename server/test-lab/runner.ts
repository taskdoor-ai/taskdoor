import { randomUUID } from 'node:crypto';
import type { LabRun, LabStepResult, LabRunSelection } from '../../src/test-lab/types.ts';
import type { LabStore } from './store.ts';
import { buildModelInput, applyEvents, buildView } from './context.ts';
import { callModel, ModelResponseError, type ModelOptions, type ModelCall } from './model.ts';
import { hash, resolveSkill } from './skills.ts';
import { validateOutput } from './validation.ts';
import { evaluateAssertions } from './assertions.ts';
import { runSelectionSchema } from './schema.ts';
import { preflightWorkflow } from './workflows.ts';

export function createRunner(store:LabStore,options:ModelOptions,modelCall:ModelCall=callModel){
  const queue:string[]=[];
  const snapshots=new Map<string,ReturnType<typeof resolveSkill>[]>();
  const controllers=new Map<string,AbortController>();
  let worker:Promise<void>|null=null;
  if(store.get().runs.some(r=>r.status==='running'||r.status==='queued'))store.updateRuns(runs=>{for(const r of runs)if(r.status==='running'||r.status==='queued'){r.status='interrupted';r.finishedAt=new Date().toISOString();r.error='本地服务已重启，未自动重试；上游已发生的用量可能仍计费。';}});
  const get=(id:string)=>{const run=store.get().runs.find(r=>r.id===id);if(!run)throw new Error('运行记录不存在');return run;};
  const update=(id:string,fn:(r:LabRun)=>void)=>{store.updateRuns(runs=>{const run=runs.find(r=>r.id===id);if(!run)throw new Error('运行记录不存在');fn(run);});};
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
          sandbox=applyEvents(sandbox,step);result.after=structuredClone(sandbox);
          const input=buildModelInput(sandbox,run.caseSnapshot,step,id,get(id).steps);result.input=input;result.promptHash=hash(skill.instructions+'\n'+JSON.stringify(input));
          const response=await modelCall({...options,model:run.model},skill.instructions,input,controller.signal);result.rawOutput=response.rawOutput;result.usage=response.usage;
          if(controller.signal.aborted)throw new Error('运行已取消');
          try{result.output=JSON.parse(response.rawOutput);}catch{throw new Error('模型输出不是有效 JSON；原文已保留，未自动修复或重试');}
          result.structureErrors=validateOutput(step.skillId,result.output,input);result.structure=result.structureErrors.length?'failed':'passed';
          result.assertions=evaluateAssertions(result.output,run.caseSnapshot.assertions.filter(a=>a.stepId===step.id));
        }catch(error){if(error instanceof ModelResponseError){result.rawOutput=error.response.rawOutput;result.usage=error.response.usage;}result.error=error instanceof Error?error.message:'运行失败';result.structure='failed';}
        result.durationMs=Date.now()-started;
        update(id,r=>{r.steps.push(result);});
        if(result.error||result.structure==='failed')break;
      }
      update(id,r=>{
        r.finishedAt=new Date().toISOString();
        if(controller.signal.aborted){r.status='cancelled';r.error='本地运行已取消；已发出的 API 请求可能仍计费。';return;}
        if(r.steps.some(s=>s.error||s.structure==='failed'||s.assertions.some(a=>a.status==='failed'))){r.status='failed';r.error=r.steps.find(s=>s.error)?.error??'结构或自动断言未通过；未执行步骤不计为通过';}
        else r.status=r.caseSnapshot.reviewChecklist.length||!r.caseSnapshot.assertions.length||r.steps.some(s=>s.assertions.some(a=>a.status==='unknown'))?'needs_review':'passed';
      });
    }catch(error){update(id,r=>{r.status=controller.signal.aborted?'cancelled':'failed';r.error=error instanceof Error?error.message:'运行异常';r.finishedAt=new Date().toISOString();});}
    finally{controllers.delete(id);snapshots.delete(id);}
  }
  const start=()=>{if(worker)return;worker=Promise.resolve().then(async()=>{while(queue.length){await execute(queue.shift()!);}}).finally(()=>{worker=null;if(queue.length)start();});};
  return {
    enqueue(caseIds:string[],requestId:string,selection:LabRunSelection={}){
      const selected=runSelectionSchema.parse(selection);
      if(!requestId||requestId.length>100||!Array.isArray(caseIds)||!caseIds.length||caseIds.length>5||new Set(caseIds).size!==caseIds.length)throw new Error('每批请选择 1–5 个不同用例，并提供有效请求标识');
      const state=store.get();const existing=state.runs.filter(r=>r.requestId===requestId);
      if(existing.length){if(JSON.stringify(existing.map(r=>r.caseId))!==JSON.stringify(caseIds)||JSON.stringify(existing[0].selection??{})!==JSON.stringify(selected))throw new Error('同一请求标识不能用于不同用例');return existing;}
      if(selected.workflowId){
        const checked=preflightWorkflow(state,selected.workflowId);
        if(JSON.stringify(checked.workflow.caseIds)!==JSON.stringify(caseIds))throw new Error('用例列表与测试流程不一致');
        if(selected.actorId)throw new Error('成组流程使用各场景保存的人员；切换人员请编辑场景或单独运行用例');
        if(!checked.ready)throw new Error(`流程预检未通过：${checked.cases.flatMap(c=>c.checks.filter(check=>check.status==='failed').map(check=>`${c.name}：${check.label}`)).slice(0,2).join('；')}`);
      }
      if(!options.apiKey)throw new Error('未配置服务端 PPIO API Key');
      if(state.runs.filter(r=>r.status==='queued'||r.status==='running').length+caseIds.length>5)throw new Error('运行队列最多 5 个用例，请等待或取消已有运行');
      const cases=caseIds.map(id=>{const c=state.cases.find(c=>c.id===id);if(!c||c.archived||!c.enabled)throw new Error('用例不存在、已归档或待审核启用');const team=state.teams.find(t=>t.id===c.teamId);if(!team||team.archived)throw new Error('用例团队不存在或已归档');const executionCase={...c,actorId:selected.actorId||c.actorId};const view=buildView(team,executionCase.actorId);if(c.steps.some(s=>s.taskId&&!view.team.tasks.some(t=>t.id===s.taskId)))throw new Error('当前人员无权查看用例目标任务');return {c:executionCase,team};});
      if(cases.reduce((n,{c})=>n+c.steps.length,0)>20)throw new Error('一批最多 20 个步骤，避免意外 API 用量');
      const frozen=cases.map(({c})=>c.steps.map(s=>resolveSkill(state,s.skillId,s.skillVersionId)));
      const batchId=randomUUID();const runs:LabRun[]=cases.map(({c,team})=>({id:randomUUID(),batchId,requestId,caseId:c.id,caseName:c.name,actorId:c.actorId,teamId:c.teamId,status:'queued',createdAt:new Date().toISOString(),startedAt:null,finishedAt:null,model:selected.model||options.model,selection:selected,endpoint:options.endpoint,caseSnapshot:structuredClone(c),teamSnapshot:structuredClone(team),steps:[],error:null,review:null}));
      store.updateRuns(all=>{all.push(...runs);});
      runs.forEach((r,i)=>{snapshots.set(r.id,frozen[i]);queue.push(r.id);});start();return runs;
    },
    cancel(id:string){const r=get(id);if(r.status==='queued'){update(id,r=>{r.status='cancelled';r.finishedAt=new Date().toISOString();r.error='已在发出 API 请求前取消';});snapshots.delete(id);}else if(r.status==='running')controllers.get(id)?.abort();return get(id);},
    review(id:string,verdict:'passed'|'failed',note:string){const r=get(id);if(r.status==='running'||r.status==='queued')throw new Error('请等待运行结束再评审');if(!['passed','failed'].includes(verdict)||!note.trim()||note.length>5000)throw new Error('请选择评审结论并填写依据（最多 5000 字）');update(id,r=>{r.review={verdict,note,at:new Date().toISOString()};});return get(id);},
    async idle(){while(worker)await worker;},
    close(){for(const controller of controllers.values())controller.abort();for(const id of queue){if(get(id).status==='queued')update(id,r=>{r.status='interrupted';r.finishedAt=new Date().toISOString();r.error='服务关闭，未发出 API 请求';});}queue.length=0;},
  };
}
