import { mockPersonName } from "../i18n/mockContent";
import { useCreationI18n } from "../i18n/creationMessages";
import { Plus, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { findTagByName, type TagDefinition } from "../data/tagGroups";
import type { TaskIconName, TaskIconTone } from "../data/workspaceNodes";
import { hasValidCreationDependencies, type CreationForm, type CreationTask } from "../lib/taskCreationForm";
import { createTaskMemberRecommendations } from "../lib/taskMemberRecommendations";
import { MemberSelector, type Member } from "./MemberSelector";
import { PersonAvatar } from "./PersonAvatar";
import { TagPicker } from "./TagPicker";
import { TagBadge } from "./TagBadge";
import { TaskAiAdjustButton } from "./TaskAiAdjustmentPopover";
import { TaskDetailFields } from "./TaskDetailFields";
import { TaskEffortField } from "./TaskEffortField";
import { TaskEffortEditor } from "./TaskEffortEditor";
import { getCreationBranchLeaves } from "../lib/taskCreationHierarchy";
import { TaskDueDatePicker } from "./TaskDueDatePicker";
import { TaskIcon } from "./TaskIcon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type Props = {
  task: CreationTask;
  form: CreationForm;
  index: number;
  members: Member[];
  tags: TagDefinition[];
  iconName: TaskIconName;
  tone: TaskIconTone;
  disabled?: boolean;
  childCount?: number;
  hierarchical?: boolean;
  branchControl?: ReactNode;
  descendantCount?: number;
  onChange: (edited: CreationTask, expected: CreationTask) => CreationTask;
  onRemove: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onAiAdjust?: (anchor?: HTMLElement | null) => void;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
};

function DependencyEditor({ form, task, label, disabled, onChange }: { form: CreationForm; task: CreationTask; label: string; disabled: boolean; onChange: (task: CreationTask) => void }) {
  const { c, locale, localize } = useCreationI18n();
  return <Popover><PopoverTrigger aria-label={c("addAPrerequisiteFor", { v0: label })} className="creation-dep-edit" disabled={disabled} type="button"><Plus aria-hidden="true" size={14} />{c("add")}</PopoverTrigger>
    <PopoverContent aria-label={c("choosePrerequisites")} className="creation-dependency-menu">
      <strong>{c("prerequisites")}</strong><p>{c("addADependencyOnlyWhenThisTask")}</p>
      {form.subtasks.filter(item => item.clientId !== task.clientId).map(candidate => {
        const selected = task.dependsOnClientIds.includes(candidate.clientId);
        const next = selected ? task.dependsOnClientIds.filter(id => id !== candidate.clientId) : [...task.dependsOnClientIds, candidate.clientId];
        const blocked = !selected && !hasValidCreationDependencies(form.subtasks.map(item => item.clientId === task.clientId ? { ...task, dependsOnClientIds: next } : item));
        return <label className="creation-dependency-option" key={candidate.clientId}>
          <input checked={selected} disabled={disabled || blocked} onChange={() => onChange({ ...task, dependsOnClientIds: next })} type="checkbox" />
          <span>{candidate.title || c("untitledTask")}{blocked && <small>{c("wouldCreateADependencyCycle")}</small>}</span>
        </label>;
      })}
      {form.subtasks.length < 2 && <p>{c("addAnotherSubtaskToSelectItHere")}</p>}
    </PopoverContent>
  </Popover>;
}

export function TaskCreationSubtaskEditor({ task, form, index, members, tags, iconName, tone, disabled = false, childCount = 0, hierarchical = false, branchControl, descendantCount = 0, onChange, onRemove, onDirtyChange, onAiAdjust, onInviteMembers }: Props) {
  const { c, locale, localize } = useCreationI18n();
  const [open, setOpen] = useState(false);
  const [effortDirty, setEffortDirty] = useState(false);
  const [draft, setDraft] = useState(() => structuredClone(task));
  const matchTask = open ? draft : task;
  const memberRecommendations = useMemo(() => createTaskMemberRecommendations({
    members,
    taskText: [matchTask.title, ...matchTask.completionCriteria, ...matchTask.labels].join(" "),
  }), [members, matchTask.title, matchTask.completionCriteria, matchTask.labels]);
  const [baseline, setBaseline] = useState(() => structuredClone(task));
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const dirtyCallback = useRef(onDirtyChange);
  dirtyCallback.current = onDirtyChange;
  const label = c("subtask", { v0: index + 1 });
  const owner = members.find(member => member.id === task.ownerId);
  const ownerName = owner ? mockPersonName(locale, owner.id, owner.name) : (task.ownerId ? c("memberUnavailable") : c("unassigned"));
  const signature = JSON.stringify(task);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const stale = signature !== JSON.stringify(baseline);

  useEffect(() => {
    if (!dirty && stale) { setDraft(structuredClone(task)); setBaseline(structuredClone(task)); }
  }, [signature, dirty, stale]);
  useEffect(() => { dirtyCallback.current(dirty || effortDirty); }, [dirty, effortDirty]);
  useEffect(() => () => dirtyCallback.current(false), []);

  const reload = () => { setDraft(structuredClone(task)); setBaseline(structuredClone(task)); setError(""); };
  const change = (next: CreationTask) => {
    if (disabled) return;
    setDraft(next);
    setError("");
    try {
      const accepted = onChange(next, baseline);
      setDraft(structuredClone(accepted));
      setBaseline(structuredClone(accepted));
    } catch (caught) { setError(caught instanceof Error ? caught.message : c("changesCouldNotBeSyncedYourInput")); }
  };

  const taskIcon = <TaskIcon iconName={iconName} size="lg" tone={tone} />;
  return <article aria-label={label} className={`task-detail-hero-card creation-task-row creation-subtask-card ${open ? "is-expanded" : disabled ? "" : "is-expandable"}`} data-tone={tone} id={`creation-subtask-${task.clientId}`} onClick={event => {
    if (open || disabled || event.defaultPrevented) return;
    if (!(event.target instanceof Element) || event.target.closest('button, a, input, textarea, select, [role="button"], [role="combobox"], [contenteditable="true"]')) return;
    trigger.current?.focus({ preventScroll: true });
    trigger.current?.click();
  }}>
    <Accordion collapsible type="single" value={open ? "task" : ""} onValueChange={value => {
      if (value && !dirty) reload();
      setOpen(Boolean(value));
    }}>
      <AccordionItem value="task">
        <div className="creation-task-summary">
          {!open && <>
            {taskIcon}
            <div className="creation-task-copy">
              <strong className="creation-child-title">{task.title || c("untitledSubtask")}</strong>
            </div>
            <div className="creation-row-owner"><span className="creation-owner-identity" title={c("ownerLabel", { v0: ownerName })}>
              {owner ? <PersonAvatar name={owner.name} profile={owner} profilePreviewFocusable={false} showProfilePreview={false} size="xs" /> : <span aria-hidden="true" className="creation-owner-empty"><UserRound size={14} /></span>}
              <span>{ownerName}</span>
            </span></div>
          </>}
          <div className="creation-subtask-header-actions">
            {branchControl}
            {open && onAiAdjust && <TaskAiAdjustButton disabled={disabled || dirty || stale} label={c("askAiToAdjust", { v0: label })} onClick={() => onAiAdjust(trigger.current)} />}
            <AccordionTrigger aria-label={c("fullDetailsOf", { v0: open ? c("collapse") : c("expand"), v1: label })} className="creation-row-expand" disabled={disabled} ref={trigger}>{open ? hierarchical ? c("collapseDetails") : c("collapse") : hierarchical ? c("details") : c("expand")}</AccordionTrigger>
          </div>
        </div>
        <AccordionContent className="creation-subtask-details">
          <div className="task-detail-heading-main">
            <div className="task-detail-heading-copy">
              <TaskDetailFields disabled={disabled} icon={taskIcon} labels={{ name: c("name", { v0: label }), criteria: c("completionCriteria", { v0: label }) }}
                onChange={patch => change({ ...draft, ...patch })} showExecutionTips value={draft} variant="heading"
                description={{ label: c("goal"), inputLabel: c("goalLabel", { v0: label }), value: draft.goal, onChange: goal => change({ ...draft, goal }) }}
                dependencies={<section aria-label={c("prerequisitesLabel", { v0: label })} className="creation-subtask-dependency-field"><span className="task-detail-field-label">{c("prerequisites")}</span><div className="creation-subtask-dependencies">{draft.dependsOnClientIds.map(id => {
                  const name = form.subtasks.find(item => item.clientId === id)?.title || c("taskNoLongerExists");
                  return <span key={id}>{name}<button aria-label={c("removePrerequisite", { v0: name })} disabled={disabled} onClick={() => change({ ...draft, dependsOnClientIds: draft.dependsOnClientIds.filter(item => item !== id) })} type="button"><X size={12} /></button></span>;
                })}<DependencyEditor disabled={disabled} form={form} label={label} onChange={change} task={draft} /></div></section>}
              />
            </div>
          </div>
          <div aria-label={c("properties", { v0: label })} className="task-detail-properties creation-subtask-metadata">
            <div className="task-detail-property creation-subtask-owner"><small>{c("owner")}</small><MemberSelector allowUnassigned disabled={disabled} hideHeader hideSelectedName label={c("ownerLabel130", { v0: label })} max={1} memberRecommendations={memberRecommendations} members={members} min={0} onChange={selected => { const ownerId = selected[0] ?? ""; change({ ...draft, ownerId, participantIds: draft.participantIds.filter(id => id !== ownerId) }); }} onInviteMembers={onInviteMembers} selected={draft.ownerId ? [draft.ownerId] : []} showInvitationStatus={false} showTriggerProfilePreview={false} /></div>
            <span aria-hidden="true" className="task-detail-property-separator" />
            <div className="task-detail-property creation-subtask-participants"><small>{c("participants")}</small><MemberSelector disabled={disabled} displayMax={4} hideHeader hideSelectedName label={c("participantsLabel", { v0: label })} memberRecommendations={memberRecommendations} members={members.filter(member => member.id !== draft.ownerId)} onChange={participantIds => change({ ...draft, participantIds })} onInviteMembers={onInviteMembers} selected={draft.participantIds} showInvitationStatus={false} stacked /></div>
            <span aria-hidden="true" className="task-detail-property-separator" />
            <TaskDueDatePicker initialValue={draft.endDate} label={c("dueDate")} onChange={endDate => change({ ...draft, startDate: "", endDate })} />
            <span aria-hidden="true" className="task-detail-property-separator" />
            <div aria-label={c("tagsLabel", { v0: label })} className="task-detail-title-tags"><small className="creation-property-label">{c("tags")}</small>{draft.labels.map(name => <TagBadge key={name} onRemove={disabled ? undefined : () => change({ ...draft, labels: draft.labels.filter(item => item !== name) })} size="sm" tag={findTagByName(tags, name) ?? { id: name, name, color: "gray", icon: "tag" }} />)}<TagPicker onChange={labels => change({ ...draft, labels })} selected={draft.labels} tags={tags} /></div>
            <div className="creation-subtask-planning">
              {childCount > 0 ? <TaskEffortEditor hasSubtasks tasks={getCreationBranchLeaves(form, task.clientId).map(item => ({ ...item, id: item.clientId }))} label={label} /> : <TaskEffortField task={draft} label={label} disabled={disabled} onDirtyChange={setEffortDirty} onChange={estimate => {
                if (disabled) throw new Error(c("thisPlanCannotBeEditedRightNowLabel"));
                const accepted = onChange({ ...draft, effortEstimate: estimate }, baseline);
                setDraft(structuredClone(accepted)); setBaseline(structuredClone(accepted)); setError("");
              }} />}
            </div>
          </div>
          {stale && <div className="creation-subtask-error" role="alert">{c("thisSubtaskWasUpdatedElsewhereYourInput")}<Button onClick={reload} size="sm" type="button" variant="ghost">{c("discardInputAndLoadTheLatestSubtask")}</Button></div>}
          {error && !stale && <div className="creation-subtask-error" role="alert">{localize(error)}<Button disabled={disabled} onClick={() => change(draft)} size="sm" type="button" variant="ghost">{c("retrySync")}</Button></div>}
          <footer className="creation-subtask-actions"><Button disabled={disabled || dirty} onClick={onRemove} size="sm" type="button" variant="ghost"><Trash2 size={14} />{descendantCount ? c("removeThisTaskAndDescendants", { v0: descendantCount }) : c("removeSubtask")}</Button></footer>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
    {!open && dirty && <p className="creation-subtask-notice" role="status">{c("someChangesCouldNotBeSyncedExpand")}</p>}
  </article>;
}
