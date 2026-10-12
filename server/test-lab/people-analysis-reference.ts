import {stableJson} from './stable-json.ts';
import {createHash} from 'node:crypto';
import type {LabState,Json} from '../../src/test-lab/types.ts';
import {applyEvents} from './context.ts';
import {selectCaseContext} from '../../src/test-lab/case-input-context.ts';

/** Evaluation-only references, frozen from the scenario snapshot before any model run. */
export function updatePeopleAnalysisReferences(state:LabState){
 let changed=false;
 for(const c of state.cases){
  const steps=c.steps.filter(s=>['agentdoor-responsibility-advisor','agentdoor-member-matcher'].includes(s.skillId));
  if(!steps.length)continue;
  const source=c.dataSnapshot??state.teams.find(t=>t.id===c.teamId);if(!source)continue;
  const fingerprint=createHash('sha256').update(stableJson({source,steps,assertions:c.assertions,revision:4})).digest('hex').slice(0,12);
  if(c.expectedOutput?.checks.some(x=>x.id.startsWith(`people-reference-v2-${fingerprint}-`)))continue;
  let snapshot=structuredClone(source);
  const checks=steps.flatMap(step=>{
   snapshot=applyEvents(snapshot,step);
   const view=selectCaseContext(snapshot,c,step).team;
   const member=view.members.find(m=>m.id===c.actorId);if(!member)return [];
   const key=c.id.split('--')[0].replace('case-people-test-','');
   const refs=view.evidence.filter(e=>e.readState!=='unavailable'&&(e.id.startsWith('people-test-')||e.id==='past-delivery'||/past|history/.test(e.taskId)||e.kind==='确认')).map(e=>({来源:e.id,任务:e.taskId,版本:e.version}));
   const special=c.expectedOutput?.checks.filter(x=>!x.id.startsWith('people-reference-')&&x.subject==='场景结果'&&(x.stepId===step.id||x.stepId===null)).map(x=>x.criterion)??[];
   const check=(suffix:string,subject:string,expected:Json)=>({id:`people-reference-v2-${fingerprint}-${step.id}-${suffix}`,stepId:step.id,subject,criterion:'对照本轮预先核对的参考结果，允许等义的简短文本；逐项核对正式责任、本人实际贡献和证据。参考证据列表是可用目录，不要求引用所有记录；仅分析输入指定的候选。无变化可返回空proposals或no_change。参考不得发送给生成模型，若原始证据冲突应保留未知。',expected});
   if(step.skillId==='agentdoor-member-matcher'){
    const assertedPercent=c.assertions.find(a=>a.stepId===step.id&&a.path==='result.candidates.0.matchPercent'&&a.operator==='equals');
    const percent=assertedPercent?assertedPercent.expected as number|null:({'full-match':100,'partial-match':50,'unknown-match':null,'wrong-history':0,'support-match':25,'near-match':75} as Record<string,number|null>)[key]??null;
    const assessments=percent===100?['full','full']:percent===50?['none','full']:percent===25?['none','partial']:percent===75?['full','partial']:percent===0?['none','none']:['unknown','unknown'];
    const role=percent===100?'owner':percent!==null&&percent>0?'participant':null;
    // Other member has explicit activity-only responsibility, unrelated to the script requirements.
    const candidates=view.members.filter(m=>m.id===c.actorId).map(m=>({人员:m.name,成员ID:m.id,责任版本:m.version,匹配百分比:m.id===member.id?percent:0,匹配梯度:m.id===member.id?(percent===null?'unknown':percent>=75?'high':percent>0?'partial':'low'):'low',建议角色:m.id===member.id?role:null,正式责任:m.responsibilities,逐项覆盖:['可编辑脚本交付','商品卖点事实核对'].map((要求,i)=>({要求,覆盖:m.id===member.id?assessments[i]:'none'}))}));
    return [check('match','参考人员匹配',candidates as unknown as Json),check('basis','参考匹配依据',{计算口径:'两项独立结果等权；完整覆盖=1、部分覆盖=0.5、未覆盖=0；覆盖未知时整体未知。',推荐负责人:role==='owner'?member.id:null,缺口:percent===100?'结果要求全部覆盖；参与权限仍须核验。':percent===50?'只覆盖卖点核对，缺少脚本撰写责任。':key==='support-match'?'只有商品资料支持，不能独立核对事实或撰写脚本。':key==='near-match'?'脚本责任覆盖，卖点核对仅部分支持；不能独立负责整项。':key==='wrong-history'?'归档责任与脚本制作不匹配，他人文稿不增加本人匹配。':'正式责任缺失，不能由历史参与身份猜匹配。',证据:refs,业务变化:'仅推荐，不改任务人员，不产生写回回执。'})];
   }
   const temporary=key==='temporary'||/role-temporary|role-correction/.test(c.id);
   const sustained=key==='sustained';
   const planned=key==='planned-only';const wrong=key==='wrong-author';
   const after=member.responsibilities;
   const broad=after.length===1&&after[0]==='内容制作';
   const operation=sustained||broad?'update':'no_change';
   const proposed=operation==='update'?['负责产品介绍脚本策划、卖点核对与文稿交付']:after;
   const reason=sustained?'两项独立历史脚本交付及复核均明确本人实际承担，可将笼统责任细化。':temporary?'目录整理或直播字幕属于临时协助；本轮用户纠正优先，不增加长期脚本或运营责任。':planned?'任务尚未开始，计划分工不能证明实际承担，维持商品资料核对责任。':wrong?'本人只是归档他人文稿，维持归档责任，不增加脚本创作责任。':step.id!=='s1'?'按事件更新后的正式责任及版本分析；既有边界已明确，不为润色重复更新。':'当前责任已经覆盖可归属的脚本与文案贡献，保留原文；历史资料支持及他人复核不能归为本人主体制作。';
   return [check('responsibility','参考责任更新',{人员:member.name,责任基准版本:member.version,预期操作:operation,更新前责任:after,预期责任文本:proposed,调整依据:reason,不应新增责任:temporary?['长期附件目录维护','直播运营','用户本轮明确排除的长期口播脚本责任']:planned||wrong?['未经本人实际承担证据支持的脚本制作']:['直播运营','拍摄与投流','视觉设计','未经授权的商务确认'],允许结果:operation==='no_change'?'保留原文的 no_change 或空 proposals；不能仅因润色产生更新。':'返回具体 update 建议，文本可等义表述。'}),check('evidence','参考贡献与边界',{证据:refs,场景核对:special,未知项:'没有新的可归属贡献时不推断长期新责任；证据不足保留待核对。',实际更新:null,写回回执:null,后续处理:'本地仅生成建议；自动更新仍需有效配置、权限、版本及业务回执。'})];
  });
  if(checks.length){c.expectedOutput={version:1,checks:[...checks,...(c.expectedOutput?.checks??[]).filter(x=>!x.id.startsWith('people-reference-'))]};c.version++;changed=true;}
 }
 return changed;
}
