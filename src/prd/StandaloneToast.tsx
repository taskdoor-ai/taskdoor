import { createRoot } from "react-dom/client";
import { ToastProvider } from "../components/ui/toast";
import "../styles/toast.css";

// Static PRD and reference pages use the same component and timing as the app.
const host = document.createElement("div");
host.dataset.agentdoorToastRoot = "";
document.body.append(host);
createRoot(host).render(<ToastProvider />);

export { toast } from "../components/ui/toast";
