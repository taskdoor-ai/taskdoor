import { hasExplicitlySignedOut } from "@/shared/lib/workspace-session";
import { I18nProvider, useI18n } from "@/shared/i18n/I18nProvider";
import { lazy, startTransition, StrictMode, Suspense, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { WorkspaceLoading } from "@/shared/ui/WorkspaceLoading";
import { ToastProvider } from "@/shared/ui/toast";
import "@/app/styles/global.css";
import "@/shared/styles/toast.css";
import "@/features/tasks/styles/task-detail-fields.css";
import "@/features/tasks/styles/task-dependencies.css";
import "@/features/tasks/styles/task-criteria-fields.css";
import "@/features/tasks/styles/task-effort.css";
import "@/features/tasks/styles/task-collaboration-schedule.css";
import "@/features/me/styles/tag-management.css";
import "@/features/tasks/styles/task-workspace-list.css";
import "@/features/tasks/styles/task-filter-panel.css";
import "@/features/tasks/styles/task-workspace.css";
import "@/features/tasks/styles/task-file-editor.css";

const OnboardingExperience = lazy(() => import("@/features/auth/components/AuthExperience"));
const loadWorkspace = () => import("@/app/App");
const App = lazy(loadWorkspace);
const isOnboardingPreview = ["/onboarding", "/login", "/signup", "/forgot-password"].includes(window.location.pathname.replace(/\/$/, "")) || /^\/t\/[^/]+\/join\/[^/]+\/?$/.test(window.location.pathname);

function RootExperience() {
  const { t } = useI18n();
  const [showOnboarding, setShowOnboarding] = useState(isOnboardingPreview || hasExplicitlySignedOut());
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
