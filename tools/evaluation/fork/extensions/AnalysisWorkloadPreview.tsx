import {I18nProvider} from '@/shared/i18n/I18nProvider';
import {TaskProgressComparison} from '@/features/tasks/components/TaskProgressComparison';
import {TaskProgressStage} from '@/features/tasks/components/TaskProgressStage';
import {analysisProgressSeries,analysisDateDifference} from '@taskdoor/analysis-progress';
import {analysisWorkloadReference,describeReference,compareReference,formatActualValue,type ReferenceOptions} from '@/test-lab/reference-display';
import '@/features/tasks/styles/task-progress-comparison.css';
import '@/features/tasks/styles/task-burnup-node.css';
const number=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?n:null;
const effort=(n:unknown)=>number(n)===null?'未知':`${Number((Number(n)/60).toFixed(2))} 小时 · ${Number((Number(n)/480).toFixed(2))} 人天`;
export default function AnalysisWorkloadPreview({progress,reference}:{progress:any;reference?:any}){
 const series=analysisProgressSeries(progress);
 const total=number(progress.totalEwdMinutes),done=number(progress.completedEwdMinutes);
 const timing=progress.comparison?.timing;
 const delta=analysisDateDifference(timing?.dueOn,timing?.completedOn??timing?.forecastOn);
 const nodeCount=(value:unknown)=>Array.isArray(value)?value.length:value===null?null:undefined;
 const baseline=analysisWorkloadReference(reference),values=baseline.values;
 type Row={label:string;actual:unknown;expected:unknown;options:ReferenceOptions};
 const standardRows:Row[]=[
  {label:'计划截止',actual:timing?.dueOn,expected:values.计划截止,options:{field:'计划截止'}},
  {label:'预计完成',actual:timing?.forecastOn,expected:values.预计完成,options:{field:'预计完成'}},
  {label:'用户确认完成',actual:timing?.completedOn,expected:values.确认完成,options:{field:'确认完成'}},
  {label:'相对计划（天）',actual:timing===undefined?undefined:delta,expected:baseline.mode==='sources'?analysisDateDifference(values.计划截止,values.预计完成):values.计划日期差,options:{field:'计划日期差',unit:'days'}},
  {label:'历史节点数',actual:nodeCount(progress.comparison?.workload),expected:values.历史节点,options:{field:'历史节点',unit:'count'}},
  {label:'预测节点数',actual:baseline.mode==='sources'&&progress.comparison?.forecastTrend===null?0:nodeCount(progress.comparison?.forecastTrend?.points ?? (progress.comparison?.forecastTrend===null?null:undefined)),expected:values.预测节点,options:{field:'预测节点',unit:'count'}},
 ];
 const sourceRows:Row[]=[
  {label:'创建日期',actual:progress.comparison?.creation?.at,expected:values.创建日期,options:{field:'创建日期'}},
  {label:'初始投入',actual:progress.comparison?.creation?.scopeMinutes,expected:values.初始投入,options:{unit:'minutes'}},
  {label:'正式开始',actual:timing?.startOn,expected:values.正式开始,options:{field:'正式开始'}},
  ...standardRows,
  {label:'计划节点数',actual:nodeCount(progress.comparison?.expected?.points),expected:values.计划节点,options:{field:'计划节点',unit:'count'}},
 ];
 const rows:Row[]=baseline.mode==='empty'?[
  {label:'历史与排期比较',actual:progress.comparison,expected:null,options:{field:'comparison'}},
 ]:baseline.mode==='sources'?sourceRows.filter(row=>row.expected!==undefined):standardRows;
 return <I18nProvider initialLocale="zh-CN"><div className="analysis-task-progress"><dl className="analysis-workload-values"><div><dt>总工作量</dt><dd>{effort(total)}</dd></div><div><dt>已完成工作量</dt><dd>{effort(done)}</dd></div><div><dt>剩余工作量</dt><dd>{total!==null&&done!==null&&done<=total?effort(total-done):'未知'}</dd></div></dl>{series?<TaskProgressComparison series={series} currentScopeMinutes={total} completedMinutes={done} completionSource="AI 预测"/>:<><TaskProgressStage model={{ratio:total!==null&&total>0&&done!==null?done/total:null,sourceLabel:'AI 预测'}} unavailableLabel="进度未知"/><h4>燃起图 · 人天</h4><p className="business-muted">缺少完整、有效的历史或范围版本，暂无法展示比较曲线。</p></>}{progress.comparison===null?<p className="business-muted">暂无可用的历史与排期比较数据。</p>:<p className="business-muted">计划截止：{formatActualValue(timing?.dueOn,{field:'计划截止'})} · AI 预计完成：{formatActualValue(timing?.forecastOn,{field:'预计完成'})} · 用户确认完成：{formatActualValue(timing?.completedOn,{field:'确认完成'})} · 相对计划：{delta===null?'未知':delta===0?'按期':delta>0?`延期 ${delta} 天`:`提前 ${-delta} 天`}</p>}{reference&&<><h4>排期与参考对照</h4>{baseline.detail&&<p className="business-muted">{baseline.detail}</p>}<table className="analysis-criterion-table"><thead><tr><th>项目</th><th>AI 实际结果</th><th>预设参考</th><th>对照</th></tr></thead><tbody>{rows.map(({label,actual,expected,options})=>{const baseline=describeReference(expected,options);return <tr key={label}><td>{label}</td><td>{formatActualValue(actual,options)}</td><td>{baseline.label}</td><td>{compareReference(actual,baseline).label}</td></tr>;})}</tbody></table>{baseline.mode!=='empty'&&<p className="business-muted">日期差由程序计算：负数提前，正数延期；数值一致仍需核对对应证据。</p>}{baseline.mode==='sources'&&<details><summary>查看预设的创建、历史、计划与预测记录</summary><pre>{JSON.stringify(reference,null,2)}</pre></details>}</>}<details><summary>查看工时与燃起图数据</summary><pre>{JSON.stringify({totalMinutes:total,completedMinutes:done,comparison:progress.comparison??null,trend:progress.trend??null},null,2)}</pre></details></div></I18nProvider>;
}
