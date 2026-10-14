import React, { useEffect, useState } from "react";
import { Folder } from "lucide-react";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import type { TaskFileNode } from "@/shared/model/task-model";
import { getNodePath, type FolderDeletePolicy } from "@/features/tasks/files/lib/task-file-tree";
import { canMoveTaskFileTo, getTaskFileMoveDestinations } from "@/features/tasks/files/lib/task-file-action-options";
import { getTaskFileNodeIcon } from "@/features/tasks/files/lib/task-file-icons";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { ScrollArea } from "@/shared/ui/scroll-area";

export type TaskFileDialogState = { type: "create"; parentId: string | null } | { type: "rename" | "move" | "delete"; nodeId: string } | null;
const rootDestinationValue = "__task-files-root__";

export function TaskFileDialogs({ dialog, nodes, onClose, onCreate, onDelete, onMove, onRename }: {
  dialog: TaskFileDialogState;
  nodes: TaskFileNode[];
  onClose: () => void;
  onCreate: (parentId: string | null, name: string) => void;
  onDelete: (nodeId: string, policy?: FolderDeletePolicy) => void;
  onMove: (nodeId: string, parentId: string | null) => void;
  onRename: (nodeId: string, name: string) => void;
}) {
  const ui = useGlobalUi();
  const node = dialog && "nodeId" in dialog ? nodes.find((item) => item.id === dialog.nodeId && !item.archived) : undefined;
  const [name, setName] = useState(dialog?.type === "rename" ? node?.name ?? "" : "");
  const [target, setTarget] = useState<string | null>(node?.parentId ?? (dialog?.type === "create" ? dialog.parentId : null));
  const [policy, setPolicy] = useState<FolderDeletePolicy>("move-contents");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(dialog?.type === "rename" ? node?.name ?? "" : "");
    setTarget(node?.parentId ?? (dialog?.type === "create" ? dialog.parentId : null));
    setPolicy("move-contents");
    setError("");
  }, [dialog, node?.id]);

  if (!dialog) return null;

  const pathFor = (parentId: string | null) => [ui("任务文件"), ...(parentId ? getNodePath(nodes, parentId).map((item) => item.name) : [])].join(" / ");
  const currentPath = pathFor(node?.parentId ?? null);
  const destinations = node ? getTaskFileMoveDestinations(nodes, node.id) : [];
  const children = node ? nodes.filter((item) => item.parentId === node.id && !item.archived).length : 0;
  const canSubmit = dialog.type === "create" ? !!name.trim()
    : !node ? false
    : dialog.type === "rename" ? !!name.trim() && name.trim() !== node.name
    : dialog.type === "move" ? canMoveTaskFileTo(nodes, node.id, target)
    : true;
  const title = dialog.type === "create" ? "新建文件夹" : dialog.type === "rename" ? "重命名" : dialog.type === "move" ? "移动到" : node?.kind === "folder" ? "删除文件夹" : "删除文件";
  const run = (action: () => void) => {
    try { action(); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "操作失败"); }
  };
  const submit = () => {
    if (!canSubmit) return;
    run(() => {
      if (dialog.type === "create") onCreate(dialog.parentId, name.trim());
      else if (node && dialog.type === "rename") onRename(node.id, name.trim());
      else if (node && dialog.type === "move") onMove(node.id, target);
      else if (node && dialog.type === "delete") onDelete(node.id, node.kind === "folder" ? policy : undefined);
    });
  };
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="task-file-dialog">
      <form className="flex min-w-0 flex-col gap-6" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <DialogHeader>
          <DialogTitle>{ui(title)}</DialogTitle>
          <DialogDescription className="break-words">
            {dialog.type === "create" ? ui("创建位置：{0}", {0: pathFor(dialog.parentId)}) : node?.name}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {(dialog.type === "create" || dialog.type === "rename") && <Field data-invalid={!!error}>
            <FieldLabel htmlFor="task-file-name">{ui("名称")}</FieldLabel>
            <Input aria-describedby={error ? "task-file-action-error" : undefined} aria-invalid={!!error} autoComplete="off" autoFocus id="task-file-name" onChange={(event) => { setName(event.target.value); setError(""); }} onFocus={(event) => { if (dialog.type === "rename") event.currentTarget.select(); }} value={name} />
          </Field>}

          {dialog.type === "move" && node && <>
            <Field>
              <FieldTitle>{ui("当前位置")}</FieldTitle>
              <FieldDescription className="break-words" title={currentPath}>{currentPath}</FieldDescription>
            </Field>
            <FieldSet>
              <FieldLegend variant="label">{ui("选择目的地")}</FieldLegend>
              <ScrollArea style={{ height: Math.min(destinations.length * 46, 248) }}>
                <RadioGroup aria-invalid={!!error} className="gap-1 pr-3" name="task-file-move-target" onValueChange={(value) => { if (typeof value !== "string") return; setTarget(value === rootDestinationValue ? null : value); setError(""); }} value={target ?? rootDestinationValue}>
                  {destinations.map((destination) => {
                    const Icon = destination.node ? getTaskFileNodeIcon(destination.node) : Folder;
                    const current = node.parentId === destination.id;
                    const path = pathFor(destination.id);
                    const inputId = `task-file-destination-${destination.id ?? rootDestinationValue}`;
                    return <FieldLabel htmlFor={inputId} key={destination.id ?? rootDestinationValue} title={path}>
                      <Field className="min-w-0" orientation="horizontal" style={{ paddingInlineStart: 10 + destination.depth * 16 }}>
                        <RadioGroupItem aria-label={path} id={inputId} value={destination.id ?? rootDestinationValue} />
                        <Icon aria-hidden="true" size={16} />
                        <FieldContent className="min-w-0">
                          <FieldTitle className="min-w-0"><span className="truncate">{destination.node?.name ?? ui("任务文件")}</span></FieldTitle>
                        </FieldContent>
                        {current && <Badge variant="secondary">{ui("当前")}</Badge>}
                      </Field>
                    </FieldLabel>;
                  })}
                </RadioGroup>
              </ScrollArea>
            </FieldSet>
            <Field role="status">
              <FieldTitle>{ui("移动到")}</FieldTitle>
              <FieldDescription className="break-words">{pathFor(target)}</FieldDescription>
              {target === node.parentId && <FieldDescription>{ui(destinations.some((destination) => destination.id !== node.parentId) ? "请选择其他位置。" : "没有其他可移动的位置。")}</FieldDescription>}
            </Field>
          </>}

          {dialog.type === "delete" && node?.kind === "folder" && children > 0 && <FieldSet>
            <FieldLegend variant="label">{ui("文件夹包含 {0} 个直接子项。", {0: children})}</FieldLegend>
            <RadioGroup name="folder-delete-policy" onValueChange={(value) => { if (value === "move-contents" || value === "archive") setPolicy(value); }} value={policy}>
              <FieldLabel htmlFor="task-file-delete-keep">
                <Field orientation="horizontal">
                  <RadioGroupItem id="task-file-delete-keep" value="move-contents" />
                  <FieldContent>
                    <FieldTitle>{ui("将内容移动到上一级后删除")}</FieldTitle>
                    <FieldDescription className="break-words">{currentPath}</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
              <FieldLabel htmlFor="task-file-delete-archive">
                <Field orientation="horizontal">
                  <RadioGroupItem id="task-file-delete-archive" value="archive" />
                  <FieldContent><FieldTitle>{ui("将整个文件夹及内容归档")}</FieldTitle></FieldContent>
                </Field>
              </FieldLabel>
            </RadioGroup>
          </FieldSet>}
          {dialog.type === "delete" && <FieldDescription>{ui("删除后可通过页面底部提示立即撤销。")}</FieldDescription>}

          {(error || (dialog.type !== "create" && !node)) && <FieldError id="task-file-action-error">{ui(error || "文件项目不存在")}</FieldError>}
        </FieldGroup>

        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">{ui("取消")}</Button>
          <Button disabled={!canSubmit} type="submit" variant={dialog.type === "delete" ? "destructive" : "default"}>{ui(dialog.type === "delete" ? "确认删除" : dialog.type === "move" ? "移动" : dialog.type === "create" ? "创建" : "保存")}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
