import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOutput} from './test-lab/validation.ts';
import {evaluateAssertions} from './test-lab/assertions.ts';

test('absence assertion distinguishes omitted user confirmation from present confirmation',()=>{
 const rule={id:'no-confirm',stepId:'s1',label:'AI cannot confirm completion',path:'timing.completedOn',operator:'exists' as const,expected:false};
 assert.equal(evaluateAssertions({timing:{}},[rule])[0].status,'passed');
 assert.equal(evaluateAssertions({timing:{completedOn:'2026-10-11'}},[rule])[0].status,'failed');
});
test('current analysis rejects a renamed chart object even when dates are numerically correct',()=>{
 const input={requestId:'r',principalId:'p',teamId:'t',inputVersions:{},taskId:'x',tasks:[{id:'x',version:1,status:'进行中'}],sources:[]};
 const output={schemaVersion:'agentdoor.task-status-analysis.v0.1',skillId:'agentdoor-task-status-analyzer',ruleVersion:'TASK-ANALYSIS-2026-10-11-v7',requestId:'r',principalId:'p',teamId:'t',inputVersions:{},coverage:{},evaluatedAt:'2026-10-09',status:'partial',evidenceRefs:[],unknowns:[],warnings:[],writeReceipt:null,result:{taskId:'x',taskVersion:1,formalStatus:'进行中',formalStatusUnchanged:true,criteriaVersion:null,criterionAssessments:[],currentSituation:{summary:'No historical records',evidenceRefs:[]},nextActions:[],progress:{state:'unknown',completionPercent:null,displayPercent:null,totalEwdMinutes:null,completedEwdMinutes:null,comparison:{workload:{totalMinutes:240},timing:{predictedCompletionDate:'2026-10-11'}}}}};
 assert.ok(validateOutput('agentdoor-task-status-analyzer',output,input).some(x=>x.includes('燃起图比较结构')));
 output.result.progress.comparison=null as any;
 assert.deepEqual(validateOutput('agentdoor-task-status-analyzer',output,input),[]);
});
