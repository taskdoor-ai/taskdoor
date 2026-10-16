import { useEffect, useRef, useState } from "react";
import { ChevronDown, MessageSquareText, Pencil, Trash2 } from "lucide-react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { isCreationAnnotationStale, type TaskCreationAnnotation } from "@/features/tasks/lib/task-creation-annotations";
import type { TaskAiAdjustmentContext } from "@/features/tasks/lib/task-ai-adjustment-types";

import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

type Props = {
  annotations: TaskCreationAnnotation[];
  context?: TaskAiAdjustmentContext;
  disabled?: boolean;
  sent?: boolean;
  onEdit?: (annotation: TaskCreationAnnotation, anchor: HTMLElement) => void;
  onRemove?: (id: string) => void;
  onContinue?: () => void;
  reviewing?: boolean;
};

export function TaskCreationAnnotationBucket({ annotations, context, disabled = false, sent = false, onEdit, onRemove, onContinue, reviewing = false }: Props) {
  const { locale } = useI18n();
  const en = locale === "en";
  const [expanded, setExpanded] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(true);
  useEffect(() => { if (reviewing) setExpanded(false); }, [reviewing]);
  const closeForNavigation = () => { restoreFocus.current = false; setExpanded(false); };
  if (!annotations.length) return null;
  const stale = Boolean(context && annotations.some(annotation => isCreationAnnotationStale(context, annotation)));
  return <Popover modal={false} open={expanded} onOpenChange={open => { if (open) restoreFocus.current = true; setExpanded(open); }}>
    <PopoverTrigger aria-expanded={expanded} className={`creation-annotation-chip${stale ? " is-stale" : ""}`} ref={trigger} type="button"><MessageSquareText aria-hidden="true" size={14} /><strong>{en ? `${annotations.length} annotations` : `${annotations.length} 条标注`}</strong>{stale && <span aria-label={en ? "Content changed" : "内容已变化"}>!</span>}<ChevronDown aria-hidden="true" className={expanded ? "is-expanded" : ""} size={13} /></PopoverTrigger>
    <PopoverContent align={sent ? "end" : "start"} aria-label={sent ? en ? "Sent annotations" : "已发送的标注" : en ? "Collected annotations" : "已收集的标注"} className="creation-annotation-bucket" collisionPadding={12} finalFocus={() => restoreFocus.current && trigger.current?.isConnected ? trigger.current : false} initialFocus={false} side="top" sideOffset={8}>
    {onContinue && <header><strong>{en ? "Annotations" : "标注"}</strong><button disabled={disabled} onClick={() => { closeForNavigation(); onContinue(); }} type="button">{en ? "Add more" : "继续标注"}</button></header>}
    <ol>{annotations.map(annotation => {
      const stale = context && isCreationAnnotationStale(context, annotation);
      return <li className={stale ? "is-stale" : ""} key={annotation.id}>
        <div className="creation-annotation-bucket-item-content">
        <div className="creation-annotation-bucket-copy"><strong>{annotation.taskTitle || (en ? "Untitled task" : "未命名任务")}</strong><p>{annotation.instruction}</p></div>
        {(onEdit || onRemove) && <div className="creation-annotation-bucket-actions">{onEdit && <button aria-label={en ? `Edit annotation on ${annotation.taskTitle}` : `编辑${annotation.taskTitle}的标注`} disabled={disabled} onClick={event => { closeForNavigation(); onEdit(annotation, event.currentTarget); }} type="button"><Pencil aria-hidden="true" size={14} /></button>}{onRemove && <button aria-label={en ? `Delete annotation on ${annotation.taskTitle}` : `删除${annotation.taskTitle}的标注`} disabled={disabled} onClick={() => { setExpanded(false); onRemove(annotation.id); }} type="button"><Trash2 aria-hidden="true" size={14} /></button>}</div>}
        </div>
        {stale && <small role="status">{en ? "Original changed or unavailable. Review or remove this annotation." : "原文已变化或不可用，请编辑核对或删除这条标注。"}</small>}
      </li>;
    })}</ol>
    </PopoverContent>
  </Popover>;
}
