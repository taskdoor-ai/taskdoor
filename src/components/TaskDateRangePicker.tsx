import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

export type TaskDateRange = { end: string; start: string };
type TaskDateRangePickerProps = { initialEnd?: string; initialStart?: string; onChange?: (range: TaskDateRange | null) => void };

const toValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromValue = (value: string) => new Date(`${value}T00:00:00`);
const dateParts = (value: string) => { const date = fromValue(value); return { day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear() }; };
const calendarDays = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => { const date = new Date(gridStart); date.setDate(gridStart.getDate() + index); return date; });
};

function SegmentedDate({ value }: { value: string }) {
  const parts = dateParts(value);
  return <span className="task-date-segments"><span>{parts.year}</span><i>/</i><span>{String(parts.month).padStart(2, "0")}</span><i>/</i><span>{String(parts.day).padStart(2, "0")}</span></span>;
}

// UI anatomy follows jolbol1's 21st.dev Date Range Picker: segmented fields + RangeCalendar popover.
export function TaskDateRangePicker({ initialEnd = "", initialStart = "", onChange }: TaskDateRangePickerProps) {
  const initialRange = initialStart && initialEnd ? { end: initialEnd, start: initialStart } : { end: "", start: "" };
  const [range, setRange] = useState<TaskDateRange>(initialRange);
  const [draft, setDraft] = useState<TaskDateRange>(initialRange);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => { const date = initialStart ? fromValue(initialStart) : new Date(); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);

  const chooseDate = (date: Date) => {
    const value = toValue(date);
    if (!selectingEnd || value < draft.start) { setDraft({ start: value, end: value }); setSelectingEnd(true); }
    else { setDraft((current) => ({ ...current, end: value })); setSelectingEnd(false); }
  };

  return <div className="task-date-range-picker">
    <button aria-expanded={open} aria-haspopup="dialog" className="task-date-range-trigger" onClick={() => { setDraft(range); setSelectingEnd(false); const date = range.start ? fromValue(range.start) : new Date(); setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1)); setOpen((value) => !value); }} type="button">
      <span className={`task-date-field-group ${range.start ? "" : "empty"}`}>{range.start ? <><SegmentedDate value={range.start} /><i>—</i><SegmentedDate value={range.end} /></> : <strong>添加周期</strong>}<CalendarIcon size={13} /></span>
    </button>
    {open && <div aria-label="选择任务周期" className="task-date-range-popover" role="dialog">
      <div className="task-range-calendar-heading">
        <button aria-label="上个月" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} type="button"><ChevronLeft size={14} /></button>
        <strong>{visibleMonth.getFullYear()} 年 {visibleMonth.getMonth() + 1} 月</strong>
        <button aria-label="下个月" onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} type="button"><ChevronRight size={14} /></button>
      </div>
      <div className="task-range-calendar-grid">
        {["日", "一", "二", "三", "四", "五", "六"].map((day) => <span className="task-range-weekday" key={day}>{day}</span>)}
        {days.map((date) => { const value = toValue(date); const outside = date.getMonth() !== visibleMonth.getMonth(); const inRange = Boolean(draft.start && value >= draft.start && value <= draft.end); const edge = value === draft.start || value === draft.end; return <button aria-label={value} aria-pressed={inRange} className={`${outside ? "outside" : ""} ${inRange ? "in-range" : ""} ${edge ? "range-edge" : ""}`} key={value} onClick={() => chooseDate(date)} type="button"><span>{date.getDate()}</span></button>; })}
      </div>
      <div className="task-range-calendar-footer"><button className="task-range-clear" disabled={!range.start} onClick={() => { const emptyRange = { end: "", start: "" }; setRange(emptyRange); setDraft(emptyRange); setSelectingEnd(false); setOpen(false); onChange?.(null); }} type="button">清空</button><span>{selectingEnd ? "请选择截止日期" : draft.start ? "已选择任务周期" : "周期为可选项"}</span><div><button onClick={() => setOpen(false)} type="button">取消</button><button disabled={!draft.start || selectingEnd} onClick={() => { setRange(draft); setOpen(false); onChange?.(draft); }} type="button">应用</button></div></div>
    </div>}
  </div>;
}
