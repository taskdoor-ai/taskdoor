import { useI18n } from '../i18n/I18nProvider';
import { useGlobalUi } from "../i18n/globalUi";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type TaskDateRange = { end: string; start: string };
type Props = { initialEnd?: string; initialStart?: string; label?: string; onChange?: (range: TaskDateRange | null) => void };

const emptyRange: TaskDateRange = { end: "", start: "" };
const toValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromValue = (value: string) => new Date(`${value}T00:00:00`);
const calendarDays = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => { const date = new Date(gridStart); date.setDate(gridStart.getDate() + index); return date; });
};

function SegmentedDate({ value }: { value: string }) {
  const date = fromValue(value);
  return <span className="task-date-segments"><span>{date.getFullYear()}</span><i>/</i><span>{String(date.getMonth() + 1).padStart(2, "0")}</span><i>/</i><span>{String(date.getDate()).padStart(2, "0")}</span></span>;
}

export function TaskDateRangePicker({ initialEnd = "", initialStart = "", label = "时间", onChange }: Props) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const initialRange = initialStart && initialEnd ? { end: initialEnd, start: initialStart } : emptyRange;
  const [range, setRange] = useState<TaskDateRange>(initialRange);
  const [draft, setDraft] = useState<TaskDateRange>(initialRange);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => { const date = initialStart ? fromValue(initialStart) : new Date(); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => { const target = event.target as Node; if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false); };
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); window.requestAnimationFrame(() => triggerRef.current?.focus()); } };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("pointerdown", handlePointerDown); document.removeEventListener("keydown", handleKeyDown); };
  }, [open]);

  useEffect(() => {
    if (!open) { setPosition(null); return; }
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const bounds = trigger.getBoundingClientRect();
      const padding = 12;
      const gap = 8;
      const width = popoverRef.current?.offsetWidth ?? 292;
      const height = popoverRef.current?.offsetHeight ?? 304;
      const below = window.innerHeight - bounds.bottom - gap;
      const above = bounds.top - gap;
      const preferredTop = below < height && above > below ? bounds.top - height - gap : bounds.bottom + gap;
      setPosition({
        left: Math.min(Math.max(padding, bounds.right - width), Math.max(padding, window.innerWidth - width - padding)),
        top: Math.min(Math.max(padding, preferredTop), Math.max(padding, window.innerHeight - height - padding)),
      });
    };
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", updatePosition); document.removeEventListener("scroll", updatePosition, true); };
  }, [open]);

  const chooseDate = (date: Date) => {
    const value = toValue(date);
    if (!selectingEnd || !draft.start || value < draft.start) { setDraft({ start: value, end: value }); setSelectingEnd(true); }
    else { setDraft((current) => ({ ...current, end: value })); setSelectingEnd(false); }
  };
  const toggle = () => {
    setDraft(range);
    setSelectingEnd(false);
    const date = range.start ? fromValue(range.start) : new Date();
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setOpen((current) => !current);
  };

  return <div className="task-date-range-picker" ref={rootRef}>
    <small className="task-date-range-label">{label}</small>
    <button aria-expanded={open} aria-haspopup="dialog" aria-label={`${label}：${range.start ? ui("{0} 至 {1}", {0: range.start, 1: range.end}) : ui("未设置")}`} className="task-date-range-trigger" onClick={toggle} ref={triggerRef} type="button">
      <span className={`task-date-field-group ${range.start ? "" : "empty"}`}>{range.start ? <><SegmentedDate value={range.start} /><i>{ui("至")}</i><SegmentedDate value={range.end} /></> : <strong>{ui("添加时间")}</strong>}<CalendarIcon aria-hidden="true" size={13} /></span>
    </button>
    {open && typeof document !== "undefined" && createPortal(<div aria-label={ui("选择开始和结束时间")} className="task-date-range-popover task-date-range-popover-fixed" ref={popoverRef} role="dialog" style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? "visible" : "hidden" }}>
      <div className="task-range-calendar-heading">
        <button aria-label={ui("上个月")} onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} type="button"><ChevronLeft size={14} /></button>
        <strong>{visibleMonth.getFullYear()}{ui("年")}{visibleMonth.getMonth() + 1}{ui("月")}</strong>
        <button aria-label={ui("下个月")} onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} type="button"><ChevronRight size={14} /></button>
      </div>
      <div className="task-range-calendar-grid">
        {(locale === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["日", "一", "二", "三", "四", "五", "六"]).map((day) => <span className="task-range-weekday" key={day}>{day}</span>)}
        {days.map((date) => { const value = toValue(date); const outside = date.getMonth() !== visibleMonth.getMonth(); const inRange = Boolean(draft.start && value >= draft.start && value <= draft.end); const edge = value === draft.start || value === draft.end; return <button aria-label={value} aria-pressed={inRange} className={`${outside ? "outside" : ""} ${inRange ? "in-range" : ""} ${edge ? "range-edge" : ""}`} key={value} onClick={() => chooseDate(date)} type="button"><span>{date.getDate()}</span></button>; })}
      </div>
      <div className="task-range-calendar-footer">
        <button className="task-range-clear" disabled={!range.start} onClick={() => { setRange(emptyRange); setDraft(emptyRange); setSelectingEnd(false); setOpen(false); onChange?.(null); }} type="button">{ui("清空")}</button>
        <span>{selectingEnd ? ui("请选择结束时间") : draft.start ? ui("已选择时间范围") : ui("时间为可选项")}</span>
        <div><button onClick={() => setOpen(false)} type="button">{ui("取消")}</button><button disabled={!draft.start || selectingEnd} onClick={() => { setRange(draft); setOpen(false); onChange?.(draft); }} type="button">{ui("应用")}</button></div>
      </div>
    </div>, document.body)}
  </div>;
}
