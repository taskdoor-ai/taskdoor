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
    <div className="task-detail-completion-content">
      {onSave ? <TaskCriteriaEditor criteria={criteria} renderMark={renderMark} label={label ?? d('current')} onSave={onSave} variant="heading" /> : count ? <ol className="criterion-readonly-list">{criteria.map((text, index) => text.trim() && <li key={index}>{renderMark(index, text)}<span>{mock.text(text)}</span></li>)}</ol> : <p className="task-heading-empty">{d('noCriteria')}</p>}
    </div>
  </section>;
}
