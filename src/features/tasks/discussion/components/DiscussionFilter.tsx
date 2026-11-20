import { ListFilter, Search, X } from "lucide-react";
import { useRef } from "react";
import type { DiscussionScope } from "@/features/tasks/discussion/lib/discussion-filter";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import "@/features/tasks/styles/task-pane-toolbar.css";
import "@/features/tasks/styles/task-filter-shared.css";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/shared/ui/dropdown-menu";

type Props = {
  query: string;
  scope: DiscussionScope;
  attachmentsOnly: boolean;
  disabled?: boolean;
  onQueryChange: (query: string) => void;
  onScopeChange: (scope: DiscussionScope) => void;
  onAttachmentsChange: (value: boolean) => void;
};

export function DiscussionFilter({ query, scope, attachmentsOnly, disabled, onQueryChange, onScopeChange, onAttachmentsChange }: Props) {
  const { locale } = useI18n();
  const en = locale === "en";
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const options: [DiscussionScope, string][] = [["all", en ? "All discussions" : "全部讨论"], ["related", en ? "Related to me" : "与我有关"], ["mine", en ? "Posted by me" : "我发布的"], ["my-replies", en ? "My replies to others" : "我回复别人"], ["replies-to-me", en ? "Others' replies to me" : "别人回复我"]];
  const filtered = scope !== "all" || attachmentsOnly;
  const filterLabel = [en ? "Filter discussions" : "筛选讨论", ...(scope === "all" ? [] : [options.find(option => option[0] === scope)?.[1]]), ...(attachmentsOnly ? [en ? "With attachments" : "包含附件"] : [])].join(" · ");
  const selectionLabel = [scope === "all" ? "" : options.find(option => option[0] === scope)?.[1], attachmentsOnly ? en ? "With attachments" : "包含附件" : ""].filter(Boolean).join(" · ");
  const clearSelection = () => {
    onScopeChange("all");
    onAttachmentsChange(false);
    triggerRef.current?.focus();
  };
  return <div className="discussion-filter" role="search" aria-label={en ? "Search discussions" : "搜索讨论"}>
    <div className="discussion-filter-search-row">
    <div className="discussion-filter-search">
      <Input ref={searchRef} aria-label={en ? "Search discussion text, authors or attachments" : "搜索讨论正文、发布人或附件名"} disabled={disabled} leadingIcon={<Search />} onChange={event => onQueryChange(event.target.value)} placeholder={en ? "Search" : "搜索"} value={query} />
      {query && <Button aria-label={en ? "Clear search" : "清除搜索"} className="discussion-filter-search-clear" disabled={disabled} onClick={() => { onQueryChange(""); searchRef.current?.focus(); }} size="icon-xs" variant="ghost"><X aria-hidden="true" /></Button>}
    </div>
    </div>
    <div className="discussion-filter-selection" data-active={filtered || undefined}>
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={filterLabel} className="discussion-filter-trigger" data-active={filtered || undefined} disabled={disabled} ref={triggerRef} render={<Button size="sm" variant="ghost" />} title={filterLabel}>
        <span className="discussion-filter-trigger-icon"><ListFilter aria-hidden="true" /></span>
        {filtered && <span className="discussion-filter-selection-label">{selectionLabel}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="discussion-filter-menu">
        <DropdownMenuRadioGroup value={scope} onValueChange={value => onScopeChange(value as DiscussionScope)}>
          {options.map(([value, label]) => <DropdownMenuRadioItem closeOnClick key={value} value={value}>{label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={attachmentsOnly} onCheckedChange={onAttachmentsChange} closeOnClick={false}>{en ? "Discussions with attachments" : "包含附件的讨论"}</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {filtered && <Button aria-label={en ? "Clear discussion filters" : "清除讨论筛选"} className="discussion-filter-clear" disabled={disabled} onClick={clearSelection} size="icon-xs" title={en ? "Clear filters" : "清除筛选"} variant="ghost"><X aria-hidden="true" /></Button>}
    </div>
  </div>;
}
