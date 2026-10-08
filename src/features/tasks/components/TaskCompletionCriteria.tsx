import { useMockText } from '../i18n/MockDataProvider';
import { useDetailCopy } from '../i18n/detailMessages';
import { useGlobalUi } from '../i18n/globalUi';
import { criterionReview, type CriterionReview } from '../lib/taskCriterionReview';
import { TaskCriteriaEditor } from './TaskCriteriaEditor';
import { TaskCriterionIndicator } from './TaskCriterionIndicator';

type TaskCompletionCriteriaProps = {
  criteria?: string[];
  reviews?: CriterionReview[];
  source?: 'recorded' | 'example';
  label?: string;
  onSave?: (values: string[], expected: string[]) => void | Promise<void>;
  onConfirm?: (index: number, confirmed: boolean, expected: string[]) => void | Promise<void>;
};
export function TaskCompletionCriteria({ criteria = [], reviews = [], source = 'recorded', label, onSave, onConfirm }: TaskCompletionCriteriaProps) {
  const d = useDetailCopy();
  const ui = useGlobalUi();
  const mock = useMockText();
  const count = criteria.filter(value => value.trim()).length;
  const confirmed = criteria.filter((text, i) => criterionReview(text, reviews[i])?.confirmation).length;
  const renderMark = (index: number, value: string, canConfirm = false) => <TaskCriterionIndicator index={index} review={criterionReview(value, reviews[index])}
    onConfirm={canConfirm && onConfirm && value === criteria[index] && value.trim() ? confirmed => onConfirm(index, confirmed, [...criteria]) : undefined} />;
  return <section aria-label={d('criteria')} className="task-detail-completion criterion-review-list" data-source={source}>
    <div className="task-detail-field-label">{d('criteria')}{count > 0 && <small className="criterion-summary" aria-live="polite">{ui('{done} / {total} 已确认', { done: confirmed, total: count })}</small>}</div>
    <div className="task-detail-completion-content">
      {onSave ? <TaskCriteriaEditor criteria={criteria} renderMark={renderMark} label={label ?? d('current')} onSave={onSave} variant="heading" /> : count ? <ol className="criterion-readonly-list">{criteria.map((text, index) => text.trim() && <li key={index}>{renderMark(index, text)}<span>{mock.text(text)}</span></li>)}</ol> : <p className="task-heading-empty">{d('noCriteria')}</p>}
    </div>
  </section>;
}
