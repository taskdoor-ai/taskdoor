import {createHash} from 'node:crypto';

const digest=value=>createHash('sha256').update(value).digest('hex');
const safe=value=>String(value??'').replace(/[<>]/g,c=>c==='<'?'&lt;':'&gt;');
export function renderOutput(step,run){
 const output=step.output;
 if(!output||typeof output!=='object')return step.rawOutput||step.error||'未返回内容';
 const lines=[];
 if(output.summary)lines.push(safe(output.summary));
 const changes=output.proposal?.changes;
 if(Array.isArray(changes))for(const [i,change] of changes.entries()){
  const fields=change.fields??{};
  const name=id=>run.teamSnapshot?.members?.find(m=>m.id===id)?.name??id??'未分配';
  lines.push(`### ${i+1}. ${safe(fields.title??change.targetId??change.action)}`);
  if(fields.goal)lines.push(`**目标：** ${safe(fields.goal.text??fields.goal)}`);
  lines.push(`**负责人：** ${safe(name(fields.ownerRecommendation?.memberId))}`);
  if(fields.participantRecommendations?.length)lines.push(`**参与人：** ${fields.participantRecommendations.map(p=>safe(name(p.memberId))).join('、')}`);
  if(fields.acceptanceCriteria?.length)lines.push('**完成标准：**',...fields.acceptanceCriteria.map(c=>`- ${safe(typeof c==='string'?c:JSON.stringify(c))}`));
  if(change.parentId)lines.push(`**归属：** ${safe(change.parentId)}`);
  if(fields.dependsOnTaskIds?.length)lines.push(`**依赖：** ${fields.dependsOnTaskIds.map(safe).join('、')}`);
 }
 if(output.questions?.length)lines.push('### 待澄清问题',...output.questions.map(q=>`- ${safe(typeof q==='string'?q:JSON.stringify(q))}`));
 if(!lines.length)return step.rawOutput||JSON.stringify(output,null,2);
 lines.push('\n---\n原始 JSON 与完整请求保存在本单元格详情的 metadata 中。');
 return lines.join('\n\n');
}

// Imports existing results; never calls a model or invents missing observations.
export function toPromptfoo(runs){
 if(!runs.length)throw new Error('批次不存在');
 const variant=r=>r.skillVersionId?`${r.model} · v${r.skillVersionNumber??r.skillVersionId}`:r.model;
 const models=[...new Set(runs.map(variant))];
 const rows=[...new Map(runs.flatMap(r=>r.caseSnapshot.steps.map(step=>[`${r.caseId}:${step.id}`,{run:r,step}]))).values()];
 const prompts=models.map(model=>({id:digest(model),raw:'{{需求}}',label:model,provider:model}));
 const results=runs.flatMap(run=>run.steps.map(step=>{
  const plan=run.caseSnapshot.steps.find(s=>s.id===step.stepId);
  const assertions=step.assertions??[];
  const expected=run.caseSnapshot.assertions.filter(a=>a.stepId===step.stepId);
  const automatic=!step.error&&step.structure==='passed'&&expected.length>0&&expected.every(a=>assertions.some(r=>r.id===a.id&&r.status==='passed'));
  const review=run.review?.verdict==='passed'?'人工已通过':run.review?.verdict==='failed'?'人工未通过':'待人工核对';
  const reason=step.error||`${automatic?'自动检查通过':'自动检查未通过或缺少断言'}；${review}`;
  const vars={用例:run.caseName,需求:plan?.prompt??'',预期:(run.caseSnapshot.verification?.expectedResults?.find(e=>e.stepId===step.stepId)?.criteria??run.caseSnapshot.reviewChecklist??[]).join('\n')};
  const tokenUsage={};for(const [key,value] of Object.entries({prompt:step.usage.inputTokens,completion:step.usage.outputTokens,total:step.usage.totalTokens}))if(value!==null&&value!==undefined)tokenUsage[key]=value;
  return {promptIdx:models.indexOf(variant(run)),testIdx:rows.findIndex(row=>row.run.caseId===run.caseId&&row.step.id===step.stepId),testCase:{description:`${run.caseName} · ${step.stepId}`,vars},promptId:digest(variant(run)),provider:{id:variant(run),label:variant(run)},prompt:{raw:JSON.stringify(step.input,null,2),label:variant(run)},vars,response:{output:renderOutput(step,run),tokenUsage},error:step.error??null,failureReason:step.error?2:automatic?0:1,success:automatic,score:expected.length?expected.filter(a=>assertions.some(r=>r.id===a.id&&r.status==='passed')).length/expected.length:0,latencyMs:step.durationMs,namedScores:{},gradingResult:{pass:automatic,score:automatic?1:0,reason,componentResults:assertions.map(a=>({pass:a.status==='passed',score:a.status==='passed'?1:0,reason:`${a.label}：${a.message??a.status}`}))},metadata:{source:'TaskDoor 真实运行历史导入（非重跑）',runId:run.id,batchId:run.batchId,runStatus:run.status,rawOutput:step.rawOutput,actualInput:step.input,skillHash:step.skillHash,reviewStatus:review,finalAccepted:automatic&&run.review?.verdict==='passed',originalResult:`http://127.0.0.1:15501/history?batch=${run.batchId}&result=${run.id}`}};
 }));
 for(const [index,prompt] of prompts.entries()){
  const group=results.filter(r=>r.promptIdx===index);
  prompt.metrics={score:group.reduce((n,r)=>n+r.score,0),testPassCount:group.filter(r=>r.success).length,testFailCount:group.filter(r=>!r.success&&r.failureReason!==2).length,testErrorCount:group.filter(r=>r.failureReason===2).length,assertPassCount:group.reduce((n,r)=>n+r.gradingResult.componentResults.filter(a=>a.pass).length,0),assertFailCount:group.reduce((n,r)=>n+r.gradingResult.componentResults.filter(a=>!a.pass).length,0),totalLatencyMs:group.reduce((n,r)=>n+r.latencyMs,0),tokenUsage:group.reduce((a,r)=>({total:a.total+(r.response.tokenUsage.total??0),prompt:a.prompt+(r.response.tokenUsage.prompt??0),completion:a.completion+(r.response.tokenUsage.completion??0)}),{total:0,prompt:0,completion:0}),namedScores:{},namedScoresCount:{},cost:0};
 }
 return {evalId:`taskdoor-${runs[0].batchId}`,createdAt:runs[0].createdAt,vars:['用例','需求','预期'],config:{description:`TaskDoor · 自动检查（人工待核对） · ${runs[0].batchId.slice(0,8)}`,prompts:['{{需求}}'],providers:models,tests:rows.map(({run,step})=>({description:run.caseName,vars:{用例:run.caseName,需求:step.prompt}})),sharing:false},results:{version:3,timestamp:runs[0].createdAt,prompts,results,stats:{successes:results.filter(r=>r.success).length,failures:results.filter(r=>!r.success).length,tokenUsage:results.reduce((a,r)=>({total:a.total+(r.response.tokenUsage.total??0)}),{total:0})}}};
}
