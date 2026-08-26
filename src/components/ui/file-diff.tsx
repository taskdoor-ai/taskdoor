import { Check, Columns2, Copy, List } from "lucide-react";
import { useMemo, useState } from "react";

type DiffLine = {
  kind: "added" | "context" | "removed";
  newNumber?: number;
  oldNumber?: number;
  text: string;
};

type FileDiffProps = {
  after: string;
  before: string;
  fileName: string;
  label?: string;
};

function createDiff(before: string, after: string): DiffLine[] {
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  const table = Array.from({ length: oldLines.length + 1 }, () => Array<number>(newLines.length + 1).fill(0));

  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      table[oldIndex][newIndex] = oldLines[oldIndex] === newLines[newIndex]
        ? table[oldIndex + 1][newIndex + 1] + 1
        : Math.max(table[oldIndex + 1][newIndex], table[oldIndex][newIndex + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex < oldLines.length && newIndex < newLines.length && oldLines[oldIndex] === newLines[newIndex]) {
      lines.push({ kind: "context", newNumber: newIndex + 1, oldNumber: oldIndex + 1, text: oldLines[oldIndex] });
      oldIndex += 1;
      newIndex += 1;
    } else if (newIndex < newLines.length && (oldIndex === oldLines.length || table[oldIndex][newIndex + 1] > table[oldIndex + 1][newIndex])) {
      lines.push({ kind: "added", newNumber: newIndex + 1, text: newLines[newIndex] });
      newIndex += 1;
    } else {
      lines.push({ kind: "removed", oldNumber: oldIndex + 1, text: oldLines[oldIndex] });
      oldIndex += 1;
    }
  }
  return lines;
}

export function FileDiff({ after, before, fileName, label }: FileDiffProps) {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"split" | "unified">("unified");
  const lines = useMemo(() => createDiff(before, after), [after, before]);
  const added = lines.filter((line) => line.kind === "added").length;
  const removed = lines.filter((line) => line.kind === "removed").length;

  const copyAfter = async () => {
    try {
      await navigator.clipboard.writeText(after);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = after;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <section className="file-diff-card">
      <header className="file-diff-header">
        <span className="file-diff-file"><span><strong>{fileName}</strong>{label && <small>{label}</small>}</span></span>
        <span className="file-diff-stats" aria-label={`${added} 项新增，${removed} 项删除`}><b>+{added}</b><em>-{removed}</em></span>
        <span className="file-diff-actions">
          <span className="file-diff-toggle" aria-label="对比视图">
            <button className={view === "unified" ? "active" : ""} onClick={() => setView("unified")} type="button"><List size={13} />Unified</button>
            <button className={view === "split" ? "active" : ""} onClick={() => setView("split")} type="button"><Columns2 size={13} />Split</button>
          </span>
          <button className="file-diff-copy" onClick={copyAfter} type="button">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy after"}</button>
        </span>
      </header>
      {view === "unified" ? (
        <div className="file-diff-body unified" role="table" aria-label={`${fileName} 文件变更对比`}>
          {lines.map((line, index) => (
            <div className={`file-diff-line ${line.kind}`} key={`${line.kind}-${index}-${line.text}`} role="row">
              <span className="file-diff-number">{line.oldNumber ?? ""}</span>
              <span className="file-diff-number">{line.newNumber ?? ""}</span>
              <span className="file-diff-mark">{line.kind === "added" ? "+" : line.kind === "removed" ? "−" : ""}</span>
              <code>{line.text || " "}</code>
            </div>
          ))}
        </div>
      ) : (
        <div className="file-diff-split" aria-label={`${fileName} 并排文件变更对比`}>
          <div className="file-diff-pane removed"><span className="file-diff-pane-label">Before</span>{before.split("\n").map((line, index) => <div className="file-diff-line removed" key={`before-${index}`}><span className="file-diff-number">{index + 1}</span><span className="file-diff-mark">−</span><code>{line || " "}</code></div>)}</div>
          <div className="file-diff-pane added"><span className="file-diff-pane-label">After</span>{after.split("\n").map((line, index) => <div className="file-diff-line added" key={`after-${index}`}><span className="file-diff-number">{index + 1}</span><span className="file-diff-mark">+</span><code>{line || " "}</code></div>)}</div>
        </div>
      )}
    </section>
  );
}
