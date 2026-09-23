import { useRef } from "react";
import { useGlobalUi } from "../i18n/globalUi";
import { useMockText } from "../i18n/MockDataProvider";
import type { TaskDeletionPreview } from "../lib/workspaceSubtaskEditing";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Button } from "./ui/button";

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
  const mock = useMockText();
  const cancel = useRef<HTMLButtonElement>(null);
  return <AlertDialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <AlertDialogContent initialFocus={cancel} finalFocus={finalFocus}>
      <AlertDialogHeader>
        <AlertDialogTitle className="break-words">{preview
          ? ui("删除「{name}」任务？", { name: mock.field(preview.task.id, "title", preview.task.name) })
          : ui("删除任务？")}</AlertDialogTitle>
        <AlertDialogDescription className="text-xs leading-relaxed">{ui("该任务及所有子任务的数据将被永久删除，无法恢复。")}</AlertDialogDescription>
      </AlertDialogHeader>
      {error && <p className="text-sm text-destructive" role="alert">{ui(error)}</p>}
      <AlertDialogFooter>
        <Button ref={cancel} variant="outline" onClick={onClose}>{ui("取消")}</Button>
        <Button variant="destructive" disabled={!preview || disabled} onClick={onConfirm}>{ui("删除")}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
