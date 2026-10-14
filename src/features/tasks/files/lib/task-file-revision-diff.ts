import type { TaskFileContent, TaskFileRevision } from "@/features/tasks/files/lib/task-file-editing";

export type TaskFileRevisionComparison =
  | { mode: "full"; contentKind: TaskFileContent["kind"]; before: string; after: string }
  | { mode: "partial"; changes: TaskFileRevision["changes"] };

function tableCellText(value: string): string {
  return /[\t\r\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function contentText(content: TaskFileContent): string {
  if (content.kind === "text") return content.text;
  if (content.kind === "pdf") return content.pages.map((page, index) => `第 ${index + 1} 页\n${page}`).join("\n\n");
  return content.sheets.map(sheet => [
    `工作表：${tableCellText(sheet.name)}`,
    sheet.columns.map(tableCellText).join("\t"),
    ...sheet.rows.map(row => row.map(tableCellText).join("\t")),
  ].join("\n")).join("\n\n");
}

/** Missing historical snapshots can only establish the recorded changes, never a full file. */
export function getTaskFileRevisionComparison(revision: TaskFileRevision): TaskFileRevisionComparison {
  if (!revision.beforeContent || !revision.afterContent) return {
    mode: "partial",
    changes: revision.changes.map(change => ({ ...change })),
  };
  if (revision.beforeContent.kind !== revision.afterContent.kind) throw new Error("文件版本快照格式不一致。");
  return {
    mode: "full",
    contentKind: revision.afterContent.kind,
    before: contentText(revision.beforeContent),
    after: contentText(revision.afterContent),
  };
}
