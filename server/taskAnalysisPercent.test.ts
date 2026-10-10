import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOutput } from './test-lab/validation.ts';
import { taskProgressPercent } from '../src/features/tasks/lib/task-progress-percent.ts';
const input = {requestId:'request',principalId:'member',teamId:'space',taskId:'task',inputVersions:{task:2,criteria:3},coverage:{},sources:[{ref:'file'}],tasks:[{id:'task',version:2,status:'IN_PROGRESS'}]};
const output = () => ({schemaVersion:'agentdoor.task-status-analysis.v0.1',skillId:'agentdoor-task-status-analyzer',ruleVersion:'TASK-ANALYSIS-2026-10-09-v4',requestId:'request',principalId:'member',teamId:'space',inputVersions:input.inputVersions,coverage:{},evaluatedAt:'2026-10-09T00:00:00Z',status:'ready',result:{taskId:'task',taskVersion:2,formalStatus:'IN_PROGRESS',formalStatusUnchanged:true,currentSituation:{summary:'主体已交付，剩余检查待完成',evidenceRefs:['file']},nextActions:[],progress:{state:'current',completionPercent:71.2,displayPercent:75},criteriaVersion:3,criterionAssessments:[{criterionId:'criterion',text:'检查结果可核对',criteriaVersion:3,state:'current',percent:75,completedContent:['主体已交付'],remainingContent:['剩余检查'],pendingChecks:[],reason:'文件仍缺检查结果',evidenceRefs:['file']}]},evidenceRefs:['file'],unknowns:[],warnings:[],writeReceipt:null});
test('分档保留未知、零与未完全达成，100 不由舍入生成',()=>{
  for(const invalid of [null,NaN,-1,101])assert.equal(taskProgressPercent(invalid),null);
  for(const [percent,expected] of [[0,0],[.01,25],[37.49,25],[37.5,50],[62.49,50],[62.5,75],[71.2,75],[99.99,75],[100,100]])assert.equal(taskProgressPercent(percent),expected);
});
test('分析校验拒绝分档错误、标准过期和无依据的百分比',()=>{
  assert.deepEqual(validateOutput('agentdoor-task-status-analyzer',output(),input),[]);
  const wrong=output();wrong.result.progress.displayPercent=100;
  assert.ok(validateOutput('agentdoor-task-status-analyzer',wrong,input).some(e=>e.includes('展示进度')));
  const stale=output();stale.result.criterionAssessments[0].criteriaVersion=2;
  assert.ok(validateOutput('agentdoor-task-status-analyzer',stale,input).some(e=>e.includes('标准评估版本')));
  const unsupported=output();unsupported.result.criterionAssessments[0].evidenceRefs=[];
  assert.ok(validateOutput('agentdoor-task-status-analyzer',unsupported,input).some(e=>e.includes('当前依据')));
  const invalid=output();invalid.result.criterionAssessments[0].percent=60;
  assert.ok(validateOutput('agentdoor-task-status-analyzer',invalid,input).length);
});
