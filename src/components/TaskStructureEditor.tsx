import { ChevronDown, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { TaskCreationChildDraft } from "../data/taskCreationScenarios";
import { Button } from "./ui/button";

type TaskStructureEditorProps = {
  children: TaskCreationChildDraft[];
  onDeleteChild: (taskId: string) => void;
  parentTitle: string;
  renderPanel: (taskId: string) => ReactNode;
};

export function TaskStructureEditor({ children, onDeleteChild, parentTitle, renderPanel }: TaskStructureEditorProps) {
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<string>>(() => new Set());
  const taskItems = [
    { id: "parent", kind: "父任务", title: parentTitle || "未命名父任务" },
    ...children.map((child) => ({
      id: child.id,
      kind: "子任务",
      title: child.title || "未命名子任务",
    })),
  ];

  const toggleTask = (taskId: string) => {
    setCollapsedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const deleteTask = (taskId: string) => {
    setCollapsedTaskIds((current) => {
      const next = new Set(current);
      next.delete(taskId);
      return next;
    });
    onDeleteChild(taskId);
  };

  useEffect(() => {
    if (children.length) return;
    setCollapsedTaskIds((current) => current.size ? new Set() : current);
  }, [children.length]);

  if (!children.length) {
    return <section aria-label="单项任务" className="task-structure-editor task-structure-editor-single">
      {renderPanel("parent")}
    </section>;
  }

  return <section aria-labelledby="task-list-title" className="transfer-section task-structure-editor">
    <header>
      <div>
        <h2 id="task-list-title">任务</h2>
        <p>每个任务都包含任务信息和上级任务；有可选文件时再展示引用。</p>
      </div>
    </header>

    <ol className="task-decomposition-list">
      {taskItems.map((task, index) => {
        const isCollapsed = collapsedTaskIds.has(task.id);
        const panelId = `task-draft-panel-${task.id}`;
        return <li className="task-decomposition-item" key={task.id}>
          <article aria-labelledby={`task-draft-title-${task.id}`} data-collapsed={isCollapsed || undefined}>
            <header className="task-decomposition-item-head">
              <div aria-hidden="true" className="task-decomposition-order">{index + 1}</div>
              <p><small>{task.kind}</small><strong id={`task-draft-title-${task.id}`}>{task.title}</strong></p>
              <div className="task-decomposition-actions">
                {task.id !== "parent" && <Button aria-label={`删除${task.title}`} onClick={() => deleteTask(task.id)} size="touch" type="button" variant="ghost"><Trash2 data-icon="inline-start" />删除</Button>}
                <Button aria-controls={panelId} aria-expanded={!isCollapsed} aria-label={`${isCollapsed ? "展开" : "收起"}${task.title}`} onClick={() => toggleTask(task.id)} size="icon-touch" type="button" variant="ghost"><ChevronDown aria-hidden="true" className={`task-decomposition-toggle-icon${isCollapsed ? " collapsed" : ""}`} /></Button>
              </div>
            </header>
            <div className="task-decomposition-panel" hidden={isCollapsed} id={panelId}>{renderPanel(task.id)}</div>
          </article>
        </li>;
      })}
    </ol>
  </section>;
}
