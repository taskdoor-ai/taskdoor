import { ChevronDown, Plus, Trash2, UserRound } from "lucide-react";
import type { TagDefinition } from "../data/tagGroups";
import { findTagByName } from "../data/tagGroups";
import { getLinearCreationStages } from "../lib/taskCreationLinearStages";
import { hasValidCreationDependencies, newCreationTask, removeCreationSubtask, type CreationForm, type CreationTask } from "../lib/taskCreationForm";
import { MemberSelector, type Member } from "./MemberSelector";
import { TagBadge } from "./TagBadge";
import { TagPicker } from "./TagPicker";
import { TaskCreationEditableText } from "./TaskCreationEditableText";
import { TaskCriteriaFields } from "./TaskCriteriaFields";
import { TaskExecutionTipsField } from "./TaskExecutionTipsField";
import { TaskDueDatePicker } from "./TaskDueDatePicker";
import { TaskEffortCost } from "./TaskEffortCost";
import { Button } from "./ui/button";
import "../styles/task-creation-linear.css";

type Props = {
  form: CreationForm;
  members: Member[];
  tags: TagDefinition[];
  revealCount: number;
  disabled?: boolean;
  onChange: (form: CreationForm) => void;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
};

type ContentProps = Omit<Props, "revealCount"> & {
  updateTask: (clientId: string, patch: Partial<CreationTask>) => void;
};

function recommendationBasis(member?: Member) {
  if (!member) return "当前没有足够依据推荐负责人，可以先创建后再分配。";
  return member.dynamicResponsibility || member.currentWork?.[0] || member.role || "基于当前团队责任范围建议。";
}

function DependencyFields({ disabled, form, task, updateTask }: {
  disabled: boolean;
  form: CreationForm;
  task: CreationTask;
  updateTask: ContentProps["updateTask"];
}) {
  const candidates = form.subtasks.filter(candidate => candidate.clientId !== task.clientId);
  if (!candidates.length) return <span className="linear-creation-muted">无可选前置任务</span>;
  return <div className="linear-creation-dependency-options">{candidates.map(candidate => {
    const checked = task.dependsOnClientIds.includes(candidate.clientId);
    const nextIds = checked ? task.dependsOnClientIds.filter(id => id !== candidate.clientId) : [...task.dependsOnClientIds, candidate.clientId];
    const nextTasks = form.subtasks.map(item => item.clientId === task.clientId ? { ...item, dependsOnClientIds: nextIds } : item);
    const createsCycle = !checked && !hasValidCreationDependencies(nextTasks);
    return <label key={candidate.clientId}>
      <input checked={checked} className="linear-creation-dependency-checkbox" disabled={disabled || createsCycle} onChange={() => updateTask(task.clientId, { dependsOnClientIds: nextIds })} type="checkbox" />
      <span>{candidate.title || "未命名子任务"}{createsCycle && <small>会形成循环依赖</small>}</span>
    </label>;
  })}</div>;
}

function LinearSubtask({ disabled = false, form, members, onChange, onInviteMembers, tags, task, updateTask }: ContentProps & { task: CreationTask }) {
  const index = form.subtasks.findIndex(item => item.clientId === task.clientId);
  const owner = members.find(member => member.id === task.ownerId);
  return <details className="linear-creation-subtask">
    <summary>
      <span className="linear-creation-subtask-summary"><strong>{task.title || "未命名子任务"}</strong><small>{task.goal || form.mainTask.goal || "目标待补充"}</small></span>
      <span className="linear-creation-subtask-owner">{owner ? owner.name : <><UserRound aria-hidden="true" size={14} />暂不分配</>}</span>
      <ChevronDown aria-hidden="true" className="linear-creation-subtask-chevron" size={16} />
    </summary>
    <div className="linear-creation-subtask-details">
      <label className="linear-creation-field"><span>子任务名称</span><TaskCreationEditableText disabled={disabled} label={`子任务 ${index + 1} 名称`} onChange={title => updateTask(task.clientId, { title })} value={task.title} /></label>
      <div className="linear-creation-field"><span>完成标准</span><TaskCriteriaFields disabled={disabled} label={`子任务 ${index + 1} 完成标准`} onChange={completionCriteria => updateTask(task.clientId, { completionCriteria })} values={task.completionCriteria} /></div>
      <TaskExecutionTipsField disabled={disabled} label={`子任务 ${index + 1} 执行建议`} onChange={executionTips => updateTask(task.clientId, { executionTips })} values={task.executionTips} />
      <div className="linear-creation-properties">
        <div><small>负责人</small><MemberSelector allowUnassigned disabled={disabled} hideHeader label={`子任务 ${index + 1} 负责人`} max={1} members={members} onChange={selected => {
          const ownerId = selected[0] ?? "";
          updateTask(task.clientId, { ownerId, participantIds: task.participantIds.filter(id => id !== ownerId) });
        }} onInviteMembers={onInviteMembers} selected={task.ownerId ? [task.ownerId] : []} showInvitationStatus={false} /></div>
        <div><small>参与人</small><MemberSelector disabled={disabled} hideHeader label={`子任务 ${index + 1} 参与人`} members={members.filter(member => member.id !== task.ownerId)} onChange={participantIds => updateTask(task.clientId, { participantIds })} onInviteMembers={onInviteMembers} selected={task.participantIds} showInvitationStatus={false} stacked /></div>
        <div><small>截止时间</small><TaskDueDatePicker initialValue={task.endDate} label={`子任务 ${index + 1} 截止时间`} onChange={endDate => updateTask(task.clientId, { startDate: "", endDate })} /></div>
      </div>
      <div className="linear-creation-property-row"><small>标签</small><div className="linear-creation-tags">{task.labels.map(name => <TagBadge key={name} onRemove={disabled ? undefined : () => updateTask(task.clientId, { labels: task.labels.filter(item => item !== name) })} size="sm" tag={findTagByName(tags, name) ?? { id: name, name, color: "gray", icon: "tag" }} />)}<TagPicker onChange={labels => updateTask(task.clientId, { labels })} selected={task.labels} tags={tags} /></div></div>
      <div className="linear-creation-property-row"><small>预计投入</small><TaskEffortCost mode="creation" showDistribution={false} tasks={[{ ...task, goal: form.mainTask.goal }]} /></div>
      <div className="linear-creation-property-row"><small>前置依赖</small><DependencyFields disabled={disabled} form={form} task={task} updateTask={updateTask} /></div>
      <footer><span>人选仍待成员接受，排期需共同确认。</span><Button disabled={disabled} onClick={() => onChange(removeCreationSubtask(form, task.clientId))} size="sm" type="button" variant="ghost"><Trash2 aria-hidden="true" size={14} />移除子任务</Button></footer>
    </div>
  </details>;
}

function MainTaskContent({ disabled = false, form, onChange, updateTask }: ContentProps) {
  const main = form.mainTask;
  return <section aria-label="主任务信息" className="linear-creation-main">
    <label className="linear-creation-field"><span>任务名称</span><TaskCreationEditableText disabled={disabled} label="任务名称" onChange={title => updateTask(main.clientId, { title })} value={main.title} /></label>
    <label className="linear-creation-field"><span>任务目标</span><TaskCreationEditableText disabled={disabled || form.decision === "attach"} label="任务目标" onChange={goal => onChange({ ...form, mainTask: { ...main, goal }, subtasks: form.subtasks.map(task => ({ ...task, goal })) })} value={form.decision === "attach" ? form.candidate?.goal ?? "" : main.goal} /></label>
    <div className="linear-creation-field"><span>完成标准</span><TaskCriteriaFields disabled={disabled} label="任务完成标准" onChange={completionCriteria => updateTask(main.clientId, { completionCriteria })} values={main.completionCriteria} /></div>
    <TaskExecutionTipsField disabled={disabled} label="主任务执行建议" onChange={executionTips => updateTask(main.clientId, { executionTips })} values={main.executionTips} />
  </section>;
}

function TeamContent({ disabled = false, form, members, onInviteMembers, updateTask }: ContentProps) {
  const main = form.mainTask;
  const owner = members.find(member => member.id === main.ownerId);
  return <section aria-label="任务协作成员" className="linear-creation-team">
    <div className="linear-creation-people">
      <div><small>负责人</small><MemberSelector allowUnassigned disabled={disabled} hideHeader label="负责人" max={1} members={members} onChange={selected => {
        const ownerId = selected[0] ?? "";
        updateTask(main.clientId, { ownerId, participantIds: main.participantIds.filter(id => id !== ownerId) });
      }} onInviteMembers={onInviteMembers} selected={main.ownerId ? [main.ownerId] : []} showInvitationStatus={false} /><p>{recommendationBasis(owner)}</p></div>
      <div><small>参与人</small><MemberSelector disabled={disabled} hideHeader label="参与人" members={members.filter(member => member.id !== main.ownerId)} onChange={participantIds => updateTask(main.clientId, { participantIds })} onInviteMembers={onInviteMembers} selected={main.participantIds} showInvitationStatus={false} stacked /><p>{main.participantIds.length ? "根据当前子任务分工补充，仍需成员接受。" : "当前没有必须提前加入的参与者，可在子任务中分别确认。"}</p></div>
    </div>
    <p className="linear-creation-boundary">以上均为人选建议，尚未向成员发出或确认指派。</p>
  </section>;
}

function SubtaskContent({ disabled = false, form, members, onChange, onInviteMembers, tags, updateTask, visibleTaskIds }: ContentProps & { visibleTaskIds: Set<string> }) {
  const createSubtask = () => ({ ...newCreationTask(), goal: form.mainTask.goal });
  const visibleTasks = form.subtasks.filter(task => visibleTaskIds.has(task.clientId));
  return <section aria-label="子任务" className="linear-creation-subtasks">
    <header>
      <div><h2>{form.subtasks.length ? `${form.subtasks.length} 个子任务` : "子任务"}</h2><small>{form.subtasks.length ? "点击任一子任务展开修改" : "这个任务当前没有子任务"}</small></div>
      <Button disabled={disabled} onClick={() => onChange({ ...form, subtasks: [...form.subtasks, createSubtask()] })} size="sm" type="button" variant="ghost"><Plus aria-hidden="true" size={14} />添加子任务</Button>
    </header>
    {visibleTasks.length > 0 && <div className="linear-creation-subtask-list">{visibleTasks.map(task => <LinearSubtask disabled={disabled} form={form} key={task.clientId} members={members} onChange={onChange} onInviteMembers={onInviteMembers} tags={tags} task={task} updateTask={updateTask} />)}</div>}
  </section>;
}

export function TaskCreationLinearSections({ form, members, tags, revealCount, disabled = false, onChange, onInviteMembers }: Props) {
  const revealedStageIds = new Set(getLinearCreationStages(form, revealCount).map(stage => stage.id));
  const visibleTaskIds = new Set(form.subtasks.filter(task => revealedStageIds.has(`subtask:${task.clientId}`)).map(task => task.clientId));
  const showSubtasks = revealedStageIds.has("plan") || (revealedStageIds.has("split") && form.subtasks.length === 0);
  const updateTask = (clientId: string, patch: Partial<CreationTask>) => onChange({
    ...form,
    mainTask: clientId === form.mainTask.clientId ? { ...form.mainTask, ...patch } : form.mainTask,
    subtasks: form.subtasks.map(task => task.clientId === clientId ? { ...task, ...patch } : task),
  });
  const contentProps = { disabled, form, members, onChange, onInviteMembers, tags, updateTask };
  return <div className="linear-creation-document">
    {revealedStageIds.has("goal") && <MainTaskContent {...contentProps} />}
    {revealedStageIds.has("people") && <TeamContent {...contentProps} />}
    {showSubtasks && <SubtaskContent {...contentProps} visibleTaskIds={visibleTaskIds} />}
  </div>;
}
