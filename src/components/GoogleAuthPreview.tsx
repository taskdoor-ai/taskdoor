import { useState } from "react";
import { ArrowLeft, ArrowRight, CircleAlert } from "lucide-react";
import googleIcon from "@lobehub/icons-static-svg/icons/google-color.svg";
import { useI18n } from "../i18n/I18nProvider";
import { Button } from "./ui/button";

export type GooglePreviewIdentity = { name: string; email: string; subject: string };
const identities: GooglePreviewIdentity[] = [
  { name: "Alex Morgan", email: "alex@example.com", subject: "demo-alex" },
  { name: "Chen", email: "chen@example.com", subject: "demo-chen" },
  { name: "周岚", email: "zhoulan@example.com", subject: "demo-zhoulan" },
];

export function GoogleAuthPreview({ onCancel, onComplete }: {
  onCancel: () => void;
  onComplete: (identity: GooglePreviewIdentity) => string;
}) {
  const { locale } = useI18n();
  const text = (en: string, zh: string) => locale === "en" ? en : zh;
  const [error, setError] = useState("");
  return <div className="google-preview">
    <div className="google-preview-brand"><img src={googleIcon} width={26} height={26} alt="Google" /></div>
    <h1 tabIndex={-1}>{error ? text("Unable to continue", "暂时无法继续") : text("Choose an account", "选择账号")}</h1>
    <p className="google-preview-description">{text("Choose an account to sign in to TaskDoor.", "选择账号登录 TaskDoor。")}</p>
    {error ? <>
      <p className="onboarding-error" role="alert"><CircleAlert aria-hidden="true" />{error}</p>
      <Button className="onboarding-primary" onClick={() => setError("")}>{text("Choose another account", "选择其他账号")}</Button>
    </> : <div className="google-preview-accounts">{identities.map(identity => <button key={identity.subject} onClick={() => setError(onComplete(identity))}>
      <span className="google-preview-avatar">{identity.name[0]}</span><span><strong>{identity.name}</strong><small>{identity.email}</small></span><ArrowRight size={18} />
    </button>)}</div>}
    <button className="onboarding-back google-preview-cancel" onClick={onCancel}><ArrowLeft size={16} />{text("Cancel and return", "取消并返回")}</button>
  </div>;
}
