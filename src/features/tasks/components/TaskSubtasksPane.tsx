import { useRef, useState, type ComponentProps } from "react";
import { Plus } from "lucide-react";
import { TaskSubtaskList } from "@/features/tasks/components/TaskSubtaskList";
import { TaskSubtaskCreateForm } from "@/features/tasks/components/TaskSubtaskCreateForm";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { Button } from "@/shared/ui/button";

type FormProps = ComponentProps<typeof TaskSubtaskCreateForm>;
type Props = Omit<ComponentProps<typeof TaskSubtaskList>, "emptyAction"> & Pick<FormProps, "currentUserId" | "members" | "tags"> & {
  taskId: string;
  onCreate?: FormProps["onCreate"];
};
export function TaskSubtasksPane({ taskId, currentUserId, members, tags, onCreate, ...listProps }: Props) {
  const { locale } = useI18n();
  const d = useDetailCopy();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const formId = `task-subtask-create-${taskId}`;
  const empty = !listProps.tasks.length;
  const cancel = () => {
    setOpen(false);
    window.requestAnimationFrame(() => (trigger.current ?? heading.current)?.focus({ preventScroll: true }));
  };
  const action = onCreate ? <Button aria-controls={formId} aria-expanded={open} className="task-subtask-create-trigger" onClick={() => setOpen(value => !value)} ref={trigger} size="sm" type="button" variant="ghost"><Plus aria-hidden="true" size={14} />{locale === "en" ? "Add subtask" : "添加子任务"}</Button> : undefined;
  return <section aria-labelledby={`task-subtasks-heading-${taskId}`} className="task-detail-section task-subtask-list-section first-section" data-subtask-suggestion-focus-return id={`task-subtasks-${taskId}`} tabIndex={-1}>
    <div className="task-section-heading task-ai-module-heading task-subtask-heading">
      <div><h2 id={`task-subtasks-heading-${taskId}`} ref={heading} tabIndex={-1}>{d("subtasks")}</h2></div>
      <div className="task-subtask-heading-actions">{!empty && action}</div>
    </div>
    {(onCreate || open) && <TaskSubtaskCreateForm inline currentUserId={currentUserId} id={formId} members={members} onCancel={cancel} onCreate={async draft => {
      if (!onCreate) throw new Error(locale === "en" ? "You no longer have permission to create subtasks here. Your input has been kept." : "你已没有当前任务的子任务创建权限，输入已保留。");
      await onCreate(draft);
    }} open={open} tags={tags} />}
    {(!empty || !open) && <TaskSubtaskList {...listProps} emptyAction={empty ? action : undefined} />}
  </section>;
}
