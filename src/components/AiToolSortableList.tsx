import { GripVertical } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { agentIconUrls } from "../data/agentIcons";
import { aiToolName, type AiTool } from "../lib/aiTools";

type Props = { order: AiTool[]; onCommit: (order: AiTool[]) => void; onBusyChange: (busy: boolean) => void };
type DragSession = { agent: AiTool; order: AiTool[]; pointerId?: number; offsetY: number };
const moved = (order: AiTool[], agent: AiTool, index: number) => {
  const next = order.filter(item => item !== agent);
  next.splice(Math.max(0, Math.min(index, next.length)), 0, agent);
  return next;
};

/** Draft order stays local until drop; abandoning a drag never changes the persisted default. */
export function AiToolSortableList({ order, onCommit, onBusyChange }: Props) {
  const [draft, setDraft] = useState<AiTool[] | null>(null);
  const [active, setActive] = useState<AiTool | null>(null);
  const [ghost, setGhost] = useState<{ y: number; outside: boolean } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const session = useRef<DragSession | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const handles = useRef(new Map<AiTool, HTMLButtonElement>());
  const instructionId = useId();
  const finish = (commit: boolean) => {
    const current = session.current;
    if (!current) return;
    session.current = null;
    if (current.pointerId !== undefined && list.current?.hasPointerCapture(current.pointerId)) list.current.releasePointerCapture(current.pointerId);
    setDraft(null); setActive(null); setGhost(null); onBusyChange(false);
    if (commit) onCommit(current.order);
    setAnnouncement(commit ? `${aiToolName(current.agent)} 已放下，第 ${current.order.indexOf(current.agent) + 1} 项；${aiToolName(current.order[0])} 为默认工具` : "已取消排序，顺序未改变");
    handles.current.get(current.agent)?.focus({ preventScroll: true });
  };
  useEffect(() => {
    session.current = null; setDraft(null); setActive(null); setGhost(null); onBusyChange(false);
  }, [order, onBusyChange]);
  useEffect(() => () => { session.current = null; onBusyChange(false); }, [onBusyChange]);
  useEffect(() => {
    if (!active) return;
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || !session.current) return;
      event.preventDefault(); event.stopPropagation(); finish(false);
    };
    document.addEventListener("keydown", escape, true);
    return () => document.removeEventListener("keydown", escape, true);
  }, [active, onCommit, onBusyChange]);
  useLayoutEffect(() => {
    const current = session.current;
    if (current) handles.current.get(current.agent)?.focus({ preventScroll: true });
  }, [draft]);
  const pick = (agent: AiTool, event: PointerEvent<HTMLButtonElement>) => {
    if (session.current || !event.isPrimary || event.button !== 0 || !list.current) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    const row = event.currentTarget.closest("li")!.getBoundingClientRect();
    const bounds = list.current.getBoundingClientRect();
    session.current = { agent, order: [...order], pointerId: event.pointerId, offsetY: event.clientY - row.top };
    list.current.setPointerCapture(event.pointerId);
    setDraft([...order]); setActive(agent); setGhost({ y: row.top - bounds.top, outside: false }); onBusyChange(true);
    setAnnouncement(`已拾取 ${aiToolName(agent)}，拖动调整顺序，拖出列表或按 Escape 取消`);
  };
  const isInside = (event: PointerEvent<HTMLUListElement>) => {
    const bounds = list.current!.getBoundingClientRect();
    return event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
  };
  const move = (event: PointerEvent<HTMLUListElement>) => {
    const current = session.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    const bounds = list.current!.getBoundingClientRect();
    const inside = isInside(event);
    setGhost({ y: event.clientY - bounds.top - current.offsetY, outside: !inside });
    if (inside) {
      current.order = moved(current.order, current.agent, Math.floor((event.clientY - bounds.top) / (bounds.height / order.length)));
      setDraft([...current.order]);
    }
  };
  const key = (agent: AiTool, event: KeyboardEvent<HTMLButtonElement>) => {
    const current = session.current;
    if (event.repeat && [" ", "Enter"].includes(event.key)) { event.preventDefault(); return; }
    if (event.key === "Escape" && current) { event.preventDefault(); event.stopPropagation(); finish(false); return; }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault(); event.stopPropagation();
      if (current?.pointerId !== undefined) return;
      if (current) finish(true);
      else { session.current = { agent, order: [...order], offsetY: 0 }; setActive(agent); setDraft([...order]); onBusyChange(true); setAnnouncement(`已拾取 ${aiToolName(agent)}，用上下方向键移动，空格放下，Escape 取消`); }
    } else if (current?.agent === agent && current.pointerId === undefined && ["ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      current.order = moved(current.order, agent, current.order.indexOf(agent) + (event.key === "ArrowUp" ? -1 : 1));
      setDraft([...current.order]); setAnnouncement(`${aiToolName(agent)}，第 ${current.order.indexOf(agent) + 1} 项`);
    }
  };
  return <>
    <span className="sr-only" id={instructionId}>拖动调整顺序。键盘按空格或回车拾取，用上下方向键移动，再次按空格或回车放下，Escape 取消。</span>
    <ul aria-label="AI 工具排序" className="ai-tool-sort-list" onLostPointerCapture={() => finish(false)} onPointerCancel={() => finish(false)} onPointerMove={move} onPointerUp={event => { if (session.current?.pointerId === event.pointerId) { event.preventDefault(); finish(isInside(event)); } }} ref={list}>
      {(draft ?? order).map((agent, index) => <li className={active === agent ? ghost ? "is-drag-placeholder" : "is-keyboard-picked" : ""} key={agent}>
        <div className="ai-tool-menu-sort-row"><img alt="" draggable={false} src={agentIconUrls[agent]} /><span>{aiToolName(agent)}</span>{index === 0 && <small>默认</small>}</div>
        <button aria-describedby={instructionId} aria-label={`拖动排序 ${aiToolName(agent)}`} aria-pressed={active === agent} className="ai-tool-drag-handle" onClick={event => { event.preventDefault(); event.stopPropagation(); }} onKeyDown={event => key(agent, event)} onPointerDown={event => pick(agent, event)} ref={element => { if (element) handles.current.set(agent, element); else handles.current.delete(agent); }} type="button"><GripVertical aria-hidden="true" size={16} /></button>
      </li>)}
      {ghost && active && <li aria-hidden="true" className={`ai-tool-drag-ghost${ghost.outside ? " is-outside" : ""}`} style={{ transform: `translateY(${ghost.y}px)` }}><div className="ai-tool-menu-sort-row"><img alt="" src={agentIconUrls[active]} /><span>{aiToolName(active)}</span></div><GripVertical size={16} /></li>}
    </ul>
    <span aria-live="polite" className="sr-only">{announcement}</span>
  </>;
}
