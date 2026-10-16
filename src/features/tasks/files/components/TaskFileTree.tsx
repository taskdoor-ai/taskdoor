import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2, MoveRight } from "lucide-react";
import React from "react";
import { Button as AriaButton, Tree, TreeItem, TreeItemContent } from "react-aria-components";
import type { TaskFileNode } from "@/shared/model/task-model";
import { sortTaskFileNodes } from "@/features/tasks/files/lib/task-file-tree";
import { getTaskFileNodeIcon } from "@/features/tasks/files/lib/task-file-icons";
import { TaskFileGlyph } from "@/features/tasks/files/components/TaskFileGlyph";
import { TaskFileName } from "@/features/tasks/files/components/TaskFileName";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";

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
    <DropdownMenuTrigger
      aria-label={ui("{0}的更多操作", {0: node.name})}
      className={cn("task-file-explorer-more", className)}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => { if (event.key !== "Tab") event.stopPropagation(); }}
      onKeyUp={(event) => { if (event.key !== "Tab") event.stopPropagation(); }}
      render={<Button size="icon-sm" variant="ghost" />}
      tabIndex={tabIndex}
    >
      <MoreHorizontal aria-hidden="true" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="task-workspace-row-menu" sideOffset={4} onClick={(event) => event.stopPropagation()}>
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={() => onAction({ type: "rename", nodeId: node.id })}><Pencil aria-hidden="true" size={15} />{d('rename')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction({ type: "move", nodeId: node.id })}><MoveRight aria-hidden="true" size={15} />{ui("移动到")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction({ type: "delete", nodeId: node.id })} variant="destructive"><Trash2 aria-hidden="true" size={15} />{ui("删除")}</DropdownMenuItem>
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
  const childrenByParent = new Map<string | null, TaskFileNode[]>();
  for (const node of sortTaskFileNodes(visible)) {
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  }
  const toggleFolder = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onExpandedChange(next);
  };

  const renderNode = (node: TaskFileNode): React.ReactElement => {
    const children = childrenByParent.get(node.id) ?? [];
    const displayName = mock.text(node.name);
    return <TreeItem
      className={({ isSelected }) => cn("task-file-explorer-row", isSelected && "active")}
      data-node-id={node.id}
      data-node-kind={node.kind}
      hasChildItems={node.kind === "folder"}
      id={node.id}
      key={node.id}
      onPress={() => {
        if (node.kind === "folder") toggleFolder(node.id);
        // Press also opens the current file again after returning to the
        // narrow-screen tree, even when its selection has not changed.
        else onSelect(node.id);
      }}
      textValue={displayName}
    >
      <TreeItemContent>{({ isExpanded, isFocused }) => <>
        {node.kind === "folder" ? <AriaButton
          aria-label={isExpanded ? ui("收起{0}", {0: displayName}) : ui("展开{0}", {0: displayName})}
          className="task-file-explorer-chevron"
          preventFocusOnPress
          slot="chevron"
        >{isExpanded ? <ChevronDown aria-hidden="true" size={13} /> : <ChevronRight aria-hidden="true" size={13} />}</AriaButton> : <span aria-hidden="true" className="task-file-explorer-chevron" />}
        <TaskFileGlyph compact expanded={isExpanded} node={node} />
        <TaskFileName className="task-file-explorer-name" name={displayName} />
        {node.kind === "folder" && children.length > 0 && <small>{children.length}</small>}
        <TaskFileNodeMenu node={node} onAction={onAction} tabIndex={isFocused ? 0 : -1} />
      </>}</TreeItemContent>
      {children.map(renderNode)}
    </TreeItem>;
  };

  return <Tree
    aria-label={ui("任务文件结构")}
    className="task-file-explorer-tree"
    disallowEmptySelection
    expandedKeys={expandedIds}
    keyboardNavigationBehavior="tab"
    onExpandedChange={(keys) => onExpandedChange(new Set([...keys].map(String)))}
    onSelectionChange={(keys) => {
      if (keys === "all") return;
      const key = keys.values().next().value;
      // Arrow navigation may focus a folder without replacing the open file.
      if (key !== undefined && visible.some((node) => node.id === String(key) && node.kind === "file")) onSelect(String(key));
    }}
    selectedKeys={selectedId ? [selectedId] : []}
    selectionBehavior="replace"
    selectionMode="single"
  >{(childrenByParent.get(null) ?? []).map(renderNode)}</Tree>;
}
