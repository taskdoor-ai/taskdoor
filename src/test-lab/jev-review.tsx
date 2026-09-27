import React from 'react';
import type { LabConfig, LabRun } from './types';
import { isActiveRun } from './model';

const labels={met:'符合',unmet:'不符合',insufficient:'信息不足'};
const percent=(value:number)=>`${(value*100).toFixed(1)}%`;
export function JevReview({run,config,busy,onReview}:{run:LabRun;config?:LabConfig['jev'];busy:boolean;onReview?:()=>Promise<void>}){
  const history=run.jevReviews??[];
  const hasCriteria=run.caseSnapshot.reviewChecklist.length>0||run.caseSnapshot.verification?.expectedResults.some(r=>r.criteria.length);
  return <section className="lab-detail-section" aria-label="Jev 语义核对">
    <div className="lab-section-heading"><h3>Jev 语义核对</h3><button disabled={busy||!config?.configured||!onReview||isActiveRun(run.status)||!hasCriteria||history.length>=20} onClick={()=>void onReview?.()}>{busy?'处理中…':history.length?'重新使用 Jev 核对':'使用 Jev 核对'}</button></div>
    <p className="lab-muted">将本次运行的输入、输出和预期发送至 TypeSafe，逐项辅助核对并产生 API 用量。最终验收仍由自动断言和人工核对决定。</p>
    {!config?.configured&&<p className="lab-alert">请配置服务端 TYPESAFE_API_KEY 并重启测试平台。</p>}
    {!hasCriteria&&<p className="lab-muted">该运行快照没有预期结果或人工核对项，请补充用例并重新运行。</p>}
    {!history.length&&<p className="lab-muted">尚未进行 Jev 核对 · {config?.model??'未配置模型'}</p>}
    {[...history].reverse().map((review,index)=><details key={review.id} open={index===0} className="lab-json-detail">
      <summary>{index===0?'最近核对':'历史核对'} · {new Date(review.at).toLocaleString('zh-CN')} · {review.model}</summary>
      <p className="lab-muted">{(review.durationMs/1000).toFixed(1)} 秒 · 输入 {review.usage?.input_tokens??'未调用'} / 输出 {review.usage?.output_tokens??'未调用'} Tokens。置信度低于 80% 时提示人工核对；此阈值为试用值，尚未经本用例库校准。</p>
      <div className="lab-table-scroll"><table className="lab-comparison-table"><thead><tr><th>核对项</th><th>判断</th><th>置信度</th><th>选项概率</th></tr></thead><tbody>{review.items.map(item=><tr key={item.id}>
        <th><small>{item.stepId?`步骤 ${run.caseSnapshot.steps.findIndex(s=>s.id===item.stepId)+1}`:'整次运行'}</small>{item.label}</th>
        <td>{labels[item.choice]}{item.note&&<small>{item.note}</small>}</td>
        <td>{item.confidence===null?'未调用':percent(item.confidence)}</td>
        <td>{item.probabilities?Object.entries(item.probabilities).map(([key,value])=><small key={key}>{labels[key as keyof typeof labels]} {percent(value)}</small>):'未判定'}</td>
      </tr>)}</tbody></table></div>
    </details>)}
  </section>;
}
