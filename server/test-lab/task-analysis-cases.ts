import type { LabAssertion, LabCase, LabEvidence, LabState, LabStep, LabTask } from '../../src/test-lab/types.ts';
import {taskAnalysisReferenceFingerprint} from './task-analysis-reference.ts';

const bilingualCriterion='报名页中英文案与成功提示均已核对。';
const bilingualPartialBasis='中文页面及中文成功提示已有核对记录；英文文案、英文成功提示与中英文一致性核对仍缺失。复合标准有部分成果，不归零，不要求固定50%。';

function newScopePartialAssertions(stepId:string):LabAssertion[]{
  const path='result.criterionAssessments.4.percent';
  return [
    {id:`${stepId}-criterion-4-minimum`,label:'双语复合标准已有中文成果',stepId,path,operator:'gte',expected:25},
    {id:`${stepId}-criterion-4-maximum`,label:'双语复合标准仍缺英文与一致性核对',stepId,path,operator:'lte',expected:75},
  ];
}

function newScopePartialEvidenceCheck(stepId:string):NonNullable<LabCase['expectedOutput']>['checks'][number]{
  return {id:`new-scope-partial-evidence-${stepId}`,stepId,subject:'新增范围部分成果与计量',
    criterion:'保留复合标准的中文既有成果；AI完成度只允许有证据的25/50/75，不强求固定50。说明英文文案、英文成功提示及中英文一致性核对的缺口。原四项已完成工作量只计一次；新增英文增量工作尚未形成结果，其已完成EWD为0，不以既有中文成果算作英文增量完成。不得更改正式已完成状态、人工确认或历史。',
    expected:{允许AI参考完成度:[25,50,75],已有成果:'中文页面与中文成功提示核对记录',剩余缺口:['英文文案','英文成功提示','中英文一致性核对'],新增英文工作已完成EwdMinutes:0,不重复计量:'原四项及中文既有工作只计算一次'}};
}

/** Explicit, pure retest clone. Never migrates edited cases or rewrites a frozen run. */
export function createNewScopeAnalysisRetestCase(source:LabCase,newId:string):LabCase{
  if(!newId.trim()||newId===source.id)throw Error('复测必须使用新的用例ID');
  if(!source.dataSnapshot)throw Error('复测需要冻结业务快照');
  const step=source.steps[0];const task=source.dataSnapshot.tasks.find(t=>t.id===step?.taskId);
  if(source.steps.length!==1||step?.skillId!=='agentdoor-task-status-analyzer'||task?.acceptanceCriteria[4]!==bilingualCriterion||task.criteria?.items[4].text!==bilingualCriterion)throw Error('只修复指定双语复合标准，不修改其它用例');
  const path='result.criterionAssessments.4.percent';
  if(!source.assertions.some(a=>a.stepId===step.id&&a.path===path))throw Error('未找到待修复的复合标准断言');
  const copy=structuredClone(source);
  copy.id=newId;copy.name=`${source.name} · 修正复测`;copy.origin='manual';copy.version=1;
  copy.assertions=[...copy.assertions.filter(a=>!(a.stepId===step.id&&a.path===path)),...newScopePartialAssertions(step.id)];
  for(const check of copy.expectedOutput?.checks??[]){
    if(check.stepId!==step.id||!Array.isArray(check.expected))continue;
    const row=check.expected[4];if(!row||typeof row!=='object'||Array.isArray(row))continue;
    if(check.subject==='参考逐条完成度'){
      delete row.AI参考完成度;row.允许AI参考完成度=[25,50,75];row.依据=bilingualPartialBasis;
    }
    if(check.subject==='逐条标准完成度'){
      delete row.percent;row.allowedPercents=[25,50,75];
    }
  }
  copy.expectedOutput??={version:1,checks:[]};
  if(!copy.expectedOutput.checks.some(c=>c.id===`new-scope-partial-evidence-${step.id}`))copy.expectedOutput.checks.push(newScopePartialEvidenceCheck(step.id));
  // Bind the retained authored references to this new rubric so normal loading is idempotent.
  const fingerprint=taskAnalysisReferenceFingerprint(copy,copy.dataSnapshot!);
  for(const check of copy.expectedOutput.checks)check.id=check.id.replace(/^analysis-reference-v2-[a-f0-9]+-/,`analysis-reference-v2-${fingerprint}-`);
  return copy;
}

const at = '2026-10-09T10:00:00+08:00';
const criteria = [
  '活动规则已核对：时间、对象、报名条件与费用写明且无未决项。',
  '报名页面已验证：必填字段、成功提示和重复报名行为均有测试记录。',
  '通知材料已核对：邮件与群公告包含一致的时间、链接、联系人。',
  '应急预案已核对：页面故障、活动延期、联系人缺席的处理方案明确。',
];
const outputs = [
  '活动时间10月20日14:00–16:00；对象为已报名客户；报名截止10月18日18:00；每人限报一次；免费。核对后无未决项。',
  '姓名、公司、邮箱必填。T01空邮箱被拒绝；T02正常提交显示报名成功；T03同邮箱再次提交显示已报名，未重复写入。核对后无未决项。',
  '邮件与群公告均写明10月20日14:00–16:00、https://example.test/signup、测试负责人。两份通知逐项核对一致，无未决项。',
  '页面故障切换离线报名表；活动延期同步邮件和群公告；联系人缺席由备份联系人接替。三个场景均已复核，无未决项。',
];

/** Expected values live only in assertions; model inputs contain business evidence. */
export function addTaskAnalysisCases(state: LabState): boolean {
  const team = state.teams.find(item => item.id === 'lab-content');
  if (!team) return false;
  const owner = team.members.find(item => item.id === 'lin') ?? team.members[0];
  const reviewer = team.members.find(item => item.id === 'xu') ?? owner;
  if (!owner) return false;
  let changed = false;
  const definitions = [
    { key: 'not-started', name: '明确尚未执行', count: 0, expected: 0 },
    { key: 'rules-only', name: '规则已交付其余未执行', count: 1, expected: 25 },
    { key: 'page-ready', name: '规则与页面已交付', count: 2, expected: 50 },
    { key: 'notice-ready', name: '通知已交付预案待补', count: 3, expected: 75 },
    { key: 'all-evidence', name: '全部交付仍未人工确认', count: 4, expected: 100 },
    { key: 'unknown', name: '完成报告没有正文依据', count: null, expected: null },
    { key: 'claim-conflict', name: '完成声称与文件不一致', count: 2, expected: 50 },
    { key: 'new-scope', name: '已完成后新增双语要求', count: 4, expected: null },
    { key: 'weighted', name: '投入权重不同的独立交付', count: 1, expected: 50 },
    { key: 'superseded', name: '旧版完整新版回退', count: 2, expected: 50 },
    { key: 'unreadable', name: '附件正文读取失败', count: null, expected: null },
    { key: 'discussion-conflict', name: '多人讨论结论冲突', count: 2, expected: 50 },
    { key: 'irrelevant-noise', name: '长讨论与无关附件干扰', count: 3, expected: 75 },
    { key: 'confirmed-gap', name: '人工确认与新交付缺口并存', count: 2, expected: 50 },
    { key: 'incremental', name: '补交文件后逐轮重新分析', count: 2, expected: 50 },
  ];
  for (const definition of definitions) {
    const taskId = `analysis-test-${definition.key}`;
    const caseId = `case-${taskId}`;
    // Preserve user edits on subsequent loads; new fixtures are appended only once.
    if (state.cases.some(item => item.id === caseId)) {
      const existing=team.tasks.find(t=>t.id===taskId);
      if(existing&&!existing.criteria){existing.criteria={taskId,version:existing.version,items:existing.acceptanceCriteria.map((text,i)=>({id:`${taskId}-criterion-${i+1}`,text}))};changed=true;}
      continue;
    }
    if (team.tasks.some(item => item.id === taskId)) continue;
    const newScope = definition.key === 'new-scope';
    const weights = definition.key === 'weighted' ? [120, 40, 40, 40] : [60, 60, 60, 60];
    const task: LabTask = {
      id: taskId, title: `分析测试 · ${definition.name}`, goal: '形成可核对的客户活动报名包。',
      status: newScope ? '已完成' : '进行中', createdById: owner.id, ownerId: owner.id,
      participantIds: reviewer.id === owner.id ? [] : [reviewer.id], parentId: null, dependsOnTaskIds: [],
      acceptanceCriteria: [...criteria, ...(newScope ? [bilingualCriterion] : [])],
      executionTips: ['以当前文件正文核对交付，讨论报告不代替正文；同一工作只计算一次。'],
      estimatedMinutes: newScope ? null : 240, dueAt: null, tags: [], visibility: 'team', version: newScope ? 2 : 1,
    };
    const evidence = (suffix: string, kind: LabEvidence['kind'], title: string, content: string, authorId = owner.id): LabEvidence => ({
      id: `${taskId}-${suffix}`, taskId, authorId, kind, title, content, createdAt: at, version: 1, visibleToIds: [],
      ...(kind === '文件' ? { attachment: {name: title, mimeType: 'text/markdown', size: Buffer.byteLength(content), dataUrl: `data:text/markdown;base64,${Buffer.from(content).toString('base64')}`} } : {}),
    });
    const scope = `# 当前工作范围\n\n合成测试活动，不代表真实客户活动。四项独立工作分别为规则、页面、通知、预案；四项预计人类投入分别为${weights.join("、")}分钟，总量240分钟；估算基线版本1，当前范围无重叠，不按标准条数平均分配。\n\n${criteria.map((text, i) => `work-${i + 1}：${text}`).join('\n\n')}${newScope ? '\n\n范围版本2新增中英双语要求，新增工作尚未估算，旧总量不覆盖当前全部范围。' : ''}`;
    const delivery = (count: number) => '# 当前交付核对记录\n\n' + outputs.map((text, i) => `## work-${i + 1}\n\n${i < count ? text : '记录明确：该项尚未执行，未形成任何交付结果。'}`).join('\n\n') + (newScope ? '\n\n## 新增双语要求\n\n当前页面只有中文，英文文案和成功提示均未交付。' : '');
    const records = [evidence('scope', '文件', '范围与投入明细.md', scope)];
    if (definition.count !== null) records.push(evidence('delivery', '文件', '交付核对记录.md', delivery(definition.count)));
    records.push(evidence('report', '讨论', '执行反馈', definition.key === 'claim-conflict' || definition.key === 'unknown' ? '全部做完了，可以标完成。' : newScope ? '原四项已交付，我将任务设为已完成；本轮新增中英双语要求。' : '已提交当前交付记录，请按正文逐项核对。'));
    records.push(evidence('review', '讨论', '核对反馈', definition.count === null ? '交付正文尚未提交，只有完成报告，不足以核对结果。' : newScope ? '新增英文页面未交付，也未估算；请说明缺口，不要自动重开任务。' : '以交付核对记录为准，未执行项已明确记录；标准尚未人工确认。', reviewer.id));
    const prompt = '按当前任务、完成标准、文件正文和讨论分析当前情况、下一步、整体进度以及逐条标准评估。原始比例与分档百分比分开，无法核对的内容为null；不改状态，不自动确认标准。没有历史不生成趋势。只返回Skill规定JSON。';
    const steps: LabStep[] = [{id: 's1', skillId: 'agentdoor-task-status-analyzer', taskId, prompt, evaluatedAt: at, usePreviousOutput: false, events: []}];
    const expectedByStep: (number | null)[] = [definition.expected];
    if (definition.key === 'incremental') {
      for (const [index, count] of [3, 4].entries()) {
        steps.push({id: `s${index + 2}`, skillId: 'agentdoor-task-status-analyzer', taskId, prompt, evaluatedAt: `2026-10-09T${index + 11}:00:00+08:00`, usePreviousOutput: true,
          events: [{type: 'evidence', evidence: {...evidence('delivery', '文件', '交付核对记录.md', delivery(count)), createdAt: `2026-10-09T${index + 11}:00:00+08:00`}}]});
        expectedByStep.push(count * 25);
      }
    }
    task.criteria={taskId,version:newScope?2:1,items:task.acceptanceCriteria.map((text,i)=>({id:`${taskId}-criterion-${i+1}`,text,...(definition.key==='confirmed-gap'&&i===3?{confirmation:{memberId:reviewer.id,confirmedAt:at}}:{})}))};
    if(definition.key==='superseded'){
      records.push(evidence('old-delivery','文件','交付旧版本.md',delivery(4)));
      const current=records.find(e=>e.id===`${taskId}-delivery`)!;current.version=2;current.supersedesId=`${taskId}-old-delivery`;
      records.push(evidence('revision','讨论','版本说明','旧文件已撤回；页面与规则保留，通知联系人失效，预案尚未重新制定。以新版交付核对记录为准。',reviewer.id));
    }
    if(definition.key==='unreadable')records.push({...evidence('unreadable','文件','最终报名包.pdf',''),readState:'unavailable'});
    if(definition.key==='discussion-conflict'){records.push(evidence('claim','讨论','负责人报告','通知与预案已经完成，可以上线。'));records.push({...evidence('reply','讨论','复核意见','不同意上线：通知缺联系人，预案没有故障切换方式。请按当前交付正文补齐。',reviewer.id),replyToId:`${taskId}-claim`});}
    if(definition.key==='irrelevant-noise'){records.push(evidence('noise','讨论','会议讨论',Array.from({length:24},(_,i)=>`第${i+1}轮：讨论会场背景颜色、茶歇口味，不修改报名包的交付范围。`).join('\n')));records.push(evidence('other','文件','其他活动总结.md','上个月活动全部完成。此记录不属于当前报名包，不证明当前预案完成。'));}
    if(definition.key==='confirmed-gap')records.push(evidence('gap','讨论','确认后的新缺口','预案曾获人工确认，但当前版本缺少故障切换与联系人替补。保留既有确认事实，当前内容仍需补齐。',reviewer.id));
    const testCase: LabCase = {
      id: caseId, name: `任务分析 · ${definition.name}`, category: '任务分析', teamId: team.id, actorId: owner.id,
      description: '团队内完整任务、讨论及文件正文用于分析；预期百分比只作为评测答案，不进入模型输入。',
      enabled: true, archived: false, version: 1, origin: 'task-analysis-evidence-v1', steps,
      assertions: steps.flatMap((step, index) => [
        ...(newScope?[]:[
          {id: `${step.id}-percent`, label: '分档完成度与证据预期一致', stepId: step.id, path: 'result.progress.displayPercent', operator: 'equals' as const, expected: expectedByStep[index]},
          {id: `${step.id}-raw-percent`, label: '原始完成度按当前投入权重计算', stepId: step.id, path: 'result.progress.completionPercent', operator: 'equals' as const, expected: expectedByStep[index]},
        ]),
        {id: `${step.id}-status`, label: '正式状态保持原值', stepId: step.id, path: 'result.formalStatus', operator: 'equals' as const, expected: task.status},
        {id: `${step.id}-receipt`, label: '分析不写业务回执', stepId: step.id, path: 'writeReceipt', operator: 'equals' as const, expected: null},
        {id: `${step.id}-criteria`, label: '逐条标准评估完整', stepId: step.id, path: 'result.criterionAssessments', operator: 'length' as const, expected: task.acceptanceCriteria.length},
        ...task.acceptanceCriteria.flatMap((_, criterionIndex):LabAssertion[] => newScope&&criterionIndex===4?newScopePartialAssertions(step.id):[{id: `${step.id}-criterion-${criterionIndex}`, label: `第${criterionIndex + 1}条标准独立核对`, stepId: step.id, path: `result.criterionAssessments.${criterionIndex}.percent`, operator: 'equals' as const,
          expected: definition.count === null ? null : criterionIndex < (definition.key === 'incremental' ? index + 2 : definition.count) ? 100 : 0}]),
      ]),
      ...(newScope?{expectedOutput:{version:1 as const,checks:steps.map(step=>newScopePartialEvidenceCheck(step.id))}}:{}),
      reviewChecklist: ['依据引用来自当前可见文件或讨论，不能引用评测答案', '确认数量不等于工作量，AI100%不等于人工确认', '完成声称与正文冲突时指出实际缺口', '新范围或旧文件版本不被描述为当前全范围完成'],
    };
    team.tasks.push(task); team.evidence.push(...records); state.cases.push(testCase); changed = true;
  }
  return changed;
}
