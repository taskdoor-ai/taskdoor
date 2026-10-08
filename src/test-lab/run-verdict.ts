import type {LabRun} from './types';
export type RunVerdict='passed'|'failed'|'pending';
export function runVerdict(run:LabRun):RunVerdict{
 if(['queued','running','cancelled','interrupted'].includes(run.status)||run.judgeStatus==='running')return 'pending';
 if(run.status==='failed'||run.steps.some(s=>s.error||s.structure==='failed'||s.assertions.some(a=>a.status==='failed')))return 'failed';
 if(run.review)return run.review.verdict;
 if(run.judgeStatus==='failed')return 'pending';
 const items=run.jevReviews?.at(-1)?.items;
 if(!items?.length)return 'pending';
 if(items.some(i=>i.choice==='unmet'&&(i.source==='model'&&!!i.note.trim()||i.source==='jev'&&(i.confidence??0)>=.8)))return 'failed';
 return items.every(i=>i.choice==='met'&&(i.source==='model'&&!!i.note.trim()||i.source==='jev'&&(i.confidence??0)>=.8))?'passed':'pending';
}
