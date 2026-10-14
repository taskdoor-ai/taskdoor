import React from "react";
import { Folder, FolderPlus, Upload } from "lucide-react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatDisplayDateTime, formatLegacyDateLabel } from "@/shared/lib/date-time";
import { getTaskFileLastUpdate, type TaskFileEditRecord } from "@/features/tasks/files/lib/task-file-editing";
import { sortTaskFileNodes } from "@/features/tasks/files/lib/task-file-tree";
import { TaskFileNodeIcon, TaskFileNodeMenu, type TaskFileAction } from "@/features/tasks/files/components/TaskFileTree";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

export function TaskFileDirectory({ folder, files, records, onSelect, onUpload, onCreate, onAction, uploading, displayName }: {
  folder: TaskFileNode | null;
  files: TaskFileNode[];
  records: Record<string, TaskFileEditRecord>;
  onSelect: (id: string) => void;
  onUpload: () => void;
  onCreate: () => void;
  onAction: (action: TaskFileAction) => void;
  uploading: boolean;
  displayName: (name: string) => string;
}) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const children = sortTaskFileNodes(files.filter(node => node.parentId === (folder?.id ?? null) && !node.archived));
  return <section aria-label={folder?.name ?? ui("任务文件")} className="task-file-directory min-h-0 flex-1">
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-5 p-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            {folder ? <TaskFileNodeIcon expanded node={folder} /> : <Folder aria-hidden="true" size={20} />}
            <h2 className="m-0 min-w-0 truncate text-base font-semibold">{folder ? displayName(folder.name) : ui("任务文件")}</h2>
            <Badge variant="secondary">{ui("{0} 项", {0: children.length})}</Badge>
          </div>
          <div className="task-file-directory-actions flex shrink-0 gap-2">
            <Button onClick={onCreate} size="sm" variant="outline"><FolderPlus data-icon="inline-start" />{ui("新建文件夹")}</Button>
            <Button disabled={uploading} onClick={onUpload} size="sm"><Upload data-icon="inline-start" />{ui("上传文件")}</Button>
          </div>
        </header>
        {children.length ? <Table className="table-fixed">
          <colgroup><col /><col className="w-24" /><col className="w-36" data-file-column="updated" /><col className="w-12" /></colgroup>
          <TableHeader><TableRow>
            <TableHead>{ui("名称")}</TableHead><TableHead>{ui("版本 / 内容")}</TableHead><TableHead data-file-column="updated">{ui("最近更新")}</TableHead><TableHead><span className="sr-only">{ui("更多文件操作")}</span></TableHead>
          </TableRow></TableHeader>
          <TableBody>{children.map(child => {
            const update = getTaskFileLastUpdate(child, records[child.id]?.revisions ?? []);
            const time = update?.isExact ? formatDisplayDateTime(update.updatedAt) : formatLegacyDateLabel(update?.updatedAt ?? "", locale);
            return <TableRow key={child.id}>
              <TableCell><Button className="h-auto min-h-11 w-full min-w-0 justify-start gap-3" onClick={() => onSelect(child.id)} title={displayName(child.name)} variant="ghost"><TaskFileNodeIcon node={child} /><span className="truncate">{displayName(child.name)}</span></Button></TableCell>
              <TableCell>{child.kind === "file" ? <Badge variant="outline">v{child.version ?? 1}</Badge> : ui("{0} 项", {0: files.filter(node => node.parentId === child.id && !node.archived).length})}</TableCell>
              <TableCell data-file-column="updated">{update?.isExact ? <time dateTime={update.updatedAt} title={formatDisplayDateTime(update.updatedAt, {year: "always"}) ?? undefined}>{time || "—"}</time> : time || "—"}</TableCell>
              <TableCell><TaskFileNodeMenu className="task-file-directory-more" node={child} onAction={onAction} /></TableCell>
            </TableRow>;
          })}</TableBody>
        </Table> : <Empty>
          <EmptyHeader><EmptyMedia variant="icon"><Folder /></EmptyMedia><EmptyTitle>{ui(folder ? "这个文件夹还是空的" : "暂无文件")}</EmptyTitle><EmptyDescription>{ui("上传文件，或新建文件夹整理任务资料。")}</EmptyDescription></EmptyHeader>
          <EmptyContent><Button disabled={uploading} onClick={onUpload} size="sm" variant="outline"><Upload data-icon="inline-start" />{ui("上传文件")}</Button></EmptyContent>
        </Empty>}
      </div>
    </ScrollArea>
  </section>;
}
