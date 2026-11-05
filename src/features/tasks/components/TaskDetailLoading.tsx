import { useI18n } from "@/shared/i18n/I18nProvider";
import { Button } from "@/shared/ui/button";

/** Mirrors the detail layout while generated fields are still unavailable. */
export function TaskDetailLoading({ onCancel }: { onCancel?: () => void }) {
  const { locale } = useI18n();
  const en = locale === "en";
  return <div className="task-detail-loading" aria-busy="true">
    <span className="sr-only" role="status">{en ? "Loading task details" : "正在加载任务详情"}</span>
    <div className="task-detail-loading-main">
      <div className="task-detail-loading-heading"><span aria-hidden="true" className="task-loading-circle" /><span aria-hidden="true" className="task-loading-bar task-loading-title" />{onCancel && <Button className="task-detail-loading-cancel" onClick={onCancel} size="sm" type="button" variant="ghost">{en ? "Cancel" : "取消"}</Button>}</div>
      <div aria-hidden="true" className="task-detail-loading-definition">
        <span>{en ? "Goal" : "目标"}</span><span className="task-loading-bar" />
        <span>{en ? "Completion criteria" : "完成标准"}</span>
        <div className="task-detail-loading-criteria">{[1, 2, 3].map(number => <div key={number}><span className="task-loading-circle" /><span className="task-loading-bar" /></div>)}</div>
      </div>
      <div aria-hidden="true" className="task-detail-loading-tabs">{(en ? ["Discussion", "Files", "Subtasks", "Activity", "Analysis"] : ["讨论", "文件", "子任务", "活动", "分析"]).map((tab, index) => <span key={tab} data-active={index === 0 || undefined}>{tab}</span>)}</div>
      <div aria-hidden="true" className="task-detail-loading-compose"><span className="task-loading-bar" /><span className="task-loading-bar" /></div>
    </div>
    <div className="task-detail-loading-properties" aria-hidden="true">
      {(en ? ["Status", "Assignee", "Collaborators", "Due date", "Tags"] : ["状态", "负责", "参与", "截止时间", "标签"]).map(label => <div key={label}><span>{label}</span><span className="task-loading-bar" /></div>)}
    </div>
  </div>;
}
