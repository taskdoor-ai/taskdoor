import type {LabState} from '../../src/test-lab/types.ts';

const technical=/MCP|create_task|create_subtasks?|set_task_|get_task|list_task_|tools\/list|effortEstimate|workspace|idempotencyKey|真实工具|回读|\[MCP评测\]/i;
// This converts built-in catalog input only, leaving run snapshots and user-authored cases intact.
export function naturalCaseInput(source:string){
 let text=source;
 // Both previous seed formats embedded business requirements as JSON.
 text=text.replace(/\{\s*"title"\s*:\s*"(?:[^"\\]|\\.)*"[^{}]*\}/g,raw=>{
  try{const v=JSON.parse(raw);return `任务叫“${v.title}”，希望${v.goal}。完成时需要满足：${v.criteria.join('；')}`;}catch{return raw;}
 });
 text=text.replace(/\[MCP评测\]\s*/g,'');
 text=text.replace(/请在当前 MCP 工作区实际创建/g,'帮我建').replace(/请在当前 MCP 工作区/g,'请');
 text=text.replace(/完成标准必须通过 set_task_criteria 保存为/g,'完成标准是');
 text=text.replace(/按真实 effortEstimate 字段保存/g,'记录预计投入');
 text=text.replace(/人工投入未知，请省略整个effortEstimate，不根据标题估算/g,'人工投入还不清楚，先别填预计投入');
 // Evaluation transport/instrumentation instructions belong to executor instructions, never user input.
 text=text.split(/(?<=[。！？])/).filter(sentence=>!technical.test(sentence)).join('');
 text=text.replace(/实际创建/g,'帮我建').replace(/创建根任务/g,'建一个总任务').replace(/独立根任务/g,'独立任务').replace(/根任务/g,'总任务').replace(/本次评测/g,'这次').replace(/新评测任务/g,'新任务').replace(/明确授权创建/g,'帮我建').replace(/严格创建这三个节点/g,'只要这三项任务').replace(/本次只创建一套新的评测任务[^。]*。/g,'');
 text=text.replace(/真实ID|真实 ID/g,'任务编号').replace(/当前凭据对应的有效成员|当前有效成员/g,'我').replace(/ACTIVE/g,'在职').replace(/MEMBER/g,'参与者').replace(/VIEWER/g,'只读成员');
 text=text.replace(/，\s*替换原标准/g,'，替换原来的完成标准').replace(/；{2,}/g,'；').replace(/。{2,}/g,'。');
 return text.trim();
}

const liveInputs:Record<string,string>={
 single:'帮我建一个“编写产品介绍文案”任务，交付一份简明产品介绍，需要包含产品用途、适用对象和核心特点。负责人是我。',
 children:'帮我建一个“准备新品发布资料”的总任务，交付完整发布资料。下面分成“编写介绍文案”和“制作发布海报”两项：文案要包含用途、适用对象和核心特点；海报要包含产品名称和发布信息。负责人都用我。',
 deadline:'帮我建一个“校对发布文案”任务，交付无错字且信息一致的文案，需要修正错别字、核对产品名称和发布日期，截止日期是2026-12-31。负责人是我。',
 criteria:'帮我建一个“整理产品规格表”任务，交付完整规格表。完成时需要满足三项：包含尺寸、包含材质、包含适用范围。负责人是我。',
 tips:'帮我建一个“核对发布素材”任务，交付已核对的素材包，素材名称和发布日期都要一致。建议先核对原始资料，再检查最终导出文件。负责人是我。',
 effort:'帮我建一个“校对短篇介绍”任务，交付没有错别字、产品名称一致的文案。我打算人工逐句校对，预计花30分钟，依据是一篇短文的一次核对。负责人是我。',
 deep:'帮我安排“产品资料交付”，交付一份完整资料包。下面先建“准备文字资料”，再在里面安排“编写产品简介”，简介需要包含用途和特点。上级任务都以对应资料全部交付为完成标准，负责人都用我。',
 parallel:'帮我安排“发布物料交付”，下面分成产品文案、发布海报、客服问答三项。文案包含用途和特点，海报包含产品名和发布信息，问答覆盖使用与售后。三项可以并行，负责人都是我。',
 dependencies:'帮我建“发布资料核对”总任务，下面分成“编写资料”和“核对资料”。先写包含产品用途的初稿，再核对到产品信息一致，两项交付齐全后总任务才算完成。负责人都是我。',
 members:'帮我建一个“成员协作核对”任务，交付已核对的资料，资料要完整、信息要一致。负责人是我，团队里如果还有在职成员，找一位一起参与；没有就先不加。',
 characters:'帮我建任务，标题用“核对「A/B」版本 & 发布说明”，目标是“交付中文发布说明，保留 A/B 与 & 的原始写法。”。完成标准分两条：包含版本名称 A/B；保留符号 &。负责人是我。',
 retry:'帮我建一个“核对交付记录”任务，交付完整核对记录。我刚才可能重复点了提交，这次还是同一件事，只要一个任务，别重复建。负责人是我。',
};

export function migrateNaturalCaseInputs(state:LabState){
 let changed=false;
 for(const c of state.cases){
  if(!/^mcp-(live|team|coverage)/.test(c.origin??'')||c.inputFormat==='natural-v1')continue;
  for(const step of c.steps){
   const old=step.prompt;
   let next=naturalCaseInput(old);
   const root=state.teams.find(t=>t.id===c.teamId)?.tasks.find(t=>!t.parentId);
   const business=root?.title??'资料交付';
   const title=old.match(/标题(?:必须是|严格为|严格是)?[：为]?\s*[“"]([^”"]+)[”"]/)?.[1]?.replace(/\[MCP评测\]\s*/g,'')??business;
   // Tool-specific test actions become ordinary repeated user requests; receipts still verify uniqueness.
   if(c.id.endsWith('-retry')||c.id.endsWith('-idempotent'))next=`帮我建一个“${title}”任务，交付一份核对记录，完成标准是记录齐全。我刚才可能重复点了提交，这次还是同一件事，只要一个任务，不要重复建。负责人是我。`;
   if(c.id.endsWith('-repeat-batch'))next=`给“${business}”建一个总任务，下面安排“整理清单”和“保留记录”两项，分别交付完整清单和核对记录。我可能重复提交了同一份请求，只要这一个总任务和这两项子任务，别多建。负责人都用我。`;
   if(c.id.endsWith('-unknown-effort'))next=`帮我建一个“${title}”任务，目标是交付核对后的资料，完成标准是资料完整、信息一致。负责人是我，具体要花多久还不清楚，先别填预计投入。`;
   if(c.id.endsWith('-member')||c.id.endsWith('-members')||c.id.endsWith('-multi-participant'))next+=`负责人是我。如果团队里还有在职成员，请${c.id.endsWith('-multi-participant')?'找最多两位':'找一位'}一起参与；人不够就按实际情况来，不要加未入职的人。`;
   else if(c.id.endsWith('-viewer'))next+=`负责人是我。团队里如果还有在职成员，请找一位帮忙查看，只能看，不能编辑；没有就先不加。`;
   else if(!next.includes('负责人'))next+='负责人是我。';
   if(!next||next==='负责人是我。')next=`帮我建一个“${business}”任务，目标是交付完整资料，完成标准是资料齐全、核对记录完整。负责人是我。`;
   if(c.id.startsWith('mcp-live-'))next=liveInputs[c.id.slice('mcp-live-'.length)]??next;
   next=next.replace(/只执行本次任务创建和明确的新任务字段设置，不执行任务对应的业务。/g,'').replace(/只设置截止日期，不提交开始日期。/g,'').replace(/不要只写在目标或回复中。/g,'');
   if(next!==old){step.prompt=next;changed=true;}
  }
  c.inputFormat='natural-v1';changed=true;
  if(/-(retry|idempotent|repeat-batch)$/.test(c.id)&&c.expectedOutput){
   const criteria=c.id.endsWith('-repeat-batch')?['真实创建一个父任务和两个子任务，并逐项get_task核对。','重复提交的同一请求没有产生额外父任务或子任务。']:['真实创建一个任务并get_task回读核对。','同一请求重复提交仅产生一个真实任务ID，不额外创建任务。'];
   if(c.expectedOutput.checks.some(x=>/两次|幂等键/.test(x.criterion))){c.reviewChecklist=criteria;c.expectedOutput.checks=criteria.map((criterion,i)=>({id:`check-${i+1}`,stepId:'s1',subject:'真实创建回执',criterion,expected:null}));changed=true;}
  }
 }
 return changed;
}
