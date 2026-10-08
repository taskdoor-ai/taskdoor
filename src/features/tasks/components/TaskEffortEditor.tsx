import { useI18n } from "../i18n/I18nProvider";
import { useGlobalUi } from "../i18n/globalUi";
import { useDetailCopy } from "../i18n/detailMessages";
import { formatEffortPersonDays, summarizeTaskEffort } from '../lib/taskEffort';
import type { EditableEffortTask, TaskEffortEdit } from '../lib/taskEffortEdits';
import { TaskEffortField } from './TaskEffortField';

/** Parent effort is read-only, including parents with just one leaf. */
export function TaskEffortEditor({tasks,hasSubtasks,label='任务',disabled=false,onChange,onDirtyChange}: {
  tasks: EditableEffortTask[]; hasSubtasks: boolean; label?: string; disabled?: boolean;
  onChange?: (edits: TaskEffortEdit[])=>void|Promise<void>;
  onDirtyChange?: (dirty:boolean)=>void;
}) {
  const { locale } = useI18n();
  const ui = useGlobalUi();
  const d = useDetailCopy();
  if (!hasSubtasks && tasks.length===1) return <TaskEffortField task={tasks[0]} label={label} disabled={disabled} onDirtyChange={onDirtyChange}
    onChange={onChange ? (estimate,expectedSignature)=>onChange([{taskId:tasks[0].id,estimate,expectedSignature}]) : undefined}/>;
  const total=summarizeTaskEffort(tasks);
  const value=total.totalMinutes!==null ? formatEffortPersonDays(total.totalMinutes, locale)
    : total.estimatedCount ? ui("已估部分 {0}", {0: formatEffortPersonDays(total.knownMinutes, locale)}) : d('notEstimated');
  return <div className="task-effort-field task-effort-total-editor">
    <span className="task-effort-field-label">{d('effort')}</span>
    <div aria-label={ui("{0}预计投入", {0: label})} className="task-effort-aggregate" role="group">
      <span>{value}</span>
      <small>{d('subtaskTotal')}{total.totalMinutes===null ? ui(" · 待补全") : ''}</small>
    </div>
  </div>;
}
