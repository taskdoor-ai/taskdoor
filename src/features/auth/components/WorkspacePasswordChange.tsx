import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { onboardingTranslator, localizeOnboardingMessage } from "@/features/auth/i18n/onboarding-messages";
import { digestPreviewPassword, getPreviewCodeResendDelay, transitionOnboarding, type OnboardingState } from "@/features/auth/lib/onboarding-preview";
import { readWorkspaceAccountEmail, readWorkspacePasswordChange, saveWorkspacePasswordChange } from "@/features/auth/lib/onboarding-workspace";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { VerificationCodeInput } from "@/shared/ui/verification-code-input";
import "@/features/auth/styles/onboarding.css";

export function WorkspacePasswordChange() {
  const { locale } = useI18n();
  const t = onboardingTranslator(locale);
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<OnboardingState | null>(null);
  const accountEmail = readWorkspaceAccountEmail();

  return <Dialog open={open} onOpenChange={next => {
    if (next) setInitial(readWorkspacePasswordChange());
    setOpen(next);
  }}>
    <div className="grid gap-(--ad-space-1)">
      <label>
        <span>{t("登录邮箱")}</span>
        <Input
          className="bg-(--ad-surface-subtle) text-(--ad-ink-secondary)"
          placeholder={t("未能读取登录邮箱")}
          readOnly
          type="email"
          value={accountEmail ?? ""}
        />
      </label>
      <DialogTrigger
        disabled={!accountEmail}
        render={<Button className="personal-profile-password-action justify-self-start px-0 text-(length:--ad-text-label)" size="sm" type="button" variant="link" />}
      >
        {t("修改密码")}
      </DialogTrigger>
    </div>
    <DialogContent overlayForceRender showCloseButton={false}>
      {open && (initial ? <PasswordChangeForm initial={initial} /> : <>
        <DialogHeader><DialogTitle>{t("修改密码")}</DialogTitle><DialogDescription>{t("无法确认当前账号，请重新登录后重试。")}</DialogDescription></DialogHeader>
        <DialogFooter><DialogClose render={<Button size="touch" type="button" variant="outline" />}>{t("取消")}</DialogClose></DialogFooter>
      </>)}
    </DialogContent>
  </Dialog>;
}

function PasswordChangeForm({ initial }: { initial: OnboardingState }) {
  const { locale } = useI18n();
  const t = onboardingTranslator(locale);
  const id = useId();
  const [state, setState] = useState(initial);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now);
  const pending = useRef(false);
  const active = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const checkingCode = state.step === "code";
  const settingPassword = state.step === "reset-password";
  const countdown = getPreviewCodeResendDelay(state, clock);
  const visibleError = error || state.error;

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    if (settingPassword) passwordInput.current?.focus();
    if (!checkingCode) return;
    form.current?.querySelector<HTMLInputElement>("[data-autofocus]")?.focus();
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [checkingCode, settingPassword]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    const now = Date.now();
    setError("");
    if (!checkingCode && !settingPassword) {
      setClock(now);
      setState(transitionOnboarding(state, { type: "forgot-password", email: initial.email, now }));
      return;
    }
    if (checkingCode) {
      setState(transitionOnboarding(state, { type: "verify-code", code, now }));
      return;
    }
    if (password.length < 8) {
      setError("密码至少需要 8 位。");
      passwordInput.current?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const digest = await digestPreviewPassword(password, state.email);
      if (!active.current) return;
      const next = saveWorkspacePasswordChange(state, digest, password.length);
      if (next.error) setError(next.error);
      else window.location.replace("/login");
    } catch (failure) {
      if (active.current) setError(failure instanceof Error && failure.message === "账号或验证状态已变化，请重新打开修改密码。" ? failure.message : "密码未能保存，请重试。");
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  };

  return <>
    <DialogHeader>
      <DialogTitle>{t("修改密码")}</DialogTitle>
      <DialogDescription>{settingPassword ? t("更新密码后需要重新登录。") : t("验证当前账号的邮箱后即可修改密码。")}</DialogDescription>
    </DialogHeader>
    <form aria-busy={busy} className="onboarding-form" noValidate onSubmit={submit} ref={form}>
      <div className="onboarding-field">
        <label htmlFor={`${id}-email`}>{t("邮箱")}</label>
        <Input autoComplete="username" id={`${id}-email`} name="username" readOnly type="email" value={state.email} />
      </div>
      {checkingCode && <>
        <div className="onboarding-field">
          <label htmlFor={`${id}-code`}>{t("验证码")}</label>
          <VerificationCodeInput describedBy={visibleError ? `${id}-error` : undefined} id={`${id}-code`} invalid={Boolean(visibleError)} value={code} onValueChange={value => {
            setCode(value);
            if (state.error) setState(transitionOnboarding(state, { type: "clear-error" }));
          }} />
        </div>
        <div className="onboarding-code-help"><button disabled={countdown > 0} type="button" onClick={() => {
          const now = Date.now();
          setClock(now);
          setCode("");
          setState(transitionOnboarding(state, { type: "send-code", now }));
          form.current?.querySelector<HTMLInputElement>("[data-autofocus]")?.focus();
        }}>{countdown > 0 ? t("{seconds} 秒后重新获取", { seconds: countdown }) : t("重新获取")}</button></div>
      </>}
      {settingPassword && <div className="onboarding-field">
        <label htmlFor={`${id}-password`}>{t("新密码")}</label>
        <div className="onboarding-password">
          <Input aria-describedby={visibleError ? `${id}-error` : undefined} aria-invalid={visibleError === "密码至少需要 8 位。" || undefined} autoComplete="new-password" disabled={busy} id={`${id}-password`} name="password" onChange={event => { setPassword(event.target.value); setError(""); }} placeholder={t("密码（至少 8 位）")} ref={passwordInput} type={showPassword ? "text" : "password"} value={password} />
          <button aria-label={t(showPassword ? "隐藏密码" : "显示密码")} aria-pressed={showPassword} disabled={busy} onClick={() => setShowPassword(value => !value)} type="button">{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
        </div>
      </div>}
      {visibleError && <p className="onboarding-error" id={`${id}-error`} role="alert">{localizeOnboardingMessage(locale, visibleError)}</p>}
      <DialogFooter>
        <DialogClose render={<Button size="touch" type="button" variant="outline" />}>{t("取消")}</DialogClose>
        <Button disabled={busy || (checkingCode && code.length !== 6)} size="touch" type="submit">{t(busy ? "正在更新…" : settingPassword ? "更新密码" : checkingCode ? "验证并继续" : "发送验证码")}</Button>
      </DialogFooter>
    </form>
  </>;
}
