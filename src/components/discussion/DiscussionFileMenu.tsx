import { useGlobalUi } from "../../i18n/globalUi";
import { Check, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { TaskFileNode } from "../../data/taskDetailMocks";
import { sortTaskFileNodes } from "../../lib/taskFileTree";
import { searchTaskFiles } from "../../lib/taskFileSearch";
import { TaskFileNodeIcon } from "../task-files/TaskFileTree";
import { Button } from "../ui/button";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "../ui/dropdown-menu";
import { Input } from "../ui/input";

/** Browse the same folder hierarchy as the task's file list. Only files can be attached. */
export function DiscussionFileMenu({ files, selectedIds, onSelect, parentId = null }: {
  files: TaskFileNode[];
  selectedIds: Set<string>;
  onSelect: (file: TaskFileNode) => void;
  parentId?: string | null;
}) {
  const ui = useGlobalUi();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const searching = parentId === null && Boolean(query.trim());
  const matches = useMemo(() => searching ? searchTaskFiles(files, query) : [], [files, query, searching]);
  const children = sortTaskFileNodes(files.filter(file => !file.archived && file.parentId === parentId));
  const availableItems = () => Array.from(itemsRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"]):not([data-disabled])') ?? []);
  const fileItem = (file: TaskFileNode, folderPath?: string) => <DropdownMenuItem aria-label={`${file.name}${selectedIds.has(file.id) ? ui("，已添加") : ""}`} className="discussion-composer-file-option" disabled={selectedIds.has(file.id)} key={file.id} onClick={() => onSelect(file)} title={folderPath ? `${folderPath} / ${file.name}` : file.name}>
    <TaskFileNodeIcon node={file} /><span className="flex min-w-0 flex-1 flex-col"><span className="truncate">{file.name}</span>{folderPath && <small className="discussion-composer-file-path truncate" title={folderPath}>{folderPath}</small>}</span>{selectedIds.has(file.id) && <Check aria-hidden="true" size={15} />}
  </DropdownMenuItem>;
  return <>
    {parentId === null && <div className="discussion-composer-file-search">
      <Input aria-label={ui("搜索任务文件")} autoFocus className="h-8" leadingIcon={<Search size={15} />} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) { event.stopPropagation(); return; }
        if (event.key === "Escape" || event.key === "Tab") return;
        // Keep typing and caret movement out of the menu's typeahead and submenu shortcuts.
        event.stopPropagation();
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const items = availableItems();
          (event.key === "ArrowDown" ? items[0] : items.at(-1))?.focus();
        } else if (event.key === "Enter") { event.preventDefault(); if (searching) availableItems()[0]?.click(); }
      }} placeholder={ui("搜索文件或文件夹")} ref={inputRef} type="search" value={query} />
      {query && <Button aria-label={ui("清除文件搜索")} onClick={() => { setQuery(""); inputRef.current?.focus(); }} size="icon-sm" variant="ghost"><X size={14} /></Button>}
    </div>}
    <DropdownMenuGroup className="discussion-composer-file-results flex min-h-0 flex-col gap-1 overflow-y-auto" onKeyDown={event => {
      if (parentId === null && event.key === "ArrowUp" && event.target === availableItems()[0]) { event.preventDefault(); event.stopPropagation(); inputRef.current?.focus(); }
    }} ref={itemsRef}>
    {searching ? matches.length ? matches.map(({ file, folderPath }) => fileItem(file, folderPath)) : <DropdownMenuItem disabled>{ui("没有找到匹配的文件")}</DropdownMenuItem>
      : children.length ? children.map(file => file.kind === "folder"
      ? <DropdownMenuSub key={file.id}>
        <DropdownMenuSubTrigger className="discussion-composer-file-option px-3 py-2" title={file.name}><TaskFileNodeIcon node={file} /><span className="min-w-0 flex-1 truncate">{file.name}</span></DropdownMenuSubTrigger>
        <DropdownMenuSubContent aria-label={file.name} className="discussion-composer-file-menu"><DiscussionFileMenu files={files} onSelect={onSelect} parentId={file.id} selectedIds={selectedIds} /></DropdownMenuSubContent>
      </DropdownMenuSub>
      : fileItem(file))
      : <DropdownMenuItem disabled>{parentId ? ui("文件夹为空") : ui("暂无任务文件")}</DropdownMenuItem>}
    </DropdownMenuGroup>
  </>;
}
