import { useGlobalUi } from "../../i18n/globalUi";
import { Check, MessageCircle, RotateCcw, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { TaskFileNode } from "../../data/taskDetailMocks";
import { getVisibleFileDiscussionThreads, type CollaborationMessage, type DiscussionDraft, type FileDiscussionThread } from "../../lib/taskCollaboration";
import { DiscussionComposer } from "../discussion/DiscussionComposer";
import { DiscussionMessages } from "../discussion/DiscussionMessages";

export type FileDiscussionCollaboration = {
  threads: FileDiscussionThread[]; messages: CollaborationMessage[]; people: string[];
  currentUserId: string; currentUserName: string; canManage: boolean;
  onPost: (draft: DiscussionDraft, thread: FileDiscussionThread, replyToActivityId?: string) => void | Promise<void>;
  onEdit: (message: CollaborationMessage, draft: DiscussionDraft) => void | Promise<void>;
  onDelete: (message: CollaborationMessage) => void;
  onResolve: (id: string, resolved: boolean) => void;
};

export function FileDiscussionPanel({ file, files, taskId, collaboration, draftThread, activeThreadId, onClose, onNewThread, onCancelDraft, onDraftSaved, onLocate, onOpenFile }: {
  file: TaskFileNode; files: TaskFileNode[]; taskId: string; collaboration: FileDiscussionCollaboration;
  draftThread: FileDiscussionThread | null; activeThreadId?: string | null;
  onClose: () => void; onNewThread: () => void; onCancelDraft: () => void; onDraftSaved: (id: string) => void;
  onLocate: (id: string) => void; onOpenFile: (id: string, version?: number) => void;
}) {
  const ui = useGlobalUi();
  const [error, setError] = useState("");
  const threads = getVisibleFileDiscussionThreads(collaboration.threads, collaboration.messages).filter(thread => thread.fileId === file.id);
  useEffect(() => { if (activeThreadId) document.getElementById(`file-thread-${activeThreadId}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [activeThreadId]);
  const canResolve = (thread: FileDiscussionThread) => collaboration.canManage || [collaboration.currentUserId, collaboration.currentUserName].includes(thread.createdBy);
  return <aside aria-label={ui("文件讨论")} className="task-file-discussion-panel">
    <header><strong>{ui("文件讨论")}<span>{threads.length}</span></strong><button aria-label={ui("关闭文件讨论")} onClick={onClose} type="button"><X size={16} /></button></header>
    <div className="task-file-discussion-list">
      {draftThread && <section aria-label={ui("新增文件评论")} className="task-file-discussion-draft"><div className="task-file-thread-source"><span>{draftThread.pageIndex != null ? ui("第 {0} 页", {0: draftThread.pageIndex + 1}) : draftThread.quote ? ui("所选正文") : ui("整个文件")} · v{draftThread.version}</span></div>{draftThread.quote && <blockquote>{draftThread.quote}</blockquote>}<DiscussionComposer actionLabel={ui("确认")} autoFocus compact draftKey={`file-discussion:${taskId}:${file.id}:${draftThread.id}`} files={files} onCancel={onCancelDraft} onSubmit={async draft => { await collaboration.onPost(draft, draftThread); onDraftSaved(draftThread.id); }} people={collaboration.people} placeholder={ui("围绕这份文件讨论，也可以 @ 协作者…")} /></section>}
      {threads.map(thread => {
        const messages = collaboration.messages.filter(message => message.fileThreadId === thread.id);
        return <section className="task-file-discussion-thread" data-active={activeThreadId === thread.id} id={`file-thread-${thread.id}`} key={thread.id}>
          <div className="task-file-thread-source"><button onClick={() => onLocate(thread.id)} type="button">{thread.pageIndex != null ? ui("第 {0} 页", {0: thread.pageIndex + 1}) : thread.quote ? ui("所选正文") : ui("整个文件")} · v{thread.version}</button>{canResolve(thread) && <button aria-label={thread.resolvedAt ? ui("重新打开讨论") : ui("解决讨论")} onClick={() => { try { collaboration.onResolve(thread.id, !thread.resolvedAt); setError(""); } catch (failure) { setError(failure instanceof Error ? failure.message : ui("操作失败，请重试。")); } }} title={thread.resolvedAt ? ui("重新打开讨论") : ui("解决讨论")} type="button">{thread.resolvedAt ? <RotateCcw size={14} /> : <Check size={15} />}{thread.resolvedAt ? ui("重开") : ui("解决")}</button>}</div>
          {thread.quote && <blockquote onClick={() => onLocate(thread.id)}>{thread.quote}</blockquote>}
          {thread.version !== (file.version ?? 1) && <p className="task-file-thread-version-note">{ui("此讨论针对 v")}{thread.version}{ui("，当前文件为 v")}{file.version ?? 1}{ui("。原文引用已保留。")}</p>}
          {thread.resolvedAt && <p className="task-file-thread-resolved">{ui("已解决")}</p>}
          {messages.some(message => message.replyToActivityId && !message.deletedAt) && <p className="task-file-thread-reply-count">{messages.filter(message => message.replyToActivityId && !message.deletedAt).length}{ui("条回复")}</p>}
          <DiscussionMessages allMessages={collaboration.messages} compact currentUser={collaboration.currentUserId} currentUserName={collaboration.currentUserName} draftKey={`file-thread:${taskId}:${thread.id}`} files={files} messages={messages} onDelete={collaboration.onDelete} onEdit={collaboration.onEdit} onOpenFile={onOpenFile} onPost={(draft, replyToId) => collaboration.onPost(draft, thread, replyToId)} people={collaboration.people} />
        </section>;
      })}
      {!threads.length && !draftThread && <div className="task-file-discussion-empty"><MessageCircle size={24} /><strong>{ui("暂无文件讨论")}</strong><p>{ui("选中文字添加评论，或讨论整个文件。")}</p></div>}
    </div>
    {error && <p className="task-file-save-error" role="alert">{error}</p>}
    {!draftThread && <footer><button className="task-file-discuss-whole" onClick={onNewThread} type="button"><MessageCircle size={15} />{ui("评论整个文件")}</button></footer>}
  </aside>;
}
