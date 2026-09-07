import { GitBranch, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { TaskEffortCost } from "./TaskEffortCost";
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
  onChange: (edited: CreationTask, expected: CreationTask) => CreationTask;
  onRemove: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onAiAdjust?: (anchor?: HTMLElement | null) => void;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
};

function DependencyEditor({ form, task, label, disabled, onChange }: { form: CreationForm; task: CreationTask; label: string; disabled: boolean; onChange: (task: CreationTask) => void }) {
  return <Popover><PopoverTrigger aria-label={`编辑${label}前置依赖`} className="creation-dep-edit" disabled={disabled} type="button"><GitBranch size={14} />编辑</PopoverTrigger>
    <PopoverContent aria-label="选择前置依赖" className="creation-dependency-menu">
      <strong>前置依赖</strong><p>只有确实需要前项产出时，才建立依赖。</p>
      {form.subtasks.filter(item => item.clientId !== task.clientId).map(candidate => {
        const selected = task.dependsOnClientIds.includes(candidate.clientId);
        const next = selected ? task.dependsOnClientIds.filter(id => id !== candidate.clientId) : [...task.dependsOnClientIds, candidate.clientId];
        const blocked = !selected && !hasValidCreationDependencies(form.subtasks.map(item => item.clientId === task.clientId ? { ...task, dependsOnClientIds: next } : item));
        return <label className="creation-dependency-option" key={candidate.clientId}>
          <input checked={selected} disabled={disabled || blocked} onChange={() => onChange({ ...task, dependsOnClientIds: next })} type="checkbox" />
          <span>{candidate.title || "未命名任务"}{blocked && <small>会形成循环依赖</small>}</span>
        </label>;
      })}
      {form.subtasks.length < 2 && <p>添加其他子任务后，可在这里选择。</p>}
    </PopoverContent>
  </Popover>;
}

export function TaskCreationSubtaskEditor({ task, form, index, members, tags, iconName, tone, disabled = false, onChange, onRemove, onDirtyChange, onAiAdjust, onInviteMembers }: Props) {
  const [open, setOpen] = useState(false);
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
  const label = `子任务 ${index + 1}`;
  const owner = members.find(member => member.id === task.ownerId);
  const ownerName = owner?.name ?? (task.ownerId ? "成员不可用" : "暂不分配");
  const signature = JSON.stringify(task);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const stale = signature !== JSON.stringify(baseline);

  useEffect(() => {
    if (!dirty && stale) { setDraft(structuredClone(task)); setBaseline(structuredClone(task)); }
  }, [signature, dirty, stale]);
  useEffect(() => { dirtyCallback.current(dirty); }, [dirty]);
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
    } catch (caught) { setError(caught instanceof Error ? caught.message : "修改未能同步，输入已保留，请重试。"); }
  };
  const revealDependency = (clientId: string) => {
    const button = document.getElementById(`creation-subtask-${clientId}`)?.querySelector<HTMLButtonElement>(".creation-row-expand");
    if (button?.getAttribute("aria-expanded") === "false") button.click();
    button?.focus();
  };

  return <article aria-label={label} className={`task-detail-hero-card creation-task-row creation-subtask-card ${open ? "is-expanded" : ""}`} data-tone={tone} id={`creation-subtask-${task.clientId}`}>
    <Accordion collapsible type="single" value={open ? "task" : ""} onValueChange={value => {
      if (value && !dirty) reload();
      setOpen(Boolean(value));
    }}>
      <AccordionItem value="task">
        <div className="creation-task-summary">
          {!open && <>
            <TaskIcon iconName={iconName} size="lg" tone={tone} />
            <div className="creation-task-copy">
              <strong className="creation-child-title">{task.title || "未命名子任务"}</strong>
            </div>
            <div className="creation-row-owner"><span className="creation-owner-identity" title={`负责人：${ownerName}`}>
              {owner ? <PersonAvatar name={owner.name} profile={owner} profilePreviewFocusable={false} showProfilePreview={false} size="xs" /> : <span aria-hidden="true" className="creation-owner-empty"><UserRound size={14} /></span>}
              <span>{ownerName}</span>
            </span></div>
          </>}
          <div className="creation-subtask-header-actions">
            {open && onAiAdjust && <TaskAiAdjustButton disabled={disabled || dirty || stale} label={`AI 帮你改${label}`} onClick={() => onAiAdjust(trigger.current)} />}
            <AccordionTrigger aria-label={`${open ? "收起" : "展开"}${label}完整信息`} className="creation-row-expand" disabled={disabled} ref={trigger}>{open ? "收起" : "展开"}</AccordionTrigger>
          </div>
          {!open && task.dependsOnClientIds.length > 0 && <div className="creation-dependencies"><span className="creation-dependencies-label"><GitBranch size={13} />前置依赖</span><div>{task.dependsOnClientIds.map(id => {
            const target = form.subtasks.find(item => item.clientId === id);
            return target && <button key={id} onClick={() => revealDependency(id)} type="button">{target.title || "未命名任务"}</button>;
          })}</div></div>}
        </div>
        <AccordionContent className="creation-subtask-details">
          <div className="task-detail-heading-main">
            <div className="task-detail-heading-copy">
              <TaskDetailFields disabled={disabled} icon={<TaskIcon iconName={iconName} size="lg" tone={tone} />} labels={{ name: `${label} 名称`, criteria: `${label} 完成标准` }}
                onChange={patch => change({ ...draft, ...patch })} showExecutionTips value={draft} variant="heading"
                dependencies={<section aria-label={`${label}前置依赖`} className="creation-subtask-dependency-field"><span className="task-detail-field-label">前置依赖</span><div className="creation-subtask-dependencies">{draft.dependsOnClientIds.length ? draft.dependsOnClientIds.map(id => {
                  const name = form.subtasks.find(item => item.clientId === id)?.title || "任务已不存在";
                  return <span key={id}>{name}<button aria-label={`移除前置依赖：${name}`} disabled={disabled} onClick={() => change({ ...draft, dependsOnClientIds: draft.dependsOnClientIds.filter(item => item !== id) })} type="button"><X size={12} /></button></span>;
                }) : <small>无</small>}<DependencyEditor disabled={disabled} form={form} label={label} onChange={change} task={draft} /></div></section>}
              />
            </div>
          </div>
          <div aria-label={`${label}属性`} className="task-detail-properties creation-subtask-metadata">
            <div className="task-detail-property creation-subtask-owner"><small>负责人</small><MemberSelector allowUnassigned disabled={disabled} hideHeader hideSelectedName label={`${label}负责人`} max={1} memberRecommendations={memberRecommendations} members={members} min={0} onChange={selected => { const ownerId = selected[0] ?? ""; change({ ...draft, ownerId, participantIds: draft.participantIds.filter(id => id !== ownerId) }); }} onInviteMembers={onInviteMembers} selected={draft.ownerId ? [draft.ownerId] : []} showInvitationStatus={false} showTriggerProfilePreview={false} /></div>
            <span aria-hidden="true" className="task-detail-property-separator" />
            <TaskDueDatePicker initialValue={draft.endDate} label="截止时间" onChange={endDate => change({ ...draft, startDate: "", endDate })} />
            <span aria-hidden="true" className="task-detail-property-separator" />
            <div aria-label={`${label}标签`} className="task-detail-title-tags">{draft.labels.map(name => <TagBadge key={name} onRemove={disabled ? undefined : () => change({ ...draft, labels: draft.labels.filter(item => item !== name) })} size="sm" tag={findTagByName(tags, name) ?? { id: name, name, color: "gray", icon: "tag" }} />)}<TagPicker onChange={labels => change({ ...draft, labels })} selected={draft.labels} tags={tags} /></div>
            <div className="creation-subtask-planning">
              <TaskEffortCost mode="creation" showDistribution={false} tasks={[{ ...draft, goal: form.mainTask.goal }]} />
            </div>
          </div>
          {stale && <div className="creation-subtask-error" role="alert">子任务已被其他操作更新，当前输入已保留，请核对最新内容。<Button onClick={reload} size="sm" type="button" variant="ghost">放弃当前输入，载入最新子任务</Button></div>}
          {error && !stale && <div className="creation-subtask-error" role="alert">{error}<Button disabled={disabled} onClick={() => change(draft)} size="sm" type="button" variant="ghost">重试同步</Button></div>}
          <footer className="creation-subtask-actions"><Button disabled={disabled || dirty} onClick={onRemove} size="sm" type="button" variant="ghost"><Trash2 size={14} />移除子任务</Button></footer>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
    {!open && dirty && <p className="creation-subtask-notice" role="status">有未能同步的修改，请展开核对。</p>}
  </article>;
}
