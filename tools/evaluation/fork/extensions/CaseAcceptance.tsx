import {useState} from 'react';
import {expectedOutputFor} from '@taskdoor/expected-output';
import type {LabCase,Json} from '@taskdoor/types';
import {describeReference,acceptanceCheckSections} from '@/test-lab/reference-display';
const readable:Record<string,string>={预计完成与计划差值:'分别核对计划截止、AI 预计完成和用户确认完成日期，比较提前或延期天数；有计划曲线时再比较完成量差值。缺依据保持未知，预测不算实际完成。',整体进度:'根据当前有效交付和工作量判断整体完成度，使用 0%、25%、50%、75%、100% 梯度；证据不足时保留未知。',逐条标准完成度:'逐条判断完成标准，说明已完成内容、剩余内容和证据；AI 完成度与人工确认分别记录。',燃起图数据结构:'按真实历史展示总工作量和完成量的变化；没有历史数据时不编造曲线或日期。',当前情况:'说明当前已完成什么、缺少什么、哪些结论待核对，处理文件版本和讨论冲突。',下一步建议:'围绕实际缺口给出可执行建议、负责人及依据，不重复安排已完成工作。'};
const labels:Record<string,string>={displayPercent:'展示完成度',completionPercent:'原始完成度',index:'标准序号',percent:'完成度',text:'完成标准',allowedPercents:'允许完成度'};
function Expected({value,field,context}:{value:Json;field?:string;context?:Record<string,unknown>}){
 if((field==='allowedPercents'||field==='允许AI参考完成度')&&Array.isArray(value))return <span>{describeReference(undefined,{field:'percent',context:{allowedPercents:value}}).label}</span>;
 if(value===null||!Array.isArray(value)&&typeof value!=='object'){const reference=describeReference(value,{field,context});return <span title={reference.detail}>{reference.label}{reference.detail&&<small> · {reference.detail}</small>}</span>;}
 if(Array.isArray(value)&&!value.length)return <span>{describeReference(value,{field,unit:field==='历史节点'||field==='预测节点'?'count':undefined}).label}</span>;
 if(Array.isArray(value))return <ul className="acceptance-reference">{value.map((v,i)=><li key={i}><Expected value={v}/></li>)}</ul>;
 return <dl className="acceptance-reference">{Object.entries(value).map(([k,v])=><div key={k}><dt>{labels[k]??k}</dt><dd><Expected value={v} field={k} context={value}/></dd></div>)}</dl>;
}
export default function CaseAcceptance({item}:{item:LabCase}){
 const[expanded,setExpanded]=useState(false);const {primary:checks,details,hasReferences}=acceptanceCheckSections(expectedOutputFor(item).checks);
 if(!checks.length)return <p className="business-muted">尚未配置验收标准</p>;
 return <div><ol className={expanded?'case-acceptance':'case-acceptance case-acceptance-collapsed'}>{checks.map(check=><li key={check.id}><strong>{check.subject||'判断规则'}</strong>{!/^(analysis|people)-reference-v\d+-/.test(check.id)&&<p>{check.id.startsWith('analysis-v')?(readable[check.subject]??check.criterion):check.criterion}</p>}{check.expected!==null&&check.expected!==undefined&&<div className="acceptance-expected"><span className="business-muted">参考分析</span><Expected value={check.expected}/></div>}{expanded&&check.id.startsWith('analysis-v')&&<details className="acceptance-technical"><summary>结构与判断细则</summary><p>{check.criterion}</p></details>}</li>)}</ol>{expanded&&details.length>0&&<details className="acceptance-technical"><summary>通用分析规则与结构细则（{details.length} 项）</summary><ol>{details.map(check=><li key={check.id}><strong>{check.subject}</strong><p>{readable[check.subject]??check.criterion}</p><p>{check.criterion}</p></li>)}</ol></details>}<button type="button" className="case-expand-toggle" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'收起参考与验收':`展开${hasReferences?'参考与验收':'验收标准'}（${checks.length} 项）`}</button></div>;
}
