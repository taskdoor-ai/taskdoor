import { ChevronDown, ChevronRight, File, FileText, FileType2, Folder, FolderOpen, Image, MoreHorizontal, NotebookTabs, Pencil, RotateCcw, Sheet, Trash2, MoveRight } from "lucide-react";
import React, { type KeyboardEvent } from "react";
import type { TaskFileNode } from "../../data/taskDetailMocks";
import { getDefaultFileIcon, sortTaskFileNodes } from "../../lib/taskFileTree";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";

export type TaskFileAction = { type: "rename" | "move" | "delete" | "change-icon" | "restore-icon"; nodeId: string };

const iconMap = { File, FileText, FileType2, Folder, FolderOpen, Image, NotebookTabs, Sheet };

export function TaskFileNodeIcon({ node, expanded = false }: { node: TaskFileNode; expanded?: boolean }) {
  const iconName = node.iconName ?? (node.kind === "folder" ? expanded ? "FolderOpen" : "Folder" : getDefaultFileIcon(node.name));
  const Icon = iconMap[iconName as keyof typeof iconMap] ?? File;
  return <Icon aria-hidden="true" size={15} />;
}

export function TaskFileTree({ expandedIds, nodes, onAction, onExpandedChange, onSelect, selectedId }: {
  expandedIds: Set<string>;
  nodes: TaskFileNode[];
  onAction: (action: TaskFileAction) => void;
  onExpandedChange: (ids: Set<string>) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const visible = nodes.filter((node) => !node.archived);
  const toggle = (id: string) => { const next = new Set(expandedIds); next.has(id) ? next.delete(id) : next.add(id); onExpandedChange(next); };
  const rows: Array<{ node: TaskFileNode; level: number }> = [];
  const collect = (parentId: string | null, level: number) => sortTaskFileNodes(visible.filter((node) => node.parentId === parentId)).forEach((node) => { rows.push({ node, level }); if (node.kind === "folder" && expandedIds.has(node.id)) collect(node.id, level + 1); });
  collect(null, 1);

  const keyDown = (event: KeyboardEvent, index: number) => {
    const current = rows[index]?.node;
    if (!current) return;
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = Math.min(rows.length - 1, index + 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, index - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = rows.length - 1;
    else if (event.key === "ArrowRight" && current.kind === "folder") { if (!expandedIds.has(current.id)) toggle(current.id); else nextIndex = Math.min(rows.length - 1, index + 1); }
    else if (event.key === "ArrowLeft") { if (current.kind === "folder" && expandedIds.has(current.id)) toggle(current.id); else if (current.parentId) nextIndex = rows.findIndex((row) => row.node.id === current.parentId); }
    else return;
    event.preventDefault();
    const target = rows[nextIndex]?.node;
    if (target) { onSelect(target.id); window.setTimeout(() => document.getElementById(`task-file-node-${target.id}`)?.focus(), 0); }
  };

  return <div aria-label="任务文件结构" className="task-file-explorer-tree" role="tree">{rows.map(({ node, level }, index) => {
    const expanded = node.kind === "folder" && expandedIds.has(node.id);
    const childCount = visible.filter((item) => item.parentId === node.id).length;
    return <div aria-expanded={node.kind === "folder" ? expanded : undefined} aria-level={level} aria-selected={selectedId === node.id} className={`task-file-explorer-row ${selectedId === node.id ? "active" : ""}`} id={`task-file-node-${node.id}`} key={node.id} onClick={() => onSelect(node.id)} onKeyDown={(event) => keyDown(event, index)} role="treeitem" style={{ paddingLeft: 8 + (level - 1) * 16 }} tabIndex={selectedId === node.id || (!selectedId && index === 0) ? 0 : -1}>
      {node.kind === "folder" ? <button aria-label={expanded ? `收起${node.name}` : `展开${node.name}`} className="task-file-explorer-chevron" onClick={(event) => { event.stopPropagation(); toggle(node.id); }} type="button">{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button> : <span className="task-file-explorer-chevron" />}
      <TaskFileNodeIcon expanded={expanded} node={node} />
      <span className="task-file-explorer-name" title={node.name}>{node.name}</span>
      {node.kind === "folder" && childCount > 0 && <small>{childCount}</small>}
      <DropdownMenu><DropdownMenuTrigger aria-label={`${node.name}的更多操作`} className="task-file-explorer-more" onClick={(event) => event.stopPropagation()}><MoreHorizontal aria-hidden="true" size={16} /></DropdownMenuTrigger><DropdownMenuContent align="end" className="task-file-explorer-menu">
        <DropdownMenuItem onClick={() => onAction({ type: "rename", nodeId: node.id })}><Pencil size={14} />重命名</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction({ type: "move", nodeId: node.id })}><MoveRight size={14} />移动到</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction({ type: "change-icon", nodeId: node.id })}><NotebookTabs size={14} />更换图标</DropdownMenuItem>
        {node.iconName && <DropdownMenuItem onClick={() => onAction({ type: "restore-icon", nodeId: node.id })}><RotateCcw size={14} />恢复默认</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction({ type: "delete", nodeId: node.id })} variant="destructive"><Trash2 size={14} />{node.kind === "folder" ? "删除文件夹" : "删除文件"}</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
    </div>;
  })}</div>;
}
