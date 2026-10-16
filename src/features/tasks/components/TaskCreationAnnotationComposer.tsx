import { useEffect, useId, useRef } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/input";
import { Popover, PopoverContent } from "@/shared/ui/popover";
import { creationAnnotationLabels, getCreationAnnotationValue, isCreationAnnotationStale, type TaskCreationAnnotation, type TaskCreationAnnotationTarget } from "@/features/tasks/lib/task-creation-annotations";
import type { TaskAiAdjustmentContext } from "@/features/tasks/lib/task-ai-adjustment-types";

type Props = {
  context: TaskAiAdjustmentContext;
  target: TaskCreationAnnotationTarget;
  annotation?: TaskCreationAnnotation;
  anchor: HTMLElement | null;
  instruction: string;
  onInstructionChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export function TaskCreationAnnotationComposer({ context, target, annotation, anchor, instruction, onInstructionChange, onSave, onClose }: Props) {
  const { locale } = useI18n();
  const en = locale === "en";
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const current = getCreationAnnotationValue(context, target);
  const field = creationAnnotationLabels[target.field][en ? "en" : "zh"];
  const label = `${field}${target.criterionIndex === undefined ? "" : ` ${target.criterionIndex + 1}`}`;
  const stale = annotation && isCreationAnnotationStale(context, annotation);
  const taskTitle = [context.task, ...context.subtasks].find(task => task.id === target.taskId)?.title || (en ? "Untitled task" : "未命名任务");
  const canSubmit = Boolean(current && instruction.trim());
  const save = () => { if (canSubmit) onSave(); };
  const placeholders = {
    task: en ? "Describe what you would like to change in this task…" : "写下你想怎样调整这张任务卡…",
    title: en ? "For example: Change to Prepare the launch plan" : "例如：改为准备新品发布方案",
    goal: en ? "For example: Change to Deliver the approved launch plan" : "例如：改为形成可执行、已确认的新品发布方案",
    completionCriteria: en ? "Describe the revised criterion, or ask to refine it" : "例如：改为方案经负责人确认并归档；也可以写“优化完成标准”",
    ownerId: en ? "For example: Change to a team member's exact name" : "例如：改为林洁，或改为待定",
    participantIds: en ? "For example: Change to exact member names, separated by commas" : "例如：改为林洁、周明；移除全部可写“改为无”",
    endDate: en ? "For example: Change to 2026-11-01" : "例如：改为2026-11-01，或改为待定",
  };
  useEffect(() => {
    const frame = requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [target.taskId, target.field, target.criterionIndex]);
  return <Popover open onOpenChange={open => { if (!open) onClose(); }} modal={false}>
    <PopoverContent anchor={anchor} initialFocus={input} finalFocus={() => anchor?.isConnected ? anchor : false} align="end" sideOffset={8} collisionPadding={12} aria-label={en ? `Annotation on ${label}` : `标注：${label}`} className="creation-annotation-composer" data-annotation-overlay>
      <header><div><MessageSquarePlus aria-hidden="true" size={16} /><strong>{target.field === "task" ? en ? "Annotation" : "标注" : label}</strong></div><Button aria-label={en ? "Close annotation editor" : "收起标注"} onClick={onClose} size="icon-sm" type="button" variant="ghost"><X aria-hidden="true" size={15} /></Button></header>
      <p className="creation-annotation-task-name">{taskTitle}</p>
      {(!current || stale) && <p className="creation-annotation-warning" role="status">{!current ? en ? "This item is unavailable. Remove this annotation from the conversation." : "这处内容已不可用，请从对话中移除这条标注。" : en ? "The original changed. Saving attaches your annotation to the current content above." : "原文已变化，保存后会以当前这处内容为准。"}</p>}
      <form onSubmit={event => { event.preventDefault(); save(); }}>
        <label className="sr-only" htmlFor={id}>{en ? "Annotation" : "标注"}</label>
        <Textarea id={id} onChange={event => onInstructionChange(event.target.value)} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); save(); } }} placeholder={placeholders[target.field]} ref={input} rows={3} value={instruction} />
        <footer><span>{en ? "Review the list before sending" : "先汇总，核对后再发给 AI"}</span><Button disabled={!canSubmit} size="sm" type="submit">{en ? "Save annotation" : "保存标注"}</Button></footer>
      </form>
    </PopoverContent>
  </Popover>;
}
