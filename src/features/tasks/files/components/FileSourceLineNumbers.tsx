import React from "react";

export function FileSourceLineNumbers({ text }: { text: string }) {
  const count = text.split(/\r\n|\r|\n/).length;
  return <div aria-hidden="true" className="task-file-source-lines">{Array.from({ length: count }, (_, index) => index + 1).join("\n")}</div>;
}
