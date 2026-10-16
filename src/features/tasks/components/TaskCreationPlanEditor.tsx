import { useCreationI18n } from "@/shared/i18n/creation-messages";
import { ListTree, ListTodo } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { TagDefinition } from "@/ai/mock/data/tagGroups";
import { syncCreationSubtaskEdit } from "@/features/tasks/lib/task-creation-subtask-editing";
import type { TaskIconTone } from "@/shared/model/task-model";
import { removeCreationSubtask, type CreationForm, type CreationTask } from "@/features/tasks/lib/task-creation-form";
import { getCreationDescendantIds, getCreationHierarchyDepth } from "@/features/tasks/lib/task-creation-hierarchy";
import { createTaskMemberRecommendations } from "@/ai/mock/lib/taskMemberRecommendations";
import type { TaskAiAdjustmentScope } from "@/features/tasks/lib/task-ai-adjustment-types";
import { getCreationAnnotationTargetKey, type TaskCreationAnnotation, type TaskCreationAnnotationTarget } from "@/features/tasks/lib/task-creation-annotations";
import { MemberSelector, type Member } from "@/features/members/components/MemberSelector";
import { TaskDueDatePicker } from "@/features/tasks/components/TaskDueDatePicker";
import { TaskAiAdjustButton } from "@/features/tasks/components/TaskAiAdjustmentPopover";
import { TaskCreationAnnotationButton } from "@/features/tasks/components/TaskCreationAnnotationButton";
import { TaskCreationSubtaskEditor } from "@/features/tasks/components/TaskCreationSubtaskEditor";
import { TaskDetailFields } from "@/features/tasks/components/TaskDetailFields";
import { TaskCreationSkeleton } from "@/features/tasks/components/TaskCreationSkeleton";
import type { CreationContentSection } from "@/features/tasks/lib/task-creation-progress";
import { getCreationDeadlineNote } from "@/features/tasks/lib/task-creation-review";
import { Button } from "@/shared/ui/button";
import "@/features/tasks/styles/task-creation-cards.css";
import "@/features/tasks/styles/task-creation-annotations.css";

const subtaskTones: TaskIconTone[] = ["pink", "purple", "red", "cyan", "amber", "blue", "green"];

type Props = {
  form: CreationForm;
  members: Member[];
  tags: TagDefinition[];
  disabled?: boolean;
  visibleSections?: CreationContentSection[];
  showSubtasks?: boolean;
  subtaskLoading?: ReactNode;
  onChange: (form: CreationForm) => void;
  onAiAdjust?: (scope: TaskAiAdjustmentScope, returnFocus?: HTMLElement | null) => void;
  annotations?: TaskCreationAnnotation[];
  onAnnotate?: (target: TaskCreationAnnotationTarget, anchor: HTMLElement) => void;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
  onSubtaskDirtyChange?: (taskId: string, dirty: boolean) => void;
};

export function TaskCreationPlanEditor({ form, members, tags, subtaskLoading, showSubtasks = false, disabled = false, visibleSections, onChange, onAiAdjust, annotations = [], onAnnotate, onInviteMembers, onSubtaskDirtyChange }: Props) {
  const { c, locale } = useCreationI18n();
  const criteriaReady = !visibleSections || visibleSections.includes("criteria");
  const propertiesReady = !visibleSections || visibleSections.includes("properties");
  const deadlineNote = getCreationDeadlineNote(form.mainTask);
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
  const mainAnnotationTarget: TaskCreationAnnotationTarget = { taskId: form.mainTask.clientId, field: "task" };
  const renderTask = (task: CreationTask): ReactNode => {
    const index = form.subtasks.findIndex(item => item.clientId === task.clientId);
    const fallbackTone = subtaskTones[index % subtaskTones.length];
    const children = form.subtasks.filter(item => item.parentClientId === task.clientId);
    const isCollapsed = collapsed.has(task.clientId);
    const editor = <TaskCreationSubtaskEditor disabled={disabled} form={form} index={index} members={members} tags={tags} task={task} tone={task.iconTone ?? fallbackTone}
      childCount={children.length} hierarchical={nested} descendantCount={getCreationDescendantIds(form, task.clientId).size}
      branchControl={children.length > 0 ? <button aria-controls={`creation-children-${task.clientId}`} aria-expanded={!isCollapsed} aria-label={c("childTasksOf", { v0: isCollapsed ? c("expand") : c("collapse"), v1: task.title })} className="creation-tree-toggle" onClick={() => setCollapsed(current => {
        const next = new Set(current); if (next.has(task.clientId)) next.delete(task.clientId); else next.add(task.clientId); return next;
      })} title={c("directSubtasks", { v0: isCollapsed ? c("expand") : c("collapse"), v1: children.length })} type="button"><ListTree aria-hidden="true" size={15} /><span>{c("subtasksLabel")}{children.length})</span></button> : undefined}
      onAiAdjust={onAiAdjust ? anchor => onAiAdjust({ kind: "subtask", taskId: task.clientId }, anchor) : undefined}
      annotations={annotations} onAnnotate={onAnnotate}
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
          <header className="task-detail-hero-card creation-heading" data-creation-annotation-card={form.mainTask.clientId} data-tone={form.mainTask.iconTone ?? "blue"}>
            {onAnnotate ? <div className="task-ai-detail-tools creation-card-annotation-tools" data-annotation-overlay><TaskCreationAnnotationButton count={annotations.filter(annotation => annotation.target.taskId === form.mainTask.clientId).length} disabled={disabled} label={form.mainTask.title} onClick={anchor => onAnnotate(mainAnnotationTarget, anchor)} targetKey={getCreationAnnotationTargetKey(mainAnnotationTarget)} /></div> : onAiAdjust && <div className="task-ai-detail-tools" data-annotation-overlay><TaskAiAdjustButton disabled={disabled} label={c("askAiToAdjustTaskDetails")} onClick={anchor => onAiAdjust({ kind: "task" }, anchor)} /></div>}
            <div className="task-detail-heading-main">
              <div className="task-detail-heading-copy">
                <TaskDetailFields showNameLabel disabled={disabled}
                  criteriaPlaceholder={!criteriaReady ? <TaskCreationSkeleton section="criteria" /> : undefined}
                  labels={{ name: c("taskName"), criteria: c("mainTaskCompletionCriteria") }} onChange={patch => updateMain({ ...form.mainTask, ...patch })} value={form.mainTask} variant="heading"
                  description={{ label: c("goal"), inputLabel: c("taskGoal"), value: form.mainTask.goal, onChange: goal => updateMain({ ...form.mainTask, goal }) }}

                />
              </div>
            </div>
            {propertiesReady ? <div aria-label={c("taskProperties")} className="task-detail-properties creation-heading-properties creation-reveal-content">
              <div className="task-detail-property"><small>{c("owner")}</small><MemberSelector avatarSize="sm" allowUnassigned disabled={disabled} hideHeader hideSelectedName label={c("owner")} max={1} memberRecommendations={memberRecommendations} members={members} min={0} onChange={selected => { const ownerId = selected[0] ?? ""; updateMain({ ...form.mainTask, ownerId, participantIds: form.mainTask.participantIds.filter(id => id !== ownerId) }); }} onInviteMembers={onInviteMembers} selected={form.mainTask.ownerId ? [form.mainTask.ownerId] : []} showInvitationStatus={false} showTriggerProfilePreview={false} /></div>
              <span aria-hidden="true" className="task-detail-property-separator" />
              <div className="task-detail-property"><small>{c("participants")}</small><MemberSelector avatarSize="sm" disabled={disabled} displayMax={4} hideHeader hideSelectedName label={c("participants")} memberRecommendations={memberRecommendations} members={members.filter(m => m.id !== form.mainTask.ownerId)} onChange={participantIds => updateMain({ ...form.mainTask, participantIds })} onInviteMembers={onInviteMembers} selected={form.mainTask.participantIds} showInvitationStatus={false} stacked /></div>
              <span aria-hidden="true" className="task-detail-property-separator" />
              <TaskDueDatePicker initialValue={form.mainTask.endDate} label={c("dueDate")} onChange={endDate => updateMain({ ...form.mainTask, endDate, startDate: "" })} />
              <span aria-hidden="true" className="task-detail-property-separator" />

            </div> : <TaskCreationSkeleton section="properties" />}
            {propertiesReady && deadlineNote && <details className="creation-deadline-note creation-reveal-content"><summary>{locale === "en" ? "AI suggested deadline" : "AI 建议截止"}<span>{locale === "en" ? "View basis" : "查看依据"}</span></summary><p>{deadlineNote}</p></details>}
          </header>
          {subtaskLoading && <section className="creation-subtasks creation-subtasks-cards" aria-label={c("subtaskPlan")}><header className="creation-subtasks-heading"><div><ListTodo size={19} /><h2>{c("subtasksLabel97")}</h2></div></header>{subtaskLoading}</section>}
          {!subtaskLoading && showSubtasks && form.subtasks.length > 0 && <section aria-label={c("subtaskPlan")} className="creation-subtasks creation-subtasks-cards">
            <header className="creation-subtasks-heading"><div><ListTodo size={19} /><h2>{c("subtasksLabel97")}</h2><span className="creation-count">{form.subtasks.length}</span>{nested && <small>{c("allLevelsSubtaskLevels", { v0: depth - 1 })}</small>}</div><div>{nested && <>
              <Button onClick={() => setCollapsed(new Set())} size="sm" type="button" variant="ghost">{c("expandAll")}</Button>
              <Button onClick={() => setCollapsed(new Set(form.subtasks.filter(task => form.subtasks.some(item => item.parentClientId === task.clientId)).map(task => task.clientId)))} size="sm" type="button" variant="ghost">{c("collapseAll")}</Button>
            </>}{onAiAdjust && <TaskAiAdjustButton disabled={disabled} label={c("askAiToAdjustSubtasks")} onClick={anchor => onAiAdjust({ kind: "subtasks" }, anchor)} />}</div></header>
            {nested ? <ul aria-label={c("subtaskHierarchy")} className="creation-task-tree">{form.subtasks.filter(task => !task.parentClientId).map(renderTask)}</ul> : <div className="creation-task-list">{form.subtasks.map(renderTask)}</div>}
          </section>}
        </fieldset>
  );
}
