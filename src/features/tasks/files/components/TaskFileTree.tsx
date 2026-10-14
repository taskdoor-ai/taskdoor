import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2, MoveRight } from "lucide-react";
import React, { type KeyboardEvent } from "react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { sortTaskFileNodes } from "@/features/tasks/files/lib/task-file-tree";
import { getTaskFileNodeIcon } from "@/features/tasks/files/lib/task-file-icons";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

export type TaskFileAction = { type: "rename" | "move" | "delete"; nodeId: string };

export function TaskFileNodeIcon({ node, expanded = false }: { node: TaskFileNode; expanded?: boolean }) {
  const Icon = getTaskFileNodeIcon(node, expanded);
  return <Icon aria-hidden="true" size={15} />;
}

export function TaskFileNodeMenu({ node, onAction, className = "", tabIndex }: {
  node: TaskFileNode;
  onAction: (action: TaskFileAction) => void;
  className?: string;
  tabIndex?: number;
}) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  return <DropdownMenu>
    <DropdownMenuTrigger aria-label={ui("{0}的更多操作", {0: node.name})} className={cn("task-file-explorer-more", className)} onClick={(event) => event.stopPropagation()} render={<Button size="icon-sm" variant="ghost" />} tabIndex={tabIndex}>
      <MoreHorizontal aria-hidden="true" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="task-workspace-row-menu" sideOffset={4} onClick={(event) => event.stopPropagation()}>
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => onAction({ type: "rename", nodeId: node.id })}><Pencil aria-hidden="true" size={15} />{d('rename')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction({ type: "move", nodeId: node.id })}><MoveRight aria-hidden="true" size={15} />{ui("移动到")}</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => onAction({ type: "delete", nodeId: node.id })} variant="destructive"><Trash2 aria-hidden="true" size={15} />{node.kind === "folder" ? ui("删除文件夹") : ui("删除文件")}</DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}

export function TaskFileTree({ expandedIds, nodes, onAction, onExpandedChange, onSelect, selectedId }: {
  expandedIds: Set<string>;
  nodes: TaskFileNode[];
  onAction: (action: TaskFileAction) => void;
  onExpandedChange: (ids: Set<string>) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const ui = useGlobalUi();
  const mock = useMockText();
  const visible = nodes.filter((node) => !node.archived);
  const toggle = (id: string) => { const next = new Set(expandedIds); next.has(id) ? next.delete(id) : next.add(id); onExpandedChange(next); };
  const rows: Array<{ node: TaskFileNode; level: number }> = [];
  const collect = (parentId: string | null, level: number) => sortTaskFileNodes(visible.filter((node) => node.parentId === parentId)).forEach((node) => { rows.push({ node, level }); if (node.kind === "folder" && expandedIds.has(node.id)) collect(node.id, level + 1); });
  collect(null, 1);
  const focusableId = rows.some((row) => row.node.id === selectedId) ? selectedId : rows[0]?.node.id;

  const keyDown = (event: KeyboardEvent, index: number) => {
    if (event.target !== event.currentTarget) return;
    const current = rows[index]?.node;
    if (!current) return;
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = Math.min(rows.length - 1, index + 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, index - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = rows.length - 1;
    else if (event.key === "ArrowRight" && current.kind === "folder") { if (!expandedIds.has(current.id)) toggle(current.id); else if (rows[index + 1]?.node.parentId === current.id) nextIndex = index + 1; }
    else if (event.key === "ArrowLeft") { if (current.kind === "folder" && expandedIds.has(current.id)) toggle(current.id); else if (current.parentId) nextIndex = rows.findIndex((row) => row.node.id === current.parentId); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(current.id); return; }
    else return;
    event.preventDefault();
    const target = rows[nextIndex]?.node;
    if (target) { onSelect(target.id); window.setTimeout(() => document.getElementById(`task-file-node-${target.id}`)?.focus(), 0); }
  };

  return <div aria-label={ui("任务文件结构")} className="task-file-explorer-tree" role="tree">{rows.map(({ node, level }, index) => {
    const expanded = node.kind === "folder" && expandedIds.has(node.id);
    const childCount = visible.filter((item) => item.parentId === node.id).length;
    return <div aria-expanded={node.kind === "folder" ? expanded : undefined} aria-level={level} aria-selected={selectedId === node.id} className={`task-file-explorer-row ${selectedId === node.id ? "active" : ""}`} id={`task-file-node-${node.id}`} key={node.id} onClick={() => onSelect(node.id)} onKeyDown={(event) => keyDown(event, index)} role="treeitem" style={{ paddingLeft: 8 + (level - 1) * 16 }} tabIndex={focusableId === node.id ? 0 : -1}>
      {node.kind === "folder" ? <button aria-label={expanded ? ui("收起{0}", {0: node.name}) : ui("展开{0}", {0: node.name})} className="task-file-explorer-chevron" onClick={(event) => { event.stopPropagation(); toggle(node.id); }} tabIndex={-1} type="button">{expanded ? <ChevronDown aria-hidden="true" size={13} /> : <ChevronRight aria-hidden="true" size={13} />}</button> : <span aria-hidden="true" className="task-file-explorer-chevron" />}
      <TaskFileNodeIcon expanded={expanded} node={node} />
      <span className="task-file-explorer-name" title={mock.text(node.name)}>{mock.text(node.name)}</span>
      {node.kind === "folder" && childCount > 0 && <small>{childCount}</small>}
      <TaskFileNodeMenu node={node} onAction={onAction} tabIndex={focusableId === node.id ? 0 : -1} />
    </div>;
  })}</div>;
}
