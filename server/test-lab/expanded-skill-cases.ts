import type {LabState,LabCase} from '../../src/test-lab/types.ts';

/** Independent evidence perturbations: references remain outside generation input. */
export function addExpandedSkillCases(state:LabState){
 let changed=false;
 const fixNoChange=(c:LabCase)=>{
  if(!c.assertions.some(a=>a.id==='operation'&&a.expected==='no_change'))return false;
  c.assertions=c.assertions.filter(a=>a.id!=='operation');
  for(const op of ['add','update','deprecate'])c.assertions.push({id:'no-'+op,stepId:'s1',label:'无新贡献时不能'+op+'责任',path:'result.proposals.*.operation',operator:'not_contains',expected:op});
  return true;
 };
 const add=(sourceId:string,key:string,name:string,mutate:(c:LabCase)=>void)=>{
  const id=sourceId+'--'+key;const existing=state.cases.find(c=>c.id===id);if(existing){if(fixNoChange(existing)){existing.version++;changed=true;}return;}
  const source=state.cases.find(c=>c.id===sourceId);if(!source)return;
  const c=structuredClone(source);c.id=id;c.name=name;c.origin='expanded-skills-v1';c.version=1;c.tags=[...(c.tags??[]),'边界回归',key];
  const team=source.dataSnapshot??state.teams.find(t=>t.id===source.teamId);if(team)c.dataSnapshot=structuredClone(team);
  if(c.expectedOutput)c.expectedOutput.checks=c.expectedOutput.checks.filter(x=>!x.id.startsWith('analysis-')&&!x.id.startsWith('people-reference-'));
  mutate(c);fixNoChange(c);state.cases.push(c);changed=true;
 };
 const planners=[
  ['planning-core-v1-d-single','duration','单项脚本 · 时长与交付格式','补充：脚本必须控制在30秒内，交付可编辑文字稿，不交付视频。','完成标准包含30秒时长与可编辑文字稿，不增加拍摄剪辑。'],
  ['planning-core-v1-d-single','fact-boundary','单项脚本 · 缺少事实不编造','补充：没有保温时长的检测资料，不得添加保温24小时等承诺。','保留350ml与可拆洗杯盖，不能编造保温时长或测试结论。'],
  ['planning-core-v1-d-three','budget','三项物料 · 预算分项不能超总额','补充：总预算2万元包含全部三项，不是每项2万元；不要添加采购或投放。','2万元作为整体预算约束，不得按每项2万元扩大预算或新增采购投放。'],
  ['planning-core-v1-d-three','format','三项物料 · 格式与尺寸明确','补充：商城图1080×1080，交付源文件和PNG；活动方案交付可编辑文档。','主视觉标准包含1080×1080、源文件及PNG；活动方案为可编辑文档。'],
  ['planning-core-v1-d-channels','parallel','独立渠道 · 不增加审核串行依赖','补充：三份内容由各自负责人独立审核，不必等官网完成才制作海报。','保留三份独立交付，不增加官网先完成的依赖。'],
  ['planning-core-v1-d-channels','scope','独立渠道 · 售后资料不足保留核对','补充：未提供具体退换货时限，客服问答应列待核对项，不自行编造天数。','客服问答涉及退换货时限时保留待核对，不编造具体时限。'],
 ] as const;
 for(const [source,key,name,input,criterion] of planners)add(source,key,name,c=>{c.steps[0].prompt+='\n'+input;c.expectedOutput!.checks.push({id:'expanded-boundary',stepId:'s1',subject:'新增边界',criterion,expected:null});});
 const analysis=[
  ['rules-only','old-claim','规则25% · 过期完成声称'],['page-ready','duplicate','页面50% · 重复上传不重复计量'],['notice-ready','noise','通知75% · 无关会议不增完成量'],['all-evidence','no-confirm','全部100% · 新讨论仍未人工确认'],
  ['weighted','duplicate','权重50% · 同一成果两份附件'],['claim-conflict','stale','正文50% · 旧群聊声称已全部完成'],['not-started','plan-only','尚未开始0% · 排期通知不代表已交付'],['superseded','old-copy','新版50% · 旧附件再次上传不恢复有效性'],
 ] as const;
 for(const [source,key,name] of analysis)add('case-analysis-test-'+source,key,name,c=>{
  const snapshot=c.dataSnapshot!,task=snapshot.tasks.find(t=>t.id===c.steps[0].taskId)!;
  if(key==='duplicate'){
   const original=snapshot.evidence.find(e=>e.taskId===task.id&&e.id.endsWith('-delivery'))!;
   snapshot.evidence.push({...structuredClone(original),id:original.id+'-copy',title:'同一交付的归档副本.md',content:'归档副本：与当前交付核对记录完全相同，非新增工作。\n'+original.content});
  }else snapshot.evidence.push({id:c.id+'-note',taskId:task.id,authorId:task.ownerId!,kind:'讨论',title:key==='old-copy'?'旧版归档说明':'补充上下文',content:key==='old-copy'?'旧完整附件是历史归档，已被当前版本替代；再次上传不表示通知与预案已经修复。':key==='plan-only'?'已安排下周执行规则、页面、通知、预案；只是计划，四项尚未执行，没有交付结果。':key==='noise'?'会议讨论茶歇与交通报销，这些不属于当前报名包四项独立交付。':key==='no-confirm'?'内容复核完成，但还没有点击完成标准确认；请保留用户确认状态。':'上月旧群聊说全部完成；该报告早于当前版本，不能代替当前交付正文。',createdAt:'2026-10-08T09:00:00+08:00',version:1,visibleToIds:[]});
 });
 const people=[['temporary','explicit-boundary','责任更新 · 临时帮助再次明确边界'],['wrong-author','archive','责任更新 · 上传归档与作者分离'],['full-match','noise','人员匹配100% · 无关历史不扣减'],['partial-match','plan-only','人员匹配50% · 拟新增职责不提前计入'],['support-match','duplicate','人员匹配25% · 重复资料不扩大覆盖'],['wrong-history','archive','人员匹配0% · 归档不等于独立制作']] as const;
 for(const [source,key,name] of people)add('case-people-test-'+source,key,name,c=>{
  const snapshot=c.dataSnapshot!,history=snapshot.tasks.find(t=>t.id.includes('history-1'))!;
  snapshot.evidence.push({id:c.id+'-note',taskId:history.id,authorId:c.actorId,kind:'讨论',title:'贡献边界补充',content:source==='temporary'?'再次说明：字幕属于单次帮忙，不承担后续直播运营，也不改变正式脚本责任。':source==='wrong-author'||source==='wrong-history'?'这份脚本由他人创作；我仅上传归档，无脚本撰写贡献。':source==='partial-match'?'有人提议以后让我写脚本，尚未确认或执行；我当前仍只负责商品卖点事实核对。':source==='support-match'?'重复发送同一份资料目录，没有新增事实核对与文稿制作贡献。':'曾临时协助会议签到，与当前产品脚本任务无关，正式脚本责任保持原文。',createdAt:'2026-10-09T09:00:00+08:00',version:1,visibleToIds:[]});
 });
 return changed;
}
