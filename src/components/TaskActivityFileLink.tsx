import { FileText } from "lucide-react";
import React from "react";

export function TaskActivityFileLink({ fileId, fileName, onOpen }: {
  fileId?: string;
  fileName: string;
  onOpen: (fileId: string) => void;
}) {
  return <button
    aria-label={fileId ? `查看文件：${fileName}` : `文件不可用：${fileName}`}
    className="task-record-file-link"
    disabled={!fileId}
    onClick={() => { if (fileId) onOpen(fileId); }}
    type="button"
  ><FileText aria-hidden="true" size={14} /><span>{fileName}</span>{!fileId && <small>暂不可用</small>}</button>;
}
