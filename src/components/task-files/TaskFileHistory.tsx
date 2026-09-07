import React from "react";
import { X } from "lucide-react";
import type { TaskFileRevision } from "../../lib/taskFileEditing";
import { PersonAvatar, PersonName } from "../PersonAvatar";

export function TaskFileHistory({ revisions, version, onClose }: { revisions: TaskFileRevision[]; version: number; onClose: () => void }) {
  return <aside aria-label="文件版本记录" className="task-file-history" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <header><strong>版本记录</strong><button aria-label="关闭版本记录" onClick={onClose} type="button"><X size={16} /></button></header>
    <p className="task-file-history-note">当前 v{version} · 仅记录本浏览器中的保存，不代表云端审计。</p>
    {revisions.length ? <ol>{[...revisions].reverse().map((revision, index) => <li key={revision.id}><details open={index === 0}>
      <summary><span className="task-file-history-author"><PersonAvatar name={revision.author} personId={revision.author} showProfilePreview={false} size="xs" /><PersonName name={revision.author} personId={revision.author} showProfilePreview={false} /><strong>v{revision.version}</strong></span><time dateTime={revision.createdAt}>{new Date(revision.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time><span>{revision.changes.length} 处修改 · 查看差异</span></summary>
      <div className="task-file-history-changes">{revision.changes.map((change, i) => <div className="task-file-history-change" key={i}><strong>{change.location}</strong><div data-change="before"><small>修改前 · v{revision.baseVersion}</small><pre>{change.before || "（空）"}</pre></div><div data-change="after"><small>修改后 · v{revision.version}</small><pre>{change.after || "（空）"}</pre></div></div>)}</div>
    </details></li>)}</ol> : <div className="task-file-history-empty"><strong>还没有修改记录</strong><p>保存正文后，可在这里查看修改人、时间、位置和前后内容。既有 v{version} 的历史未接入。</p></div>}
  </aside>;
}
