import { useI18n } from "@/shared/i18n/I18nProvider";
import { Button } from "@/shared/ui/button";
import "@/shared/styles/workspace-loading.css";

type WorkspaceLoadingProps = {
  teamName?: string;
  error?: string;
  notice?: string;
  onRetry?: () => void;
  openingApp?: boolean;
};

export function WorkspaceLoading({ teamName, error, notice, onRetry, openingApp = false }: WorkspaceLoadingProps) {
  const { t } = useI18n();
  return <main aria-busy={!error} aria-labelledby="workspace-loading-title" className="workspace-loading">
    <div className="workspace-loading-content">
      {error ? <>
        <h1 id="workspace-loading-title">{t('loading.error')}</h1>
        {teamName && <p className="workspace-loading-team">{teamName}</p>}
        <p className="workspace-loading-error" role="alert">{error}</p>
        {onRetry && <Button className="workspace-loading-retry" onClick={onRetry} variant="outline">{t('common.retry')}</Button>}
      </> : <>
        <p aria-live="polite" className="workspace-loading-status" id="workspace-loading-title" role="status"><span className="workspace-loading-shimmer">{openingApp ? t('loading.page') : t('loading.team')}</span></p>
        {teamName && <p className="workspace-loading-team">{teamName}</p>}
      </>}
      {notice && <p className="workspace-loading-team" role="status">{notice}</p>}
    </div>
  </main>;
}
