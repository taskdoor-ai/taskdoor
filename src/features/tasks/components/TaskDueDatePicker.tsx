import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { formatDisplayDate, formatDisplayMonth } from "@/shared/lib/date-time";
import { taskCalendarDate, taskCreationDay, taskScheduleError } from "@/features/tasks/lib/task-schedule";
import { useTeamTimeZone } from "@/shared/lib/useTeamTimeZone";
import { CalendarIcon, ChevronLeft, ChevronRight, InfinityIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TaskDueDatePickerProps = {
  initialValue?: string;
  minDate?: string;
  label?: string;
  emptyLabel?: string;
  presentation?: "portal" | "inline";
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
  const { locale } = useI18n();
  return <time className="task-date-segments" dateTime={value} title={formatDisplayDate(value, { locale, year: "always" }) ?? undefined}>{formatDisplayDate(value, { locale }) ?? "—"}</time>;
}

// Single-date adaptation of jolbol1's 21st.dev Date Range Picker anatomy.
export function TaskDueDatePicker({ initialValue = "", label = "截止时间", minDate: configuredMinDate, emptyLabel, presentation = "portal", onChange }: TaskDueDatePickerProps) {
  const timeZone = useTeamTimeZone();
  const today = taskCalendarDate(new Date().toISOString(), timeZone);
  const minDate = configuredMinDate ?? today ?? "";
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const { locale } = useI18n();
  const inline = presentation === "inline";
  const noDateLabel = emptyLabel ?? d('noDueDate');
  const [value, setValue] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);
  const [mode, setMode] = useState<"date" | "none">(initialValue ? "date" : "none");
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const existingError = taskScheduleError(value, minDate, undefined, timeZone, locale);
  const draftError = mode === "date" ? taskScheduleError(draft, minDate, undefined, timeZone, locale) : null;
  const pickerId = useId();
  const [popoverPosition, setPopoverPosition] = useState<{ left: number; top: number } | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = fromValue(initialValue || today || "");
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
    if (!open || inline) {
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
  }, [open, inline]);

  const isPositioned = inline || popoverPosition !== null;
  useEffect(() => {
    if (open && isPositioned) popoverRef.current?.querySelector<HTMLInputElement>("input:checked")?.focus({ preventScroll: true });
  }, [open, isPositioned]);

  const toggle = () => {
    setSaveError("");
    setDraft(value);
    setMode(value ? "date" : "none");
    const date = fromValue(value || taskCreationDay(new Date(), timeZone));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setOpen((current) => !current);
  };
  const dismiss = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const apply = () => {
    const nextValue = mode === "none" ? "" : draft;
    if (mode === "date" && (!nextValue || draftError)) return;
    try {
      onChange?.(nextValue);
      setValue(nextValue);
      dismiss();
    } catch (error) { setSaveError(error instanceof Error ? error.message : d('saveFailed')); }
  };

  if (!today) return <div className="task-due-date-picker"><small className="task-due-date-label">{label}</small><span>{value ? <SegmentedDate value={value} /> : noDateLabel}</span><p className="task-schedule-error" role="alert">{locale === "en" ? "The team timezone is invalid. Date changes are unavailable." : "团队时区无效，暂时无法修改日期。"}</p></div>;

  const calendar = <div aria-label={ui("设置{0}", {0: label})} className={`task-due-date-popover${inline ? " is-inline" : ""}`} id={pickerId} ref={popoverRef} role="dialog" style={inline ? undefined : {
      left: popoverPosition?.left ?? 0,
      top: popoverPosition?.top ?? 0,
      visibility: popoverPosition ? "visible" : "hidden",
    }}>
      <div className="task-due-date-shortcuts">{[1, 3, 7, 10, 30].map(count => {
        const date = fromValue(taskCreationDay(new Date(), timeZone)); date.setDate(date.getDate() + count);
        const deadline = toValue(date);
        return <button type="button" key={count} title={formatDisplayDate(deadline, { locale, year: "always" }) ?? undefined} aria-label={`${locale === "en" ? `${count} days` : `${count} 天`} · ${formatDisplayDate(deadline, { locale, year: "always" }) ?? "—"}`} onClick={() => { setMode("date"); setDraft(deadline); setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }}>{locale === "en" ? `${count} days` : `${count} 天`}</button>;
      })}</div>
      <fieldset className="task-due-date-modes">
        <legend className="sr-only">{inline ? ui("设置{0}", {0: label}) : ui("截止时间类型")}</legend>
        <label>
          <input checked={mode === "date"} name={`${pickerId}-mode`} onChange={() => setMode("date")} type="radio" value="date" />
          <CalendarIcon size={15} /><span>{ui("指定日期")}</span>
        </label>
        <label>
          <input checked={mode === "none"} name={`${pickerId}-mode`} onChange={() => setMode("none")} type="radio" value="none" />
          <InfinityIcon size={16} /><span>{noDateLabel}</span>
        </label>
      </fieldset>
      {mode === "date" ? <>
      <div className="task-range-calendar-heading">
        <button aria-label={d("previousMonth")} onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} type="button"><ChevronLeft size={14} /></button>
        <strong>{formatDisplayMonth(visibleMonth, { locale }) ?? "—"}</strong>
        <button aria-label={d("nextMonth")} onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} type="button"><ChevronRight size={14} /></button>
      </div>
      <div className="task-range-calendar-grid">
        {(locale === "en" ? ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] : ["日", "一", "二", "三", "四", "五", "六"]).map((day) => <span className="task-range-weekday" key={day}>{day}</span>)}
        {days.map((date) => {
          const dateValue = toValue(date);
          const outside = date.getMonth() !== visibleMonth.getMonth();
          const selected = draft === dateValue;
          return <button disabled={Boolean(minDate && dateValue < minDate)} aria-label={formatDisplayDate(dateValue, { locale, year: "always" }) ?? "—"} aria-pressed={selected} className={`${outside ? "outside" : ""} ${selected ? "in-range range-edge" : ""}`} key={dateValue} onClick={() => setDraft(dateValue)} type="button"><span>{date.getDate()}</span></button>;
        })}
      </div>
      </> : <div className="task-due-date-unlimited">
        <InfinityIcon size={23} />
        <p>{emptyLabel ?? d('noDateHint')}</p>
      </div>}
      {(draftError || saveError) && <p className="task-schedule-error" role="alert">{saveError || draftError}</p>}
      <div className="task-range-calendar-footer">
        <span>{mode === "none" ? noDateLabel : formatDisplayDate(draft, { locale }) ?? d("chooseDate")}</span>
        <div><button onClick={dismiss} type="button">{d('cancel')}</button><button disabled={mode === "date" && (!draft || Boolean(draftError))} onClick={apply} type="button">{d("confirm")}</button></div>
      </div>
    </div>;

  return <div className="task-due-date-picker" onKeyDown={event => { if (inline && open && event.key === "Escape") { event.stopPropagation(); dismiss(); } }} ref={rootRef}>
    <small className="task-due-date-label">{label}</small>
    <button aria-controls={open ? pickerId : undefined} aria-expanded={open} aria-haspopup="dialog" aria-label={`${label}：${formatDisplayDate(value, { locale, year: "always" }) ?? noDateLabel}`} className="task-due-date-trigger" onClick={toggle} ref={triggerRef} type="button">
      <span className={`task-due-date-field ${value ? "" : "empty"}`}>{value ? <SegmentedDate value={value} /> : <strong>{noDateLabel}</strong>}<CalendarIcon size={13} /></span>
    </button>
    {existingError && <span className="task-schedule-error" role="status">{existingError}{ui("请重新设置。")}</span>}
    {open && (inline ? calendar : typeof document !== "undefined" ? createPortal(calendar, document.body) : null)}
  </div>;
}
