import type {ToolTrace} from './mcp-execution.ts';
// These checks compare actual receipts, never fixture answers or the model's summary.
export function checkMcpReceipts(tasks:any[],members:Record<string,any>,trace:ToolTrace[]){
 const successful=trace.filter(t=>t.status==='completed'&&!(t.result as any)?.isError);
 const data=(t:ToolTrace)=>{const r=t.result as any;if(r?.structuredContent)return r.structuredContent;try{return JSON.parse(r?.content?.find((c:any)=>c.type==='text')?.text);}catch{return null;}};
 for(const task of tasks){
  if(typeof task.goal!=='string'||!task.goal.trim())throw Error(`任务「${task.title??task.id}」未保存目标`);
  if(task.criteria?.unavailable||!Array.isArray(task.criteria?.items)||!task.criteria.items.length)throw Error(`任务「${task.title??task.id}」未保存可回读的完成标准`);
  const receipt=successful.find(t=>['create_task','create_subtask','create_subtasks'].includes(t.name)&&(t.name==='create_subtasks'?data(t)?.tasks?.some((item:any)=>item.id===task.id):data(t)?.id===task.id));
  if(!receipt)throw Error(`任务 ${task.id} 缺少本次成功创建回执`);
  const created=data(receipt);const expected={...(receipt.name==='create_subtasks'?created.tasks.find((item:any)=>item.id===task.id):created)};
  for(const update of successful.filter(t=>t.name==='update_task'&&t.arguments.taskId===task.id))for(const field of ['title','goal','dueDate'])if(update.arguments[field]!==undefined)expected[field]=update.arguments[field];
  for(const field of ['title','goal','ownerMemberId','dueDate','parentTaskId'])if(expected[field]!==undefined&&expected[field]!==task[field])throw Error(`任务「${task.title}」回读 ${field} 与创建回执不一致`);
  const criteria=successful.filter(t=>t.name==='set_task_criteria'&&t.arguments.taskId===task.id).at(-1)?.arguments.criteria as any[]|undefined;
  if(criteria&&JSON.stringify(criteria.map(c=>c.text))!==JSON.stringify(task.criteria.items.map((c:any)=>c.text)))throw Error(`任务「${task.title}」回读完成标准与写入内容不一致`);
  const dependencies=successful.filter(t=>t.name==='set_task_dependencies'&&t.arguments.taskId===task.id).at(-1)?.arguments.dependsOnTaskIds as string[]|undefined;
  if(dependencies){const actual=task.dependencies?.items?.map((item:any)=>item.taskId??item.dependsOnTaskId??item.id);if(task.dependencies?.unavailable||!Array.isArray(actual)||JSON.stringify([...actual].sort())!==JSON.stringify([...dependencies].sort()))throw Error(`任务「${task.title}」前置依赖未正确保存`);}
  for(const assignment of successful.filter(t=>t.name==='set_task_member'&&t.arguments.taskId===task.id))if(!members[task.id]?.items?.some((member:any)=>member.memberId===assignment.arguments.memberId&&member.role===assignment.arguments.role))throw Error(`任务「${task.title}」参与者未正确保存`);
 }
 const latest=new Map<string,ToolTrace>();for(const t of trace.filter(t=>!t.name.startsWith('list_')&&t.name!=='get_task'))latest.set(t.name+':'+(t.arguments.taskId??t.arguments.idempotencyKey),t);
 const failed=[...latest.values()].find(t=>(t.result as any)?.isError);
 if(failed){const error=data(failed);throw Error(`工具 ${failed.name} 未通过：${error?.message??error?.code??'业务校验失败'}`);}
}
