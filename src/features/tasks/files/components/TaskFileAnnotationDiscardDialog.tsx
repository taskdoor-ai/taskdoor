import { useRef } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";

export function TaskFileAnnotationDiscardDialog({ open, onCancel, onDiscard, finalFocus }: { open: boolean; onCancel: () => void; onDiscard: () => void; finalFocus: () => HTMLElement | false }) {
  const { locale } = useI18n();
  const t = (zh: string, en: string) => locale === "en" ? en : zh;
  const cancel = useRef<HTMLButtonElement>(null);
  return <AlertDialog open={open} onOpenChange={next => { if (!next) onCancel(); }}>
    <AlertDialogContent initialFocus={cancel} finalFocus={finalFocus} showCloseButton={false}>
      <AlertDialogHeader><AlertDialogTitle>{t("丢弃本次标注？", "Discard these annotations?")}</AlertDialogTitle><AlertDialogDescription>{t("本次标注尚未生成文件或交给 AI。离开后将丢失，系统不会自动保存。", "These annotations have not been saved as a file or handed off to AI. Leaving will discard them; they are not saved automatically.")}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><Button onClick={onCancel} ref={cancel} variant="outline">{t("继续标注", "Continue annotating")}</Button><Button onClick={onDiscard} variant="destructive">{t("丢弃并离开", "Discard and leave")}</Button></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
