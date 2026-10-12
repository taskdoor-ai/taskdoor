import {I18nProvider} from '@/shared/i18n/I18nProvider';
import {TaskProgressComparison} from '@/features/tasks/components/TaskProgressComparison';
import {TaskProgressStage} from '@/features/tasks/components/TaskProgressStage';
import {analysisProgressSeries,analysisDateDifference} from '@taskdoor/analysis-progress';
import '@/features/tasks/styles/task-progress-comparison.css';
import '@/features/tasks/styles/task-burnup-node.css';
const number=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?n:null;
const effort=(n:unknown)=>number(n)===null?'未知':`${Number((Number(n)/60).toFixed(2))} 小时 · ${Number((Number(n)/480).toFixed(2))} 人天`;
export default function AnalysisWorkloadPreview({progress,reference}:{progress:any;reference?:any}){
 const series=analysisProgressSeries(progress);
 const total=number(progress.totalEwdMinutes),done=number(progress.completedEwdMinutes);
 const timing=progress.comparison?.timing;
 const delta=analysisDateDifference(timing?.dueOn,timing?.completedOn??timing?.forecastOn);
 return <I18nProvider initialLocale="zh-CN"><div className="analysis-task-progress"><dl className="analysis-workload-values"><div><dt>总工作量</dt><dd>{effort(total)}</dd></div><div><dt>已完成工作量</dt><dd>{effort(done)}</dd></div><div><dt>剩余工作量</dt><dd>{total!==null&&done!==null&&done<=total?effort(total-done):'未知'}</dd></div></dl>{series?<TaskProgressComparison series={series} currentScopeMinutes={total} completedMinutes={done} completionSource="AI 预测"/>:<><TaskProgressStage model={{ratio:total!==null&&total>0&&done!==null?done/total:null,sourceLabel:'AI 预测'}} unavailableLabel="进度未知"/><h4>燃起图 · 人天</h4><p className="business-muted">缺少完整、有效的历史或范围版本，暂无法展示比较曲线。</p></>}<p className="business-muted">计划截止：{timing?.dueOn??'未知'} · AI 预计完成：{timing?.forecastOn??'未知'} · 用户确认完成：{timing?.completedOn??'尚无确认记录'} · 相对计划：{delta===null?'未知':delta===0?'按期':delta>0?`延期 ${delta} 天`:`提前 ${-delta} 天`}</p>{reference&&<><h4>排期与参考对照</h4><table className="analysis-criterion-table"><thead><tr><th>项目</th><th>AI 实际结果</th><th>预设参考</th><th>对照</th></tr></thead><tbody>{[
 ['计划截止',timing?.dueOn??null,reference.计划截止??null],
 ['预计完成',timing?.forecastOn??null,reference.预计完成??null],
 ['用户确认完成',timing?.completedOn??null,reference.确认完成??null],
 ['相对计划（天）',delta,reference.计划日期差??null],
 ['历史节点数',Array.isArray(progress.comparison?.workload)?progress.comparison.workload.length:null,Array.isArray(reference.历史节点)&&reference.历史节点.length?reference.历史节点.length:null],
 ['预测节点数',Array.isArray(progress.comparison?.forecastTrend?.points)?progress.comparison.forecastTrend.points.length:null,Array.isArray(reference.预测节点)?reference.预测节点.length:null],
 ].map(([label,actual,expected])=><tr key={String(label)}><td>{label}</td><td>{actual===null?'未提供':String(actual)}</td><td>{expected===null?'未提供':String(expected)}</td><td>{actual===expected?'一致': '存在偏差'}</td></tr>)}</tbody></table><p className="business-muted">日期差由程序计算：负数提前，正数延期；数值一致仍需核对对应证据。</p></>}<details><summary>查看工时与燃起图数据</summary><pre>{JSON.stringify({totalMinutes:total,completedMinutes:done,comparison:progress.comparison??null,trend:progress.trend??null},null,2)}</pre></details></div></I18nProvider>;
}
