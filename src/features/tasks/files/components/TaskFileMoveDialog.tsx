import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { Button as AriaButton, Tree, TreeItem, TreeItemContent } from "react-aria-components";
import type { TaskFileNode } from "@/shared/model/task-model";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/shared/ui/empty";
import { Input } from "@/shared/ui/input";
import { canMoveTaskFileTo, getTaskFileMoveDestinations, searchTaskFileMoveDestinations, type TaskFileMoveDestination } from "@/features/tasks/files/lib/task-file-action-options";
import { getNodePath } from "@/features/tasks/files/lib/task-file-tree";
import "@/features/tasks/styles/task-file-move-dialog.css";

const rootKey = "__task-files-root__";

export function TaskFileMoveDialog({ nodeId, nodes, onClose, onMove }: {
  nodeId: string;
  nodes: TaskFileNode[];
  onClose: () => void;
  onMove: (nodeId: string, parentId: string | null) => void | Promise<void>;
}) {
  const ui = useGlobalUi();
  const node = nodes.find(item => item.id === nodeId && !item.archived);
  const destinations = getTaskFileMoveDestinations(nodes, nodeId);
  const [target, setTarget] = useState<string | null>(node?.parentId ?? null);
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState(() => new Set([
    rootKey,
    ...(node?.parentId && destinations.some(destination => destination.id === node.parentId) ? getNodePath(nodes, node.parentId).map(item => item.id) : []),
  ]));
  const [collapsedSearchIds, setCollapsedSearchIds] = useState(new Set<string>());
  const [error, setError] = useState("");
  const [moving, setMoving] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const result = searchTaskFileMoveDestinations(destinations, query);
  const searching = Boolean(query.trim());
  const visibleKeys = result.destinations.map(destination => destination.id ?? rootKey);
  const treeExpandedIds = searching ? new Set(visibleKeys.filter(id => !collapsedSearchIds.has(id))) : expandedIds;
  const targetAvailable = destinations.some(destination => destination.id === target);
  const canSubmit = !moving && canMoveTaskFileTo(nodes, nodeId, target);
  const pathFor = (id: string | null) => [ui("任务文件"), ...(id ? getNodePath(nodes, id).map(item => item.name) : [])].join(" / ");
  const targetPath = targetAvailable ? pathFor(target) : ui("位置已不可用，请重新选择文件夹。");
  const message = error ? ui(error) : (!node ? ui("文件项目不存在") : !targetAvailable ? ui("位置已不可用，请重新选择文件夹。") : "");
  const childrenByParent = new Map<string, TaskFileMoveDestination[]>();
  for (const destination of result.destinations) {
    if (destination.id === null) continue;
    const parent = destination.node?.parentId ?? rootKey;
    const children = childrenByParent.get(parent) ?? [];
    children.push(destination);
    childrenByParent.set(parent, children);
  }
  const search = (value: string) => { setQuery(value); setCollapsedSearchIds(new Set()); };
  const submit = async () => {
    if (submitting.current || !canMoveTaskFileTo(nodes, nodeId, target)) return;
    submitting.current = true;
    setMoving(true);
    setError("");
    try { await onMove(nodeId, target); if (mounted.current) onClose(); }
    catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : ui("移动失败，请重试。")); }
    finally { submitting.current = false; if (mounted.current) setMoving(false); }
  };
  const renderDestination = (destination: TaskFileMoveDestination): ReactElement => {
    const key = destination.id ?? rootKey;
    const name = destination.node?.name ?? ui("任务文件");
    const children = childrenByParent.get(key) ?? [];
    return <TreeItem className="task-file-move-row" data-destination-id={destination.id ?? rootKey} hasChildItems={children.length > 0} id={key} key={key} textValue={name}>
      <TreeItemContent>{({ isExpanded }) => <>
        {children.length > 0 ? <AriaButton aria-label={isExpanded ? ui("收起{0}", {0: name}) : ui("展开{0}", {0: name})} className="task-file-move-chevron" preventFocusOnPress slot="chevron">{isExpanded ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}</AriaButton> : <span aria-hidden="true" className="task-file-move-chevron" />}
        <span className="task-file-move-name" title={pathFor(destination.id)}>{name}</span>
        {node?.parentId === destination.id && <span className="task-file-move-current">{ui("当前")}</span>}
      </>}</TreeItemContent>
      {children.map(renderDestination)}
    </TreeItem>;
  };

  return <Dialog open onOpenChange={open => { if (!open && !submitting.current) onClose(); }}>
    <DialogContent className="task-file-move-dialog" overlayForceRender onKeyDownCapture={event => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (!submitting.current) onClose();
    }}>
      <DialogHeader className="task-file-move-header">
        <DialogTitle>{node ? ui("移动 {0} 到…", {0: node.name}) : ui("移动文件")}</DialogTitle>
        <DialogDescription className="sr-only">{ui("选择目标文件夹")}</DialogDescription>
      </DialogHeader>
      <div className="task-file-move-search">
        <Input aria-label={ui("搜索文件夹")} disabled={moving} leadingIcon={<Search />} onChange={event => search(event.target.value)} placeholder={ui("搜索文件夹")} value={query} />
        {query && <Button aria-label={ui("清除搜索")} className="task-file-move-search-clear" disabled={moving} onClick={() => search("")} size="icon-xs" variant="ghost"><X /></Button>}
      </div>
      <div className="task-file-move-body">
        {result.destinations.length ? <Tree aria-label={ui("选择目标文件夹")} className="task-file-move-tree" disabledBehavior="all" disabledKeys={moving ? visibleKeys : []} disallowEmptySelection expandedKeys={treeExpandedIds} onExpandedChange={keys => {
          const next = new Set([...keys].map(String));
          if (searching) setCollapsedSearchIds(new Set(visibleKeys.filter(id => !next.has(id))));
          else setExpandedIds(next);
        }} onSelectionChange={keys => {
          if (keys === "all" || moving) return;
          const key = keys.values().next().value;
          if (key === undefined) return;
          const id = String(key) === rootKey ? null : String(key);
          if (!destinations.some(destination => destination.id === id)) return;
          setTarget(id); setError("");
        }} selectedKeys={[target ?? rootKey]} selectionBehavior="replace" selectionMode="single">{result.destinations.filter(destination => destination.id === null).map(renderDestination)}</Tree> : <Empty className="task-file-move-empty"><EmptyHeader><EmptyTitle>{ui(node ? "没有匹配的文件夹" : "文件项目不存在")}</EmptyTitle>{searching && <EmptyDescription>{ui("试试其他名称，或清除搜索。")}</EmptyDescription>}</EmptyHeader>{searching && <Button disabled={moving} onClick={() => search("")} size="sm" variant="outline">{ui("清除搜索")}</Button>}</Empty>}
      </div>
      {message && <p className="task-file-move-error" role="alert">{message}</p>}
      <footer className="task-file-move-footer">
        <div aria-label={ui("目标位置")} aria-live="polite" className="task-file-move-target" title={targetPath}>{targetPath}</div>
        <div className="task-file-move-buttons"><Button disabled={moving} onClick={onClose} variant="outline">{ui("取消")}</Button><Button disabled={!canSubmit} onClick={() => { void submit(); }}>{ui(moving ? "正在移动…" : "移动到此处")}</Button></div>
      </footer>
    </DialogContent>
  </Dialog>;
}
