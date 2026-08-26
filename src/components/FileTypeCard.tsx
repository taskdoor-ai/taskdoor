type FileType = "docx" | "patch" | "pdf";

export function FileTypeCard({ format }: { format: FileType }) {
  const isCode = format === "patch";

  return (
    <span aria-hidden="true" className={`file-type-card file-type-${format}`}>
      <span className="file-type-sheet">
        {isCode ? (
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

