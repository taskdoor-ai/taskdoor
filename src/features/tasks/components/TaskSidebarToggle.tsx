import { useContext } from 'react';
import { PanelLeft } from 'lucide-react';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Button } from '@/shared/ui/button';
import { TaskSidebarContext } from '@/features/tasks/lib/task-sidebar-context';

export function TaskSidebarToggle() {
  const sidebar = useContext(TaskSidebarContext);
  const { locale } = useI18n();
  if (!sidebar?.collapsed) return null;
  const label = locale === 'en' ? 'Show task list' : '展开任务列表';
  return <span className="task-workspace-sidebar-toggle-wrap">
    <Button aria-label={label} aria-controls={sidebar.sidebarId} aria-expanded={!sidebar.collapsed} className="task-workspace-sidebar-toggle" onClick={sidebar.toggle} ref={sidebar.toggleRef} size="icon-sm" type="button" variant="ghost"><PanelLeft aria-hidden="true" strokeWidth={1.65} /></Button>
    <span aria-hidden="true" className="task-workspace-sidebar-tooltip" role="tooltip">{label}</span>
  </span>;
}
