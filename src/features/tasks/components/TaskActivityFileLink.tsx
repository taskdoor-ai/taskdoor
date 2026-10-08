import { useMockText } from "@/ai/mock/i18n/MockDataProvider";
import { useModuleCopy } from "@/shared/i18n/module-messages";
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
