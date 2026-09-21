import { useI18n } from "../i18n/I18nProvider";
import { mockPersonName } from "../i18n/mockContent";
import { useModuleCopy } from "../i18n/moduleMessages";
import { currentWorkspaceUserId } from "../lib/workspaceSession";
import { Building2, ImagePlus, ListChecks, UserRound, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { applyPersonalProfileDraft, isValidProfileEmail, savePersonalCenterState, type PersonalCenterState } from "../data/memberProfiles";
import { PersonalResponsibilityPanel, TeamInformationPanel, TeamMembersPanel } from "./PersonalCenterPage";
import type { Member } from "./MemberSelector";
import { PersonAvatar, PersonName } from "./PersonAvatar";
import { Button } from "./ui/button";
import { toast } from "./ui/toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Dialog as Modal, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { createPersonalAvatarDataUrl } from "../lib/personalAvatar";
import { applyAutomaticResponsibilityUpdates } from "../lib/responsibilityProposals";

export type PersonalCenterModule = "profile" | "team" | "members" | "responsibility";
type PendingResponsibilityAction = { run: () => void };

export function PersonalCenterModal({ activeModule, activeTeamId, members, onActiveTeamChange, onModuleChange, onOpenChange, onOpenEvidence, onStateChange, open, state }: { activeModule: PersonalCenterModule; activeTeamId: string; members: Member[]; onActiveTeamChange: (teamId: string) => void; onModuleChange: (module: PersonalCenterModule) => void; onOpenChange: (open: boolean) => void; onOpenEvidence: (taskId: string) => void; onStateChange: (state: PersonalCenterState) => void; open: boolean; state: PersonalCenterState }) {
  const m = useModuleCopy();
  const { locale } = useI18n();
  const [draft, setDraft] = useState(state.profile);
  const [saveError, setSaveError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [responsibilityDirty, setResponsibilityDirty] = useState(false);
  const [autoUpdateError, setAutoUpdateError] = useState("");
  const [autoUpdateAttempt, setAutoUpdateAttempt] = useState(0);
  const [pendingResponsibilityAction, setPendingResponsibilityAction] = useState<PendingResponsibilityAction | null>(null);
  const responsibilityModuleRef = useRef<HTMLButtonElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const profileValid = Boolean(draft.name.trim()) && isValidProfileEmail(draft.email);

  // The modal stays mounted while closed, so enabled teams also process new suggestions outside settings.
  useEffect(() => {
    const next = applyAutomaticResponsibilityUpdates(state, { pausedTeamId: responsibilityDirty ? activeTeamId : undefined });
    if (next !== state) {
      if (!savePersonalCenterState(next)) {
        setAutoUpdateError(m('couldNotSaveAutomaticResponsibilityUpdatesYour'));
        return;
      }
      onStateChange(next);
    }
    setAutoUpdateError("");
  }, [activeTeamId, autoUpdateAttempt, onStateChange, responsibilityDirty, state]);

  useEffect(() => {
    if (!open) {
      setResponsibilityDirty(false);
      setPendingResponsibilityAction(null);
      return;
    }
    setDraft({ ...state.profile });
    setSaveError("");
    setAvatarBusy(false);
  }, [open, state.profile]);

  useEffect(() => {
    if (!open || activeModule !== "responsibility") return;
    window.requestAnimationFrame(() => responsibilityModuleRef.current?.focus());
  }, [activeModule, open]);

  const save = () => {
    if (!profileValid || avatarBusy) return;
    const next = applyPersonalProfileDraft(state, draft, currentWorkspaceUserId());
    if (!savePersonalCenterState(next)) {
      setSaveError(m('couldNotSaveYourProfileYourInformation'));
      return;
    }
    onStateChange(next);
    toast.success(m('profileSaved'));
  };

  const changeAvatar = async (file: File | undefined) => {
    if (!file) return;
    setSaveError("");
    setAvatarBusy(true);
    try {
      const avatarDataUrl = await createPersonalAvatarDataUrl(file);
      setDraft((current) => ({ ...current, avatarDataUrl }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : m('couldNotProcessThisImageChooseAnother'));
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
      <DialogHeader className="personal-center-dialog-header"><DialogTitle>{m('settings')}</DialogTitle><DialogDescription className="sr-only">{m('viewYourProfileAndCurrentTeamInformation')}</DialogDescription></DialogHeader>
      <div className="personal-center-dialog-body">
        <aside aria-label={m('settingsNavigation')} className="personal-center-module-nav">
          <div className="personal-center-module-identity"><PersonAvatar avatarUrl={state.profile.avatarDataUrl} name={state.profile.name} size="md" /><strong><PersonName name={state.profile.name} /></strong></div>
          <nav>
            <div className="personal-center-nav-group">
              <span>{m('personalSettings')}</span>
              <button aria-current={activeModule === "profile" ? "page" : undefined} className="personal-center-nav-action" onClick={() => changeModule("profile")} type="button"><UserRound aria-hidden="true" /><span>{m('profile')}</span></button>
              <button aria-current={activeModule === "responsibility" ? "page" : undefined} className="personal-center-nav-action" onClick={() => changeModule("responsibility")} ref={responsibilityModuleRef} type="button"><ListChecks aria-hidden="true" /><span>{m('myResponsibilities')}</span></button>
            </div>
            <div className="personal-center-nav-group">
              <span>{m('teamSettings')}</span>
              <button aria-current={activeModule === "team" ? "page" : undefined} className="personal-center-nav-action" onClick={() => changeModule("team")} type="button"><Building2 aria-hidden="true" /><span>{m('teamInformation')}</span></button>
              <button aria-current={activeModule === "members" ? "page" : undefined} className="personal-center-nav-action" onClick={() => changeModule("members")} type="button"><UsersRound aria-hidden="true" /><span>{m('members')}</span></button>
            </div>
          </nav>
        </aside>
        <section aria-labelledby={activeModule === "profile" ? "personal-center-panel-title" : activeModule === "team" ? "team-information-title" : activeModule === "members" ? "team-members-title" : "personal-responsibility-title"} className="personal-center-module-content">
          {activeModule === "profile" ? <div className="personal-profile-panel">
            <header><small>{m('sharedProfile')}</small><h2 id="personal-center-panel-title">{m('profile')}</h2><p>{m('yourTeamsUseThisProfileToIdentify')}</p></header>
            <div className="personal-edit-fields">
              <section aria-label={m('avatar')} className="personal-avatar-setting">
                <div className="personal-avatar-preview">
                  <button aria-label={m('chooseAnAvatarImage')} className="personal-avatar-choice" disabled={avatarBusy} onClick={() => avatarInputRef.current?.click()} type="button">
                    <PersonAvatar avatarUrl={draft.avatarDataUrl} className="personal-avatar-image" name={draft.name || state.profile.name} showProfilePreview={false} size="xl" />
                  </button>
                  <Button aria-label={m('changeAvatar')} className="personal-avatar-edit" disabled={avatarBusy} onClick={() => avatarInputRef.current?.click()} size="icon-xs" title={m('changeAvatar')} type="button" variant="outline"><ImagePlus aria-hidden="true" /></Button>
                  <input accept="image/jpeg,image/png,image/webp" aria-label={m('chooseALocalAvatarImage')} className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void changeAvatar(file); }} ref={avatarInputRef} type="file" />
                </div>
              </section>
              <label><span>{m('name')}</span><Input autoFocus onChange={(event) => { setDraft({ ...draft, name: event.target.value });  }} value={mockPersonName(locale, currentWorkspaceUserId(), draft.name)} /></label>
              <label><span>{m('email')}</span><Input aria-label={m('email')} type="email" value={draft.email} onChange={(event) => { setDraft({ ...draft, email: event.target.value }); setSaveError("");  }} /></label>
              {saveError && <p aria-live="polite" className="personal-edit-error" role="alert">{m.text(saveError)}</p>}
            </div>
            <div className="personal-profile-actions"><span aria-live="polite">{avatarBusy ? m('processingAvatar') : ""}</span><Button disabled={!profileValid || avatarBusy} onClick={save} type="button">{m('saveProfile')}</Button></div>
          </div> : activeModule === "team" ? <TeamInformationPanel activeTeamId={activeTeamId} onActiveTeamChange={onActiveTeamChange} onStateChange={onStateChange} state={state} /> : activeModule === "members" ? <TeamMembersPanel activeTeamId={activeTeamId} members={members} onActiveTeamChange={onActiveTeamChange} onStateChange={onStateChange} state={state} /> : <PersonalResponsibilityPanel activeTeamId={activeTeamId} onActiveTeamChange={onActiveTeamChange} onDirtyChange={setResponsibilityDirty} onOpenEvidence={onOpenEvidence} onRequestContextChange={requestResponsibilityAction} onStateChange={onStateChange} state={state} />}
          {autoUpdateError && <div><p className="personal-edit-error" role="alert">{m.text(autoUpdateError)}</p><Button onClick={() => setAutoUpdateAttempt((attempt) => attempt + 1)} size="sm" type="button" variant="link">{m('retryAutomaticUpdate')}</Button></div>}
        </section>
      </div>
    </DialogContent>
    <AlertDialog onOpenChange={(nextOpen) => { if (!nextOpen && pendingResponsibilityAction) cancelPendingResponsibilityAction(); }} open={Boolean(pendingResponsibilityAction)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m('discardUnsavedResponsibilityChanges')}</AlertDialogTitle>
          <AlertDialogDescription>{m('yourResponsibilityChangesHaveNotBeenSaved')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancelPendingResponsibilityAction} size="touch">{m('keepEditing')}</AlertDialogCancel>
          <AlertDialogAction onClick={confirmPendingResponsibilityAction} size="touch" variant="destructive">{m('discardChanges')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Modal>;
}
