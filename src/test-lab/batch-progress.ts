import type {LabRun} from './types';
export function batchProgress(runs:LabRun[]){
 const pendingJudge=(r:LabRun)=>!!r.selection?.judgeModel&&!['cancelled','interrupted'].includes(r.status)&&!['completed','failed'].includes(r.judgeStatus??'');
 const queued=runs.filter(r=>r.status==='queued').length;
 const running=runs.filter(r=>r.status==='running').length;
 const judging=runs.filter(r=>!['queued','running'].includes(r.status)&&pendingJudge(r)).length;
 const ended=runs.length-queued-running-judging;
 return {total:runs.length,ended,queued,running,judging,percent:runs.length?Math.round(ended/runs.length*100):0,failed:runs.filter(r=>r.status==='failed'||r.judgeStatus==='failed').length,cancelled:runs.filter(r=>['cancelled','interrupted'].includes(r.status)).length};
}
