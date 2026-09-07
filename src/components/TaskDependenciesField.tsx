import { useState } from "react";
import { Link2, Plus } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [baseline, setBaseline] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const stale = open && !sameTaskDependencies(dependencyIds, baseline);
  const ids = [...new Set(dependencyIds)];
  const candidates = tasks.filter(task => task.id !== taskId && (!query.trim() || task.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const missing = draft.filter(id => !tasks.some(task => task.id === id));
  const reload = () => { setDraft([...dependencyIds]); setBaseline([...dependencyIds]); setError(""); setQuery(""); };
  const save = async () => {
    if (!onSave || saving || stale) return;
    setSaving(true);
    setError("");
    try { await onSave(draft, baseline); setOpen(false); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "前置依赖未能保存，选择已保留，请重试。"); }
    finally { setSaving(false); }
  };
  if (!ids.length && !onSave) return null;
  return <section aria-label="前置依赖" className="task-dependencies-field">
    <div className="task-detail-field-label">前置依赖</div>
    <div className="task-dependencies-content">
      {ids.length > 0 && <div className="task-dependencies-chips">{ids.map(id => {
        const task = tasks.find(task => task.id === id);
        return <div className="task-dependencies-chip" key={id}>{task ? <>
          <button aria-label={`打开前置任务：${task.title}`} disabled={!onOpenTask} onClick={() => onOpenTask?.(id)} type="button"><Link2 aria-hidden="true" size={13} /><span>{task.title}</span></button>
          <TaskStatusBadge size="sm" value={task.status} />
        </> : <span>任务不可用 · 待核对</span>}</div>;
      })}</div>}
      {onSave && <Popover open={open} onOpenChange={next => { if (saving) return; if (next) reload(); setOpen(next); }}>
        <PopoverTrigger aria-label={ids.length ? "编辑前置依赖" : "添加前置依赖"} className="task-dependencies-edit" type="button">{ids.length ? "编辑" : <><Plus aria-hidden="true" size={13} />添加前置依赖</>}</PopoverTrigger>
        <PopoverContent aria-label="编辑前置依赖" className="task-dependencies-popover">
          <header><strong>前置依赖</strong><p>仅作协作参考，可随时调整，不限制任务开始或完成。</p></header>
          <Input aria-label="搜索前置任务" disabled={saving} onChange={event => setQuery(event.target.value)} placeholder="搜索当前团队任务…" value={query} />
          <div aria-label="可选前置任务" className="task-dependencies-options" role="group">
            {missing.map((id, index) => <label key={id}><input aria-label={`移除不可用的前置依赖 ${index + 1}`} checked disabled={saving || stale} onChange={() => setDraft(values => values.filter(value => value !== id))} type="checkbox" /><span>任务不可用 · 待核对<small>取消勾选可移除此关联</small></span></label>)}
            {candidates.map(task => {
              const checked = draft.includes(task.id);
              const issue = checked ? undefined : getTaskDependencyIssue(tasks, taskId, task.id);
              return <label key={task.id}><input aria-label={`前置任务：${task.title}`} checked={checked} disabled={saving || stale || Boolean(issue)} onChange={() => setDraft(values => checked ? values.filter(id => id !== task.id) : [...values, task.id])} type="checkbox" /><span>{task.title}<small>{issue ?? task.status}</small></span></label>;
            })}
            {!candidates.length && <p>{query.trim() ? "没有匹配的任务" : "暂无可选前置任务"}</p>}
          </div>
          {stale && <p role="alert">前置依赖已更新，当前选择已保留。<Button disabled={saving} onClick={reload} size="sm" type="button" variant="ghost">载入最新依赖</Button></p>}
          {error && <p className="task-dependencies-error" role="alert">{error}</p>}
          <footer><Button disabled={saving || stale || !draft.length} onClick={() => setDraft([])} size="sm" type="button" variant="ghost">清空</Button><Button disabled={saving} onClick={() => setOpen(false)} size="sm" type="button" variant="ghost">取消</Button><Button disabled={saving || stale} onClick={() => void save()} size="sm" type="button">{saving ? "保存中…" : "保存"}</Button></footer>
        </PopoverContent>
      </Popover>}
    </div>
  </section>;
}
