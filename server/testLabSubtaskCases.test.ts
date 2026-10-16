import test from 'node:test';
import assert from 'node:assert/strict';
import {seedLab} from './test-lab/seeds.ts';
import {addSubtaskCases, buildSubtaskCases, planSubtaskCaseRefresh, subtaskCaseIds, subtaskCasesOrigin} from './test-lab/subtask-cases.ts';
import {caseSchema, editableSchema, validateRelations} from './test-lab/schema.ts';
import {updateContentTeamRoster} from './test-lab/content-team-roster.ts';
import {buildSubtaskInput} from './test-lab/subtask-suggestions.ts';

function fixtures() {
  const state=seedLab();
  updateContentTeamRoster(state);
  addSubtaskCases(state);
  return {state,cases:state.cases.filter(item=>item.origin===subtaskCasesOrigin)};
}

test('独立拆解九例十一轮通过真实 Schema 和关系校验，每轮都是当前父任务与独立建议 Skill',()=>{
  const {state,cases}=fixtures();
  assert.equal(cases.length,9);
  assert.equal(cases.reduce((sum,item)=>sum+item.steps.length,0),11);
  assert.deepEqual(cases.map(item=>item.id),subtaskCaseIds);
  editableSchema.parse({expectedRevision:state.revision,teams:state.teams,cases:state.cases});
  validateRelations(state.teams,state.cases);
  for (const item of cases) {
    caseSchema.parse(item);
    for(const [i,step] of item.steps.entries()){
      assert.equal(step.skillId,'taskdoor-decompose-task');
      assert.equal(step.evaluatedAt,'2026-10-16T09:00:00+08:00');
      assert.deepEqual(step.events,[]);
      assert.equal(step.usePreviousOutput,i>0);
      assert.ok(item.dataSnapshot!.tasks.some(task=>task.id===step.taskId));
      assert.deepEqual(item.verification!.expectedResults.find(result=>result.stepId===step.id)!.criteria,item.expectedOutput!.checks.filter(check=>check.stepId===step.id).map(check=>check.criterion));
      assert.equal(item.assertions.filter(check=>check.stepId===step.id&&check.path==='parentTaskId').length,1);
    }
    assert.equal(item.teamId,'lab-content');
    assert.equal(item.dataSnapshot!.id,item.teamId);
    assert.equal(item.subtaskContext!.coverage.length,6);
    assert.ok(item.reviewChecklist.length>=5);
    assert.deepEqual(item.verification!.expectedResults.flatMap(result=>result.criteria),item.reviewChecklist);
    assert.deepEqual(item.expectedOutput!.checks.map(check=>check.criterion),item.reviewChecklist);
    assert.ok(item.assertions.every(check=>['schemaVersion','parentTaskId','status'].includes(check.path)));
  }
});

test('父任务和已有子任务只在隔离快照，建立数据不改团队任务或成员并且各例互不串用',()=>{
  const state=seedLab();
  const team=state.teams.find(item=>item.id==='lab-content')!;
  const before=structuredClone(team);
  assert.equal(addSubtaskCases(state),true);
  assert.deepEqual(team,before);
  const cases=state.cases.filter(item=>item.origin===subtaskCasesOrigin);
  for (const item of cases) {
    assert.notEqual(item.dataSnapshot,team);
    assert.notEqual(item.dataSnapshot!.members,team.members);
    assert.deepEqual(item.dataSnapshot!.members.map(member=>member.id),team.members.map(member=>member.id));
    assert.ok(item.dataSnapshot!.tasks.every(task=>!team.tasks.some(original=>original.id===task.id)));
  }
  cases[0].dataSnapshot!.members[0].responsibilities.push('仅第一例的人为编辑');
  cases[0].dataSnapshot!.tasks[0].goal='仅第一例编辑目标';
  assert.deepEqual(team,before);
  assert.ok(cases.slice(1).every(item=>!JSON.stringify(item.dataSnapshot).includes('仅第一例')));
});

test('再次注册只补缺例，保留用户编辑、归档禁用、快照、验收和同ID自定义内容',()=>{
  const {state,cases}=fixtures();
  const retained=cases[0];
  retained.steps[0].prompt='用户编辑的拆解要求';
  retained.archived=true;retained.enabled=false;
  retained.reviewChecklist.push('用户自定义验收');
  retained.dataSnapshot!.tasks[0].goal='用户已修改的目的';
  const frozen=structuredClone(retained);
  const count=state.cases.length;
  assert.equal(addSubtaskCases(state),false);
  assert.equal(state.cases.length,count);
  assert.deepEqual(retained,frozen);
  state.cases=state.cases.filter(item=>item.id!==subtaskCaseIds[2]);
  assert.equal(addSubtaskCases(state),true);
  assert.equal(state.cases.length,count);
  assert.deepEqual(state.cases.find(item=>item.id===retained.id),frozen);
  retained.origin='user-authored';
  assert.equal(addSubtaskCases(state),false);
  assert.equal(retained.origin,'user-authored');
});

test('缺少目标团队或有效成员时不注册，也不改状态',()=>{
  const state=seedLab();
  state.teams=state.teams.filter(team=>team.id!=='lab-content');
  const frozen=structuredClone(state);
  assert.equal(addSubtaskCases(state),false);
  assert.deepEqual(state,frozen);
  const empty={...seedLab().teams[0],members:[]};
  assert.deepEqual(buildSubtaskCases(empty),[]);
});

test('只补商城图场景保留已完成文案、正式职责语义以及有条件日期验收',()=>{
  const {cases}=fixtures();
  const item=cases.find(item=>item.id===subtaskCaseIds[0])!;
  const team=item.dataSnapshot!,parent=team.tasks.find(task=>task.id===item.steps[0].taskId)!;
  const child=team.tasks.find(task=>task.parentId===parent.id)!;
  assert.equal(child.status,'已完成');
  assert.equal(parent.dueAt,'2026-10-23');
  assert.equal(parent.criteria!.version,2);
  assert.equal(parent.version,3);
  const ownerCheck=item.expectedOutput!.checks.find(check=>check.subject==='目标标准与责任承接')!;
  const expected=ownerCheck.expected as Record<string,unknown>;
  assert.equal(expected.ownerFollowsConfirmedResponsibilities,true);
  assert.equal('recommendedOwnerMemberId' in expected,false);
  const dateCheck=item.expectedOutput!.checks.find(check=>check.subject==='有限交付建议日期')!;
  assert.deepEqual(dateCheck.expected,{suggestedDueDateRequired:true,notBefore:'2026-10-16',notAfter:'2026-10-23',requiresWarning:true});
  assert.equal(item.assertions.some(check=>check.path.includes('dueDate')),false,'不把有条件建议固定成某一天');
});

test('合理视觉职责可以有多位人选，候选期望不随成员目录首位或顺序固定到某人',()=>{
  const {state}=fixtures();
  const team=structuredClone(state.teams.find(team=>team.id==='lab-content')!);
  const visual=team.members.find(member=>member.responsibilities.some(line=>/视觉|海报|设计/.test(line)))!;
  // Use an explicit overlapping-responsibility fixture rather than assuming the
  // seed roster already contains every member from the user's saved workspace.
  const alternative=team.members.find(member=>member.id!==visual.id)!;
  alternative.responsibilities.push('商城主视觉设计与出图');
  assert.ok(team.members.filter(member=>member.responsibilities.some(line=>/视觉|海报|设计/.test(line))).length>=2);
  const forward=buildSubtaskCases(team),reverse=buildSubtaskCases({...team,members:[...team.members].reverse()});
  for(const [caseId,subject] of [[subtaskCaseIds[0],'目标标准与责任承接'],[subtaskCaseIds[2],'局部目标标准与明确子截止']]){
    const expected=forward.find(item=>item.id===caseId)!.expectedOutput!.checks.find(check=>check.subject===subject)!.expected as Record<string,unknown>;
    const reordered=reverse.find(item=>item.id===caseId)!.expectedOutput!.checks.find(check=>check.subject===subject)!.expected;
    assert.equal(expected.ownerFollowsConfirmedResponsibilities,true);
    assert.equal('recommendedOwnerMemberId' in expected,false);
    assert.deepEqual(reordered,expected);
  }
});

test('文件版本和回复保持真实关联，截止归属新图片而非父任务',()=>{
  const {cases}=fixtures();
  const item=cases.find(item=>item.id===subtaskCaseIds[2])!;
  const team=item.dataSnapshot!;
  const current=team.evidence.find(e=>e.supersedesId)!;
  const original=team.evidence.find(e=>e.id===current.supersedesId)!;
  assert.equal(current.version,2);assert.ok(original.content.includes('20%'));
  assert.ok(current.content.includes('没有促销折扣'));
  const reply=team.evidence.find(e=>e.replyToId)!;
  assert.ok(team.evidence.some(e=>e.id===reply.replyToId));
  assert.deepEqual(reply.relatedEvidenceIds,[current.id]);
  assert.equal(reply.kind,'确认');
  assert.ok(reply.content.includes('2026-10-21'));
  assert.equal(team.tasks.find(task=>task.id===item.steps[0].taskId)!.dueAt,'2026-10-23');
});

test('职责缺失只影响分工，报价关键外部等待未知有明确事实和空日期验收',()=>{
  const {cases}=fixtures();
  const item=cases.find(item=>item.id===subtaskCaseIds[3])!;
  assert.ok(item.dataSnapshot!.members.every(member=>member.responsibilities.length===0&&member.responsibilityVersion===null));
  assert.equal(item.subtaskContext!.coverage.find(row=>row.scope==='responsibilities')!.status,'unavailable');
  assert.ok(item.dataSnapshot!.members.length>0);
  const assignment=item.expectedOutput!.checks.find(check=>check.subject==='不从角色或自荐伪造分工')!.expected;
  assert.deepEqual(assignment,{ownerMemberId:null,participants:[],missingFormalResponsibilities:true});
  const date=item.expectedOutput!.checks.find(check=>check.subject==='报价用于判断且不承诺外部结果时间')!.expected as {dueDate:unknown};
  assert.equal(date.dueDate,null);
  assert.ok(item.dataSnapshot!.evidence.some(e=>e.content.includes('回复时间未知')));
});

test('分页与真实配额用业务事实表达，不通过语义关键词断言强行命中',()=>{
  const {cases}=fixtures();
  const partial=cases.find(item=>item.id===subtaskCaseIds[4])!;
  assert.equal(partial.subtaskContext!.coverage.find(row=>row.scope==='existing_children')!.status,'partial');
  assert.ok(partial.dataSnapshot!.evidence.some(e=>e.content.includes('hasMore=true')));
  assert.equal(partial.assertions.some(check=>check.path==='status'),false,'允许关键查重缺口需要补问');
  const depth=cases.find(item=>item.id===subtaskCaseIds[5])!;
  assert.equal(depth.dataSnapshot!.maxTaskDepth,2);
  const parent=depth.dataSnapshot!.tasks.find(task=>task.id===depth.steps[0].taskId)!;
  const ancestor=depth.dataSnapshot!.tasks.find(task=>task.id===parent.parentId)!;
  assert.ok(ancestor);assert.equal(ancestor.parentId,null);
  assert.deepEqual(depth.assertions.find(check=>check.path==='status')!.expected,'no_split_needed');
  for (const item of [cases[1],depth]) {
    assert.equal(item.assertions.some(check=>/title|goal|summary|warnings|acceptanceCriteria/.test(check.path)),false);
    assert.equal(item.assertions.find(check=>check.path==='status')!.expected,'no_split_needed');
  }
});

test('真实适配只注入冻结当前范围和证据，验收答案不泄漏且职责版本不借用成员版本',()=>{
  const {cases}=fixtures();
  for (const item of cases) {
    const input=buildSubtaskInput(item.dataSnapshot!,item,item.steps[0],'fixture-request');
    assert.equal(input.currentTask.id,item.steps[0].taskId);
    assert.equal(input.currentTask.version,3);
    assert.equal(input.currentTask.criteriaVersion,2);
    assert.equal(input.currentDate,'2026-10-16');
    assert.ok(input.currentTask.sourceId);
    assert.equal('assertions' in input,false);
    assert.equal('reviewChecklist' in input,false);
    assert.equal('verification' in input,false);
    assert.equal('expectedOutput' in input,false);
    for (const member of input.members) {
      const saved=item.dataSnapshot!.members.find(row=>row.id===member.id)!;
      assert.equal(member.responsibilityVersion,saved.responsibilityVersion??null);
      assert.ok(member.responsibilitySourceId);
    }
    assert.ok(input.existingChildren.every(child=>item.dataSnapshot!.tasks.some(task=>task.id===child.id&&task.parentId===input.currentTask.id)));
    assert.ok(input.sources.every(source=>item.dataSnapshot!.evidence.some(evidence=>evidence.taskId===source.subjectId)));
  }
  const partial=cases.find(item=>item.id===subtaskCaseIds[4])!;
  const partialInput=buildSubtaskInput(partial.dataSnapshot!,partial,partial.steps[0],'partial-request');
  assert.equal(partialInput.coverage.find(row=>row.scope==='existing_children')!.status,'partial');
  const depth=cases.find(item=>item.id===subtaskCaseIds[5])!;
  const depthInput=buildSubtaskInput(depth.dataSnapshot!,depth,depth.steps[0],'depth-request');
  assert.equal(depthInput.currentTask.depth,2);
  assert.equal(depthInput.maxTaskDepth,2);
  assert.equal(depthInput.existingChildren.length,0);
  assert.equal(JSON.stringify(depthInput).includes('subtask-v1-depth-root'),false,'祖先只用于核对深度，不注入无关祖先正文');
});

test('多个剩余贡献保留进行中覆盖，局部标准与父业务指标分开且日期逐项归属',()=>{
  const {cases}=fixtures(),item=cases.find(item=>item.id==='case-subtask-v1-multiple-remaining')!;
  const input=buildSubtaskInput(item.dataSnapshot!,item,item.steps[0],'multiple-request');
  assert.equal(input.existingChildren.length,1);
  assert.equal(input.existingChildren[0].status,'进行中');
  assert.ok(input.currentTask.goal.includes('8%提升到10%'));
  const remaining=item.expectedOutput!.checks.find(check=>check.subject==='进行中覆盖与两个独立剩余贡献')!.expected as Record<string,unknown>;
  assert.equal(remaining.suggestionCount,2);
  assert.equal(remaining.coveredStatus,'进行中');
  const metric=item.expectedOutput!.checks.find(check=>check.subject==='父业务目的与各项可控贡献分清')!.expected as Record<string,unknown>;
  assert.equal(metric.metricCopiedIntoEveryChild,false);
  assert.equal(metric.extraMeasurementWork,false);
  const date=item.expectedOutput!.checks.find(check=>check.subject==='分项日期与正式职责推荐')!.expected as Record<string,unknown>;
  assert.equal(date.visualDueDate,'2026-10-21');
  assert.equal(date.answerSuggestedDueDateRequired,true);
  assert.equal(date.distinctOwnersRequired,false);
  assert.ok(input.sources.some(source=>source.content.includes('8%到10%')));
});

test('附件解析失败冻结缺口，真实适配只传元数据且不冒充文件正文',()=>{
  const {cases}=fixtures(),item=cases.find(item=>item.id==='case-subtask-v1-unread-file')!;
  const input=buildSubtaskInput(item.dataSnapshot!,item,item.steps[0],'unread-request');
  const file=input.sources.find(source=>source.attachment)!;
  assert.equal(file.version,4);
  assert.equal(file.readState,'unavailable');
  assert.equal(file.content,'');
  assert.match(file.readReason!,/PDF正文解析失败/);
  assert.deepEqual(file.attachment,{name:'最终验收及例外清单.pdf',mimeType:'application/pdf',size:48211});
  assert.equal(JSON.stringify(input).includes('data:application/pdf'),false);
  assert.equal(input.coverage.find(scope=>scope.scope==='files')!.status,'partial');
  assert.equal(item.assertions.some(check=>check.path==='status'),false,'局部候选与关键确认两种合法状态均允许');
  const criteria=item.expectedOutput!.checks.find(check=>check.subject==='正文读取缺口决定结论边界')!.expected as Record<string,unknown>;
  assert.deepEqual(criteria.allowedStatuses,['partial','needs_clarification']);
  assert.equal(criteria.metadataIsNotBody,true);
});

test('三轮修改以previousPlan承接人工清空改期和删除，不通过真实事件伪造已保存修改',()=>{
  const {cases}=fixtures(),item=cases.find(item=>item.id==='case-subtask-v1-edited-plan')!;
  assert.deepEqual(item.steps.map(step=>step.usePreviousOutput),[false,true,true]);
  assert.ok(item.steps.every(step=>step.skillId==='taskdoor-decompose-task'&&step.taskId===item.steps[0].taskId&&step.events.length===0));
  const previousPlan={schemaVersion:'taskdoor.subtask-suggestions.v1',suggestions:[{clientId:'stable-visual',dueDate:null},{clientId:'stable-answer',dueDate:'2026-10-20'}]};
  const input=buildSubtaskInput(item.dataSnapshot!,item,item.steps[2],'edit-request',previousPlan);
  assert.deepEqual(input.previousPlan,previousPlan);
  assert.notEqual(input.previousPlan,previousPlan);
  const second=item.expectedOutput!.checks.find(check=>check.subject==='第二步应用人工清空及改期')!;
  assert.equal(second.stepId,'s2');
  assert.deepEqual(second.expected,{suggestionCount:2,preserveClientIds:true,visualDueDate:null,answerDueDate:'2026-10-20',unrelatedFieldsPreserved:true,formalDateWritten:false});
  const third=item.expectedOutput!.checks.find(check=>check.subject==='第三步仅改名删除且不恢复人工编辑')!;
  assert.equal(third.stepId,'s3');
  assert.equal((third.expected as Record<string,unknown>).deletedCandidateNotRestored,true);
  assert.equal((third.expected as Record<string,unknown>).visualDueDate,null);
  assert.equal(input.currentTask.dueDate,'2026-10-23','父正式日期保持不变');
});

test('刷新只补缺例；可信源基线才更新未编辑旧定义，保留用户内容、开关、版本与外部历史',()=>{
  const {state,cases}=fixtures(),team=state.teams.find(team=>team.id==='lab-content')!;
  const baseline=structuredClone(cases.slice(0,6));
  for(const item of baseline){item.description='旧源中的定义';item.version=4;}
  const current=structuredClone(baseline);
  current[0].archived=true;current[0].enabled=false;
  current[1].steps[0].prompt='用户自己调整的拆解要求';
  current[2].origin='user-authored';
  const frozen=structuredClone(current),runs=structuredClone(state.runs);
  const absentBaseline=planSubtaskCaseRefresh(current,team);
  assert.equal(absentBaseline.updatedIds.length,0);
  assert.equal(absentBaseline.preservedIds.length,6);
  assert.equal(absentBaseline.addedIds.length,3);
  const result=planSubtaskCaseRefresh(current,team,baseline);
  assert.deepEqual(result.updatedIds,[subtaskCaseIds[0],subtaskCaseIds[3],subtaskCaseIds[4],subtaskCaseIds[5]]);
  assert.deepEqual(result.preservedIds,[subtaskCaseIds[1],subtaskCaseIds[2]]);
  assert.equal(result.cases[0].version,5);
  assert.equal(result.cases[0].enabled,false);
  assert.equal(result.cases[0].archived,true);
  assert.deepEqual(result.cases[1],frozen[1]);
  assert.deepEqual(result.cases[2],frozen[2]);
  assert.deepEqual(current,frozen,'纯函数不改调用方数组或对象');
  assert.deepEqual(state.runs,runs,'历史运行不属于刷新范围');
  const again=planSubtaskCaseRefresh(result.cases,team,baseline);
  assert.deepEqual(again.updatedIds,[]);
  assert.deepEqual(again.addedIds,[]);
});
