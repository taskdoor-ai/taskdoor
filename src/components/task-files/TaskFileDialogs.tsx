import { File, FileText, FileType2, Folder, Image, NotebookTabs, Sheet } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { TaskFileNode } from "../../data/taskDetailMocks";
import { getDescendantIds, getNodePath, sortTaskFileNodes, type FolderDeletePolicy } from "../../lib/taskFileTree";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

export type TaskFileDialogState = { type: "create"; parentId: string | null } | { type: "rename" | "move" | "delete" | "icon"; nodeId: string } | null;
const iconOptions = [{ name: "Folder", label: "文件夹", Icon: Folder }, { name: "File", label: "文件", Icon: File }, { name: "FileText", label: "文档", Icon: FileText }, { name: "FileType2", label: "文本", Icon: FileType2 }, { name: "Sheet", label: "表格", Icon: Sheet }, { name: "Image", label: "图片", Icon: Image }, { name: "NotebookTabs", label: "笔记", Icon: NotebookTabs }];

export function TaskFileDialogs({ dialog, nodes, onClose, onCreate, onDelete, onIcon, onMove, onRename }: {
  dialog: TaskFileDialogState; nodes: TaskFileNode[]; onClose: () => void;
  onCreate: (parentId: string | null, name: string) => void; onDelete: (nodeId: string, policy?: FolderDeletePolicy) => void;
  onIcon: (nodeId: string, iconName: string) => void; onMove: (nodeId: string, parentId: string | null) => void; onRename: (nodeId: string, name: string) => void;
}) {
  const node = dialog && "nodeId" in dialog ? nodes.find((item) => item.id === dialog.nodeId) : undefined;
  const [name, setName] = useState(""); const [target, setTarget] = useState<string | null>(null); const [policy, setPolicy] = useState<FolderDeletePolicy>("move-contents"); const [error, setError] = useState("");
  useEffect(() => { setName(dialog?.type === "rename" ? node?.name ?? "" : ""); setTarget(node?.parentId ?? (dialog?.type === "create" ? dialog.parentId : null)); setPolicy("move-contents"); setError(""); }, [dialog, node?.id]);
  if (!dialog) return null;
  const run = (action: () => void) => { try { action(); onClose(); } catch (reason) { setError(reason instanceof Error ? reason.message : "操作失败"); } };
  const title = dialog.type === "create" ? "新建文件夹" : dialog.type === "rename" ? "重命名" : dialog.type === "move" ? "移动到" : dialog.type === "icon" ? "更换图标" : node?.kind === "folder" ? "删除文件夹" : "删除文件";
  const invalidTargets = node ? new Set([node.id, ...getDescendantIds(nodes, node.id)]) : new Set<string>();
  const folders = sortTaskFileNodes(nodes.filter((item) => item.kind === "folder" && !item.archived && !invalidTargets.has(item.id)));
  const children = node ? nodes.filter((item) => item.parentId === node.id && !item.archived).length : 0;
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="task-file-action-dialog"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{dialog.type === "create" ? `创建位置：${dialog.parentId ? getNodePath(nodes, dialog.parentId).map((item) => item.name).join(" / ") : "任务文件根目录"}` : node?.name}</DialogDescription></DialogHeader>
    {(dialog.type === "create" || dialog.type === "rename") && <label className="task-file-dialog-field"><span>名称</span><input autoFocus onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") run(() => dialog.type === "create" ? onCreate(dialog.parentId, name) : onRename(node!.id, name)); }} value={name} /></label>}
    {dialog.type === "move" && <div className="task-file-dialog-targets"><button className={target === null ? "active" : ""} onClick={() => setTarget(null)} type="button"><Folder size={15} />任务文件根目录</button>{folders.map((folder) => <button className={target === folder.id ? "active" : ""} key={folder.id} onClick={() => setTarget(folder.id)} type="button" style={{ paddingLeft: 14 + (getNodePath(nodes, folder.id).length - 1) * 14 }}><Folder size={15} />{folder.name}</button>)}</div>}
    {dialog.type === "icon" && <div className="task-file-icon-grid">{iconOptions.map(({ name: iconName, label, Icon }) => <button key={iconName} onClick={() => run(() => onIcon(node!.id, iconName))} title={label} type="button"><Icon size={18} /><span>{label}</span></button>)}</div>}
    {dialog.type === "delete" && node?.kind === "folder" && children > 0 && <div className="task-file-delete-policies"><p>此文件夹包含 {children} 个直接子项，请选择处理方式。</p><label><input checked={policy === "move-contents"} name="folder-delete-policy" onChange={() => setPolicy("move-contents")} type="radio" />将内容移动到上一级后删除</label><label><input checked={policy === "archive"} name="folder-delete-policy" onChange={() => setPolicy("archive")} type="radio" />将整个文件夹及内容归档</label></div>}
    {dialog.type === "delete" && (node?.kind === "file" || children === 0) && <p className="task-file-delete-copy">删除后可通过页面底部提示立即撤销。</p>}
    {error && <p className="task-file-dialog-error" role="alert">{error}</p>}
    {dialog.type !== "icon" && <DialogFooter><Button onClick={onClose} variant="outline">取消</Button><Button disabled={(dialog.type === "create" || dialog.type === "rename") ? !name.trim() : false} onClick={() => run(() => { if (dialog.type === "create") onCreate(dialog.parentId, name); else if (dialog.type === "rename") onRename(node!.id, name); else if (dialog.type === "move") onMove(node!.id, target); else onDelete(node!.id, node?.kind === "folder" ? policy : undefined); })} variant={dialog.type === "delete" ? "destructive" : "default"}>{dialog.type === "delete" ? "确认删除" : dialog.type === "move" ? "移动" : "保存"}</Button></DialogFooter>}
  </DialogContent></Dialog>;
}
