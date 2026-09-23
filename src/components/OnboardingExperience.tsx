import { GoogleAuthPreview } from "./GoogleAuthPreview";
import googleIcon from "@lobehub/icons-static-svg/icons/google-color.svg";
import { useI18n } from "../i18n/I18nProvider";
import { onboardingTranslator, localizeOnboardingMessage } from "../i18n/onboardingMessages";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Building2, Check, CircleAlert, Eye, EyeOff, LoaderCircle, Mail } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { TeamFlowIllustration } from "./TeamFlowIllustration";
import { WorkspaceLoading } from "./WorkspaceLoading";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { VerificationCodeInput } from "./ui/verification-code-input";
import { simplifyOnboardingEntry, createOnboardingPreview, digestPreviewPassword, getPreviewCodeResendDelay, getPreviewInvitation,  restoreOnboardingPreview, transitionOnboarding, type AuthMode, type OnboardingAction, type OnboardingState } from "../lib/onboardingPreview";
import { loadPersonalCenterDirectory, savePersonalCenterDirectory } from "../data/memberProfiles";
import { acceptTeamEmailInvitation, resolveTeamEmailInvitation } from "../lib/teamInvitations";
import "../styles/onboarding.css";

import { enterOnboardingWorkspace } from "../lib/onboardingWorkspace";
import { onboardingStorageKey as storageKey } from "../lib/workspaceSession";
const authPaths: Record<AuthMode, string> = { login: "/login", register: "/signup", forgot: "/forgot-password" };
function initialState() {
  const token = new URLSearchParams(window.location.search).get("invite") || window.location.pathname.match(/^\/t\/[^/]+\/join\/([^/]+)\/?$/)?.[1] || "";
  const path = window.location.pathname.replace(/\/$/, "");
  const mode = path === "/signup" || path.startsWith("/t/") ? "register" : path === "/forgot-password" ? "forgot" : "login";
  let state = createOnboardingPreview(token ? "invited" : "new", token);
  try {
    const saved = restoreOnboardingPreview(sessionStorage.getItem(storageKey));
    if (saved) state = { ...saved, inviteToken: token || saved.inviteToken };
  } catch { /* Keep forms usable when browser storage is unavailable. */ }
  if (path !== "/onboarding" && (state.authMode !== mode || state.verified)) state = transitionOnboarding(state, { type: "auth-mode", mode });
  if (state.authMode === "register" && state.step === "code") state = transitionOnboarding(state, { type: "edit-email" });
  const invitation = getPreviewInvitation(state.inviteToken, loadPersonalCenterDirectory());
  if (!state.email && invitation?.email) state = { ...state, email: invitation.email };
  return simplifyOnboardingEntry(state);
}
function Brand() {
  const { locale } = useI18n();
  const t = onboardingTranslator(locale);
  return <a aria-label={t("TaskDoor 首页")} className="onboarding-brand" href="/"><BrandMark /><span>TaskDoor</span></a>;
}
function Heading({ title, description }: { title: string; description: ReactNode }) {
  return <header className="onboarding-heading"><h1 tabIndex={-1}>{title}</h1><p>{description}</p></header>;
}
function TeamInvitationCard({ invitation }: { invitation: NonNullable<ReturnType<typeof getPreviewInvitation>> }) {
  const { locale } = useI18n();
  const t = onboardingTranslator(locale);
  return <section aria-label={t("团队邀请")} className="onboarding-invitation">
    <span aria-hidden="true" className="onboarding-invitation-logo"><Building2 /></span>
    <div className="onboarding-invitation-copy">
      <strong>{invitation.team.name}</strong>
      <dl><dt>{t("加入身份")}</dt><dd>{invitation.team.role === "admin" ? t("团队管理员") : t("团队成员")}</dd></dl>
    </div>
  </section>;
}

export default function OnboardingExperience({ onWorkspaceReady }: { onWorkspaceReady: () => Promise<void> }) {
  const { locale } = useI18n();
  const t = onboardingTranslator(locale);
  const [state, setState] = useState<OnboardingState>(initialState);
  const [email, setEmail] = useState(() => state.step === "email" && ["login", "register"].includes(state.authMode) ? "" : state.email);
  const [name, setName] = useState(state.name);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState("");
  const [googlePreview, setGooglePreview] = useState(false);
  const [localError, setLocalError] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [storageNotice, setStorageNotice] = useState("");
  const surface = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const enteringWorkspace = useRef(false);
  const mounted = useRef(true);
  const debug = new URLSearchParams(window.location.search).get("preview") === "1";
  const countdown = getPreviewCodeResendDelay(state, clock);
  const invitation = getPreviewInvitation(state.inviteToken, loadPersonalCenterDirectory());
  const activeTeam = state.teams.find(team => team.id === state.activeTeamId);
  const alreadyMember = Boolean(invitation && state.teams.some(team => team.id === invitation.team.id));
  const inviteProblem = !invitation ? t("这份邀请无法使用") : invitation.status === "expired" ? t("这份邀请已过期") : invitation.status === "revoked" ? t("这份邀请已撤销") : invitation.email && invitation.email !== state.email ? t("请使用受邀邮箱加入") : "";
  const registration = state.authMode === "register";
  const forgot = state.authMode === "forgot";
  const authScreen = ["email", "code", "reset-password"].includes(state.step);
  const href = (mode: AuthMode) => {
    const params = new URLSearchParams();
    if (state.inviteToken) params.set("invite", state.inviteToken);
    if (debug) params.set("preview", "1");
    return `${authPaths[mode]}${params.size ? `?${params}` : ""}`;
  };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    document.title = `${state.step === "workspace" ? activeTeam?.name : !authScreen ? t("设置团队") : registration ? t("注册") : forgot ? t("重置密码") : t("登录")} · TaskDoor`;
    const params = new URLSearchParams();
    if (state.inviteToken) params.set("invite", state.inviteToken);
    if (debug) params.set("preview", "1");
    window.history.replaceState(null, "", `${authScreen ? authPaths[state.authMode] : "/onboarding"}${params.size ? `?${params}` : ""}`);
    try { sessionStorage.setItem(storageKey, JSON.stringify(state)); setStorageNotice(""); }
    catch { setStorageNotice("浏览器未能保存本次进度，刷新后需要重新开始。"); }
  }, [state, activeTeam?.name, authScreen, registration, forgot, debug, locale]);
  useEffect(() => {
    setLocalError("");
    setGooglePreview(false);
    setPassword("");
    setShowPassword(false);
    setCode("");
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      // Focus the title without opening the mobile keyboard on page entry.
      surface.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [state.step, state.authMode]);
  useEffect(() => {
    if (state.error) surface.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [state.error]);
  useEffect(() => {
    if (state.step !== "code" && !state.registrationCode) return;
    setClock(Date.now());
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.step, state.codeExpiresAt, state.registrationCode]);

  const enterWorkspace = async () => {
    if (enteringWorkspace.current) return;
    enteringWorkspace.current = true;
    setLocalError("");
    try { enterOnboardingWorkspace(state); await onWorkspaceReady(); }
    catch (error) { if (mounted.current) setLocalError(error instanceof Error ? error.message : "无法进入工作区，请重试。"); }
    finally { enteringWorkspace.current = false; }
  };
  useEffect(() => {
    if (state.step === "workspace") void enterWorkspace();
  }, [state]);

  const change = (action: OnboardingAction) => {
    if (!pending.current) setState(previous => simplifyOnboardingEntry(transitionOnboarding(previous, action, loadPersonalCenterDirectory())));
  };
  const clearError = () => { setLocalError(""); if (state.error) change({ type: "clear-error" }); };
  const perform = async (action: OnboardingAction | (() => Promise<OnboardingAction>), label: string) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(label);
    setLocalError("");
    try {
      const resolved = typeof action === "function" ? await action() : action;
      if (mounted.current) {
        const personalState = loadPersonalCenterDirectory();
        const next = simplifyOnboardingEntry(transitionOnboarding(state, resolved, personalState));
        if (resolved.type === "accept-invite" && next.step === "workspace" && !next.error && resolveTeamEmailInvitation(personalState, state.inviteToken)) {
          const joined = acceptTeamEmailInvitation(personalState, state.inviteToken, next);
          if (!savePersonalCenterDirectory(joined)) throw new Error("加入状态未能保存，请检查浏览器存储后重试。");
        }
        setState(next);
      }
    } catch (caught) { if (mounted.current) setLocalError(caught instanceof Error ? caught.message : "暂时无法完成操作，请重试。"); }
    finally { pending.current = false; if (mounted.current) setBusy(""); }
  };
  const submitAuth = (event: FormEvent) => {
    event.preventDefault();
    if (forgot) { void perform({ type: "forgot-password", email, now: Date.now() }, "继续中…"); return; }
    if (!password) { setLocalError("请输入密码。"); surface.current?.querySelector<HTMLElement>("#account-password")?.focus(); return; }
    void perform(async () => {
      const passwordDigest = await digestPreviewPassword(password, email);
      return registration ? { type: "complete-registration", name: "", email, passwordDigest, passwordLength: password.length, code, now: Date.now() } : { type: "login", email, passwordDigest };
    }, registration ? "正在验证并创建账号…" : "正在登录…");
  };
  const switchAccount = () => { change({ type: "switch-account" }); setEmail(""); setName(""); };
  const errorField = state.error ? state.errorField : ["请输入密码。", "密码至少需要 8 位。"].includes(localError) ? "password" : "";
  const invalid = (field: string) => ({ "aria-invalid": errorField === field || undefined, "aria-describedby": errorField === field ? "onboarding-error" : undefined });
  const error = localizeOnboardingMessage(locale, state.error || localError);
  const errorBlock = error ? <p className="onboarding-error" id="onboarding-error" role="alert"><CircleAlert aria-hidden="true" /><span>{error}</span></p> : null;
  const submitButton = (label: string, incomplete = false) => <Button className="onboarding-primary" type="submit" disabled={Boolean(busy) || incomplete}>{busy ? <><LoaderCircle aria-hidden="true" className="onboarding-spinner" />{localizeOnboardingMessage(locale, busy)}</> : label}</Button>;
  const back = (action: OnboardingAction, label = t("返回")) => <button className="onboarding-back" disabled={Boolean(busy)} onClick={() => change(action)}><ArrowLeft aria-hidden="true" />{label}</button>;
  const account = <div className="onboarding-account"><span><Mail aria-hidden="true" /><span>{state.email}</span></span><button onClick={switchAccount}>{t("退出登录")}</button></div>;
  const profileField = !state.name ? <div className="onboarding-field"><label className="onboarding-input-label" htmlFor="account-name">{t("姓名")}</label><Input id="account-name" name="name" autoComplete="name" placeholder={t("你的称呼")} maxLength={40} value={name} disabled={Boolean(busy)} {...invalid("name")} onChange={event => { setName(event.target.value); clearError(); }} />{errorField === "name" && errorBlock}</div> : null;
  const passwordField = (reset = false) => <div className="onboarding-field">
    <label className="onboarding-input-label" htmlFor="account-password">{reset ? t("新密码") : t("密码")}</label>
    <div className="onboarding-password"><Input id="account-password" name="password" type={showPassword ? "text" : "password"} autoComplete={registration || reset ? "new-password" : "current-password"} placeholder={registration || reset ? t("密码（至少 8 位）") : t("密码")} value={password} disabled={Boolean(busy)} {...invalid("password")} onBlur={() => { if ((registration || reset) && password && password.length < 8) setLocalError("密码至少需要 8 位。"); }} onChange={event => { setPassword(event.target.value); clearError(); }} /><button type="button" aria-label={showPassword ? t("隐藏密码") : t("显示密码")} aria-pressed={showPassword} disabled={Boolean(busy)} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
    {errorField === "password" && errorBlock}
  </div>;

  if (state.step === "workspace") return <WorkspaceLoading teamName={activeTeam?.name} error={localizeOnboardingMessage(locale, localError)} onRetry={() => void enterWorkspace()} />;

  return <div className="onboarding-page onboarding-auth" ref={surface}>
    <aside className="onboarding-story" aria-labelledby="onboarding-story-title">
      <div className="onboarding-story-inner">
        <div className="onboarding-art-scene" aria-hidden="true">
          <img className="onboarding-story-art" src="/images/onboarding-team-v1.png" alt="" width={1024} height={1024} fetchPriority="high" draggable={false} />
          <TeamFlowIllustration />
        </div>
        <h2 id="onboarding-story-title">{t("和你的团队，一起把工作做好。")}</h2>
      </div>
    </aside>
    <main className="onboarding-main"><div className="onboarding-flow">
      <div className="onboarding-form-brand"><Brand /></div>
      <section className="onboarding-card" data-step={state.step} aria-busy={Boolean(busy)}>
        {googlePreview && <GoogleAuthPreview onCancel={() => {
          setGooglePreview(false);
          requestAnimationFrame(() => surface.current?.querySelector<HTMLElement>(".onboarding-google")?.focus());
        }} onComplete={identity => {
          const next = simplifyOnboardingEntry(transitionOnboarding(state, { type: "google-preview-complete", ...identity }, loadPersonalCenterDirectory()));
          if (next.error) return localizeOnboardingMessage(locale, next.error);
          setEmail(next.email); setName(next.name); setState(next); setGooglePreview(false);
          return "";
        }} />}
        {!googlePreview && state.step === "email" && <>
          {forgot && <a className="onboarding-back" href={href("login")}><ArrowLeft aria-hidden="true" />{t("返回登录")}</a>}
          <Heading title={registration ? invitation ? t("注册并加入团队") : t("创建你的账号") : forgot ? t("忘记密码？") : t("欢迎回来")} description={registration ? invitation ? t("完成注册后，即可加入「{team}」", { team: invitation.team.name }) : t("开启与团队一起工作的全新方式") : forgot ? t("输入注册邮箱，验证后即可设置新密码") : t("登录 TaskDoor，继续你的工作")} />
          {state.inviteToken && invitation && <TeamInvitationCard invitation={invitation} />}
          {state.notice && <p className="onboarding-success" role="status"><Check aria-hidden="true" />{localizeOnboardingMessage(locale, state.notice)}</p>}
          {!forgot && <div className="onboarding-social">
            <Button type="button" variant="outline" className="onboarding-google" disabled={Boolean(busy)} onClick={() => { setGooglePreview(true); requestAnimationFrame(() => surface.current?.querySelector<HTMLElement>(".google-preview h1")?.focus()); }}>
              <img src={googleIcon} alt="" aria-hidden="true" width={20} height={20} />{t("使用 Google 继续")}
            </Button>
            <div className="onboarding-auth-divider"><span>{t("或使用邮箱")}</span></div>
          </div>}
          <form className="onboarding-form" noValidate onSubmit={submitAuth}>

            <div className="onboarding-field"><label className="onboarding-input-label" htmlFor="account-email">{t("邮箱")}</label><Input id="account-email" name={forgot ? "email" : "username"} type="email" inputMode="email" autoComplete={forgot ? "email" : "username"} autoCapitalize="none" spellCheck={false} placeholder={t("邮箱地址")} maxLength={254} value={email} disabled={Boolean(busy)} {...invalid("email")} onChange={event => { setEmail(event.target.value); if (registration) { setCode(""); change({ type: "edit-email" }); } clearError(); }} />{errorField === "email" && errorBlock}</div>
            {!forgot && passwordField()}
            {registration && <div className="onboarding-field">
              <label className="onboarding-input-label" htmlFor="registration-code">{t("验证码")}</label>
              <div className="onboarding-registration-code">
                <Input id="registration-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder={t("邮箱验证码")} value={code} disabled={Boolean(busy)} {...invalid("code")} onChange={event => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); clearError(); }} />
                <Button type="button" variant="outline" disabled={Boolean(busy) || countdown > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())} onClick={() => {
                  setCode("111111");
                  void perform({ type: "request-registration-code", email, code: "111111", now: Date.now() }, "正在发送…");
                }}>{countdown > 0 ? t("{seconds} 秒后重新获取", { seconds: countdown }) : state.registrationCode ? t("重新获取") : t("发送验证码")}</Button>
              </div>
              {errorField === "code" && errorBlock}
            </div>}
            {!["name", "email", "password", "code"].includes(errorField) && errorBlock}{submitButton(registration ? t("验证并创建账号") : forgot ? t("继续") : t("登录"), registration && (!email.trim() || password.length < 8 || code.length !== 6))}
          </form>
          {!registration && !forgot && <p className="onboarding-forgot-link"><a href={href("forgot")}>{t("忘记密码？")}</a></p>}
          {!forgot && <p className="onboarding-auth-switch">{registration ? t("已有账号？") : t("还没有账号？")}<a className="onboarding-link" href={href(registration ? "login" : "register")}>{registration ? t("登录") : t("注册")}</a></p>}
        </>}
        {state.step === "code" && <>
          {back({ type: "edit-email" }, t("修改邮箱"))}
          <Heading title={forgot ? t("验证你的身份") : t("验证邮箱")} description={<>{t("请输入以下邮箱对应的 6 位验证码：")}<strong className="onboarding-email-address">{state.email}</strong></>} />
          <form className="onboarding-form" noValidate onSubmit={event => { event.preventDefault(); void perform({ type: "verify-code", code, now: Date.now() }, "正在验证…"); }}>
            <div className="onboarding-field"><label htmlFor="account-code">{t("验证码")}</label><VerificationCodeInput id="account-code" value={code} onValueChange={value => { setCode(value); clearError(); }} disabled={Boolean(busy)} invalid={Boolean(state.error)} describedBy={state.error ? "onboarding-error" : undefined} /></div>
            <div className="onboarding-code-help"><span>{t("输入任意 6 位数字即可")}</span><button type="button" disabled={countdown > 0 || Boolean(busy)} onClick={() => { setCode(""); change({ type: "send-code", now: Date.now() }); }}>{countdown > 0 ? t("{seconds} 秒后重新获取", { seconds: countdown }) : t("重新获取")}</button></div>
            {errorBlock}{submitButton(forgot ? t("验证并继续") : t("验证邮箱"), code.length !== 6)}
          </form>
        </>}
        {state.step === "reset-password" && <>
          <Heading title={t("设置新密码")} description={t("使用新密码登录你的 TaskDoor 账号。")} />
          <form className="onboarding-form" noValidate onSubmit={event => { event.preventDefault(); void perform(async () => ({ type: "reset-password", passwordDigest: await digestPreviewPassword(password, state.email), passwordLength: password.length }), "正在更新…"); }}>{passwordField(true)}{errorField !== "password" && errorBlock}{submitButton(t("更新密码"))}</form>
          <p className="onboarding-auth-switch"><a className="onboarding-link" href={href("login")}>{t("返回登录")}</a></p>
        </>}
        {state.step === "invite" && <>
          <Heading title={inviteProblem || (alreadyMember ? t("你已在这个团队中") : t("加入「{team}」", { team: invitation?.team.name ?? "" }))} description={inviteProblem ? (invitation?.email && invitation.email !== state.email ? t("这份邀请发给了 {email}。", { email: invitation.email }) : t("请联系团队管理员，获取新的邀请链接。")) : t("确认团队信息，加入后即可开始协作。")} />
          {invitation && <TeamInvitationCard invitation={invitation} />}
          {!inviteProblem && profileField}
          {(inviteProblem || errorField !== "name") && errorBlock}{inviteProblem ? <div className="onboarding-invite-recovery">{invitation?.email && invitation.email !== state.email && <Button className="onboarding-primary" onClick={switchAccount}>{t("切换账号")}</Button>}</div> : <Button className="onboarding-primary" disabled={Boolean(busy)} onClick={() => void perform({ type: "accept-invite", profileName: name }, "正在加入…")}>{localizeOnboardingMessage(locale, busy) || (alreadyMember ? t("进入团队") : t("立即加入"))}</Button>}{account}
        </>}
      </section>
      {storageNotice && <p className="onboarding-storage-notice" role="status">{localizeOnboardingMessage(locale, storageNotice)}</p>}
    </div></main>
  </div>;
}
