import { useI18n } from "../i18n/I18nProvider";
import { LoaderCircle } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { Button } from "./ui/button";
import "../styles/workspace-loading.css";

type WorkspaceLoadingProps = {
  teamName?: string;
  error?: string;
  onRetry?: () => void;
  openingApp?: boolean;
};

export function WorkspaceLoading({ teamName, error, onRetry, openingApp = false }: WorkspaceLoadingProps) {
  const { t } = useI18n();
  return <main aria-busy={!error} aria-labelledby="workspace-loading-title" className="workspace-loading">
    <div className="workspace-loading-content">
      <div className="workspace-loading-brand"><BrandMark /><span>TaskDoor</span></div>
      <h1 id="workspace-loading-title">{error ? t('loading.error') : openingApp ? t('loading.app') : t('loading.workspace')}</h1>
      {teamName && <p className="workspace-loading-team">{teamName}</p>}
      {error ? <>
        <p className="workspace-loading-error" role="alert">{error}</p>
        {onRetry && <Button className="workspace-loading-retry" onClick={onRetry} variant="outline">{t('common.retry')}</Button>}
      </> : <p aria-live="polite" className="workspace-loading-status" role="status"><LoaderCircle aria-hidden="true" /><span>{openingApp ? t('loading.page') : t('loading.team')}</span></p>}
    </div>
  </main>;
}
