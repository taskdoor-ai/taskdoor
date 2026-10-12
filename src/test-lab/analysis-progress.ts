import {getTaskProgressComparison,type TaskProgressComparisonSeries} from '@/features/tasks/lib/task-progress-comparison';
/** Bind the model proposal to a real recorded source; never relabel it as a demo example. */
export function analysisProgressSeries(progress:unknown):TaskProgressComparisonSeries|null{
 if(!progress||typeof progress!=='object')return null;
 const comparison=(progress as {comparison?:unknown}).comparison;
 if(!comparison||typeof comparison!=='object')return null;
 const series={...comparison,source:'recorded'} as TaskProgressComparisonSeries;
 try{return getTaskProgressComparison(series)?series:null;}catch{return null;}
}
export function analysisDateDifference(due:unknown,finish:unknown):number|null{
 const day=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v?Date.parse(v+'T00:00:00Z'):null;
 try{const a=day(due),b=day(finish);return a===null||b===null?null:(b-a)/86400000;}catch{return null;}
}
