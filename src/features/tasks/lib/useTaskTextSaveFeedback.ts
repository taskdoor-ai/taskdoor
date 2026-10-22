import { useCallback, useEffect, useRef, useState } from "react";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { toast } from "@/shared/ui/toast";

export type TaskTextSaveStatus = "idle" | "saving" | "saved" | "error";

/** Feedback belongs to one edit, and cannot outlive a newer edit or the task. */
export function useTaskTextSaveFeedback(scope: string) {
  const d = useDetailCopy();
  const [status, setStatus] = useState<TaskTextSaveStatus>("idle");
  const sequence = useRef(0);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const cancel = useCallback(() => {
    sequence.current += 1;
  }, []);
  const clear = useCallback(() => {
    cancel();
    setStatus("idle");
  }, [cancel]);

  useEffect(() => {
    clear();
    return cancel;
  }, [scope, clear, cancel]);

  const save = async (value: string, savedValue: string, onSave?: (value: string) => void | Promise<void>) => {
    clear();
    if (!onSave || value === savedValue) return;
    const request = sequence.current;
    const requestScope = scope;
    setStatus("saving");
    try {
      await onSave(value);
      if (request !== sequence.current || requestScope !== currentScope.current) return;
      setStatus("idle");
      toast.success(d("fieldSaved"));
    } catch {
      if (request === sequence.current && requestScope === currentScope.current) setStatus("error");
    }
  };

  return { status, clear, save };
}
