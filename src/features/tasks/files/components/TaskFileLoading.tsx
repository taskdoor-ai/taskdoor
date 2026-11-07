import { useGlobalUi } from "@/shared/i18n/global-ui";
import { Spinner } from "@/shared/ui/spinner";
import "@/features/tasks/styles/task-file-loading.css";

export function TaskFileLoading() {
  const ui = useGlobalUi();
  return <div className="task-file-loading" role="status">
    <Spinner aria-hidden="true" className="task-file-loading__spinner motion-reduce:animate-none" />
    <span>{ui("正在读取附件…")}</span>
  </div>;
}
