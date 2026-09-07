import { CalendarIcon, ChevronLeft, ChevronRight, InfinityIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TaskDueDatePickerProps = {
  initialValue?: string;
  label?: string;
  onChange?: (value: string) => void;
};

const toValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromValue = (value: string) => new Date(`${value}T00:00:00`);
const calendarDays = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

function SegmentedDate({ value }: { value: string }) {
  const date = fromValue(value);
  return <span className="task-date-segments"><span>{date.getFullYear()}</span><i>/</i><span>{String(date.getMonth() + 1).padStart(2, "0")}</span><i>/</i><span>{String(date.getDate()).padStart(2, "0")}</span></span>;
}

// Single-date adaptation of jolbol1's 21st.dev Date Range Picker anatomy.
export function TaskDueDatePicker({ initialValue = "", label = "截止时间", onChange }: TaskDueDatePickerProps) {
  const [value, setValue] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);
  const [mode, setMode] = useState<"date" | "none">(initialValue ? "date" : "none");
  const [open, setOpen] = useState(false);
  const pickerId = useId();
  const [popoverPosition, setPopoverPosition] = useState<{ left: number; top: number } | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = initialValue ? fromValue(initialValue) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);

  // Keep the trigger mounted when a parent saves or AI updates the date.
  useEffect(() => {
    setValue(initialValue);
    setDraft(initialValue);
    setMode(initialValue ? "date" : "none");
    setOpen(false);
  }, [initialValue]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPopoverPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const bounds = trigger.getBoundingClientRect();
      const viewportPadding = 12;
      const gap = 8;
      const popoverWidth = popoverRef.current?.offsetWidth ?? 320;
      const popoverHeight = popoverRef.current?.offsetHeight ?? 384;
      const availableBelow = window.innerHeight - bounds.bottom - gap;
      const availableAbove = bounds.top - gap;
      const placeAbove = availableBelow < popoverHeight && availableAbove > availableBelow;
      const preferredTop = placeAbove ? bounds.top - popoverHeight - gap : bounds.bottom + gap;
      const maxTop = Math.max(viewportPadding, window.innerHeight - popoverHeight - viewportPadding);
      const top = Math.min(Math.max(viewportPadding, preferredTop), maxTop);
      const maxLeft = Math.max(viewportPadding, window.innerWidth - popoverWidth - viewportPadding);
      const left = Math.min(Math.max(viewportPadding, bounds.right - popoverWidth), maxLeft);
      setPopoverPosition({ left, top });
    };

    const frame = window.requestAnimationFrame(updatePosition);
    const resizeObserver = new ResizeObserver(updatePosition);
    if (popoverRef.current) resizeObserver.observe(popoverRef.current);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const isPositioned = popoverPosition !== null;
  useEffect(() => {
    if (open && isPositioned) popoverRef.current?.querySelector<HTMLInputElement>("input:checked")?.focus({ preventScroll: true });
  }, [open, isPositioned]);

  const toggle = () => {
    setDraft(value);
    setMode(value ? "date" : "none");
    const date = value ? fromValue(value) : new Date();
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setOpen((current) => !current);
  };
  const dismiss = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const apply = () => {
    const nextValue = mode === "none" ? "" : draft;
    if (mode === "date" && !nextValue) return;
    setValue(nextValue);
    dismiss();
    onChange?.(nextValue);
  };

  return <div className="task-due-date-picker" ref={rootRef}>
    <small className="task-due-date-label">{label}</small>
    <button aria-controls={open ? pickerId : undefined} aria-expanded={open} aria-haspopup="dialog" aria-label={`${label}：${value || "不设截止时间"}`} className="task-due-date-trigger" onClick={toggle} ref={triggerRef} type="button">
      <span className={`task-due-date-field ${value ? "" : "empty"}`}>{value ? <SegmentedDate value={value} /> : <strong>不设截止时间</strong>}<CalendarIcon size={13} /></span>
    </button>
    {open && typeof document !== "undefined" && createPortal(<div aria-label={`设置${label}`} className="task-due-date-popover" id={pickerId} ref={popoverRef} role="dialog" style={{
      left: popoverPosition?.left ?? 0,
      top: popoverPosition?.top ?? 0,
      visibility: popoverPosition ? "visible" : "hidden",
    }}>
      <fieldset className="task-due-date-modes">
        <legend className="sr-only">截止时间类型</legend>
        <label>
          <input checked={mode === "date"} name={`${pickerId}-mode`} onChange={() => setMode("date")} type="radio" value="date" />
          <CalendarIcon size={15} /><span>指定日期</span>
        </label>
        <label>
          <input checked={mode === "none"} name={`${pickerId}-mode`} onChange={() => setMode("none")} type="radio" value="none" />
          <InfinityIcon size={16} /><span>不设截止时间</span>
        </label>
      </fieldset>
      {mode === "date" ? <>
      <div className="task-range-calendar-heading">
        <button aria-label="上个月" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} type="button"><ChevronLeft size={14} /></button>
        <strong>{visibleMonth.getFullYear()} 年 {visibleMonth.getMonth() + 1} 月</strong>
        <button aria-label="下个月" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} type="button"><ChevronRight size={14} /></button>
      </div>
      <div className="task-range-calendar-grid">
        {["日", "一", "二", "三", "四", "五", "六"].map((day) => <span className="task-range-weekday" key={day}>{day}</span>)}
        {days.map((date) => {
          const dateValue = toValue(date);
          const outside = date.getMonth() !== visibleMonth.getMonth();
          const selected = draft === dateValue;
          return <button aria-label={dateValue} aria-pressed={selected} className={`${outside ? "outside" : ""} ${selected ? "in-range range-edge" : ""}`} key={dateValue} onClick={() => setDraft(dateValue)} type="button"><span>{date.getDate()}</span></button>;
        })}
      </div>
      </> : <div className="task-due-date-unlimited">
        <InfinityIcon size={23} />
        <p>任务没有固定截止日期，之后仍可调整。</p>
      </div>}
      <div className="task-range-calendar-footer">
        <span>{mode === "none" ? "不设截止时间" : draft || "请选择日期"}</span>
        <div><button onClick={dismiss} type="button">取消</button><button disabled={mode === "date" && !draft} onClick={apply} type="button">应用</button></div>
      </div>
    </div>, document.body)}
  </div>;
}
