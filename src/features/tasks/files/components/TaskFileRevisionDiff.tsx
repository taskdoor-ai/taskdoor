import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import type { TaskFileRevision } from "@/features/tasks/files/lib/task-file-editing";
import { getTaskFileRevisionComparison } from "@/features/tasks/files/lib/task-file-revision-diff";
import { ScrollArea } from "@/shared/ui/scroll-area";

const theme = {
  diffViewerBackground: "var(--ad-surface)", diffViewerColor: "var(--ad-ink)",
  diffViewerTitleBackground: "var(--ad-surface-quiet)", diffViewerTitleColor: "var(--ad-ink-secondary)", diffViewerTitleBorderColor: "var(--ad-border-soft)",
  gutterBackground: "var(--ad-surface-quiet)", gutterBackgroundDark: "var(--ad-surface-subtle)", gutterColor: "var(--ad-ink-tertiary)",
  addedBackground: "var(--ad-task-status-success-soft)", addedColor: "var(--ad-ink)", addedGutterBackground: "var(--ad-task-status-success-soft)", addedGutterColor: "var(--ad-ink-secondary)",
  removedBackground: "var(--ad-task-status-failed-soft)", removedColor: "var(--ad-ink)", removedGutterBackground: "var(--ad-task-status-failed-soft)", removedGutterColor: "var(--ad-ink-secondary)",
  wordAddedBackground: "color-mix(in srgb, var(--ad-task-status-success) 30%, var(--ad-surface))", wordRemovedBackground: "color-mix(in srgb, var(--ad-task-status-failed) 30%, var(--ad-surface))",
  codeFoldBackground: "var(--ad-surface-quiet)", codeFoldGutterBackground: "var(--ad-surface-subtle)", codeFoldContentColor: "var(--ad-ink-secondary)", emptyLineBackground: "var(--ad-surface)",
};
const styles = { variables: { light: theme, dark: theme }, diffContainer: { minWidth: 0 }, contentText: { fontFamily: "var(--ad-font-mono)" } };

export function TaskFileRevisionDiff({ revision }: { revision: TaskFileRevision }) {
  const ui = useGlobalUi();
  const comparison = useMemo(() => getTaskFileRevisionComparison(revision), [revision]);
  const frameRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(400);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setHeight(Math.max(160, frame.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [comparison.mode]);
  const props = {
    splitView: true, compareMethod: DiffMethod.CHARS, hideLineNumbers: false,
    disableWordDiff: false, showDiffOnly: true, extraLinesSurroundingDiff: 3, hideSummary: true,
    leftTitle: `v${revision.baseVersion}`, rightTitle: `v${revision.version}`, styles,
    codeFoldMessageRenderer: (count: number) => <span>{ui("展开 {0} 行未修改内容", {0: count})}</span>,
  };
  if (comparison.mode === "full") return <div className="task-file-revisions-diff-frame h-full min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border" ref={frameRef}>
    <div className="task-file-revisions-diff"><ReactDiffViewer {...props} infiniteLoading={{ pageSize: 60, overscan: 20, containerHeight: `${height}px` }} newValue={comparison.after} oldValue={comparison.before} /></div>
  </div>;
  return <ScrollArea className="task-file-revisions-diff-fragments h-full">
    <div className="flex flex-col gap-4">
      <p className="m-0 text-xs text-muted-foreground">{ui("此版本仅保留修改片段。")}</p>
      {comparison.changes.map((change, index) => <section className="flex min-w-0 flex-col gap-2" key={index}>
        <strong className="text-xs">{change.location}</strong>
        <div className="overflow-x-auto rounded-lg border"><div className="task-file-revisions-diff"><ReactDiffViewer {...props} newValue={change.after} oldValue={change.before} /></div></div>
      </section>)}
    </div>
  </ScrollArea>;
}
