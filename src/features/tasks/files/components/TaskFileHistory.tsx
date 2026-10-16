import { useI18n } from "@/shared/i18n/I18nProvider";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import React, { Suspense, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { FileText, History, X } from "lucide-react";
import type { TaskFileRevision } from "@/features/tasks/files/lib/task-file-editing";
import { PersonAvatar, PersonName } from "@/shared/ui/PersonAvatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Separator } from "@/shared/ui/separator";
import { Spinner } from "@/shared/ui/spinner";
import { formatDisplayDateTime } from "@/shared/lib/date-time";

const TaskFileRevisionDiff = React.lazy(() => import("@/features/tasks/files/components/TaskFileRevisionDiff").then(module => ({ default: module.TaskFileRevisionDiff })));

export function TaskFileHistory({ revisions, version, filePath, onClose }: { revisions: TaskFileRevision[]; version: number; filePath?: string; onClose: () => void }) {
  const { locale } = useI18n();
  const ui = useGlobalUi();
  const orderedRevisions = [...revisions].sort((a, b) => b.version - a.version);
  const [selectedId, setSelectedId] = useState<string | null>(() => orderedRevisions[0]?.id ?? null);
  const selected = orderedRevisions.find(revision => revision.id === selectedId) ?? orderedRevisions[0];
  return <aside aria-label={ui("文件版本记录")} className="task-file-revisions flex h-full min-h-0 min-w-0 flex-col" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <header className="flex shrink-0 items-center gap-2 p-4">
      <strong>{ui("文件历史")}</strong>
      <Button aria-label={ui("关闭版本记录")} className="ml-auto" onClick={onClose} size="icon-sm" variant="ghost"><X data-icon="inline-start" /></Button>
    </header>
    <Separator />
    {orderedRevisions.length ? <Tabs.Root activationMode="manual" className="task-file-revisions-layout" onValueChange={setSelectedId} orientation="vertical" value={selected?.id ?? ""}>
      <main className="flex min-h-0 min-w-0 flex-col">
        {filePath && <div className="flex shrink-0 items-center gap-2 px-4 py-3 text-muted-foreground"><FileText aria-hidden="true" className="size-4 shrink-0" /><span className="min-w-0 break-words">{filePath}</span></div>}
        {selected && <Tabs.Content className="min-h-0 flex-1 px-4 pb-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" key={selected.id} value={selected.id}>
          <Suspense fallback={<div className="flex items-center justify-center gap-2 p-8" role="status"><Spinner /><span>{ui("正在加载差异")}</span></div>}><TaskFileRevisionDiff revision={selected} /></Suspense>
        </Tabs.Content>}
      </main>
      <Separator orientation="vertical" />
      <aside aria-label={ui("更新历史")} className="flex min-h-0 min-w-0 flex-col">
        <ScrollArea className="task-file-revisions-list-scroll min-h-0 flex-1">
          <Tabs.List aria-label={ui("更新历史")} className="flex flex-col gap-2 p-3">
            {orderedRevisions.map(revision => <Tabs.Trigger asChild key={revision.id} value={revision.id}>
              <Button className="h-auto w-full justify-start gap-2 whitespace-normal p-3 text-left" variant={selected?.id === revision.id ? "secondary" : "ghost"}>
                <PersonAvatar name={revision.author} personId={revision.author} profilePreviewFocusable={false} showProfilePreview={false} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex min-w-0 items-center gap-2"><PersonName className="min-w-0 flex-1 truncate" name={revision.author} personId={revision.author} showProfilePreview={false} /><Badge variant="outline">v{revision.version}</Badge></span>
                  <time className="text-xs font-normal text-muted-foreground" dateTime={revision.createdAt} title={formatDisplayDateTime(revision.createdAt, { locale, year: "always" }) ?? undefined}>{formatDisplayDateTime(revision.createdAt, { locale }) ?? "—"}</time>
                  {revision.version === version && <span className="text-xs font-normal text-muted-foreground">{ui("当前版本")}</span>}
                </span>
              </Button>
            </Tabs.Trigger>)}
          </Tabs.List>
        </ScrollArea>
      </aside>
    </Tabs.Root> : <Empty className="flex-1"><EmptyHeader><EmptyMedia variant="icon"><History /></EmptyMedia><EmptyTitle>{ui("还没有修改记录")}</EmptyTitle><EmptyDescription>{ui("编辑并保存后会显示在这里。")}</EmptyDescription></EmptyHeader></Empty>}
  </aside>;
}
