import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { onboardingStorageKey, signOutWorkspace } from "@/shared/lib/workspace-session";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { WorkspaceLoading } from "@/shared/ui/WorkspaceLoading";
import { OnboardingShell } from "@/features/auth/components/OnboardingShell";
import { onboardingTranslator, localizeOnboardingMessage } from "@/features/auth/i18n/onboarding-messages";
import { restoreOnboardingPreview, transitionOnboarding } from "@/features/auth/lib/onboarding-preview";
import { enterOnboardingWorkspace } from "@/features/auth/lib/onboarding-workspace";

/** Local setup caller only: no formal session, receipt, account service or KC state is consumed. */
export default function SetupExperience({ onWorkspaceReady }: { onWorkspaceReady: () => Promise<void> }) {
  const { locale } = useI18n();
  const t = onboardingTranslator(locale);
  const [initial] = useState(() => {
    try { return restoreOnboardingPreview(sessionStorage.getItem(onboardingStorageKey)); } catch { return null; }
  });
  const [name, setName] = useState(initial?.name ?? "");
  const [team, setTeam] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const invited = Boolean(initial?.inviteToken);
  const ready = Boolean(name.trim() && (invited || team.trim()));
  useEffect(() => {
    if (!initial?.verified) window.location.replace("/login");
    document.title = `${t("设置团队")} · Taskdoor`;
  }, [initial, locale]);
  if (!initial?.verified) return <WorkspaceLoading openingApp />;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setError("");
    try {
      const next = invited ? { ...initial, name: name.trim(), step: "invite" as const } : transitionOnboarding({ ...initial, name: "" }, { type: "create-team", name: team, profileName: name });
      if (next.error) { setError(next.error); return; }
      sessionStorage.setItem(onboardingStorageKey, JSON.stringify(next));
      if (invited) window.location.assign(`/onboarding?invite=${encodeURIComponent(initial.inviteToken)}`);
      else { enterOnboardingWorkspace(next); await onWorkspaceReady(); }
    } catch { setError("设置未能完成，请重试。"); }
    finally { setBusy(false); }
  };
  return <OnboardingShell appearance="sand-auth" busy={busy} step="setup">
    <header className="onboarding-heading"><h1 tabIndex={-1}>{invited ? t("告诉团队你是谁") : t("欢迎使用 Taskdoor")}</h1><p>{invited ? t("填写名字后，回到邀请继续加入。") : t("设置你的称呼和团队信息，开始一起工作。")}</p></header>
    <form className="onboarding-form" noValidate onSubmit={event => void submit(event)}>
      <div className="onboarding-field"><label className="onboarding-input-label" htmlFor="setup-name">{t("姓名")}</label><Input autoComplete="name" autoFocus disabled={busy} id="setup-name" maxLength={40} onChange={event => { setName(event.target.value); setError(""); }} placeholder={t("你的称呼")} value={name} /></div>
      {!invited && <div className="onboarding-field"><label className="onboarding-input-label" htmlFor="setup-team">{t("团队名称")}</label><Input disabled={busy} id="setup-team" maxLength={40} onChange={event => { setTeam(event.target.value); setError(""); }} placeholder={t("填写团队名称")} value={team} /></div>}
      {error && <p className="onboarding-error" role="alert">{localizeOnboardingMessage(locale, error)}</p>}
      <Button className="onboarding-primary" disabled={busy || !ready} type="submit">{busy ? <><LoaderCircle aria-hidden="true" className="onboarding-spinner" />{t("正在完成设置…")}</> : invited ? t("继续") : t("创建团队并开始")}</Button>
    </form>
    <div className="onboarding-account"><span><Mail aria-hidden="true" /><span>{initial.email}</span></span><button type="button" onClick={signOutWorkspace}>{t("退出登录")}</button></div>
  </OnboardingShell>;
}
