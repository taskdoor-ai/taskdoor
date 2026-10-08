import type {LabJevReview} from './types';
export function criterionTitle(label:string){try{const item=JSON.parse(label);return [item.subject,item.criterion].filter(Boolean).join('：')||label;}catch{return label;}}
export function judgeSummary(review:LabJevReview){
 const met=review.items.filter(i=>i.choice==='met');const unmet=review.items.filter(i=>i.choice==='unmet');const unknown=review.items.filter(i=>i.choice==='insufficient');
 const uncertain=review.items.filter(i=>i.source==='jev'&&(i.confidence===null||i.confidence<.8));
 const focus=unmet.length?unmet:unknown.length?unknown:met;
 const titles=focus.slice(0,2).map(i=>`“${criterionTitle(i.label)}”`).join('、');
 const basis=unmet.length?`判断依据：核对结果认为实际输出未满足${titles}${unmet.length>2?'等要求':''}。`:unknown.length?`判断依据：现有输入和输出不足以核实${titles}${unknown.length>2?'等要求':''}。`:met.length?`判断依据：核对结果认为实际输出符合${titles}${met.length>2?'等验收要求':''}。`:'判断依据：没有可用的核对项。';
 return {met,unmet,unknown,uncertain,basis,text:`已核对 ${review.items.length} 项：${met.length} 项符合，${unmet.length} 项不符合，${unknown.length} 项资料不足。${uncertain.length?`另有 ${uncertain.length} 项判断置信度不足，建议复核。`:''}`};
}
