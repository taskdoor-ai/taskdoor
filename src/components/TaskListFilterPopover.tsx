import { Inbox, ListFilter, Search } from "lucide-react";
import { useState } from "react";
import type { TagDefinition } from "../data/sharedTypes";
import { getTagIcon } from "./TagBadge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type Props = {
  statuses: string[];
  tags: TagDefinition[];
  selectedStatuses: string[];
  selectedTags: string[];
  includeUntagged: boolean;
  resultCount: number;
  touch: boolean;
  onStatusToggle: (status: string) => void;
  onTagToggle: (tag: string) => void;
  onUntaggedToggle: () => void;
  onReset: () => void;
  onManageTags: () => void;
};

// 标签名称由用户决定，不能与表示空值的“未打标签”条件混淆。
export function getFilterTagLabel(name: string) {
  return name === "未打标签" ? "未打标签（标签）" : name;
}

export function TaskListFilterPopover({ statuses, tags, selectedStatuses, selectedTags, includeUntagged, resultCount, touch, onStatusToggle, onTagToggle, onUntaggedToggle, onReset, onManageTags }: Props) {
  const [open, setOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const active = selectedStatuses.length + selectedTags.length + Number(includeUntagged) > 0;
  const showTagSearch = tags.length > 6;
  const query = showTagSearch ? tagQuery.trim().toLowerCase() : "";
  const visibleTags = tags.filter((tag) => tag.name.toLowerCase().includes(query));

  return <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setTagQuery(""); }}>
    <PopoverTrigger render={<Button aria-label="筛选任务" className="task-workspace-list-options" data-filter-active={active || undefined} size={touch ? "icon-touch" : "icon-sm"} title="筛选任务" variant="outline" />}><ListFilter aria-hidden="true" /></PopoverTrigger>
    <PopoverContent align="start" aria-label="筛选任务" className="task-filter-popover" collisionPadding={12}>
      <div className="task-filter-heading"><strong>筛选任务</strong><button className="task-filter-text-button" disabled={!active} onClick={onReset} type="button">重置</button></div>
      <div className="task-filter-body">
        <fieldset className="task-filter-section">
          <legend>状态 <span>多选</span></legend>
          <div className="task-filter-status-options">
            {statuses.map((status) => <label className="task-filter-option" key={status}>
              <input aria-label={`状态：${status}`} checked={selectedStatuses.includes(status)} onChange={() => onStatusToggle(status)} type="checkbox" />
              <span className="task-filter-option-name">{status}</span>
            </label>)}
            {statuses.length === 0 && <p className="task-filter-empty">暂无任务状态</p>}
          </div>
        </fieldset>
        <fieldset className="task-filter-section">
          <legend>标签 <span>多选</span></legend>
          {showTagSearch && <Input aria-label="搜索筛选标签" className="task-filter-tag-search" leadingIcon={<Search />} onChange={(event) => setTagQuery(event.target.value)} placeholder="搜索标签…" value={tagQuery} />}
          <div className="task-filter-tag-options">
            {visibleTags.map((tag) => {
              const Icon = getTagIcon(tag.icon);
              return <label className="task-filter-option" key={tag.id}>
                <input aria-label={`标签：${getFilterTagLabel(tag.name)}`} checked={selectedTags.includes(tag.name)} onChange={() => onTagToggle(tag.name)} type="checkbox" />
                <Icon aria-hidden="true" size={15} style={{ color: `var(--ad-tag-${tag.color}-ink)` }} />
                <span className="task-filter-option-name" title={tag.name}>{getFilterTagLabel(tag.name)}</span>
              </label>;
            })}
            {visibleTags.length === 0 && query && <p className="task-filter-empty">没有匹配的标签</p>}
          </div>
          <label className="task-filter-option task-filter-untagged">
            <input aria-label="标签：未打标签" checked={includeUntagged} onChange={onUntaggedToggle} type="checkbox" />
            <Inbox aria-hidden="true" size={15} /><span className="task-filter-option-name">未打标签</span>
          </label>
        </fieldset>
      </div>
      <div className="task-filter-footer">
        <span aria-live="polite">{resultCount} 项匹配</span>
        <button className="task-filter-text-button" onClick={() => { setOpen(false); setTagQuery(""); onManageTags(); }} type="button">管理标签</button>
      </div>
    </PopoverContent>
  </Popover>;
}
