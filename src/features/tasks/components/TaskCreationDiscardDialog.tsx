import { useRef } from "react";
import { useCreationI18n } from "@/shared/i18n/creation-messages";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";

export function TaskCreationDiscardDialog({ open, error, onCancel, onDiscard, finalFocus }: {
  open: boolean;
  error: string;
  onCancel: () => void;
  onDiscard: () => void;
  finalFocus: () => HTMLElement | false;
}) {
  const { c } = useCreationI18n();
  const cancel = useRef<HTMLButtonElement>(null);
  return <AlertDialog open={open} onOpenChange={value => { if (!value) onCancel(); }}>
    <AlertDialogContent initialFocus={cancel} finalFocus={finalFocus} showCloseButton={false}>
      <AlertDialogHeader>
        <AlertDialogTitle>{c("leaveCreationTitle")}</AlertDialogTitle>
        <AlertDialogDescription>{c("leaveCreationDescription")}</AlertDialogDescription>
      </AlertDialogHeader>
      {error && <p className="text-sm text-destructive" role="alert">{c("discardCreationFailed")}</p>}
      <AlertDialogFooter>
        <Button ref={cancel} onClick={onCancel} type="button" variant="outline">{c("continueEditing")}</Button>
        <Button onClick={onDiscard} type="button" variant="destructive">{c("discardAndLeave")}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
