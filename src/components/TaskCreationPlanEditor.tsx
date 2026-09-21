import { useCreationI18n } from "../i18n/creationMessages";
import { ListTree, ListTodo, Plus } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { findTagByName, type TagDefinition } from "../data/tagGroups";
import { syncCreationSubtaskEdit } from "../lib/taskCreationSubtaskEditing";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { newCreationTask, removeCreationSubtask, type CreationForm, type CreationTask } from "../lib/taskCreationForm";
import { getCreationEffortLeaves } from "../lib/taskCreationEffort";
import { getCreationDescendantIds, getCreationHierarchyDepth } from "../lib/taskCreationHierarchy";
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
import { TaskEffortEditor } from "./TaskEffortEditor";
import { applyCreationEffortEdits } from "../lib/taskEffortEdits";
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
  const { c, locale, localize } = useCreationI18n();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const nested = form.subtasks.some(task => task.parentClientId);
  const depth = getCreationHierarchyDepth(form);
  const memberRecommendations = useMemo(() => createTaskMemberRecommendations({
    members,
    taskText: [form.mainTask.title, form.mainTask.goal, ...form.mainTask.completionCriteria, ...form.mainTask.labels].join(" "),
  }), [members, form.mainTask.title, form.mainTask.goal, form.mainTask.completionCriteria, form.mainTask.labels]);
  const latestForm = useRef(form);
  latestForm.current = form;
  const update = (next: CreationForm) => { if (!disabled) { latestForm.current = next; onChange(next); } };
  const updateMain = (task: CreationTask) => update({ ...form, mainTask: task });
  const renderTask = (task: CreationTask): ReactNode => {
    const index = form.subtasks.findIndex(item => item.clientId === task.clientId);
    const fallback = visual[index % visual.length];
    const children = form.subtasks.filter(item => item.parentClientId === task.clientId);
    const isCollapsed = collapsed.has(task.clientId);
    const editor = <TaskCreationSubtaskEditor disabled={disabled} form={form} iconName={task.iconName ?? fallback.iconName} index={index} members={members} tags={tags} task={task} tone={task.iconTone ?? fallback.tone}
      childCount={children.length} hierarchical={nested} descendantCount={getCreationDescendantIds(form, task.clientId).size}
      branchControl={children.length > 0 ? <button aria-controls={`creation-children-${task.clientId}`} aria-expanded={!isCollapsed} aria-label={c("childTasksOf", { v0: isCollapsed ? c("expand") : c("collapse"), v1: task.title })} className="creation-tree-toggle" onClick={() => setCollapsed(current => {
        const next = new Set(current); if (next.has(task.clientId)) next.delete(task.clientId); else next.add(task.clientId); return next;
      })} title={c("directSubtasks", { v0: isCollapsed ? c("expand") : c("collapse"), v1: children.length })} type="button"><ListTree aria-hidden="true" size={15} /><span>{c("subtasksLabel")}{children.length})</span></button> : undefined}
      onAiAdjust={onAiAdjust ? anchor => onAiAdjust({ kind: "subtask", taskId: task.clientId }, anchor) : undefined}
      onDirtyChange={dirty => onSubtaskDirtyChange?.(task.clientId, dirty)} onInviteMembers={onInviteMembers}
      onRemove={() => update(removeCreationSubtask(latestForm.current, task.clientId))}
      onChange={(edited, expected) => {
        if (disabled) throw new Error(c("thisPlanCannotBeEditedPleaseReopen"));
        const next = syncCreationSubtaskEdit(latestForm.current, edited, expected, members);
        update(next);
        return next.subtasks.find(item => item.clientId === edited.clientId)!;
      }} />;
    if (!nested) return <div key={task.clientId}>{editor}</div>;
    return <li className="creation-tree-node" key={task.clientId}>
      {editor}
      {children.length > 0 && <ul aria-label={c("childTasksOfLabel", { v0: task.title })} className="creation-tree-children" hidden={isCollapsed} id={`creation-children-${task.clientId}`}>{children.map(renderTask)}</ul>}
    </li>;
  };

  return (
        <fieldset className="creation-editable-plan" disabled={disabled}>
          <header className="task-detail-hero-card creation-heading" data-tone={form.mainTask.iconTone ?? "blue"}>
            {onAiAdjust && <div className="task-ai-detail-tools"><TaskAiAdjustButton disabled={disabled} label={c("askAiToAdjustTaskDetails")} onClick={anchor => onAiAdjust({ kind: "task" }, anchor)} /></div>}
            <div className="task-detail-heading-main">
              <div className="task-detail-heading-copy">
                <TaskDetailFields disabled={disabled} icon={<TaskIcon iconName={form.mainTask.iconName ?? "target"} size="lg" tone={form.mainTask.iconTone ?? "blue"} />}
                  labels={{ name: c("taskName"), criteria: c("mainTaskCompletionCriteria") }} onChange={patch => updateMain({ ...form.mainTask, ...patch })} showExecutionTips value={form.mainTask} variant="heading"
                  description={{ label: c("goal"), inputLabel: c("taskGoal"), value: form.mainTask.goal, onChange: goal => updateMain({ ...form.mainTask, goal }) }}
                  effort={<TaskEffortEditor hasSubtasks={form.subtasks.length > 0} disabled={disabled} label={c("mainTask")} tasks={getCreationEffortLeaves(form).map(task => ({ ...task, id: task.clientId }))} onDirtyChange={dirty => onSubtaskDirtyChange?.(form.mainTask.clientId, dirty)} onChange={edits => { if (disabled) throw new Error(c("thisPlanCannotBeEditedRightNowLabel")); update(applyCreationEffortEdits(latestForm.current, edits)); }} />}
                />
              </div>
            </div>
            <div aria-label={c("taskProperties")} className="task-detail-properties creation-heading-properties">
              <div className="task-detail-property"><small>{c("owner")}</small><MemberSelector allowUnassigned hideHeader hideSelectedName label={c("owner")} max={1} memberRecommendations={memberRecommendations} members={members} min={0} onChange={selected => { const ownerId = selected[0] ?? ""; updateMain({ ...form.mainTask, ownerId, participantIds: form.mainTask.participantIds.filter(id => id !== ownerId) }); }} onInviteMembers={onInviteMembers} selected={form.mainTask.ownerId ? [form.mainTask.ownerId] : []} showInvitationStatus={false} showTriggerProfilePreview={false} /></div>
              <span aria-hidden="true" className="task-detail-property-separator" />
              <div className="task-detail-property"><small>{c("participants")}</small><MemberSelector displayMax={4} hideHeader hideSelectedName label={c("participants")} memberRecommendations={memberRecommendations} members={members.filter(m => m.id !== form.mainTask.ownerId)} onChange={participantIds => updateMain({ ...form.mainTask, participantIds })} onInviteMembers={onInviteMembers} selected={form.mainTask.participantIds} showInvitationStatus={false} stacked /></div>
              <span aria-hidden="true" className="task-detail-property-separator" />
              <TaskDueDatePicker initialValue={form.mainTask.endDate} label={c("dueDate")} onChange={endDate => updateMain({ ...form.mainTask, endDate, startDate: "" })} />
              <span aria-hidden="true" className="task-detail-property-separator" />
              <div aria-label={c("taskTags")} className="task-detail-title-tags"><small className="creation-property-label">{c("tags")}</small>{form.mainTask.labels.map(name => <TagBadge key={name} onRemove={disabled ? undefined : () => updateMain({ ...form.mainTask, labels: form.mainTask.labels.filter(item => item !== name) })} size="sm" tag={findTagByName(tags, name) ?? { id: name, name, color: "gray", icon: "tag" }} />)}<TagPicker onChange={labels => updateMain({ ...form.mainTask, labels })} selected={form.mainTask.labels} tags={tags} /></div>
            </div>
          </header>
          {form.subtasks.length > 0 && <section aria-label={c("subtaskPlan")} className="creation-subtasks creation-subtasks-cards">
            <header className="creation-subtasks-heading"><div><ListTodo size={19} /><h2>{c("subtasksLabel97")}</h2><span className="creation-count">{form.subtasks.length}</span><small>{nested ? c("allLevelsSubtaskLevels", { v0: depth - 1 }) : c("togetherAchieveTheMainTaskGoal")}</small></div><div>{nested && <>
              <Button onClick={() => setCollapsed(new Set())} size="sm" type="button" variant="ghost">{c("expandAll")}</Button>
              <Button onClick={() => setCollapsed(new Set(form.subtasks.filter(task => form.subtasks.some(item => item.parentClientId === task.clientId)).map(task => task.clientId)))} size="sm" type="button" variant="ghost">{c("collapseAll")}</Button>
            </>}{onAiAdjust && <TaskAiAdjustButton disabled={disabled} label={c("askAiToAdjustSubtasks")} onClick={anchor => onAiAdjust({ kind: "subtasks" }, anchor)} />}<Button onClick={() => update({ ...form, subtasks: [...form.subtasks, newCreationTask()] })} size="sm" type="button" variant="ghost"><Plus size={14} />{c("addSubtask")}</Button></div></header>
            {nested ? <ul aria-label={c("subtaskHierarchy")} className="creation-task-tree">{form.subtasks.filter(task => !task.parentClientId).map(renderTask)}</ul> : <div className="creation-task-list">{form.subtasks.map(renderTask)}</div>}
          </section>}
          {!form.subtasks.length && form.decision !== "attach" && <Button className="creation-add-subtask-inline" disabled={disabled} onClick={() => update({ ...form, subtasks: [newCreationTask()] })} size="sm" type="button" variant="ghost"><Plus size={14} />{c("addSubtask")}</Button>}
        </fieldset>
  );
}
