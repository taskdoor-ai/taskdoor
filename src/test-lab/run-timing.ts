import type {LabRun} from '@/test-lab/types';

function elapsed(start?:string|null,end?:string|null):number|null {
  if(!start||!end)return null;
  const ms=Date.parse(end)-Date.parse(start);
  return Number.isFinite(ms)&&ms>=0?ms:null;
}
/** Automatic judging keeps its wall time; later reviews exclude idle time. */
export function runTiming(run:LabRun){
  const generationMs=elapsed(run.startedAt,run.finishedAt);
  const automatic=!!run.selection?.judgeModel;
  const latestReview=run.jevReviews?.at(-1);
  const hasJudge=!!(automatic||run.judgeStatus||run.judgeStartedAt||run.judgeFinishedAt||latestReview);
  let judgeMs=elapsed(run.judgeStartedAt,run.judgeFinishedAt);
  // Older manual reviews saved their duration without separate timestamps.
  if(!automatic&&!run.judgeStartedAt&&!run.judgeFinishedAt&&(!run.judgeStatus||run.judgeStatus==='completed')){
    const duration=latestReview?.durationMs;
    if(duration!==undefined&&Number.isFinite(duration)&&duration>=0)judgeMs=duration;
  }
  const judged=hasJudge&&run.judgeStatus!=='skipped';
  const totalMs=!judged?generationMs:automatic?elapsed(run.startedAt,run.judgeFinishedAt)
    :generationMs===null||judgeMs===null?null:generationMs+judgeMs;
  return {generationMs,judgeMs,totalMs,hasJudge};
}
export function formatDuration(ms:number|null){
  if(ms===null)return '未记录';
  return `${Math.round(ms)} ms`;
}
