import { Database, ListTodo, Presentation, Table2 } from "lucide-react";

export type FileTypeCardFormat = "csv" | "data" | "docx" | "md" | "patch" | "pdf" | "pptx" | "task" | "xlsx";

export function FileTypeCard({ format }: { format: FileTypeCardFormat }) {
  const isCode = format === "md" || format === "patch";
  const objectIcon = format === "data"
    ? <Database />
    : format === "task"
      ? <ListTodo />
      : format === "csv" || format === "xlsx"
        ? <Table2 />
        : format === "pptx"
          ? <Presentation />
          : null;

  return (
    <span aria-hidden="true" className={`file-type-card file-type-${format}`}>
      <span className="file-type-sheet">
        {objectIcon ? (
          <span className="file-type-object-mark">{objectIcon}</span>
        ) : isCode ? (
          <span className="file-type-code-lines">
            <i><b>&lt;</b><em /><b>&gt;</b></i>
            <i><b>&lt;</b><em /><b>/&gt;</b></i>
            <i><b>&lt;/</b><em /><b>&gt;</b></i>
          </span>
        ) : (
          <span className="file-type-document-lines">
            <i /><i /><i /><i /><i />
          </span>
        )}
      </span>
      <b className="file-type-badge">{format}</b>
    </span>
  );
}
