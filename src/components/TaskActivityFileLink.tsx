import { useMockText } from "../i18n/MockDataProvider";
import { useModuleCopy } from "../i18n/moduleMessages";
import { FileText } from "lucide-react";
import React from "react";

export function TaskActivityFileLink({ fileId, fileName, onOpen }: {
  fileId?: string;
  fileName: string;
  onOpen: (fileId: string) => void;
}) {
  const m = useModuleCopy();
  const mock = useMockText();
  const displayName = mock.text(fileName);
  return <button
    aria-label={fileId ? m("viewFile", { name: displayName }) : m("unavailableFile", { name: displayName })}
    className="task-record-file-link"
    disabled={!fileId}
    onClick={() => { if (fileId) onOpen(fileId); }}
    type="button"
  ><FileText aria-hidden="true" size={14} /><span>{displayName}</span>{!fileId && <small>{m('unavailable')}</small>}</button>;
}
