import {updateTaskAnalysisReferences} from './task-analysis-reference.ts';
import type {LabState,Json} from '../../src/test-lab/types.ts';
/** Reference answers are evaluation-only; never included in business snapshots. */
export function updateTaskAnalysisExpectations(state:LabState){
 let changed=false;
 for(const c of state.cases){
  const steps=c.steps.filter(s=>s.skillId==='agentdoor-task-status-analyzer');
  if(!steps.length||c.expectedOutput?.checks.some(check=>check.id.startsWith('analysis-v5-')))continue;
  const checks=steps.flatMap(step=>{
   const reference=(path:string)=>c.assertions.find(a=>a.stepId===step.id&&a.path===path&&a.operator==='equals');
   const grade=reference('result.progress.displayPercent');const raw=reference('result.progress.completionPercent');
   const snapshot=c.dataSnapshot??state.teams.find(t=>t.id===c.teamId);const task=snapshot?.tasks.find(t=>t.id===step.taskId);
   const criteria=c.assertions.filter(a=>a.stepId===step.id&&/^result\.criterionAssessments\.\d+\.percent$/.test(a.path)&&a.operator==='equals').map(a=>({index:Number(a.path.split('.')[2])+1,percent:a.expected,text:task?.acceptanceCriteria[Number(a.path.split('.')[2])]??''}));
   const check=(suffix:string,subject:string,criterion:string,expected:Json)=>({id:`analysis-v5-${step.id}-${suffix}`,stepId:step.id,subject,criterion,expected});
   return [
    check('progress','整体进度','核对 progress.state、原始 completionPercent 与展示 displayPercent。展示梯度为0/25/50/75/100；按独立工作投入加权，不能直接用人工确认数量计算。参考值只用于评测；无足够证据的旧用例须判断为未知，不能硬凑百分比。',grade?{displayPercent:grade.expected,...(raw?{completionPercent:raw.expected}:{})}:null),
    check('criteria','逐条标准完成度','criterionAssessments 必须覆盖当前标准，回显文本、ID及标准版本；每条包含梯度百分比、已完成内容、剩余内容、待核对项、理由与证据引用。人工确认与AI完成度独立。逐条核对以下参考值，不以整体百分比替代每条。',criteria.length?criteria:null),
    check('trend','燃起图数据结构','核对 progress.trend：有真实历史时 points 按时间排序，每点包含 at、totalEwdMinutes、completedEwdMinutes、unconfirmedEwdMinutes、inputVersions、changeReasons，解释总量与完成量的变化。图表使用原始工作量，不能用展示梯度代替；无历史时 trend=null 或 points=[]，说明历史不足，不编造每日点或预测日期。',null),
    check('timing','预计完成与计划差值','核对 progress.comparison 的 workload、expected、aiAssessment、forecastTrend 与 timing，字段与 nocoly/taskdoor 正式前端一致。dueOn 来自截止记录，forecastOn 需有执行和依赖依据；completedOn 只能来自用户确认，AI100%不产生确认日期。缺少完整范围版本或历史时 comparison=null。finishOn、deltaDays、deltaMinutes、deltaPoints均由前端程序派生，不是AI必须输出的字段。comparison=null且输入确实无历史或有效排期时，应判符合未知处理，不因缺少这些派生字段判资料不足。前端计算完成日为completedOn??forecastOn、日期差为完成日减截止日；正数延期负数提前零按期，缺日期为未知。计划量只来自已保存计划，同版本计算 deltaMinutes/deltaPoints；未提供计划不补零。预测节点有依据、最后在预测日达到届时总量；只有日期不编造节点，不用 source=example 伪装真实分析。',null),
    check('situation','当前情况','currentSituation 包含 summary、confirmedResults、unmetResults、pendingChecks、recentChanges、evidenceRefs；摘要具体说明已交付与缺口。逐项与当前文件正文和讨论比对，处理新版、冲突、权限及读取失败，不把完成声称当交付事实。',criteria.length?{已完成:criteria.filter(x=>x.percent===100).map(x=>x.text),待补齐:criteria.filter(x=>x.percent===0).map(x=>x.text),未知:criteria.filter(x=>x.percent===null).map(x=>x.text)}:null),
    check('actions','下一步建议','nextActions 每项包含 action、actorId、diagnosisType、reason、evidenceRefs。行动必须对应本轮尚未完成或待核对内容，有据时指定负责人，无依据时actorId=null；不重复要求已完成工作，不把前置受阻扩大为全任务阻塞，无待办时允许空数组。',criteria.length?{应围绕这些缺口提出行动:criteria.filter(x=>x.percent!==100).map(x=>x.text)}:null),
   ];
  });
  c.expectedOutput={version:1,checks:[...checks,...(c.expectedOutput?.checks??[]).filter(check=>!/^analysis-v[2345]-/.test(check.id))]};c.version++;changed=true;
 }
 return updateTaskAnalysisReferences(state)||changed;
}
