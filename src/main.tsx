import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./styles/task-detail-fields.css";
import "./styles/task-dependencies.css";
import "./styles/task-criteria-fields.css";
import "./styles/task-effort.css";
import "./styles/task-collaboration-schedule.css";
import "./styles/tag-management.css";
import "./styles/task-workspace-list.css";
import "./styles/task-workspace.css";
import "./styles/task-file-editor.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
