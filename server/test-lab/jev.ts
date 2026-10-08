import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import type { LabRun, LabJevReview, LabJevItem } from '../../src/test-lab/types.ts';
import type { LabStore } from './store.ts';

const endpoint = 'https://api.typesafe.ai/v1/systemone';
const choices = ['met', 'unmet', 'insufficient'] as const;
const probability = z.number().min(0).max(1);
const answerSchema = z.object({
  type: z.literal('choice'), choice: z.enum(choices), confidence: probability,
  probabilities: z.object({ met: probability, unmet: probability, insufficient: probability }).strict(),
}).refine(a => Math.abs(Object.values(a.probabilities).reduce((n,p)=>n+p,0)-1)<0.02 && a.probabilities[a.choice]>=Math.max(...Object.values(a.probabilities))-0.00001);
export type JevOptions = { apiKey?: string; model: string; timeoutMs: number };

import { buildJevRequest, criteriaFor } from './jev-request.ts';
export { buildJevRequest } from './jev-request.ts';

export async function evaluateWithJev(run:LabRun,options:JevOptions,transport:typeof fetch=fetch):Promise<LabJevReview> {
  if (!options.apiKey) throw new Error('未配置 TYPESAFE_API_KEY，请在服务端配置后重启');
  const request=buildJevRequest(run,options.model);
  const started=Date.now();
  const items:LabJevItem[]=criteriaFor(run).map((item,index)=>({...item,id:`q${index}`,choice:'insufficient',confidence:null,probabilities:null,source:'local',note:'该范围有步骤未执行或没有有效输出，需人工核对'}));
  let model=options.model,usage:LabJevReview['usage']=null;
  if(Object.keys(request.questions).length){
    const signal=AbortSignal.timeout(options.timeoutMs);
    try {
      const response=await transport(endpoint,{method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${options.apiKey}`},body:JSON.stringify(request)});
      if([401,403].includes(response.status))throw new Error('Jev 认证失败，请检查服务端 Key 和权限');
      if([429,529].includes(response.status))throw new Error('Jev 限流或暂时繁忙，请稍后重试；未自动重试');
      if(!response.ok){
        const detail=await response.text();
        if([400,413,422].includes(response.status)&&/context.{0,40}(limit|length|exceed)|too many tokens|maximum.{0,20}tokens|token.{0,20}limit/i.test(detail))throw new Error('JEV_CONTEXT_LIMIT：Jev 上下文超限');
        throw new Error(`Jev 返回 HTTP ${response.status}；上游正文已隐藏`);
      }
      const text=await response.text();
      if(text.length>1_000_000)throw new Error('Jev 响应过大');
      let raw:unknown;try{raw=JSON.parse(text);}catch{throw new Error('Jev 返回无效 JSON');}
      const parsed=z.object({model:z.string().min(1).max(120),answers:z.record(z.string(),answerSchema),usage:z.object({input_tokens:z.number().int().nonnegative(),output_tokens:z.number().int().nonnegative()}).optional()}).safeParse(raw);
      if(!parsed.success || Object.keys(request.questions).some(id=>!parsed.data.answers[id]))throw new Error('Jev 返回无效或不完整的判断结果');
      model=parsed.data.model;usage=parsed.data.usage??null;
      for(const item of items)if(request.questions[item.id]){
        const answer=parsed.data.answers[item.id];
        Object.assign(item,{choice:answer.choice,confidence:answer.confidence,probabilities:answer.probabilities,source:'jev',note:answer.confidence<0.8?'置信度低于试用阈值 80%，需人工核对':answer.choice==='insufficient'?'资料不足，需人工核对':''});
      }
    }catch(error){
      if(signal.aborted)throw new Error('Jev 调用超时；未自动重试');
      if(error instanceof TypeError)throw new Error('无法连接 Jev，请检查网络');
      throw error;
    }
  }
  return {id:randomUUID(),at:new Date().toISOString(),model,requestedModel:options.model,policyVersion:'jev-review-v1',requestHash:createHash('sha256').update(JSON.stringify(request)).digest('hex'),durationMs:Date.now()-started,usage,items};
}

export function createJevReviewer(store:LabStore,options:JevOptions,transport:typeof fetch=fetch,evaluator:(run:LabRun)=>Promise<LabJevReview>=run=>evaluateWithJev(run,options,transport)){
  const pending=new Set<string>();
  return async(runId:string)=>{
    if(pending.has(runId))throw new Error('该运行正在进行 Jev 核对，请稍候');
    const run=store.getRun(runId);
    if(!run)throw new Error('测试运行不存在');
    if((run.jevReviews?.length??0)>=20)throw new Error('该运行已保存 20 次 Jev 核对，请导出记录后使用新的测试运行');
    pending.add(runId);
    try {
      const review=await evaluator(run);
      return store.updateRun(runId,current=>{current.jevReviews=[...(current.jevReviews??[]),review];});
    }finally{pending.delete(runId);}
  };
}
