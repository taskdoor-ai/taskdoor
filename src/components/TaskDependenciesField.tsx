import { useMockText } from "../i18n/MockDataProvider";
import { useI18n } from "../i18n/I18nProvider";
import { statusMessageKey } from "../i18n/taskStatus";
import { useGlobalUi } from "../i18n/globalUi";
import { useDetailCopy } from "../i18n/detailMessages";
import { useState } from "react";
import { Link2, Plus, X } from "lucide-react";
import type { TaskRelationSummary } from "./TaskRelationsSection";
import { getTaskDependencyIssue, sameTaskDependencies } from "../lib/taskDependencies";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type Props = {
  taskId: string;
  dependencyIds: string[];
  tasks: TaskRelationSummary[];
  onOpenTask?: (taskId: string) => void;
  onSave?: (ids: string[], expected: string[]) => void | Promise<void>;
};

export function TaskDependenciesField({ taskId, dependencyIds, tasks, onOpenTask, onSave }: Props) {
  const ui = useGlobalUi();
  const mock = useMockText();
  const { t } = useI18n();
  const title = (task: TaskRelationSummary) => mock.field(task.id, "title", task.title);
  const d = useDetailCopy();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [baseline, setBaseline] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const stale = open && !sameTaskDependencies(dependencyIds, baseline);
  const ids = [...new Set(dependencyIds)];
  const candidates = tasks.filter(task => task.id !== taskId && (!query.trim() || [task.title, title(task)].some(value => value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))));
  const missing = draft.filter(id => !tasks.some(task => task.id === id));
  const reload = () => { setDraft([...dependencyIds]); setBaseline([...dependencyIds]); setError(""); setQuery(""); };
  const save = async (values = draft, expected = baseline) => {
    if (!onSave || saving || stale) return;
    setSaving(true);
    setError("");
    try { await onSave(values, expected); setOpen(false); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "前置依赖未能保存，请重试。"); }
    finally { setSaving(false); }
  };
  if (!ids.length && !onSave) return null;
  return <section aria-label={d('dependencies')} className="task-dependencies-field">
    <div className="task-detail-field-label">{d('dependencies')}</div>
    <div className="task-dependencies-content">
      {ids.length > 0 && <div className="task-dependencies-chips">{ids.map((id, index) => {
        const task = tasks.find(task => task.id === id);
        return <div className="task-dependencies-chip" key={id}>{task ? <>
          <button aria-label={ui("打开前置任务：{0}", {0: title(task)})} disabled={!onOpenTask} onClick={() => onOpenTask?.(id)} type="button"><Link2 aria-hidden="true" size={13} /><span>{title(task)}</span></button>
          <TaskStatusBadge size="sm" value={task.status} />
        </> : <span>{ui("任务不可用 · 待核对")}</span>}
          {onSave && <button aria-label={ui("移除前置依赖：{0}", {0: task ? title(task) : ui("不可用任务 {0}", {0: index + 1})})} className="task-dependencies-remove" disabled={saving || open} onClick={() => void save(ids.filter(value => value !== id), dependencyIds)} title={d('removeDependency')} type="button"><X aria-hidden="true" size={12} /></button>}
        </div>;
      })}</div>}
      {onSave && <Popover open={open} onOpenChange={next => { if (saving) return; if (next) reload(); setOpen(next); }}>
        <PopoverTrigger aria-label={d('addDependencies')} className="task-dependencies-edit" type="button"><Plus aria-hidden="true" size={13} />{d('append')}</PopoverTrigger>
        <PopoverContent aria-label={d('editDependencies')} className="task-dependencies-popover">
          <header><strong>{d('dependencies')}</strong><p>{ui("仅作协作参考，可随时调整，不限制任务开始或完成。")}</p></header>
          <Input aria-label={ui("搜索前置任务")} disabled={saving} onChange={event => setQuery(event.target.value)} placeholder={ui("搜索当前团队任务…")} value={query} />
          <div aria-label={ui("可选前置任务")} className="task-dependencies-options" role="group">
            {missing.map((id, index) => <label key={id}><input aria-label={ui("移除不可用的前置依赖 {0}", {0: index + 1})} checked disabled={saving || stale} onChange={() => setDraft(values => values.filter(value => value !== id))} type="checkbox" /><span>{ui("任务不可用 · 待核对")}<small>{ui("取消勾选可移除此关联")}</small></span></label>)}
            {candidates.map(task => {
              const checked = draft.includes(task.id);
              const issue = checked ? undefined : getTaskDependencyIssue(tasks, taskId, task.id);
              return <label key={task.id}><input aria-label={ui("前置任务：{0}", {0: title(task)})} checked={checked} disabled={saving || stale || Boolean(issue)} onChange={() => setDraft(values => checked ? values.filter(id => id !== task.id) : [...values, task.id])} type="checkbox" /><span>{title(task)}<small>{issue ? ui(issue) : t(statusMessageKey[task.status])}</small></span></label>;
            })}
            {!candidates.length && <p>{query.trim() ? ui("没有匹配的任务") : ui("暂无可选前置任务")}</p>}
          </div>
          {stale && <p role="alert">{ui("前置依赖已更新，当前选择已保留。")}<Button disabled={saving} onClick={reload} size="sm" type="button" variant="ghost">{ui("载入最新依赖")}</Button></p>}
          {error && <p className="task-dependencies-error" role="alert">{ui(error)}</p>}
          <footer><Button disabled={saving || stale || !draft.length} onClick={() => setDraft([])} size="sm" type="button" variant="ghost">{ui("清空")}</Button><Button disabled={saving} onClick={() => setOpen(false)} size="sm" type="button" variant="ghost">{d('cancel')}</Button><Button disabled={saving || stale} onClick={() => void save()} size="sm" type="button">{saving ? ui("保存中…") : d('save')}</Button></footer>
        </PopoverContent>
      </Popover>}
      {!open && error && <p className="task-dependencies-error" role="alert">{ui(error)}</p>}
    </div>
  </section>;
}
