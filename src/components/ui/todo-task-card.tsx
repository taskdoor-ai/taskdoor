import type { ReactNode } from "react";
import { Clock3, GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";

type TodoTaskCardProps = {
  checked: boolean;
  dragging?: boolean;
  icon: ReactNode;
  meta: string;
  onCheckedChange: () => void;
  onDragEnd?: () => void;
  onDragStart?: () => void;
  tag?: string;
  title: string;
};

/**
 * Task-row composition adapted from the 21st.dev Subframe Checkbox Card.
 * Uses Agentdoor's existing Origin-style checkbox primitive and domain metadata.
 */
export function TodoTaskCard({ checked, dragging = false, icon, meta, onCheckedChange, onDragEnd, onDragStart, tag, title }: TodoTaskCardProps) {
  return (
    <div draggable onDragEnd={onDragEnd} onDragStart={onDragStart} className={`group flex cursor-grab items-start gap-2 rounded-xl border bg-white/90 p-3 shadow-[0_3px_10px_rgba(29,31,36,0.035)] transition hover:-translate-y-0.5 hover:border-black/[0.16] hover:bg-white active:cursor-grabbing motion-reduce:transform-none ${checked ? "border-emerald-200/80" : "border-black/[0.07]"} ${dragging ? "rotate-1 scale-[.98] opacity-45 shadow-lg" : ""}`}>
      <GripVertical aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#b1b3b8] transition-colors group-hover:text-[#6f737b]" />
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
      <Checkbox checked={checked} onChange={onCheckedChange} size="md" />
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f3f3f0] text-[#6f737b] transition-colors group-hover:bg-[#ececea] group-hover:text-[#303238]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-medium leading-5 transition ${checked ? "text-[#9a9da4] line-through" : "text-[#2b2d32]"}`}>{title}</span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#858990]">
          <span className="flex items-center gap-1"><Clock3 className="size-3" />{meta}</span>
          {tag && <span className="rounded bg-black/[0.045] px-1.5 py-0.5 font-medium">{tag}</span>}
        </span>
      </span>
      </label>
    </div>
  );
}
