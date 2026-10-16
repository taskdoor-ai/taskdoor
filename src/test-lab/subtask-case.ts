import type {LabCase} from '@/test-lab/types';

export function isSubtaskSuggestionsCase(item:LabCase){
  return item.steps.length>0&&item.steps.every((step,index)=>step.skillId==='taskdoor-decompose-task'&&!!step.taskId&&!step.events.length&&(index>0||!step.usePreviousOutput))&&!item.workload&&!item.contextMode;
}

export function availableSubtaskSuggestionsCases(cases:LabCase[],teamId:string){
  return cases.filter(item=>item.teamId===teamId&&item.enabled&&!item.archived&&isSubtaskSuggestionsCase(item));
}

export function isSubtaskSuggestionsSnapshot(snapshot:string){
  const header=/^skills\/taskdoor-decompose-task\/references\/production-runtime\.json ---\r?\n/;
  const manifest=snapshot.split(/^--- FILE: /m).find(document=>header.test(document));
  try{return !!manifest&&JSON.parse(manifest.replace(header,'')).mode==='subtasks';}catch{return false;}
}
