import { useEffect, useRef, useState, type FormEvent } from "react";
import googleIcon from "@lobehub/icons-static-svg/icons/google-color.svg";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { onboardingTranslator } from "@/features/auth/i18n/onboarding-messages";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { BrandLogo } from "@/shared/ui/BrandMark";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { TeamFlowIllustration } from "@/features/auth/components/TeamFlowIllustration";
import "@/features/auth/styles/onboarding.css";

/** UI reference after Google verification. Production eligibility and creation belong to KC. */
export function GoogleFirstConsent({ email, onContinue, onDecline }: {
  email: string;
  onContinue: () => void;
  onDecline: () => void;
}) {
  const { locale } = useI18n();
  const t = onboardingTranslator(locale);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState(false);
  const checkbox = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!agreed) { setError(true); checkbox.current?.focus(); return; }
    onContinue();
  };
  return <>
    <header className="onboarding-heading">
      <h1 ref={heading} tabIndex={-1}>{t("确认创建账号")}</h1>
      <p>{t("Google 验证已完成。请确认同意隐私政策，再创建你的 Taskdoor 账号。")}</p>
    </header>
    <form className="onboarding-form" noValidate onSubmit={submit}>
      <div className="onboarding-field">
        <label htmlFor="google-consent-email">{t("Google 邮箱")}</label>
        <div className="google-first-consent-email"><img src={googleIcon} width={20} height={20} alt="Google" /><Input id="google-consent-email" value={email} readOnly autoComplete="off" /></div>
      </div>
      <div className="onboarding-consent">
        <div className="onboarding-consent-row">
          <input ref={checkbox} id="google-first-consent" type="checkbox" checked={agreed} aria-labelledby="google-first-consent-label" aria-invalid={error || undefined} aria-describedby={error ? "google-first-consent-error" : undefined} onChange={event => { setAgreed(event.target.checked); if (event.target.checked) setError(false); }} />
          <span id="google-first-consent-label"><label htmlFor="google-first-consent">{t("我已阅读并同意")}</label>{" "}<a className="onboarding-link" href="https://sand.taskdoor.com/privacy.html" target="_blank" rel="noopener noreferrer">{t("隐私政策")}</a></span>
        </div>
        {error && <p className="onboarding-consent-error" id="google-first-consent-error" role="alert">{t("请先勾选同意《隐私政策》后继续。")}</p>}
      </div>
      <Button className="onboarding-primary" type="submit">{t("继续创建账号")}</Button>
      <button className="onboarding-link google-first-consent-decline" onClick={onDecline} type="button">{t("不同意，返回登录")}</button>
    </form>
  </>;
}

/** Isolated visual preview: no OAuth, account/session writes, team setup or password step. */
export default function GoogleFirstConsentPreview() {
  const { locale } = useI18n();
  const t = onboardingTranslator(locale);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => { document.title = `${t("确认创建账号")} · Taskdoor`; }, [locale]);
  return <div className="onboarding-page onboarding-auth">
    <div className="onboarding-language"><LanguageSwitcher /></div>
    <aside className="onboarding-story" aria-label={t("Taskdoor 首页")}><div className="onboarding-story-inner">
      <div className="onboarding-art-scene" aria-hidden="true"><img className="onboarding-story-art" src="/images/onboarding-team-v1.png" alt="" width={1024} height={1024} draggable={false} /><TeamFlowIllustration /></div>
      <h2>{t("和你的团队，还有你的 Agent，一起完成任务。")}</h2>
    </div></aside>
    <main className="onboarding-main"><div className="onboarding-flow">
      <div className="onboarding-form-brand"><a className="onboarding-brand" aria-label={t("Taskdoor 首页")} href="/"><BrandLogo /></a></div>
      <section className="onboarding-card"><GoogleFirstConsent email="alex@example.com" onContinue={() => setConfirmed(true)} onDecline={() => window.location.assign("/login")} />
        {confirmed && <p className="google-first-consent-status" role="status">{t("已确认同意。")}</p>}
      </section>
    </div></main>
  </div>;
}
