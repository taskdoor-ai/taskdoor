import { evaluate } from 'promptfoo';
import { renderOutput } from './bridge.mjs';
const pending=new Map();
process.on('disconnect',()=>process.exit(1));
process.on('message',async message=>{
 if(message.type==='result'){
  const next=pending.get(message.id);pending.delete(message.id);
  if(message.error)next?.reject(new Error(message.error));else next?.resolve(message.run);
 }
 if(message.type!=='start')return;
 try{
  const runs=message.runs;
  let evaluationId;
  const variant=r=>JSON.stringify([r.model,r.skillVersionId??'']);const models=[...new Map(runs.map(r=>[variant(r),r])).values()];
  const cases=[...new Map(runs.map(r=>[r.caseId,r])).values()];
  const providers=models.map(column=>({
   id:()=>`taskdoor:${variant(column)}`,label:column.model+(column.skillVersionNumber?` · v${column.skillVersionNumber}`:''),
   async callApi(_prompt,context){
    if(context.evaluationId){evaluationId=context.evaluationId;process.send({type:'evaluation',id:evaluationId});}
    const planned=runs.find(r=>r.caseId===context.vars.caseId&&variant(r)===variant(column));
    if(!planned)throw new Error('未找到本批次执行组合');
    const run=await new Promise((resolve,reject)=>{pending.set(planned.id,{resolve,reject});process.send({type:'execute',id:planned.id});});
    const assertions=run.steps.flatMap(s=>s.assertions);
    const automaticPass=run.steps.length===run.caseSnapshot.steps.length&&run.steps.every(s=>!s.error&&s.structure==='passed')&&assertions.length>0&&assertions.every(a=>a.status==='passed')&&!['cancelled','interrupted','failed'].includes(run.status);
    const output=run.steps.map((s,i)=>`## 第 ${i+1} 步\n\n${renderOutput(s,run)}`).join('\n\n');
    const usage={};
    for(const [key,field] of [['prompt','inputTokens'],['completion','outputTokens'],['total','totalTokens']])if(run.steps.length&&run.steps.every(s=>s.usage[field]!=null))usage[key]=run.steps.reduce((n,s)=>n+s.usage[field],0);
    return {output:output||run.error||'没有模型输出',...(run.error?{error:run.error}:{}),tokenUsage:usage,metadata:{
     source:'Promptfoo 实时执行',runId:run.id,batchId:run.batchId,automaticPass,
     reviewStatus:run.status,finalAccepted:run.status==='passed',
     steps:run.steps,jevReviews:run.jevReviews,judgeStatus:run.judgeStatus,judgeError:run.judgeError,teamSnapshot:run.teamSnapshot,caseSnapshot:run.caseSnapshot,
     originalResult:`http://127.0.0.1:15501/history?batch=${run.batchId}&result=${run.id}`,
    }};
   },
  }));
  const record=await evaluate({
   description:`TaskDoor · ${runs[0].team} · ${runs[0].batchId.slice(0,8)} · 自动检查（人工验收在 TaskDoor）`,
   prompts:['{{需求}}'],providers,sharing:false,writeLatestResults:true,
   tests:cases.map(r=>({description:r.caseName,vars:{caseId:r.caseId,用例:r.caseName,团队:r.team,操作人:r.actor,需求:r.steps.map(s=>s.message??'').join('\n\n')},assert:[{type:'javascript',value:'({pass: context.providerResponse.metadata.automaticPass, score: context.providerResponse.metadata.automaticPass ? 1 : 0, reason: "TaskDoor 结构与业务断言检查；人工验收请返回 TaskDoor 查看"})'}]})),
  },{cache:false,maxConcurrency:2,showProgressBar:false,repeat:1,progressCallback:(completed)=>{if(evaluationId)process.send({type:'evaluation',id:evaluationId,completed});}});
  process.send({type:'evaluation',id:record.id});
  process.send({type:'done'},()=>process.exit(0));
 }catch{process.exit(1);}
});
