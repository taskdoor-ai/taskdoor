import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { TaskCreationEditableText } from "@/features/tasks/components/TaskCreationEditableText";

type Props = {
  renderMark?: (index: number, value: string, canConfirm?: boolean) => ReactNode;
  renderAction?: (index: number, value: string) => ReactNode;
  values: string[];
  onChange: (values: string[]) => void;
  onCommit?: () => void;
  label: string;
  disabled?: boolean;
  idPrefix?: string;
  className?: string;
  showInitialEmptyRow?: boolean;
};

export function TaskCriteriaFields({ renderMark, renderAction, values, onChange, onCommit, label, disabled = false, idPrefix, className = "", showInitialEmptyRow = true }: Props) {
  const d = useDetailCopy();
  const mock = useMockText();
  const generatedId = useId();
  const prefix = idPrefix ?? generatedId;
  const root = useRef<HTMLDivElement>(null);
  const focusFrame = useRef(0);
  const commitFrame = useRef(0);
  const composing = useRef(false);
  const pointerAction = useRef(false);
  const pendingCommit = useRef(false);
  const commitCallback = useRef(onCommit);
  commitCallback.current = onCommit;
  const displayedValues = values.length || !showInitialEmptyRow ? values : [""];

  const scheduleCommit = () => {
    cancelAnimationFrame(commitFrame.current);
    commitFrame.current = requestAnimationFrame(() => {
      if (!pendingCommit.current || composing.current || pointerAction.current) return;
      if (root.current?.contains(document.activeElement)) { pendingCommit.current = false; return; }
      pendingCommit.current = false;
      commitCallback.current?.();
    });
  };
  useEffect(() => {
    const releasePointer = () => {
      if (!pointerAction.current) return;
      pointerAction.current = false;
      if (pendingCommit.current) {
        cancelAnimationFrame(commitFrame.current);
        // A click may add/remove a row and schedule its focus in this frame.
        commitFrame.current = requestAnimationFrame(scheduleCommit);
      }
    };
    document.addEventListener("pointerup", releasePointer);
    document.addEventListener("pointercancel", releasePointer);
    return () => {
      cancelAnimationFrame(focusFrame.current);
      cancelAnimationFrame(commitFrame.current);
      document.removeEventListener("pointerup", releasePointer);
      document.removeEventListener("pointercancel", releasePointer);
    };
  }, []);

  const focusRow = (index: number) => {
    cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      root.current?.querySelectorAll("textarea")[index]?.focus();
    });
  };

  return <div aria-label={label} className={`task-criteria-fields ${className}`.trim()} onBlur={event => {
    if (!onCommit || (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node))) return;
    pendingCommit.current = true;
    if (!composing.current && !pointerAction.current) scheduleCommit();
  }} onFocus={() => { pendingCommit.current = false; cancelAnimationFrame(commitFrame.current); }} onCompositionStart={() => { composing.current = true; cancelAnimationFrame(commitFrame.current); }} onCompositionEnd={() => {
    composing.current = false;
    if (pendingCommit.current) scheduleCommit();
  }} onPointerDownCapture={event => {
    if (event.button === 0 && (event.target as HTMLElement).closest("button")) {
      pointerAction.current = true;
      cancelAnimationFrame(commitFrame.current);
    }
  }} onClick={() => {
    pointerAction.current = false;
    if (pendingCommit.current) scheduleCommit();
  }} ref={root} role="group">
    {displayedValues.map((value, index) => <div className="task-criteria-field-row" key={index}>
      {renderMark ? renderMark(index, value) : <span aria-hidden="true" className="task-criteria-field-mark">{index + 1}</span>}
      <TaskCreationEditableText
        className="task-criteria-field-input"
        disabled={disabled}
        id={`${prefix}-${index}`}
        label={`${label} ${index + 1}`}
        onChange={nextValue => {
          if (disabled) return;
          onChange(displayedValues.map((current, currentIndex) => currentIndex === index ? nextValue : current));
        }}
        placeholder={d('criteriaHint')}
        value={value}
        displayValue={mock.text(value)}
      />
      <div className="criterion-row-actions">{renderAction?.(index, value)}
      {displayedValues.length > 1 && <button aria-label={`${d("remove")} ${label} ${index + 1}`} className="task-criteria-field-remove" disabled={disabled} onClick={() => {
        if (disabled) return;
        const next = displayedValues.filter((_, currentIndex) => currentIndex !== index);
        onChange(next);
        focusRow(Math.min(index, next.length - 1));
      }} type="button"><X aria-hidden="true" size={13} /></button>}</div>
    </div>)}
    <button aria-label={`${d("add")} ${label}`} className="task-criteria-field-add" disabled={disabled} onClick={() => {
      if (disabled) return;
      onChange([...displayedValues, ""]);
      focusRow(displayedValues.length);
    }} type="button"><Plus aria-hidden="true" size={13} />{d('append')}</button>
  </div>;
}
