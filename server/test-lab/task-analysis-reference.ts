import {stableJson} from './stable-json.ts';
import {createHash} from 'node:crypto';
import type {LabState,Json} from '../../src/test-lab/types.ts';
import {applyEvents} from './context.ts';
import {selectCaseContext} from '../../src/test-lab/case-input-context.ts';

/** Authored fixture reference answers, frozen before execution; never model-generated or model inputs. */
export function updateTaskAnalysisReferences(state:LabState){
 let changed=false;
 for(const c of state.cases){
  const steps=c.steps.filter(s=>s.skillId==='agentdoor-task-status-analyzer');
  if(!steps.length)continue;
  const source=c.dataSnapshot??state.teams.find(t=>t.id===c.teamId);if(!source)continue;
  const fingerprint=createHash('sha256').update(stableJson({source,steps,assertions:c.assertions,revision:5})).digest('hex').slice(0,12);
  if(c.expectedOutput?.checks.some(x=>x.id.startsWith(`analysis-reference-v2-${fingerprint}-`)))continue;
  let snapshot=structuredClone(source);
  const checks=steps.flatMap(step=>{
   snapshot=applyEvents(snapshot,step);
   const view=selectCaseContext(snapshot,c,step).team;
   const task=view.tasks.find(t=>t.id===step.taskId);if(!task)return [];
   const ref=(path:string)=>c.assertions.find(a=>a.stepId===step.id&&a.path===path&&a.operator==='equals');
   const refs=view.evidence.filter(e=>e.taskId===task.id||view.tasks.some(t=>t.parentId===task.id&&t.id===e.taskId)).map(e=>`${e.id} · v${e.version}${e.readState==='unavailable'?' · 正文不可读':''}`);
   const key=c.id.split('--')[0].replace('case-analysis-test-','');
   const synthetic=(c.id.startsWith('case-analysis-test-')||c.id.startsWith('case-analysis-timing-'));const hierarchy=c.id.startsWith('case-analysis-data-');
   const ewd=view.evidence.some(e=>e.id.endsWith('ewd-content-check'));
   const grade=ref('result.progress.displayPercent');const raw=ref('result.progress.completionPercent');
   const percent=grade?.expected??(ewd?75:hierarchy?50:null);
   const original=raw?.expected??(ewd?Number((552/720*100).toFixed(4)):hierarchy?50:null);
   const criteria=task.acceptanceCriteria.map((text,i)=>{
    const a=ref(`result.criterionAssessments.${i}.percent`);
    const value=a?a.expected:c.id==='case-status'?50:hierarchy?(i===0?100:0):ewd?[100,75,50][i]??null:null;
    return {完成标准:text,AI参考完成度:value,用户确认:task.criteria?.items[i]?.confirmation??'未提供确认记录',依据:c.id==='case-status'?'正文已有产品介绍与口播，但缺活动标题、优惠金额、行动引导，且无产品信息完整核对记录；参考50%表示部分交付，不能确认完成或据此计算整体工时比例。':synthetic?(value===100?'当前交付正文明确覆盖该项，并有核对记录。':value===0?'当前正文明确记载未执行或未交付。':'缺少可读取的交付正文，无法核对。'):hierarchy?(i===0?'子任务脚本480字且商品卖点已复核。':'海报子任务讨论明确尚未执行。'):ewd?'对应明细内容核对为100%、80%、40%，分别映射到100%、75%、50%档。':'目前未建立充分的逐条内容核对，参考完成度保留未知。'};
   });
   const done=criteria.filter(x=>x.AI参考完成度===100).map(x=>x.完成标准);
   const gaps=criteria.filter(x=>x.AI参考完成度!==100).map(x=>x.完成标准);
   const authored={
    'claim-conflict':'讨论声称全部完成，但正文只覆盖规则与页面；通知、预案未执行，以正文为准。',
    'new-scope':'原四项已交付，新增英文文案及成功提示没有交付或估算，原240分钟不能作为完整新范围分母。正式已完成状态保留。',
    'superseded':'新版只保留规则与页面；旧完整文件已被替代，通知联系人失效，预案待重新制定。',
    'unreadable':'最终报名包正文读取失败，无法验证完成声称；不可读不代表未完成或零进度。',
    'unknown':'只有全部完成的讨论报告，没有交付正文；整体与各标准完成度未知。',
    'discussion-conflict':'负责人声称通知和预案完成，复核意见与正文指出联系人及故障切换缺口；规则与页面已交付。',
    'irrelevant-noise':'规则、页面、通知已有交付；当前预案未执行，茶歇讨论及上月活动总结不证明本次预案完成。',
    'confirmed-gap':'预案已有用户确认，但当前版本仍缺故障切换与联系人替补；保留确认，AI对当前预案预测0%。',
    'weighted':'只有规则完整交付，规则占120分钟，其余各40分钟；完成120/240=50%，不能按一项/四项算25%。',
   } as Record<string,string>;
   const scenario=c.expectedOutput?.checks.filter(x=>!x.id.startsWith('analysis-')&&x.subject==='场景结果'&&(x.stepId===step.id||x.stepId===null)).map(x=>x.criterion)??[];
   const summary=authored[key]??(synthetic?`本轮 ${done.length} 项交付有正文支持，${gaps.length} 项待补齐或待核对。`:hierarchy?'脚本已完整交付，海报明确未执行；父级汇总和成果引用不重复计量。':ewd?'新版v2删除无依据承诺，主体交付仍有色卡、SKU及接收核对缺口；不是正式验收。':c.id==='case-status'?'脚本已有产品介绍与口播，但缺活动标题、优惠金额和最终行动引导。':scenario.join('；')||'只有可见工作说明或局部记录，无法核对完整交付与整体工作量。');
   const action=key==='unknown'||key==='unreadable'?'取得可读取的当前交付正文，再逐项核对。':key==='new-scope'?'补齐英文页面和成功提示，核对新增范围投入后重新分析整体进度。':hierarchy?'完成1080×1920首发海报；核对对应海报交付。'+(c.id.endsWith('dependency')?'审批仅影响发布，制作可继续；发布前再取得审批记录。':''):ewd?'补齐最终色卡、SKU对照和交接接收核对，采用当前版本继续完成。':c.id==='case-status'?'补齐活动标题、优惠金额及最终行动引导，取得产品信息核对结果。':gaps.length?'围绕这些未完成或待核对标准补交并复核：'+gaps.join('；'):synthetic?'四项内容均已核对；是否确认完成由用户决定，AI不自动确认。':'补取可见交付与逐项核对记录；缺少的成本、私密资料保持未知。';
   const history=view.evidence.find(e=>e.id.endsWith('ewd-history'));
   let points:Json=[];if(history&&history.readState!=='unavailable'){try{points=JSON.parse(history.content).points??[];}catch{}}
   const check=(suffix:string,subject:string,expected:Json)=>({id:`analysis-reference-v2-${fingerprint}-${step.id}-${suffix}`,stepId:step.id,subject,criterion:`对照本用例第${step.id}轮预先核对的参考分析与证据。数值应符合参考；文字允许等义表达；行动处理人允许任务负责人或有正式责任依据的协作者，不强求参考姓名相等。参考是评判依据而非业务事实，矛盾时应指出，不得以参考强迫模型编造。`,expected});
   return [check('progress','参考整体进度',{展示完成度:percent,原始完成度:original,计算依据:ewd?'120×100% + 480×80% + 120×40% = 552分钟；552/720≈76.67%，展示75%。':hierarchy?'脚本60分钟已完成、海报60分钟未执行：60/120=50%；不加父级120分钟。':key==='weighted'?authored[key]:synthetic&&percent!==null?`四项独立工作各60分钟，完整交付对应${original}%工作量。`:'当前只有总估算或不完整新范围，不能据此计算完成量。',证据:refs}),check('criteria','参考逐条完成度',criteria as unknown as Json),check('situation','参考情况与下一步',{当前情况:summary,已完成:done,剩余或待核对:gaps,下一步建议:action,建议处理人:view.members.find(m=>m.id===task.ownerId)?.name??null,特殊预期:scenario}),check('trend','参考燃起图与日期',c.expectedOutput?.checks.find(x=>x.subject==='排期参考'&&x.stepId===step.id)?.expected??{历史节点:points,计划截止:task.dueAt,预计完成:null,确认完成:null,计划日期差:null,依据:history?'只保留输入中真实历史点；范围从960降为720时完成量仍240，随后完成量增至552。未提供有效未来交付安排或独立确认完成日期，预测与差值未知。':'未提供历史工作量观察或有效未来交付安排；不产生历史曲线、预测日期或提前延期数值。'})];
  });
  if(checks.length){c.expectedOutput={version:1,checks:[...checks,...(c.expectedOutput?.checks??[]).filter(x=>!/^analysis-reference-v[12]-/.test(x.id))]};c.version++;changed=true;}
 }
 return changed;
}
