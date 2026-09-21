import { I18nProvider, useI18n } from "./i18n/I18nProvider";
import { lazy, startTransition, StrictMode, Suspense, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { WorkspaceLoading } from "./components/WorkspaceLoading";
import { ToastProvider } from "./components/ui/toast";
import "./styles.css";
import "./styles/toast.css";
import "./styles/task-detail-fields.css";
import "./styles/task-dependencies.css";
import "./styles/task-criteria-fields.css";
import "./styles/task-effort.css";
import "./styles/task-collaboration-schedule.css";
import "./styles/tag-management.css";
import "./styles/task-workspace-list.css";
import "./styles/task-filter-panel.css";
import "./styles/task-workspace.css";
import "./styles/task-file-editor.css";

const OnboardingExperience = lazy(() => import("./components/OnboardingExperience"));
const loadWorkspace = () => import("./App");
const App = lazy(loadWorkspace);
const isOnboardingPreview = ["/onboarding", "/login", "/signup", "/forgot-password"].includes(window.location.pathname.replace(/\/$/, "")) || /^\/t\/[^/]+\/join\/[^/]+\/?$/.test(window.location.pathname);

function RootExperience() {
  const { t } = useI18n();
  const [showOnboarding, setShowOnboarding] = useState(isOnboardingPreview);
  const onWorkspaceReady = useCallback(async () => {
    // Keep the transition visible until the workspace module is ready.
    try { await loadWorkspace(); }
    catch { throw new Error(t('app.loadError')); }
    window.history.replaceState(null, "", "/");
    document.title = t('app.title');
    startTransition(() => setShowOnboarding(false));
  }, [t]);
  return <Suspense fallback={<WorkspaceLoading openingApp={showOnboarding} />}>
    {showOnboarding ? <OnboardingExperience onWorkspaceReady={onWorkspaceReady} /> : <App />}
  </Suspense>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
    <ToastProvider>
    <RootExperience />
    </ToastProvider>
    </I18nProvider>
  </StrictMode>,
);
