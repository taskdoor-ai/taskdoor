import { useCallback, useEffect, useRef, useState } from "react";

export type TaskTextSaveStatus = "idle" | "saving" | "saved" | "error";

/** Feedback belongs to one edit, and cannot outlive a newer edit or the task. */
export function useTaskTextSaveFeedback(scope: string) {
  const [status, setStatus] = useState<TaskTextSaveStatus>("idle");
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = useCallback(() => {
    sequence.current += 1;
    clearTimeout(timer.current);
    timer.current = undefined;
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
    setStatus("saving");
    try {
      await onSave(value);
      if (request !== sequence.current) return;
      setStatus("saved");
      timer.current = setTimeout(() => {
        if (request === sequence.current) setStatus("idle");
      }, 2200);
    } catch {
      if (request === sequence.current) setStatus("error");
    }
  };

  return { status, clear, save };
}
