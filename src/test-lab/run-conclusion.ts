import type {LabRun} from './types';
import {runVerdict} from './run-verdict';
import {criterionTitle} from './judge-summary';

function explainError(error:string){
 if(error.includes('评测写入只允许本次运行创建的任务'))return '模型使用了非本次创建的任务 ID，写入被拦截。';
 if(error.includes('模型未通过 MCP 创建任何任务'))return '模型未实际创建任务，创建流程未完成。';
 if(error==='fetch failed')return '请求连接失败，创建流程未完成（fetch failed）。';
 return error;
}

/** Explain the saved verdict using actual errors or review evidence, not expected answers. */
export function runConclusion(run:LabRun){
 const verdict=runVerdict(run);
 if(run.status==='queued')return {verdict,title:'排队中',reason:''};
 if(run.status==='running')return {verdict,title:'执行中',reason:''};
 if(run.judgeStatus==='running')return {verdict,title:'验收中',reason:''};
 if(run.status==='cancelled'||run.status==='interrupted')return {verdict,title:run.status==='cancelled'?'已取消':'已中断',reason:run.error||'执行未完成。'};
 if(verdict==='failed'){
  const error=run.error||run.steps.find(step=>step.error)?.error;
  if(error&&error!=='结构或自动断言未通过；未执行步骤不计为通过')return {verdict,title:'未通过',reason:run.selection?.executionMode==='preview'&&error==='fetch failed'?'模型请求连接失败，任务方案未生成。':explainError(error)};
  const structural=run.steps.flatMap(step=>step.structureErrors);
  if(structural.length)return {verdict,title:'未通过',reason:'输出结构不符合要求：'+structural[0]};
  const assertion=run.steps.flatMap(step=>step.assertions).find(item=>item.status==='failed');
  if(assertion)return {verdict,title:'未通过',reason:assertion.message||`未满足：${assertion.label}`};
 }
 if(run.review)return {verdict,title:verdict==='passed'?'通过':'未通过',reason:run.review.note||'人工验收'+(verdict==='passed'?'通过。':'未通过。')};
 const items=run.jevReviews?.at(-1)?.items??[];
 if(verdict==='failed'){
  const failed=items.filter(item=>item.choice==='unmet'&&(item.source==='model'&&!!item.note.trim()||item.source==='jev'&&(item.confidence??0)>=.8));
  return {verdict,title:'未通过',reason:failed.slice(0,2).map(item=>item.note.trim()||`未满足：${criterionTitle(item.label)}`).join('；')||'执行失败，记录中未提供具体原因。'};
 }
 if(verdict==='passed')return {verdict,title:'通过',reason:'已满足本次完成标准。'};
 if(run.judgeStatus==='failed')return {verdict,title:'待判断',reason:'验收失败：'+(run.judgeError||'未收到有效判断结果。')};
 if(items.some(item=>item.choice==='insufficient'))return {verdict,title:'待判断',reason:items.filter(item=>item.choice==='insufficient'&&item.source!=='local').map(item=>item.note.trim()).filter(Boolean).slice(0,2).join('；')||(run.selection?.executionMode==='preview'?'任务方案或必要输入资料不足，暂时无法核对完成标准。':'创建或回读证据不足，暂时无法核对完成标准。')};
 if(items.length)return {verdict,title:'待判断',reason:'判断置信度不足，需要复核。'};
 return {verdict,title:'待判断',reason:'执行已结束，尚无验收结论。'};
}
