import type { TaskFileNode } from "@/shared/model/task-model";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { TaskFileDownload, TaskFileViewer } from "@/features/tasks/files/components/TaskFileViewer";
import "@/features/tasks/styles/discussion-attachment-preview.css";

export function DiscussionAttachmentPreview({ file, onClose }: { file: TaskFileNode | null; onClose: () => void }) {
  const { locale } = useI18n();
  if (!file) return null;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="discussion-attachment-preview" overlayForceRender>
      <div className="discussion-attachment-preview__header">
        <DialogHeader className="discussion-attachment-preview__identity">
          <DialogTitle>{file.name}</DialogTitle>
          <DialogDescription>{locale === "en" ? "Discussion attachment" : "讨论附件"} · v{file.version ?? 1}</DialogDescription>
        </DialogHeader>
        <TaskFileDownload file={file} />
      </div>
      <div className="discussion-attachment-preview__viewer"><TaskFileViewer file={file} key={`${file.id}:${file.version ?? 1}`} /></div>
    </DialogContent>
  </Dialog>;
}
