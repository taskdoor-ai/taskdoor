import { useGlobalUi } from "../i18n/globalUi";
import { useDetailCopy } from "../i18n/detailMessages";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { findTagByName, type TagDefinition } from "../data/tagGroups";
import { TagBadge } from "./TagBadge";
import { TagPicker } from "./TagPicker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type Props = {
  onChange?: (names: string[]) => void;
  selected: string[];
  tags: TagDefinition[];
};

export function TaskTagList({ onChange, selected, tags }: Props) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const selectedTags = useMemo(() => selected.map((name) => findTagByName(tags, name) ?? { id: name, name, icon: "tag" as const, color: "gray" as const }), [selected, tags]);
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(selectedTags.length);
  const [open, setOpen] = useState(false);
  const removable = Boolean(onChange);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measurement = measurementRef.current;
    const picker = pickerRef.current;
    if (!container || !measurement || !picker) return;

    const updateVisibleCount = () => {
      const available = container.getBoundingClientRect().width;
      const gap = Number.parseFloat(getComputedStyle(container).columnGap) || 0;
      const widths = Array.from(measurement.querySelectorAll(".ad-tag-badge"), (badge) => badge.getBoundingClientRect().width);
      const counters = measurement.querySelectorAll(".task-tag-overflow");
      const pickerWidth = picker.getBoundingClientRect().width;
      let count = widths.length;
      let tagsWidth = widths.reduce((sum, width) => sum + width, 0);

      // Reserve both controls before fitting complete badges into the remaining space.
      while (count > 0) {
        const hidden = widths.length - count;
        const counterWidth = hidden ? counters[hidden - 1].getBoundingClientRect().width + gap : 0;
        if (tagsWidth + count * gap + counterWidth + pickerWidth <= available) break;
        tagsWidth -= widths[--count];
      }
      setVisibleCount(count);
      if (count === widths.length) setOpen(false);
    };

    updateVisibleCount();
    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(container);
    observer.observe(measurement);
    observer.observe(picker);
    return () => observer.disconnect();
  }, [selectedTags, removable]);

  const hiddenTags = selectedTags.slice(visibleCount);
  const renderBadge = (tag: TagDefinition) => <TagBadge key={tag.id} onRemove={onChange ? () => onChange(selected.filter((name) => name !== tag.name)) : undefined} size="sm" tag={tag} />;

  return <div aria-label={d('taskTags')} className="task-detail-title-tags task-tag-list" ref={containerRef}>
    {selectedTags.slice(0, visibleCount).map(renderBadge)}
    {hiddenTags.length > 0 && <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger aria-label={ui(hiddenTags.length === 1 ? "另有 1 个标签" : "另有 {0} 个标签", {0: hiddenTags.length})} className="task-tag-overflow" closeDelay={150} delay={100} onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setOpen(true); }} openOnHover type="button">+{hiddenTags.length}</PopoverTrigger>
      <PopoverContent align="end" aria-label={d('moreTags')} className="task-tag-overflow-popover" finalFocus={false} initialFocus={false}>
        <ul aria-label={d('hiddenTags')} className="task-tag-overflow-list">
          {hiddenTags.map((tag) => <li key={tag.id}>{renderBadge(tag)}</li>)}
        </ul>
      </PopoverContent>
    </Popover>}
    <div className="task-tag-picker" ref={pickerRef}><TagPicker onChange={(names) => onChange?.(names)} selected={selected} tags={tags} /></div>
    <div aria-hidden="true" className="task-tag-measurement-clip" inert><div className="task-tag-measurement" ref={measurementRef}>
      {selectedTags.map(renderBadge)}
      {selectedTags.map((tag, index) => <span className="task-tag-overflow" key={`counter-${tag.id}`}>+{index + 1}</span>)}
    </div></div>
  </div>;
}
