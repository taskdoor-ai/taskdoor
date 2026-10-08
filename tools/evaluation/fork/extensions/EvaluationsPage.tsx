import {useEffect,type ReactNode} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import type {LabRun} from '@taskdoor/types';
import {runVerdict} from '@taskdoor/run-verdict';
import {batchProgress} from '@taskdoor/batch-progress';
import {Page,Button,Card,GridTable,Cell,Notice,useBusiness} from './shared';
export default function EvaluationsPage({children}:{children:ReactNode}){
 const {data,error,refresh}=useBusiness();const [query]=useSearchParams();
 const groups=new Map<string,LabRun[]>();for(const run of data?.state.runs??[]){const list=groups.get(run.batchId)??[];list.push(run);groups.set(run.batchId,list);}
 const batches=[...groups.values()].sort((a,b)=>b[0].createdAt.localeCompare(a[0].createdAt));
 const active=batches.some(runs=>{const p=batchProgress(runs);return p.ended<p.total;});
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>void refresh(),2000);return()=>clearInterval(timer);},[active]);
 if(query.get('view')==='native')return <>{children}</>;
 return <Page title="评测结果" description="创建后立即保存评测记录，执行进度自动更新。" actions={<div className="business-row"><Button asChild><Link to="/setup">新建评测</Link></Button><Button variant="outline" onClick={()=>void refresh()}>刷新</Button><Button variant="outline" asChild><Link to="?view=native">引擎报告</Link></Button></div>}><Notice error={error}/><Card className="p-4"><GridTable heads={['评测批次','状态','完成度','评测结果','操作']}>{batches.map(runs=>{const first=runs[0];const p=batchProgress(runs);const passed=runs.filter(r=>runVerdict(r)==='passed').length;const failed=runs.filter(r=>runVerdict(r)==='failed').length;const pending=runs.length-passed-failed;const state=p.running?'运行中':p.judging?'判断中':p.queued?'排队中':p.cancelled===p.total?'已取消或中断':'已结束';return <tr key={first.batchId}><Cell><strong>{first.teamSnapshot.name}</strong><p className="business-muted">{new Date(first.createdAt).toLocaleString('zh-CN')} · {new Set(runs.map(r=>r.caseId)).size} 条用例 · {runs.length} 组</p></Cell><Cell>{state}</Cell><Cell><progress aria-label="批次完成度" value={p.ended} max={p.total}/><p className="business-muted">{p.ended} / {p.total} 已结束</p></Cell><Cell><div className="eval-result-counts"><span className="eval-count-success">成功 <strong>{passed}</strong></span><span className="eval-count-failed">失败 <strong>{failed}</strong></span><span className="eval-count-pending">待判断 <strong>{pending}</strong></span></div></Cell><Cell><Button asChild variant="outline"><Link to={'/eval/taskdoor-'+first.batchId}>查看结果</Link></Button></Cell></tr>;})}</GridTable>{!batches.length&&<p className="business-muted">{data?'还没有评测记录，点击“新建评测”开始。':'正在读取评测记录…'}</p>}</Card></Page>;
}
