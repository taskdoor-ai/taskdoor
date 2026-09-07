import { Building2, ImagePlus, ListChecks, UserRound, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { applyPersonalProfileDraft, isValidProfileEmail, savePersonalCenterState, type PersonalCenterState } from "../data/memberProfiles";
import { PersonalResponsibilityPanel, TeamInformationPanel, TeamMembersPanel } from "./PersonalCenterPage";
import type { Member } from "./MemberSelector";
import { PersonAvatar, PersonName } from "./PersonAvatar";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Dialog as Modal, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { createPersonalAvatarDataUrl } from "../lib/personalAvatar";

export type PersonalCenterModule = "profile" | "team" | "members" | "responsibility";
type PendingResponsibilityAction = { run: () => void };

export function PersonalCenterModal({ activeModule, activeTeamId, members, onActiveTeamChange, onModuleChange, onOpenChange, onOpenEvidence, onStateChange, open, state }: { activeModule: PersonalCenterModule; activeTeamId: string; members: Member[]; onActiveTeamChange: (teamId: string) => void; onModuleChange: (module: PersonalCenterModule) => void; onOpenChange: (open: boolean) => void; onOpenEvidence: (taskId: string) => void; onStateChange: (state: PersonalCenterState) => void; open: boolean; state: PersonalCenterState }) {
  const [draft, setDraft] = useState(state.profile);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [responsibilityDirty, setResponsibilityDirty] = useState(false);
  const [pendingResponsibilityAction, setPendingResponsibilityAction] = useState<PendingResponsibilityAction | null>(null);
  const responsibilityModuleRef = useRef<HTMLButtonElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const profileValid = Boolean(draft.name.trim()) && isValidProfileEmail(draft.email);

  useEffect(() => {
    if (!open) {
      setResponsibilityDirty(false);
      setPendingResponsibilityAction(null);
      return;
    }
    setDraft({ ...state.profile });
    setSaveError("");
    setSaved(false);
    setAvatarBusy(false);
  }, [open, state.profile]);

  useEffect(() => {
    if (!open || activeModule !== "responsibility") return;
    window.requestAnimationFrame(() => responsibilityModuleRef.current?.focus());
  }, [activeModule, open]);

  const save = () => {
    if (!profileValid || avatarBusy) return;
    const next = applyPersonalProfileDraft(state, draft, "周岚");
    if (!savePersonalCenterState(next)) {
      setSaveError("保存失败，当前信息没有改变。请检查浏览器存储设置后重试。");
      return;
    }
    onStateChange(next);
    setSaved(true);
  };

  const changeAvatar = async (file: File | undefined) => {
    if (!file) return;
    setSaveError("");
    setAvatarBusy(true);
    try {
      const avatarDataUrl = await createPersonalAvatarDataUrl(file);
      setDraft((current) => ({ ...current, avatarDataUrl }));
      setSaved(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "无法处理这张图片，请重新选择");
    } finally {
      setAvatarBusy(false);
    }
  };

  const requestResponsibilityAction = (run: () => void) => {
    if (!responsibilityDirty) {
      run();
      return;
    }
    setPendingResponsibilityAction({ run });
  };
  const returnToResponsibilityEditor = () => {
    window.setTimeout(() => document.querySelector<HTMLTextAreaElement>('#responsibility-document-editor')?.focus({ preventScroll: true }), 0);
  };
  const cancelPendingResponsibilityAction = () => {
    setPendingResponsibilityAction(null);
    returnToResponsibilityEditor();
  };
  const confirmPendingResponsibilityAction = () => {
    const action = pendingResponsibilityAction;
    if (!action) return;
    setPendingResponsibilityAction(null);
    setResponsibilityDirty(false);
    window.setTimeout(action.run, 0);
  };
  const changeModule = (module: PersonalCenterModule) => {
    if (module === activeModule) return;
    requestResponsibilityAction(() => {
      setResponsibilityDirty(false);
      onModuleChange(module);
    });
  };
  const changeOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    requestResponsibilityAction(() => {
      setResponsibilityDirty(false);
      onOpenChange(false);
    });
  };

  return <Modal onOpenChange={changeOpen} open={open}>
    <DialogContent className="personal-center-dialog">
      <DialogHeader className="personal-center-dialog-header"><DialogTitle>设置</DialogTitle><DialogDescription className="sr-only">查看个人信息和当前团队信息。</DialogDescription></DialogHeader>
      <div className="personal-center-dialog-body">
        <aside aria-label="设置功能" className="personal-center-module-nav">
          <div className="personal-center-module-identity"><PersonAvatar avatarUrl={state.profile.avatarDataUrl} name={state.profile.name} size="md" /><strong><PersonName name={state.profile.name} /></strong></div>
          <nav>
            <div className="personal-center-nav-group">
              <span>个人设置</span>
              <button aria-current={activeModule === "profile" ? "page" : undefined} className="personal-center-nav-action" onClick={() => changeModule("profile")} type="button"><UserRound aria-hidden="true" /><span>个人信息</span></button>
              <button aria-current={activeModule === "responsibility" ? "page" : undefined} className="personal-center-nav-action" onClick={() => changeModule("responsibility")} ref={responsibilityModuleRef} type="button"><ListChecks aria-hidden="true" /><span>我的责任</span></button>
            </div>
            <div className="personal-center-nav-group">
              <span>团队设置</span>
              <button aria-current={activeModule === "team" ? "page" : undefined} className="personal-center-nav-action" onClick={() => changeModule("team")} type="button"><Building2 aria-hidden="true" /><span>团队信息</span></button>
              <button aria-current={activeModule === "members" ? "page" : undefined} className="personal-center-nav-action" onClick={() => changeModule("members")} type="button"><UsersRound aria-hidden="true" /><span>成员</span></button>
            </div>
          </nav>
        </aside>
        <section aria-labelledby={activeModule === "profile" ? "personal-center-panel-title" : activeModule === "team" ? "team-information-title" : activeModule === "members" ? "team-members-title" : "personal-responsibility-title"} className="personal-center-module-content">
          {activeModule === "profile" ? <div className="personal-profile-panel">
            <header><small>跨团队资料</small><h2 id="personal-center-panel-title">个人信息</h2><p>这些资料用于团队识别和联系，不随团队切换。</p></header>
            <div className="personal-edit-fields">
              <section aria-label="头像" className="personal-avatar-setting">
                <div className="personal-avatar-preview">
                  <button aria-label="选择头像图片" className="personal-avatar-choice" disabled={avatarBusy} onClick={() => avatarInputRef.current?.click()} type="button">
                    <PersonAvatar avatarUrl={draft.avatarDataUrl} className="personal-avatar-image" name={draft.name || state.profile.name} showProfilePreview={false} size="xl" />
                  </button>
                  <Button aria-label="修改头像" className="personal-avatar-edit" disabled={avatarBusy} onClick={() => avatarInputRef.current?.click()} size="icon-xs" title="修改头像" type="button" variant="outline"><ImagePlus aria-hidden="true" /></Button>
                  <input accept="image/jpeg,image/png,image/webp" aria-label="选择本地头像图片" className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void changeAvatar(file); }} ref={avatarInputRef} type="file" />
                </div>
              </section>
              <label><span>姓名</span><Input autoFocus onChange={(event) => { setDraft({ ...draft, name: event.target.value }); setSaved(false); }} value={draft.name} /></label>
              <label><span>邮箱</span><Input aria-label="邮箱" type="email" value={draft.email} onChange={(event) => { setDraft({ ...draft, email: event.target.value }); setSaveError(""); setSaved(false); }} /></label>
              {saveError && <p aria-live="polite" className="personal-edit-error" role="alert">{saveError}</p>}
            </div>
            <div className="personal-profile-actions"><span aria-live="polite">{saved ? "已保存" : avatarBusy ? "正在处理头像" : ""}</span><Button disabled={!profileValid || avatarBusy} onClick={save} type="button">保存个人信息</Button></div>
          </div> : activeModule === "team" ? <TeamInformationPanel activeTeamId={activeTeamId} onActiveTeamChange={onActiveTeamChange} onStateChange={onStateChange} state={state} /> : activeModule === "members" ? <TeamMembersPanel activeTeamId={activeTeamId} members={members} onActiveTeamChange={onActiveTeamChange} onStateChange={onStateChange} state={state} /> : <PersonalResponsibilityPanel activeTeamId={activeTeamId} onActiveTeamChange={onActiveTeamChange} onDirtyChange={setResponsibilityDirty} onOpenEvidence={onOpenEvidence} onRequestContextChange={requestResponsibilityAction} onStateChange={onStateChange} state={state} />}
        </section>
      </div>
    </DialogContent>
    <AlertDialog onOpenChange={(nextOpen) => { if (!nextOpen && pendingResponsibilityAction) cancelPendingResponsibilityAction(); }} open={Boolean(pendingResponsibilityAction)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>放弃未保存的责任修改？</AlertDialogTitle>
          <AlertDialogDescription>当前责任说明的修改尚未保存。继续后，这些修改将丢失。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancelPendingResponsibilityAction} size="touch">继续编辑</AlertDialogCancel>
          <AlertDialogAction onClick={confirmPendingResponsibilityAction} size="touch" variant="destructive">放弃修改</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Modal>;
}
