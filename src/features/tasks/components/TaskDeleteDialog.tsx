import { useI18n } from "@/shared/i18n/I18nProvider";
import { useRef } from "react";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import type { TaskDeletionPreview } from "@/features/tasks/lib/workspace-subtask-editing";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/alert-dialog";
import { TaskBranchDisclosure } from "@/features/tasks/components/TaskBranchDisclosure";
import { Button } from "@/shared/ui/button";

type Props = {
  open: boolean;
  preview?: TaskDeletionPreview | null;
  error?: string;
  disabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  finalFocus: () => HTMLElement | false;
};

export function TaskDeleteDialog({ open, preview, error, disabled, onClose, onConfirm, finalFocus }: Props) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const mock = useMockText();
  const cancel = useRef<HTMLButtonElement>(null);
  return <AlertDialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <AlertDialogContent initialFocus={cancel} finalFocus={finalFocus}>
      <AlertDialogHeader>
        <AlertDialogTitle>{preview
          ? ui("删除「{name}」任务？", { name: mock.field(preview.task.id, "title", preview.task.name) })
          : ui("删除任务？")}</AlertDialogTitle>
        <AlertDialogDescription>{locale === 'zh-CN' ? `该任务${preview?.descendantCount ? `及 ${preview.descendantCount} 个子任务` : ''}将移入回收站，30 天内可以恢复。` : `This task${preview?.descendantCount ? ` and ${preview.descendantCount} subtasks` : ''} will be moved to the recycle bin and can be restored within 30 days.`}</AlertDialogDescription>
      </AlertDialogHeader>
      {preview && <TaskBranchDisclosure key={preview.signature} tasks={preview.deletedTasks} rootId={preview.task.id} deleting />}
      {error && <p className="text-sm text-destructive" role="alert">{ui(error)}</p>}
      <AlertDialogFooter>
        <Button ref={cancel} variant="outline" onClick={onClose}>{ui("取消")}</Button>
        <Button variant="destructive" disabled={!preview || disabled} onClick={onConfirm}>{ui("删除")}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
