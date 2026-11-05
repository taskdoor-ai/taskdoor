import { useState, useId, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useMockText } from '@/ai/mock/i18n/MockDataProvider';
import { useDetailCopy } from '@/shared/i18n/detail-messages';
import { criterionReview } from '@/features/tasks/lib/task-criterion-review';
import type { CriterionReview } from '@/shared/model/criterion-review';
import { TaskCriteriaEditor } from '@/features/tasks/components/TaskCriteriaEditor';
import { TaskCriterionIndicator } from '@/features/tasks/components/TaskCriterionIndicator';

type TaskCompletionCriteriaProps = {
  completed?: boolean;
  onTaskComplete?: (completed: boolean) => void;
  criteria?: string[];
  reviews?: CriterionReview[];
  source?: 'recorded' | 'example';
  label?: string;
  onSave?: (values: string[], expected: string[]) => void | Promise<void>;
  onConfirm?: (index: number, confirmed: boolean, expected: string[]) => void | Promise<void>;
};
export function TaskCompletionCriteria({ criteria = [], reviews = [], source = 'recorded', label, onSave, onConfirm, completed = false, onTaskComplete }: TaskCompletionCriteriaProps) {
  const [expanded, setExpanded] = useState(false);
  const { locale } = useI18n();
  const contentId = useId();
  const previewRef = useRef<HTMLOListElement>(null);
  const [preview, setPreview] = useState({ overflow: false, height: 0, visible: 0, fade: false });
  useLayoutEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    const measure = () => {
      const rows = Array.from(element.children) as HTMLElement[];
      if (!rows.length) return;
      const line = parseFloat(getComputedStyle(rows[0]).lineHeight) || 23;
      const budget = line * 4;
      const top = rows[0].getBoundingClientRect().top;
      const bottom = (row: HTMLElement) => row.getBoundingClientRect().bottom - top;
      const overflow = bottom(rows[rows.length - 1]) > budget + 1;
      const fitting = rows.filter(row => bottom(row) <= budget + 1);
      setPreview({ overflow, height: fitting.length ? bottom(fitting[fitting.length - 1]) : budget, visible: Math.max(1, fitting.length), fade: !fitting.length });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [criteria, locale]);
  const d = useDetailCopy();
  const mock = useMockText();
  const count = criteria.filter(value => value.trim()).length;
  const confirmed = criteria.filter((text, i) => criterionReview(text, reviews[i])?.confirmation).length;
  const renderMark = (index: number, value: string, canConfirm = false) => <TaskCriterionIndicator index={index} review={criterionReview(value, reviews[index])}
    onConfirm={canConfirm && onConfirm && value === criteria[index] && value.trim() ? async nextConfirmed => { await onConfirm(index, nextConfirmed, [...criteria]); const nextCount = confirmed + (nextConfirmed ? 1 : -1); if (nextConfirmed && count > 0 && nextCount === count) onTaskComplete?.(true); else if (!nextConfirmed && completed) onTaskComplete?.(false); } : undefined} />;
  return <section aria-label={d('criteria')} className="task-detail-completion criterion-review-list" data-source={source}>
    <div className="task-detail-field-label">
      {d('criteria')}

    </div>
    <div className="task-detail-completion-content" data-criteria-collapsed={preview.overflow && !expanded} >
      <ol ref={previewRef} className="criterion-height-preview" aria-hidden={onSave ? true : expanded || !preview.overflow} style={{ height: !onSave && preview.overflow && !expanded ? preview.height : 0, opacity: !onSave && preview.overflow && !expanded ? 1 : 0, pointerEvents: "none", maskImage: preview.fade && !expanded ? "linear-gradient(black 65%, transparent)" : undefined }}>
        {criteria.filter(text => text.trim()).map((text, index) => <li key={index} aria-hidden={index >= preview.visible}><span>{index + 1}</span><span>{mock.text(text)}</span></li>)}
      </ol>
      <div id={contentId} hidden={!onSave && preview.overflow && !expanded}>
      {onSave ? <TaskCriteriaEditor maxVisibleRows={preview.overflow && !expanded ? preview.visible : undefined} criteria={criteria} renderMark={renderMark} label={label ?? d('current')} onSave={onSave} variant="heading" /> : count ? <ol className="criterion-readonly-list">{criteria.map((text, index) => text.trim() && <li key={index}>{renderMark(index, text)}<span>{mock.text(text)}</span></li>)}</ol> : <p className="task-heading-empty">{d('noCriteria')}</p>}
      </div>
      {preview.overflow && <button type="button" className="task-criteria-expand" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(value => !value)}>{expanded ? (locale === "en" ? "Show less" : "收起") : (locale === "en" ? `Show all (${count})` : `展开全部（共 ${count} 条）`)}</button>}
    </div>
  </section>;
}
