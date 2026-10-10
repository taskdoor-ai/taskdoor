import { useRef, useState } from "react";
import { createPersonalAvatarDataUrl } from "@/shared/lib/avatar-image";
import type { TeamAppearance } from "@/shared/model/team-appearance";
import { useModuleCopy } from "@/shared/i18n/module-messages";
import { AvatarEditActions } from "@/shared/ui/AvatarEditActions";
import { TeamLogo, defaultTeamAppearance } from "@/shared/ui/TeamLogo";
import "@/features/members/styles/team-appearance.css";

type Props = { teamId: string; name: string; appearance?: TeamAppearance; onChange: (appearance: TeamAppearance) => void };

export function TeamAppearancePicker({ teamId, name, appearance, onChange }: Props) {
  const m = useModuleCopy();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = appearance ?? defaultTeamAppearance(teamId);
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const avatarDataUrl = await createPersonalAvatarDataUrl(file);
      onChange({ iconTone: current.iconTone, avatarDataUrl });
    } catch (error) {
      setError(error instanceof Error ? error.message : m('couldNotProcessThisImageChooseAnother'));
    } finally {
      setBusy(false);
    }
  };
  return <>
    <div className="team-avatar-preview">
    <div aria-busy={busy} className="team-appearance-trigger">
      <TeamLogo name={name} teamId={teamId} appearance={current} size="xl" />
      <AvatarEditActions className="team-avatar-edit-overlay" disabled={busy} onEdit={() => inputRef.current?.click()} onRemove={current.avatarDataUrl ? () => { setError(""); onChange({ iconTone: current.iconTone }); } : undefined} style={{ background: `color-mix(in srgb, var(--ad-tag-${current.iconTone === "neutral" ? "gray" : current.iconTone}-ink) 80%, transparent)` }} />
    </div>
    </div>
      <input accept="image/jpeg,image/png,image/webp" aria-label={m('chooseALocalAvatarImage')} className="sr-only" ref={inputRef} type="file" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void upload(file); }} />
      {busy && <p role="status">{m('processingAvatar')}</p>}
      {error && <p role="alert">{m.text(error)}</p>}
  </>;
}
