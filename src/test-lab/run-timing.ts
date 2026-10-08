import type {LabRun} from './types';

function elapsed(start?:string|null,end?:string|null):number|null {
  if(!start||!end)return null;
  const ms=Date.parse(end)-Date.parse(start);
  return Number.isFinite(ms)&&ms>=0?ms:null;
}
/** Wall time, excluding queueing. Missing timestamps are never converted to zero. */
export function runTiming(run:LabRun){
  const generationMs=elapsed(run.startedAt,run.finishedAt);
  const judgeMs=elapsed(run.judgeStartedAt,run.judgeFinishedAt);
  const judged=!!run.selection?.judgeModel;
  return {generationMs,judgeMs,totalMs:judged?elapsed(run.startedAt,run.judgeFinishedAt):generationMs};
}
export function formatDuration(ms:number|null){
  if(ms===null)return '未记录';
  return `${Math.round(ms)} ms`;
}
