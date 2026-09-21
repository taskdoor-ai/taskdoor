import { useProgressCopy } from "../i18n/progressCopy";
import React from "react";
import type { TaskProgressDisplay } from "../lib/taskProgressDisplay";

const shortDate=(date:string)=>`${Number(date.slice(5,7))}/${Number(date.slice(8,10))}`;

export function TaskBurnUpHeading() {
  const p = useProgressCopy();
  return <h2 className="task-burnup-heading"><span>{p("燃起图")} <small className="task-progress-chart-unit">{p("人天")}</small></span></h2>;
}

/** Connect the two real date positions; a short interval puts its label above the link. */
export function TaskBurnUpTimeDelta({model, startX, endX, dueX, finishX, y = 24, fontSize = 11}: {
  model: TaskProgressDisplay; startX: number; endX: number; dueX: number | null; finishX: number | null; y?: number; fontSize?: number;
}) {
  const p = useProgressCopy();
  if (model.deltaDays === null || dueX === null || finishX === null) return null;
  const label = model.deltaDays === 0 ? p("按期") : p(`${model.deltaDays > 0 ? "+" : "−"}${Math.abs(model.deltaDays)} 天`);
  const width = Array.from(label).reduce((sum, char) => sum + (/[^\x00-\x7F]/.test(char) ? fontSize : fontSize * .6), 0) + 8;
  const x = Math.max(startX + width / 2, Math.min(endX - width / 2, (dueX + finishX) / 2));
  const inline = Math.abs(finishX - dueX) >= width + fontSize;
  const labelY = Math.max(fontSize, inline ? y : y - fontSize - 4);
  const radius = fontSize * .3;
  return <g className="task-progress-chart-time-comparison" data-kind={model.completedOn ? "completed" : "forecast"}>
    <title>{p(`${model.timeStatus}，相对计划截止日期`)}</title>
    {dueX !== finishX && <line className="task-progress-chart-time-link" x1={dueX} x2={finishX} y1={y} y2={y}/>}
    <path className="task-progress-chart-plan-node" d={`M ${dueX} ${y-radius} L ${dueX+radius} ${y} L ${dueX} ${y+radius} L ${dueX-radius} ${y} Z`}/>
    <line className="task-progress-chart-finish-node" x1={finishX} x2={finishX} y1={y-fontSize*.55} y2={y+fontSize*.55}/>
    <foreignObject x={x-width/2} y={labelY-fontSize*.65} width={width} height={fontSize*1.5} overflow="visible">
      <div className="task-progress-chart-time-delta" data-relation={model.timeTone} data-placement={inline ? "inline" : "above"} title={p(model.timeStatus)} style={{fontSize}}>{label}</div>
    </foreignObject>
  </g>;
}

type AxisEntry = { date: string; x: number; kind: "start" | "record" | "plan" | "forecast" | "completed" | "observation" | "tick"; label: string };
type AxisLabel = { date: string; x: number; entries: AxisEntry[]; labelX: number; anchor: "middle"; left: number; right: number; row: number; captionRows: AxisEntry[][] };

/** Keep every label on its real date x; crowded labels use separate rows. */
export function layoutBurnUpDateAxis({ model, start, end, asOf, startX, endX, asOfX, dueX, finishX, historyStartOn, observationLabel = "当前", translate = (value: string) => value, fontSize = 11 }: {
  model: TaskProgressDisplay; start: string; end: string; asOf: string; startX: number; endX: number; asOfX: number;
  dueX: number | null; finishX: number | null; observationLabel?: string; translate?: (value: string) => string; fontSize?: number;
  historyStartOn?: string | null;
}) {
  const entries: AxisEntry[] = [];
  const startedOn = model.startOn ?? historyStartOn;
  if (startedOn && startedOn >= start && startedOn <= end) {
    const span = Date.parse(end) - Date.parse(start);
    const x = span === 0 ? (startX + endX) / 2 : startX + (Date.parse(startedOn) - Date.parse(start)) / span * (endX - startX);
    entries.push({ date: startedOn, x, kind: model.startOn ? "start" : "record", label: "创建" });
  }
  if (model.dueOn && dueX !== null) entries.push({ date: model.dueOn, x: dueX, kind: "plan", label: "计划截止" });
  if (model.finishOn && finishX !== null) entries.push({ date: model.finishOn, x: finishX, kind: model.completedOn ? "completed" : "forecast", label: model.completedOn ? "确认完成" : "AI 预测完成" });
  entries.push({ date: asOf, x: asOfX, kind: "observation", label: observationLabel });
  for (const [date, x] of [[start, startX], [end, endX]] as const) if (!entries.some(entry => entry.date === date)) entries.push({ date, x, kind: "tick", label: "" });
  for (const entry of entries) entry.label = translate(entry.label);
  const groups = [...new Set(entries.map(entry => entry.date))].map(date => ({ date, entries: entries.filter(entry => entry.date === date) }));
  const isMilestone = (entry: AxisEntry) => entry.kind !== "tick";
  const textWidth = (text: string) => Array.from(text).reduce((width, char) => width + (/[^\x00-\x7F]/.test(char) ? fontSize : fontSize * .56), 0);
  const measured = groups.map(group => {
    const x = group.entries[0].x, titles = group.entries.filter(entry => entry.label);
    const width = Math.max(textWidth(shortDate(group.date)), textWidth(titles.map(entry => entry.label).join("｜")));
    const fits = width <= Math.max(fontSize * 8, (endX - startX) / 2);
    const captionRows = !fits && titles.length > 1 ? titles.map(entry => [entry]) : [titles];
    return { ...group, x, captionRows, width: Math.max(textWidth(shortDate(group.date)), ...captionRows.map(row => textWidth(row.map(entry => entry.label).join("｜")))) };
  }).sort((a, b) => a.date.localeCompare(b.date));
  const gap = 4;
  const milestones = measured.filter(group => group.entries.some(isMilestone));
  const labels: AxisLabel[] = [];
  const bounds = (group: typeof measured[number]) => {
    const anchor = "middle";
    const left = group.x - group.width / 2;
    return { ...group, anchor, left, right: left + group.width, labelX: group.x } as const;
  };
  const overlaps = (a: {left:number;right:number}, b: {left:number;right:number}) => a.left < b.right + gap && b.left < a.right + gap;
  for (const group of milestones) {
    const label = bounds(group);
    let row = 0;
    while (labels.some(other => other.row === row && overlaps(label, other))) row++;
    labels.push({ ...label, row });
  }
  // Ordinary end ticks are optional and never create an additional row.
  for (const group of measured.filter(group => !group.entries.some(isMilestone))) {
    const label = bounds(group);
    if (label.left >= startX && label.right <= endX && !labels.some(other => other.row === 0 && overlaps(label, other))) labels.push({ ...label, row:0 });
  }
  const rowHeight = fontSize * (3.6 + (Math.max(1, ...labels.map(label => label.captionRows.length)) - 1) * 1.4) + 4;
  return { labels: labels.sort((a, b) => a.date.localeCompare(b.date)), fontSize, rowHeight,
    // Drawing bounds include centered edge labels; plot/date coordinates stay unchanged.
    labelStartX: Math.min(startX, ...labels.map(label => label.left - gap)),
    labelEndX: Math.max(endX, ...labels.map(label => label.right + gap)),
    height: (Math.max(0, ...labels.map(label => label.row)) + 1) * rowHeight };

}

export function TaskBurnUpDateAxis({ layout, y }: { layout: ReturnType<typeof layoutBurnUpDateAxis>; y: number }) {
  const p = useProgressCopy();
  return <g aria-label={p("燃起图时间轴")} className="task-progress-chart-date-axis">
    {layout.labels.map(item => {
      const kind = item.entries.some(entry => entry.kind === "forecast") ? "forecast" : item.entries.some(entry => entry.kind === "completed") ? "completed" : item.entries.some(entry => entry.kind === "plan") ? "plan" : "tick";
      const titles = item.entries.filter(entry => entry.label);
      const rowY = y + item.row * layout.rowHeight;
      return <g key={item.date} data-date={item.date} data-kind={kind}>
        <text className="task-progress-chart-axis-date" x={item.labelX} y={rowY + layout.fontSize * 1.65} textAnchor={item.anchor} fontSize={layout.fontSize}>{shortDate(item.date)}</text>
        {titles.length > 0 && item.captionRows.map((row, rowIndex) => <text key={rowIndex} className="task-progress-chart-axis-caption" x={item.labelX} y={rowY + layout.fontSize * (3 + rowIndex * 1.4)} textAnchor={item.anchor} fontSize={layout.fontSize}>
          {row.map((entry, index) => <React.Fragment key={entry.kind}>{index > 0 && <tspan className="task-progress-chart-axis-separator">｜</tspan>}<tspan data-kind={entry.kind}>{entry.label}</tspan></React.Fragment>)}
        </text>)}
      </g>;
    })}
  </g>;
}

/** Without a chart, retain known dates in a compact fallback. */
export function TaskBurnUpTiming({model, showStatus = model.deltaDays === null, showDates = true}:{model:TaskProgressDisplay; showStatus?:boolean; showDates?:boolean}) {
  const p = useProgressCopy();
  const entries=[
    {kind:"start",label:p("创建"),date:model.startOn},
    {kind:"observation",label:p("当前"),date:model.asOf},
    {kind:"plan",label:p("计划截止"),date:model.dueOn},
    {kind:model.completedOn ? "completed" : "forecast",label:model.completedOn ? p("确认完成") : p("AI 预测完成"),date:model.finishOn},
  ].filter((item):item is typeof item & {date:string}=>Boolean(item.date));
  const dates=[...new Set(entries.map(item=>item.date))].sort();
  if ((!showStatus || !model.timeStatus) && !showDates) return null;
  return <div className="task-progress-chart-timing" aria-label={p("任务完成时间")} data-relation={model.timeTone}>
    {showStatus && model.timeStatus && <p className="task-progress-chart-time-status" data-relation={model.timeTone}>{p(model.timeStatus)}</p>}
    {showDates && dates.length > 0 && <div className="task-progress-chart-dates">
      {dates.map(date=>{
        const items=entries.filter(item=>item.date === date);
        const kind=items.some(item=>item.kind === "forecast") ? "forecast" : items.some(item=>item.kind === "completed") ? "completed" : "plan";
        return <div key={date} className="task-progress-chart-date" data-date={date} data-kind={kind}>
          <span className="task-progress-chart-date-types">{items.map((item,index)=><React.Fragment key={item.kind}>
            {index>0 && <span className="task-progress-chart-date-separator" aria-hidden="true">｜</span>}
            <span className={item.kind === "forecast" ? "task-ai-prediction-label" : undefined} data-kind={item.kind}>{item.label}</span>
          </React.Fragment>)}</span>
          <time className={kind === "forecast" ? "task-ai-prediction-label" : undefined} dateTime={date}>{shortDate(date)}</time>
        </div>;
      })}
    </div>}
  </div>;
}
