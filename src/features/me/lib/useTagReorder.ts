import { useEffect, useRef, useState, type ButtonHTMLAttributes, type RefObject } from "react";
import { moveTagByOffset, reorderTags, type TagDropPlacement } from "@/features/me/lib/tag-order";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import type { TagDefinition } from "@/shared/model/task-model";

type Options = {
  tags: TagDefinition[];
  onChange: (tags: TagDefinition[]) => void;
  disabled: boolean;
  listRef: RefObject<HTMLUListElement | null>;
  onError: (message: string) => void;
};
type Drag = { id: string; targetId: string | null; placement: TagDropPlacement; x: number; y: number };
type PendingDrag = {
  id: string; pointerId: number; startX: number; startY: number; clientX: number; clientY: number;
  tags: TagDefinition[]; active: boolean; startScrollTop: number;
};

export function useTagReorder(options: Options) {
  const ui = useGlobalUi();
  const latest = useRef(options);
  latest.current = options;
  const pending = useRef<PendingDrag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [message, setMessage] = useState("");

  const cancel = () => {
    if (pending.current?.active) setMessage(ui("已取消标签排序。"));
    pending.current = null;
    setDrag(null);
  };

  const targetAt = (current: PendingDrag): Drag => {
    const list = latest.current.listRef.current;
    const hit = document.elementFromPoint(current.clientX, current.clientY)?.closest<HTMLElement>("[data-tag-id]");
    const target = hit && list?.contains(hit) ? hit : null;
    const rect = target?.getBoundingClientRect();
    const scrollTop = list?.closest<HTMLElement>(".tag-management-page")?.scrollTop ?? 0;
    return {
      id: current.id,
      targetId: target?.dataset.tagId ?? null,
      placement: rect && current.clientY >= rect.top + rect.height / 2 ? "after" : "before",
      x: current.clientX - current.startX,
      y: current.clientY - current.startY + scrollTop - current.startScrollTop,
    };
  };

  const commit = (next: TagDefinition[], tag: TagDefinition) => {
    const { tags, onChange, onError } = latest.current;
    if (next === tags) return;
    onError("");
    try {
      onChange(next);
      setMessage(ui("已将「{0}」移到第 {1} 位。", { 0: tag.name, 1: next.findIndex(item => item.id === tag.id) + 1 }));
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : ui("标签顺序未能保存，请重试。"));
      setMessage(ui("标签顺序未能保存，请重试。"));
    }
  };

  useEffect(() => {
    if (pending.current && (options.disabled || pending.current.tags !== options.tags)) cancel();
  }, [options.tags, options.disabled]);

  useEffect(() => {
    if (!drag) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cancel();
    };
    window.addEventListener("keydown", onKeyDown);
    let frame = 0;
    const scroll = () => {
      const current = pending.current;
      const viewport = latest.current.listRef.current?.closest<HTMLElement>(".tag-management-page");
      if (!current?.active) return;
      if (viewport) {
        const rect = viewport.getBoundingClientRect();
        const offset = current.clientY < rect.top + 48 ? -12 : current.clientY > rect.bottom - 48 ? 12 : 0;
        if (offset) {
          const previous = viewport.scrollTop;
          viewport.scrollTop += offset;
          if (previous !== viewport.scrollTop) setDrag(targetAt(current));
        }
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => { window.removeEventListener("keydown", onKeyDown); cancelAnimationFrame(frame); };
  }, [Boolean(drag)]);

  const getHandleProps = (tag: TagDefinition): ButtonHTMLAttributes<HTMLButtonElement> => ({
    onPointerDown(event) {
      if (latest.current.disabled || !event.isPrimary || event.button !== 0 || pending.current) return;
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture(event.pointerId);
      latest.current.onError("");
      pending.current = {
        id: tag.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, clientX: event.clientX, clientY: event.clientY,
        tags: latest.current.tags, active: false,
        startScrollTop: latest.current.listRef.current?.closest<HTMLElement>(".tag-management-page")?.scrollTop ?? 0,
      };
    },
    onPointerMove(event) {
      const current = pending.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (latest.current.disabled || current.tags !== latest.current.tags) { cancel(); return; }
      current.clientX = event.clientX;
      current.clientY = event.clientY;
      if (!current.active && Math.hypot(current.clientX - current.startX, current.clientY - current.startY) < 6) return;
      if (!current.active) {
        current.active = true;
        setMessage(ui("正在移动「{0}」，按 Escape 取消。", { 0: tag.name }));
      }
      setDrag(targetAt(current));
    },
    onPointerUp(event) {
      const current = pending.current;
      if (!current || current.pointerId !== event.pointerId) return;
      current.clientX = event.clientX;
      current.clientY = event.clientY;
      pending.current = null;
      setDrag(null);
      if (!current.active || latest.current.disabled || current.tags !== latest.current.tags) return;
      const target = targetAt(current);
      if (!target.targetId) { setMessage(ui("已取消标签排序。")); return; }
      commit(reorderTags(current.tags, tag.id, target.targetId, target.placement), tag);
    },
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
    onKeyDown(event) {
      if (latest.current.disabled || event.altKey || event.ctrlKey || event.metaKey) return;
      const directions: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 };
      if (!(event.key in directions)) return;
      event.preventDefault();
      if (pending.current) { cancel(); return; }
      let offset = directions[event.key];
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const items = [...(latest.current.listRef.current?.querySelectorAll<HTMLElement>("[data-tag-id]") ?? [])];
        const top = items[0]?.getBoundingClientRect().top;
        const columns = items.filter(item => Math.abs(item.getBoundingClientRect().top - (top ?? 0)) < 2).length;
        offset *= Math.max(1, columns);
      }
      commit(moveTagByOffset(latest.current.tags, tag.id, offset), tag);
    },
  });

  return { drag, getHandleProps, message };
}
