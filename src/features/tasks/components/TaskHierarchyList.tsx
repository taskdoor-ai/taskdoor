import { useEffect, useMemo, useRef, type CSSProperties, type Dispatch, type KeyboardEvent, type ReactNode, type SetStateAction } from "react";
import type { TaskHierarchyNode } from "@/features/tasks/lib/task-list-hierarchy";

export type TaskHierarchyRowState = {
  context: boolean;
  directChildCount: number;
  expanded?: boolean;
  level: number;
  onToggle?: () => void;
  pathUnavailable: boolean;
};
export type TaskHierarchyExpansion = Record<string, ReadonlySet<string>>;

type Props = {
  roots: TaskHierarchyNode[];
  ancestorsByTaskId: ReadonlyMap<string, string[]>;
  selectedTaskId: string | null;
  queryKey: string;
  filtered: boolean;
  label: string;
  savedExpansion: TaskHierarchyExpansion;
  setSavedExpansion: Dispatch<SetStateAction<TaskHierarchyExpansion>>;
  renderRow: (node: TaskHierarchyNode, state: TaskHierarchyRowState) => ReactNode;
};

/** Expansion is a reading preference, independent from the matching result set. */
export function TaskHierarchyList({ roots, ancestorsByTaskId, selectedTaskId, queryKey, filtered, label, renderRow, savedExpansion, setSavedExpansion }: Props) {
  const containerRef = useRef<HTMLUListElement>(null);
  const defaults = useMemo(() => {
    const ids = new Set<string>();
    const visit = (nodes: TaskHierarchyNode[]) => nodes.forEach(node => {
      if (filtered && node.children.length) ids.add(node.task.id);
      if (filtered) visit(node.children);
    });
    visit(roots);
    return ids;
  }, [roots, filtered]);
  const expanded = savedExpansion[queryKey] ?? defaults;
  const expandedRef = useRef(expanded);
  const previousSelectionRef = useRef({ selectedTaskId, queryKey });
  expandedRef.current = expanded;
  useEffect(() => {
    const previousSelection = previousSelectionRef.current;
    const navigatedToTask = previousSelection.queryKey === queryKey && previousSelection.selectedTaskId !== selectedTaskId;
    previousSelectionRef.current = { selectedTaskId, queryKey };
    // Opening the view does not expand the tree around an already selected task.
    const path = filtered || navigatedToTask ? ancestorsByTaskId.get(selectedTaskId ?? "") ?? [] : [];
    setSavedExpansion(current => {
      const previous = current[queryKey] ?? expandedRef.current;
      if (current[queryKey] && path.every(id => previous.has(id))) return current;
      return { ...current, [queryKey]: new Set([...previous, ...path]) };
    });
    // A manual collapse must survive unrelated data refreshes and sorting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId, queryKey]);

  const toggle = (id: string) => setSavedExpansion(current => {
    const next = new Set(current[queryKey] ?? expandedRef.current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { ...current, [queryKey]: next };
  });
  const visibleNodes: TaskHierarchyNode[] = [];
  const flatten = (nodes: TaskHierarchyNode[]) => nodes.forEach(node => {
    visibleNodes.push(node);
    if (expanded.has(node.task.id)) flatten(node.children);
  });
  flatten(roots);
  const focusNode = (id?: string) => {
    if (!id) return;
    const item = [...(containerRef.current?.querySelectorAll<HTMLElement>("[data-tree-row]") ?? [])].find(row => row.dataset.treeRow === id);
    (item?.querySelector<HTMLButtonElement>(".task-workspace-row:not(:disabled)") ?? item?.querySelector<HTMLButtonElement>(".task-tree-toggle:not(:disabled)"))?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const target = event.target as HTMLElement;
    if (!target.matches(".task-workspace-row, .task-tree-toggle")) return;
    const id = target.closest<HTMLElement>("[data-tree-row]")?.dataset.treeRow;
    const index = visibleNodes.findIndex(node => node.task.id === id);
    const node = visibleNodes[index];
    if (!node) return;
    if (event.key === "ArrowDown") focusNode(visibleNodes[Math.min(index + 1, visibleNodes.length - 1)]?.task.id);
    else if (event.key === "ArrowUp") focusNode(visibleNodes[Math.max(index - 1, 0)]?.task.id);
    else if (event.key === "Home") focusNode(visibleNodes[0]?.task.id);
    else if (event.key === "End") focusNode(visibleNodes.at(-1)?.task.id);
    else if (event.key === "ArrowRight") {
      if (node.children.length && !expanded.has(node.task.id)) toggle(node.task.id);
      else focusNode(node.children[0]?.task.id);
    } else if (event.key === "ArrowLeft") {
      if (node.children.length && expanded.has(node.task.id)) toggle(node.task.id);
      else focusNode(ancestorsByTaskId.get(node.task.id)?.at(-1));
    } else return;
    event.preventDefault();
  };
  const renderNode = (node: TaskHierarchyNode, divided = false): ReactNode => {
    const isExpanded = expanded.has(node.task.id);
    return <li aria-expanded={node.children.length ? isExpanded : undefined} aria-level={node.level + 1} aria-selected={node.matches && node.task.id === selectedTaskId} className="task-tree-item" data-divided={divided || undefined} key={node.task.id} role="treeitem">
      {renderRow(node, { context: !node.matches, directChildCount: node.directChildCount, expanded: node.children.length ? isExpanded : undefined, level: node.level, onToggle: node.children.length ? () => toggle(node.task.id) : undefined, pathUnavailable: node.pathUnavailable })}
      {node.children.length > 0 && <ul className="task-tree-group" hidden={!isExpanded} role="group" style={{ "--task-tree-depth": Math.min(node.level, 5) } as CSSProperties}>{node.children.map(child => renderNode(child))}</ul>}
    </li>;
  };
  return <ul aria-label={label} className="task-workspace-rows task-list-hierarchy" onKeyDown={onKeyDown} ref={containerRef} role="tree">{roots.map((node, index) => renderNode(node, index > 0 && roots[index - 1].pinnedBranch && !node.pinnedBranch))}</ul>;
}
