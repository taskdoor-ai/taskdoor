import { ArrowRight, Check, CircleCheck, Clock3, Clock5, ExternalLink, Link2, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { AiConnectionDialog } from "./AiConnectionDialog";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { demoTodos } from "../data/demoTodos";

export function MyTodosPage({ onOpenTask, selectedTodoId }: { onOpenTask: (taskId: string) => void; selectedTodoId: string }) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [connectOpen, setConnectOpen] = useState(false);
  const todo = demoTodos.find((item) => item.id === selectedTodoId) ?? demoTodos[0];
  const done = todo.status === "已完成" || completed.includes(todo.id);
  return <article className="todo-detail-view">
    <header className="todo-detail-heading">
      <p>我的待办 / {todo.taskPath}</p>
      <div className="todo-detail-meta">
        <span className={`todo-detail-status ${done ? "completed" : todo.status === "等待前置任务" ? "blocked" : "pending"}`}>{done ? <CircleCheck strokeWidth={3} /> : todo.status === "等待前置任务" ? <TriangleAlert strokeWidth={3} /> : <Clock5 strokeWidth={3} />}{done ? "已完成" : todo.status}</span>
        <span><Clock3 size={15} />{todo.due}</span>
      </div>
      <h1>{todo.title}</h1>
      <p>{todo.description}</p>
    </header>
    <div className="todo-detail-actions">
      <button className="primary" disabled={todo.status === "已完成"} onClick={() => setCompleted((current) => done ? current.filter((id) => id !== todo.id) : [...current, todo.id])} type="button">{done ? <Check size={15} /> : <Check size={15} />}{done ? "已完成" : "标记为完成"}</button>
      <button onClick={() => setConnectOpen(true)} type="button"><Sparkles size={15} />在个人 Agent 中处理</button>
    </div>
    <section className="todo-detail-grid">
      <div className="todo-detail-main">
        <section><small>待办说明</small><h2>需要处理的内容与范围</h2><p>{todo.detail}</p></section>
        <section><small>交付物</small><h2>完成时需要提交的成果</h2><p>{todo.output}</p></section>
        <section><small>完成标准</small><h2>满足以下条件才可标记完成</h2><ul>{todo.criteria.map((criterion) => <li key={criterion}><Check size={13} />{criterion}</li>)}</ul></section>
      </div>
      <aside className="todo-related-task">
        <header><Link2 size={16} /><span><small>关联协作任务</small><strong>{todo.taskTitle}</strong></span></header>
        <h3>{todo.taskTitle}</h3>
        <dl><div><dt>任务路径</dt><dd>{todo.taskPath}</dd></div><div><dt>负责人</dt><dd>{todo.taskOwner}</dd></div><div><dt>任务状态</dt><dd><TaskStatusBadge size="sm" value={todo.taskStatus} /></dd></div></dl>
        <button onClick={() => onOpenTask(todo.taskId)} type="button">查看完整任务<ExternalLink size={13} /></button>
      </aside>
    </section>
    <button className="todo-next" type="button">完成后交给下一责任人<ArrowRight size={14} /></button>
    {connectOpen && <AiConnectionDialog
      onClose={() => setConnectOpen(false)}
      onConnect={() => setConnectOpen(false)}
      request={{
        title: `处理待办：${todo.title}`,
        description: "选择本地个人 Agent，仅带入完成这条待办所需的上下文。",
        workObject: { kind: "我的待办", title: todo.title, content: todo.description, meta: `${todo.taskTitle} · ${todo.taskPath}` },
        instruction: `完成待办“${todo.title}”，给出明确结论，并标记仍需确认的问题。`,
        expectedOutput: todo.output,
        context: [
          { label: "关联任务", value: todo.taskTitle },
          { label: "任务路径", value: todo.taskPath },
          { label: "截止时间", value: todo.due },
        ],
      }}
    />}
  </article>;
}
