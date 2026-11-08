import { useRef } from "react";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";

export type TaskLeaveKind = "owner" | "collaborator";

/** Confirms a change that would take away the person's own access to the task. */
export function TaskLeaveDialog({ kind, onCancel, onConfirm }: { kind: TaskLeaveKind | null; onCancel: () => void; onConfirm: () => void }) {
  const d = useDetailCopy();
  const cancel = useRef<HTMLButtonElement>(null);
  const owner = kind === "owner";
  return <AlertDialog open={kind !== null} onOpenChange={open => { if (!open) onCancel(); }}>
    <AlertDialogContent initialFocus={cancel} showCloseButton={false}>
      <AlertDialogHeader>
        <AlertDialogTitle>{d(owner ? "leaveOwnerTitle" : "leaveTitle")}</AlertDialogTitle>
        <AlertDialogDescription>{d(owner ? "leaveOwnerDescription" : "leaveDescription")}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button ref={cancel} onClick={onCancel} type="button" variant="outline">{d("leaveCancel")}</Button>
        <Button onClick={onConfirm} type="button" variant={owner ? "default" : "destructive"}>{d(owner ? "leaveOwnerConfirm" : "leaveConfirm")}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
