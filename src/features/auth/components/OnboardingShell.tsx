import { useEffect, useState, type ReactNode, type Ref } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { applyTheme, readThemePreference, THEME_STORAGE_KEY } from "@/shared/lib/theme-preference";
import { BrandLogo } from "@/shared/ui/BrandMark";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { TeamFlowIllustration } from "@/features/auth/components/TeamFlowIllustration";
import { onboardingTranslator } from "@/features/auth/i18n/onboarding-messages";
import "@/features/auth/styles/onboarding.css";
import "@/features/auth/styles/auth-sand.css";

/** A21's released shell, with only Demo preferences and local form state behind it. */
export function OnboardingShell({ appearance, busy = false, step, children, notice, surfaceRef }: {
  appearance?: "sand-auth";
  busy?: boolean;
  step: string;
  children: ReactNode;
  notice?: ReactNode;
  surfaceRef?: Ref<HTMLDivElement>;
}) {
  const { locale, t: ui } = useI18n();
  const t = onboardingTranslator(locale);
  const [theme, setTheme] = useState(readThemePreference);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setTheme(readThemePreference());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const themeLabel = theme === "light" ? ui("theme.dark") : ui("theme.light");
  const toggleTheme = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Keep the current tab usable. */ }
  };
  return <div className={`onboarding-page onboarding-auth${appearance ? "" : " onboarding-auth--standard"}`} data-auth-appearance={appearance} ref={surfaceRef}>
    {!appearance && <div className="onboarding-language"><LanguageSwitcher /></div>}
    <aside className="onboarding-story" aria-labelledby="onboarding-story-title">
      <div className="onboarding-story-inner">
        <div className="onboarding-art-scene" aria-hidden="true">
          <img className="onboarding-story-art" src="/images/onboarding-team-v1.png" alt="" width={1024} height={1024} fetchPriority="high" draggable={false} />
          <span className="onboarding-avatar-backs" />
          <img className="onboarding-story-art onboarding-story-art--avatars" src="/images/onboarding-team-v1.png" alt="" width={1024} height={1024} draggable={false} />
          <TeamFlowIllustration />
        </div>
        <h2 id="onboarding-story-title">{t("和你的团队，还有你的 Agent，一起完成任务。")}</h2>
      </div>
    </aside>
    <main className="onboarding-main"><div className="onboarding-flow">
      <div className="onboarding-form-brand"><a aria-label={t("Taskdoor 首页")} className="onboarding-brand" href="/"><BrandLogo /></a></div>
      <section className="onboarding-card" aria-busy={busy} data-step={step}>{children}</section>
      {notice}
      {appearance && <footer className="onboarding-footer">
        <nav aria-label={t("法律信息")} className="onboarding-legal-links">
          <a href="https://sand.taskdoor.com/privacy.html" target="_blank" rel="noopener noreferrer">{t("隐私政策")}</a>
          <a href="https://sand.taskdoor.com/terms.html" target="_blank" rel="noopener noreferrer">{t("服务条款")}</a>
        </nav>
        <div className="onboarding-preferences">
          <LanguageSwitcher authAppearance={appearance} />
          <button aria-label={themeLabel} className="onboarding-theme-toggle" onClick={toggleTheme} title={themeLabel} type="button">
            {theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
          </button>
        </div>
      </footer>}
    </div></main>
  </div>;
}
