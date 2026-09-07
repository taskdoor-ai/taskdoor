import { ListTodo, Plus } from "lucide-react";
import { useMemo, useRef } from "react";
import { findTagByName, type TagDefinition } from "../data/tagGroups";
import { syncCreationSubtaskEdit } from "../lib/taskCreationSubtaskEditing";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { newCreationTask, removeCreationSubtask, type CreationForm, type CreationTask } from "../lib/taskCreationForm";
import { getCreationEffortLeaves } from "../lib/taskCreationEffort";
import { createTaskMemberRecommendations } from "../lib/taskMemberRecommendations";
import type { TaskAiAdjustmentScope } from "../lib/taskAiAdjustmentTypes";
import { MemberSelector, type Member } from "./MemberSelector";
import { TaskDueDatePicker } from "./TaskDueDatePicker";
import { TaskIcon } from "./TaskIcon";
import { TagBadge } from "./TagBadge";
import { TagPicker } from "./TagPicker";
import { TaskAiAdjustButton } from "./TaskAiAdjustmentPopover";
import { TaskCreationSubtaskEditor } from "./TaskCreationSubtaskEditor";
import { TaskDetailFields } from "./TaskDetailFields";
import { TaskEffortCost } from "./TaskEffortCost";
import { TaskMemberMatchBasis } from "./TaskMemberMatchBasis";
import { Button } from "./ui/button";
import "../styles/task-creation-cards.css";

const visual: Array<{ iconName: TaskIconName; tone: TaskIconTone }> = [
  { iconName: "briefcase", tone: "pink" }, { iconName: "sparkles", tone: "purple" }, { iconName: "flag", tone: "red" },
  { iconName: "list-todo", tone: "cyan" }, { iconName: "target", tone: "amber" }, { iconName: "chart", tone: "blue" }, { iconName: "file-check", tone: "green" },
];

type Props = {
  form: CreationForm;
  members: Member[];
  tags: TagDefinition[];
  disabled?: boolean;
  onChange: (form: CreationForm) => void;
  onAiAdjust?: (scope: TaskAiAdjustmentScope, returnFocus?: HTMLElement | null) => void;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
  onSubtaskDirtyChange?: (taskId: string, dirty: boolean) => void;
};

export function TaskCreationPlanEditor({ form, members, tags, disabled = false, onChange, onAiAdjust, onInviteMembers, onSubtaskDirtyChange }: Props) {
  const memberRecommendations = useMemo(() => createTaskMemberRecommendations({
    members,
    taskText: [form.mainTask.title, form.mainTask.goal, ...form.mainTask.completionCriteria, ...form.mainTask.labels].join(" "),
  }), [members, form.mainTask.title, form.mainTask.goal, form.mainTask.completionCriteria, form.mainTask.labels]);
  const latestForm = useRef(form);
  latestForm.current = form;
  const update = (next: CreationForm) => { if (!disabled) { latestForm.current = next; onChange(next); } };
  const updateMain = (task: CreationTask) => update({ ...form, mainTask: task });

  return (
        <fieldset className="creation-editable-plan" disabled={disabled}>
          <header className="task-detail-hero-card creation-heading" data-tone={form.mainTask.iconTone ?? "blue"}>
            {onAiAdjust && <div className="task-ai-detail-tools"><TaskAiAdjustButton disabled={disabled} label="AI 帮你改任务信息" onClick={anchor => onAiAdjust({ kind: "task" }, anchor)} /></div>}
            <div className="task-detail-heading-main">
              <div className="task-detail-heading-copy">
                <TaskDetailFields disabled={disabled} icon={<TaskIcon iconName={form.mainTask.iconName ?? "target"} size="lg" tone={form.mainTask.iconTone ?? "blue"} />}
                  labels={{ name: "任务名称", criteria: "主任务完成标准" }} onChange={patch => updateMain({ ...form.mainTask, ...patch })} showExecutionTips value={form.mainTask} variant="heading"
                  description={form.decision === "attach" ? { label: "目标", inputLabel: "任务目标", value: form.candidate?.goal || "主任务尚未填写目标" } : { label: "目标", inputLabel: "任务目标", value: form.mainTask.goal, onChange: goal => updateMain({ ...form.mainTask, goal }) }}
                  effort={<TaskEffortCost mode="creation" showDistribution={form.subtasks.length > 0} tasks={getCreationEffortLeaves(form)} />}
                />
              </div>
            </div>
            <div aria-label="任务属性" className="task-detail-properties creation-heading-properties">
              <div className="task-detail-property"><small>负责人</small><MemberSelector allowUnassigned hideHeader hideSelectedName label="负责人" max={1} memberRecommendations={memberRecommendations} members={members} min={0} onChange={selected => { const ownerId = selected[0] ?? ""; updateMain({ ...form.mainTask, ownerId, participantIds: form.mainTask.participantIds.filter(id => id !== ownerId) }); }} onInviteMembers={onInviteMembers} selected={form.mainTask.ownerId ? [form.mainTask.ownerId] : []} showInvitationStatus={false} showTriggerProfilePreview={false} /></div>
              <span aria-hidden="true" className="task-detail-property-separator" />
              <div className="task-detail-property"><small>参与人</small><MemberSelector displayMax={4} hideHeader hideSelectedName label="参与人" memberRecommendations={memberRecommendations} members={members.filter(m => m.id !== form.mainTask.ownerId)} onChange={participantIds => updateMain({ ...form.mainTask, participantIds })} onInviteMembers={onInviteMembers} selected={form.mainTask.participantIds} showInvitationStatus={false} stacked /></div>
              <span aria-hidden="true" className="task-detail-property-separator" />
              <TaskDueDatePicker initialValue={form.mainTask.endDate} label="截止时间" onChange={endDate => updateMain({ ...form.mainTask, endDate, startDate: "" })} />
              <span aria-hidden="true" className="task-detail-property-separator" />
              <div aria-label="任务标签" className="task-detail-title-tags">{form.mainTask.labels.map(name => <TagBadge key={name} onRemove={disabled ? undefined : () => updateMain({ ...form.mainTask, labels: form.mainTask.labels.filter(item => item !== name) })} size="sm" tag={findTagByName(tags, name) ?? { id: name, name, color: "gray", icon: "tag" }} />)}<TagPicker onChange={labels => updateMain({ ...form.mainTask, labels })} selected={form.mainTask.labels} tags={tags} /></div>
            </div>
            <TaskMemberMatchBasis label="主任务匹配依据" members={members} recommendations={memberRecommendations} task={form.mainTask} />
          </header>
          {form.subtasks.length > 0 && <section aria-label="子任务规划" className="creation-subtasks creation-subtasks-cards">
            <header className="creation-subtasks-heading"><div><ListTodo size={19} /><h2>子任务</h2><span className="creation-count">{form.subtasks.length}</span><small>共同完成主任务目标</small></div><div>{onAiAdjust && <TaskAiAdjustButton disabled={disabled} label="AI 帮你改子任务安排" onClick={anchor => onAiAdjust({ kind: "subtasks" }, anchor)} />}<Button onClick={() => update({ ...form, subtasks: [...form.subtasks, newCreationTask()] })} size="sm" type="button" variant="ghost"><Plus size={14} />添加子任务</Button></div></header>
            <div className="creation-task-list">{form.subtasks.map((task, index) => {
              const fallback = visual[index % visual.length];
              const tone = task.iconTone ?? fallback.tone;
              return <TaskCreationSubtaskEditor disabled={disabled} form={form} iconName={task.iconName ?? fallback.iconName} index={index} key={task.clientId} members={members} tags={tags} task={task} tone={tone}
                onAiAdjust={onAiAdjust ? anchor => onAiAdjust({ kind: "subtask", taskId: task.clientId }, anchor) : undefined}
                onDirtyChange={dirty => onSubtaskDirtyChange?.(task.clientId, dirty)}
                onInviteMembers={onInviteMembers}
                onRemove={() => update(removeCreationSubtask(latestForm.current, task.clientId))}
                onChange={(edited, expected) => {
                  if (disabled) throw new Error("当前方案不可编辑，请重新打开方案。");
                  const next = syncCreationSubtaskEdit(latestForm.current, edited, expected, members);
                  update(next);
                  return next.subtasks.find(item => item.clientId === edited.clientId)!;
                }}
              />;
            })}</div>
          </section>}
          {!form.subtasks.length && form.decision !== "attach" && <Button className="creation-add-subtask-inline" disabled={disabled} onClick={() => update({ ...form, subtasks: [newCreationTask()] })} size="sm" type="button" variant="ghost"><Plus size={14} />添加子任务</Button>}
        </fieldset>
  );
}
