import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import "../shared/styles/pm-global.css";
import "../features/tasks/styles/task-workspace.css";
import "../features/tasks/styles/task-heading.css";
import "../features/tasks/styles/task-situation.css";
import "../features/tasks/styles/task-effort.css";
import "../features/tasks/styles/task-progress-comparison.css";
import "./progress-preview.css";
import { ProgressScenarioCatalog } from "./ProgressScenarioCatalog";
import { ProgressComponentModel } from "./ProgressComponentModel";

function TaskProgressPreview() {
  useEffect(() => {
    // The standalone preview also works in a static PRD without the app server.
    const resize = () => {
      const frame = window.frameElement;
      if (frame?.tagName === "IFRAME") (frame as HTMLIFrameElement).style.height = `${document.getElementById("root")!.getBoundingClientRect().height + 2}px`;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(document.getElementById("root")!);
    return () => observer.disconnect();
  }, []);
  const modelView = new URLSearchParams(window.location.search).get("view") === "model";
  return <main className={`prd-progress-preview${modelView ? " prd-progress-preview-model" : ""}`}>{modelView ? <ProgressComponentModel/> : <ProgressScenarioCatalog/>}</main>;
}

createRoot(document.getElementById("root")!).render(<TaskProgressPreview />);
