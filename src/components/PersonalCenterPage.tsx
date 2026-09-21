import { useI18n } from "../i18n/I18nProvider";
import { mockTeamName, mockPersonName } from "../i18n/mockContent";
import { settingsMockText } from "../i18n/settingsMock";
import { useModuleCopy } from "../i18n/moduleMessages";
import { currentWorkspaceUserId } from "../lib/workspaceSession";
import { ArrowRight, ChevronDown, Copy, EyeOff, FileCheck2, Mail, Pencil, Plus, RefreshCw, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getTeamInviteLink, savePersonalCenterState, type PersonalCenterState, type ResponsibilityClaim, type ResponsibilityDocument, type TeamAccessRole } from "../data/memberProfiles";
import type { Member } from "./MemberSelector";
import { PersonAvatar, PersonName } from "./PersonAvatar";
import { Button } from "./ui/button";
import { toast } from "./ui/toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Input, Textarea } from "./ui/input";
import { Select as TeamSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { TeamLogo } from "./TeamLogo";
import { useMemberInvitations } from "./MemberInvitations";
import { applyResponsibilityProposal, rebaseResponsibilityUpdateProposal, splitResponsibilityContent } from "../lib/responsibilityProposals";
import { resolveTeamMemberResponsibility, updateTeamMemberResponsibility } from "../lib/teamMemberResponsibility";
import "../styles/personal-center.css";

const toResponsibilityParagraphs = splitResponsibilityContent;

type TeamContextProps = {
  activeTeamId: string;
  onActiveTeamChange: (teamId: string) => void;
  state: PersonalCenterState;
};

export function TeamInformationPanel({ activeTeamId, onActiveTeamChange, onStateChange, state }: TeamContextProps & { onStateChange: (state: PersonalCenterState) => void }) {
  const m = useModuleCopy();
  const { locale } = useI18n();
  const selectedTeam = state.teams.find((team) => team.id === activeTeamId) ?? state.teams[0];
  const [nameDraft, setNameDraft] = useState(selectedTeam.name);
  const [dangerAction, setDangerAction] = useState<"delete" | "leave" | null>(null);
  const currentMembership = selectedTeam.memberships.find((membership) => membership.memberId === currentWorkspaceUserId() || membership.email === state.profile.email);
  const canDelete = currentMembership?.status === "active" && currentMembership.role === "admin";
  const hasFallbackTeam = state.teams.length > 1;

  useEffect(() => {
    setNameDraft(selectedTeam.name);
    setDangerAction(null);
  }, [selectedTeam.id, selectedTeam.name]);

  const saveTeamInformation = () => {
    const name = nameDraft.trim();
    if (!name) return;
    const next = { ...state, teams: state.teams.map((team) => team.id === selectedTeam.id ? { ...team, name } : team) };
    if (!savePersonalCenterState(next)) {
      toast.error(m('couldNotSaveTheTeamNameThe'));
      return;
    }
    onStateChange(next);
    toast.success(m('teamInformationSaved'));
  };

  const removeTeam = () => {
    if (!dangerAction) return;
    if (!hasFallbackTeam) {
      toast.error(m('atLeastOneTeamMustRemain'));
      setDangerAction(null);
      return;
    }
    if (dangerAction === "delete" && !canDelete) {
      toast.error(m('onlyTeamAdministratorsCanDeleteATeam'));
      setDangerAction(null);
      return;
    }
    const teams = state.teams.filter((team) => team.id !== selectedTeam.id);
    const next = { ...state, teams };
    if (!savePersonalCenterState(next)) {
      toast.error(dangerAction === "delete" ? m('couldNotDeleteTheTeamTheTeam') : m('couldNotLeaveTheTeamYouAre'));
      setDangerAction(null);
      return;
    }
    onStateChange(next);
    onActiveTeamChange(teams[0].id);
    setDangerAction(null);
  };

  return <section aria-labelledby="team-information-title" className="personal-team-panel">
    <div className="responsibility-toolbar"><div><h2 id="team-information-title">{m('general')}</h2></div></div>
    <div className="team-general-settings">
      <section aria-labelledby="team-logo-label"><h3 id="team-logo-label">{m('teamLogo')}</h3><TeamLogo name={selectedTeam.name} size="xl" teamId={selectedTeam.id} /></section>
      <label><span>{m('teamName')}</span><Input aria-label={m('teamName')} onChange={(event) => { setNameDraft(event.target.value); }} value={mockTeamName(locale, selectedTeam.id, nameDraft)} /></label>
      <div className="team-general-actions"><Button disabled={!nameDraft.trim() || nameDraft.trim() === selectedTeam.name} onClick={saveTeamInformation} type="button">{m('saveTeamInformation')}</Button></div>
      <section className="team-danger-setting"><div><h3>{m('leaveTeam')}</h3><p>{m('leaveThisTeamYouCanRejoinIf')}</p></div><Button disabled={!hasFallbackTeam} onClick={() => setDangerAction("leave")} type="button" variant="destructive">{m('leaveTeam')}</Button></section>
      <section className="team-danger-setting"><div><h3>{m('deleteTeam')}</h3><p>{m('permanentlyDeleteThisTeamAndItsData')}</p></div><Button disabled={!canDelete || !hasFallbackTeam} onClick={() => setDangerAction("delete")} type="button" variant="destructive">{m('deleteTeam')}</Button></section>
    </div>
    <AlertDialog onOpenChange={(open) => { if (!open) setDangerAction(null); }} open={Boolean(dangerAction)}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{dangerAction === "delete" ? m("deleteTeamQuestion", { team: mockTeamName(locale, selectedTeam.id, selectedTeam.name) }) : m("leaveTeamQuestion", { team: mockTeamName(locale, selectedTeam.id, selectedTeam.name) })}</AlertDialogTitle><AlertDialogDescription>{dangerAction === "delete" ? m('teamInformationInvitationsAndResponsibilitiesWillBe') : m('afterConfirmationYouWillSwitchToAnother')}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel size="touch">{m('cancel')}</AlertDialogCancel><AlertDialogAction onClick={removeTeam} size="touch" variant="destructive">{dangerAction === "delete" ? m('confirmTeamDeletion') : m('confirmLeavingTeam')}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}

const accessRoleLabel: Record<TeamAccessRole, string> = { admin: "管理员", member: "成员" };

export function TeamMembersPanel({ activeTeamId, members, onStateChange, state }: TeamContextProps & { members: Member[]; onStateChange: (state: PersonalCenterState) => void }) {
  const m = useModuleCopy();
  const { locale } = useI18n();
  const invitations = useMemberInvitations();
  const selectedTeam = state.teams.find((team) => team.id === activeTeamId) ?? state.teams[0];
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null);
  const [responsibilityDraft, setResponsibilityDraft] = useState("");
  const currentMembership = selectedTeam.memberships.find((membership) => membership.memberId === currentWorkspaceUserId() || membership.email === state.profile.email);
  const canManage = currentMembership?.status === "active" && currentMembership.role === "admin";
  const inviteLink = getTeamInviteLink(selectedTeam);

  useEffect(() => {
    setEditingMembershipId(null);
    setResponsibilityDraft("");
  }, [selectedTeam.id]);

  const focusResponsibilityEdit = (membershipId: string) => {
    window.setTimeout(() => document.getElementById(`edit-member-responsibility-${membershipId}`)?.focus({ preventScroll: true }), 0);
  };

  const beginResponsibilityEdit = (membershipId: string, responsibility: string) => {
    if (!canManage) return;
    setEditingMembershipId(membershipId);
    setResponsibilityDraft(responsibility === "未填写责任" || responsibility === "加入后补充责任" ? "" : responsibility);
  };

  const cancelResponsibilityEdit = (membershipId: string) => {
    setEditingMembershipId(null);
    setResponsibilityDraft("");
    focusResponsibilityEdit(membershipId);
  };

  const saveMemberResponsibility = (membershipId: string) => {
    if (!canManage) return;
    const membership = selectedTeam.memberships.find((item) => item.id === membershipId);
    if (!membership || membership.status !== "active") return;
    const result = updateTeamMemberResponsibility(state, selectedTeam.id, membershipId, responsibilityDraft);
    if (result.changed && !savePersonalCenterState(result.state)) {
      toast.error(m('couldNotSaveResponsibilitiesThePreviousContent'));
      return;
    }
    if (result.changed) onStateChange(result.state);
    toast.success(result.changed ? m('responsibilitiesSaved') : m('noChangesToResponsibilities'));
    setEditingMembershipId(null);
    setResponsibilityDraft("");
    focusResponsibilityEdit(membershipId);
  };

  const commitTeam = (team: typeof selectedTeam, successMessage: string) => {
    const next = { ...state, teams: state.teams.map((item) => item.id === team.id ? team : item) };
    if (!savePersonalCenterState(next)) {
      toast.error(m('couldNotSaveMemberInformationThePrevious'));
      return false;
    }
    onStateChange(next);
    toast.success(successMessage);
    return true;
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success(m('invitationLinkCopied'));
    } catch {
      toast.error(m('couldNotCopyTheLinkSelectIt'));
    }
  };

  const regenerateInviteLink = () => {
    if (!canManage) return;
    const token = `${selectedTeam.id}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
    commitTeam({ ...selectedTeam, inviteToken: token }, m('aNewInvitationLinkWasGeneratedThe'));
  };

  const changeRole = (membershipId: string, role: TeamAccessRole) => {
    if (!canManage) return;
    const membership = selectedTeam.memberships.find((item) => item.id === membershipId);
    if (!membership || membership.role === role) return;
    const activeAdminCount = selectedTeam.memberships.filter((item) => item.status === "active" && item.role === "admin").length;
    if (membership.status === "active" && membership.role === "admin" && role === "member" && activeAdminCount === 1) {
      toast.error(m('theTeamMustHaveAtLeastOne'));
      return;
    }
    commitTeam({ ...selectedTeam, memberships: selectedTeam.memberships.map((item) => item.id === membershipId ? { ...item, role } : item) }, m("roleAssigned", { email: membership.email, role: m.text(accessRoleLabel[role]) }));
  };

  return <section aria-labelledby="team-members-title" className="team-members-panel">
    <div className="responsibility-toolbar"><div><h2 id="team-members-title">{m('members')}</h2></div></div>
    <section className="team-invite-link"><h3>{m('invitationLink')}</h3><div><Input aria-label={m('invitationLink')} readOnly value={inviteLink} /><Button aria-label={m('copyInvitationLink')} onClick={copyInviteLink} size="icon" type="button" variant="ghost"><Copy aria-hidden="true" /></Button></div><p>{m('multiplePeopleCanUseThisLinkYou')}<button disabled={!canManage} onClick={regenerateInviteLink} type="button"><RefreshCw aria-hidden="true" />{m('regenerateLink')}</button>.</p></section>
    <div className="team-members-summary">
      <strong>{m("members")} ({selectedTeam.memberships.length})</strong>
      <Button disabled={!canManage || !invitations} onClick={event => invitations?.openInvite({ allowRoleSelection: true, returnFocus: event.currentTarget })} type="button" variant="outline"><UserPlus aria-hidden="true" />{m('inviteMembers')}</Button>
    </div>
    <div className="team-member-table"><div aria-hidden="true" className="team-member-list-head"><span>{m('user')}</span><span>{m('responsibility')}</span><span>{m('role')}</span></div><ul aria-label={m('teamMembers')} className="team-member-list">{selectedTeam.memberships.map((membership) => {
      const member = members.find((item) => item.id === membership.memberId || item.email.toLocaleLowerCase() === membership.email.toLocaleLowerCase());
      const isCurrentUser = membership.memberId === currentWorkspaceUserId() || membership.email === state.profile.email;
      const responsibility = resolveTeamMemberResponsibility(membership, member);
      const memberLabel = member?.name ?? membership.email;
      const isEditingResponsibility = editingMembershipId === membership.id;
      return <li key={membership.id}><div>{membership.status === "active" ? <PersonAvatar name={member?.name ?? membership.email} personId={member?.id ?? membership.memberId} profile={member} size="md" /> : <span className="team-invited-avatar"><Mail aria-hidden="true" /></span>}<span><strong>{membership.status === "active" && member ? <PersonName name={member.name} profile={member} /> : membership.name || m('noNameSet')}{isCurrentUser && <em>{m('you')}</em>}{membership.status === "invited" && <em className="invited">{m('invited')}</em>}</strong><small>{membership.email}</small></span></div><div className="team-member-responsibility">{isEditingResponsibility ? <div className="team-member-responsibility-editor"><Input aria-label={m("memberResponsibility", { name: memberLabel })} autoFocus onChange={(event) => setResponsibilityDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveMemberResponsibility(membership.id); if (event.key === "Escape") cancelResponsibilityEdit(membership.id); }} value={responsibilityDraft} /><div><Button onClick={() => cancelResponsibilityEdit(membership.id)} size="sm" type="button" variant="ghost">{m('cancel')}</Button><Button onClick={() => saveMemberResponsibility(membership.id)} size="sm" type="button">{m('save')}</Button></div></div> : <><p className="team-member-responsibility-text" title={m.text(membership.responsibility === undefined ? settingsMockText(locale, membership.memberId ?? "", responsibility) : responsibility)}>{m.text(membership.responsibility === undefined ? settingsMockText(locale, membership.memberId ?? "", responsibility) : responsibility)}</p>{membership.status === "invited" && canManage && invitations && <div className="member-invited-actions"><Button size="sm" variant="ghost" onClick={() => { try { invitations.invite(membership.email, membership.role, true); } catch (caught) { toast.error(caught instanceof Error ? caught.message : m('couldNotResendTheInvitation')); } }}>{m('resendInvitation')}</Button></div>}{canManage && membership.status === "active" ? <Button aria-label={m("editMemberResponsibility", { name: member?.name ?? membership.email })} className="team-member-responsibility-edit" id={`edit-member-responsibility-${membership.id}`} onClick={() => beginResponsibilityEdit(membership.id, responsibility)} size="icon-sm" title={m('editResponsibilities')} type="button" variant="ghost"><Pencil aria-hidden="true" /></Button> : null}</>}</div><TeamSelect disabled={!canManage} onValueChange={(value) => changeRole(membership.id, String(value) as TeamAccessRole)} value={membership.role}><SelectTrigger aria-label={m("changeMemberRole", { name: member?.name ?? membership.email })} className="team-member-role-select" size="sm"><SelectValue>{m.text(accessRoleLabel[membership.role])}</SelectValue></SelectTrigger><SelectContent align="end" alignItemWithTrigger={false}><SelectItem value="admin">{m('administrator')}</SelectItem><SelectItem value="member">{m('member')}</SelectItem></SelectContent></TeamSelect></li>;
    })}</ul></div>
  </section>;
}

export function PersonalResponsibilityPanel({ activeTeamId, onActiveTeamChange, onDirtyChange, onOpenEvidence, onRequestContextChange, onStateChange, state }: { activeTeamId: string; onActiveTeamChange: (teamId: string) => void; onDirtyChange: (dirty: boolean) => void; onOpenEvidence: (taskId: string) => void; onRequestContextChange: (action: () => void) => void; onStateChange: (state: PersonalCenterState) => void; state: PersonalCenterState }) {
  const m = useModuleCopy();
  const { locale } = useI18n();
  const selectedTeam = useMemo(() => state.teams.find((team) => team.id === activeTeamId) ?? state.teams[0], [activeTeamId, state.teams]);
  const [responsibilityDraft, setResponsibilityDraft] = useState(selectedTeam.responsibilityDocument.content);
  const [draftSnapshot, setDraftSnapshot] = useState({ content: selectedTeam.responsibilityDocument.content, revisionId: selectedTeam.responsibilityDocument.revisionId });
  const [proposalErrors, setProposalErrors] = useState<Record<string, string>>({});
  const pendingClaims = useMemo(() => selectedTeam.observedClaims.filter((claim) => !claim.reviewState || claim.reviewState === "active"), [selectedTeam.observedClaims]);
  const responsibilityDirty = responsibilityDraft !== draftSnapshot.content;

  useEffect(() => {
    setProposalErrors({});
  }, [pendingClaims, selectedTeam.id]);

  useEffect(() => {
    setResponsibilityDraft(selectedTeam.responsibilityDocument.content);
    setDraftSnapshot({ content: selectedTeam.responsibilityDocument.content, revisionId: selectedTeam.responsibilityDocument.revisionId });
    onDirtyChange(false);
  }, [onDirtyChange, selectedTeam.id, selectedTeam.responsibilityDocument.content, selectedTeam.responsibilityDocument.revisionId]);

  const commit = (next: PersonalCenterState, message: string) => {
    if (!savePersonalCenterState(next)) {
      toast.error(m('couldNotSaveYourCurrentContentIs'));
      return false;
    }
    onStateChange(next);
    toast.success(message);
    return true;
  };

  const resetResponsibilityDraft = () => {
    setResponsibilityDraft(selectedTeam.responsibilityDocument.content);
    setDraftSnapshot({ content: selectedTeam.responsibilityDocument.content, revisionId: selectedTeam.responsibilityDocument.revisionId });
    onDirtyChange(false);
  };

  const changeAutoUpdate = (enabled: boolean) => {
    const next = { ...state, teams: state.teams.map((team) => team.id === selectedTeam.id ? { ...team, responsibilityAutoUpdate: enabled } : team) };
    commit(next, enabled ? m('automaticUpdatesEnabled') : m('automaticUpdatesDisabled'));
  };

  const changeResponsibilityDraft = (value: string) => {
    setResponsibilityDraft(value);
    onDirtyChange(value !== draftSnapshot.content);
  };

  const saveResponsibilityDocument = () => {
    if (!responsibilityDirty) return;
    const targetStillMatches = selectedTeam.responsibilityDocument.revisionId === draftSnapshot.revisionId
      && selectedTeam.responsibilityDocument.content === draftSnapshot.content;
    if (!targetStillMatches) {
      toast.error(m('responsibilitiesHaveChangedCancelYourChangesAnd'));
      return;
    }
    const content = responsibilityDraft.trim();
    const revisionId = `RESP-${selectedTeam.id.toUpperCase()}-${Date.now()}`;
    const next = {
      ...state,
      teams: state.teams.map((team) => team.id !== selectedTeam.id ? team : {
        ...team,
        responsibilityDocument: {
          content,
          updatedAt: "刚刚",
          updatedBy: state.profile.name,
          revisionId,
        },
      }),
    };
    if (commit(next, m('responsibilitiesSaved'))) {
      setResponsibilityDraft(content);
      setDraftSnapshot({ content, revisionId });
      onDirtyChange(false);
      window.setTimeout(() => document.getElementById("responsibility-document-editor")?.focus({ preventScroll: true }), 80);
    }
  };

  const cancelResponsibilityEdit = () => {
    resetResponsibilityDraft();
    window.setTimeout(() => document.getElementById("responsibility-document-editor")?.focus({ preventScroll: true }), 80);
  };

  const changeTeam = (teamId: string) => {
    if (teamId === selectedTeam.id) return;
    onRequestContextChange(() => {
      resetResponsibilityDraft();
      setProposalErrors({});
      onActiveTeamChange(teamId);
    });
  };

  const resolveSuggestion = (claim: ResponsibilityClaim, decision: "accepted" | "hidden") => {
    if (decision === "accepted" && responsibilityDirty) {
      toast.info(m('saveOrCancelYourResponsibilityChangesFirst'));
      return;
    }
    const appliedText = claim.description.trim();
    const application = decision === "accepted" ? applyResponsibilityProposal(selectedTeam.responsibilityDocument, claim, appliedText) : null;
    if (application && (application.status === "conflict" || application.status === "invalid")) {
      setProposalErrors((current) => ({ ...current, [claim.id]: application.message }));
      window.setTimeout(() => document.getElementById(`responsibility-proposal-${claim.id}-message`)?.focus({ preventScroll: true }), 80);
      return;
    }
    const nextPendingClaim = pendingClaims.find((item) => item.id !== claim.id);
    const documentChanged = application?.status === "applied";
    const nextRevisionId = documentChanged ? `RESP-${selectedTeam.id.toUpperCase()}-${Date.now()}` : selectedTeam.responsibilityDocument.revisionId;
    const nextContent = application?.content ?? selectedTeam.responsibilityDocument.content;
    const nextParagraphs = toResponsibilityParagraphs(nextContent);
    const next = {
      ...state,
      teams: state.teams.map((team) => team.id !== selectedTeam.id ? team : {
        ...team,
        responsibilityDocument: documentChanged ? {
          content: nextContent,
          updatedAt: "刚刚",
          updatedBy: state.profile.name,
          revisionId: nextRevisionId,
        } : team.responsibilityDocument,
        observedClaims: team.observedClaims.map((item) => {
          if (item.id === claim.id) return {
            ...item,
            reviewState: decision,
            updatedAt: "刚刚",
            changeHistory: [...(item.changeHistory ?? []), {
              id: `CS-SELF-${Date.now()}`,
              actor: state.profile.name,
              action: decision,
              at: "刚刚",
              ...(decision === "accepted" ? {
                appliedText,
                ...(application && "previousText" in application && application.previousText ? { previousText: application.previousText } : {}),
                resultRevisionId: nextRevisionId,
              } : {}),
            }],
          };
          if (!documentChanged || item.reviewState && item.reviewState !== "active" || item.proposal?.operation !== "update" || item.proposal.baseRevisionId !== team.responsibilityDocument.revisionId) return item;
          const target = item.proposal.target;
          if (application?.resultIndex === target.paragraphIndex || nextParagraphs[target.paragraphIndex] !== target.expectedText) return item;
          return { ...item, proposal: { ...item.proposal, baseRevisionId: nextRevisionId } };
        }),
      }),
    };
    const message = decision === "accepted"
      ? application?.status === "duplicate" ? m('noContentChangesThePendingSuggestionHas') : claim.proposal?.operation === "update" ? m('responsibilitiesUpdated') : m('responsibilityAdded')
      : m('responsibilitySuggestionIgnored');
    if (commit(next, message)) {
      setProposalErrors((current) => {
        const { [claim.id]: _removed, ...rest } = current;
        return rest;
      });
      window.setTimeout(() => {
        const focusTarget = nextPendingClaim
          ? document.getElementById("responsibility-ai-suggestions-trigger") ?? document.getElementById(`responsibility-proposal-${nextPendingClaim.id}-apply`) ?? document.getElementById(`responsibility-proposal-${nextPendingClaim.id}-ignore`)
          : document.getElementById("responsibility-document-editor");
        focusTarget?.focus({ preventScroll: true });
      }, 80);
    }
  };

  const viewEvidence = (taskId: string) => {
    onRequestContextChange(() => {
      resetResponsibilityDraft();
      onOpenEvidence(taskId);
    });
  };

  return <div className="personal-responsibility-panel">
    <section aria-labelledby="personal-responsibility-title">
      <div className="responsibility-toolbar">
        <div><small>{m('personalSettings')}</small><h2 id="personal-responsibility-title">{m('myResponsibilities')}</h2><p>{m('viewAndMaintainYourResponsibilitiesInThe')}</p></div>
        <div className="responsibility-toolbar-actions">
          <div className="responsibility-team-control">
            <span>{m('currentTeam')}</span>
            <TeamSelect onValueChange={(value) => changeTeam(String(value))} value={selectedTeam.id}>
              <SelectTrigger aria-label={m("switchResponsibilityTeam", { team: mockTeamName(locale, selectedTeam.id, selectedTeam.name) })} className="responsibility-team-select" size="sm">
                <SelectValue>{mockTeamName(locale, selectedTeam.id, selectedTeam.name)}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">{state.teams.map((team) => <SelectItem className="responsibility-team-option" key={team.id} value={team.id}>{mockTeamName(locale, team.id, team.name)}</SelectItem>)}</SelectContent>
            </TeamSelect>
          </div>
        </div>
      </div>

      <div className="personal-responsibility-workspace">
        <article aria-label={m('responsibilityDescription')} className="responsibility-document">
          <ResponsibilityStatementList autoUpdate={selectedTeam.responsibilityAutoUpdate === true} claims={pendingClaims} dirty={responsibilityDirty} document={selectedTeam.responsibilityDocument} draft={responsibilityDraft} errors={proposalErrors} key={selectedTeam.id} onAutoUpdateChange={changeAutoUpdate} onCancel={cancelResponsibilityEdit} onChangeDraft={changeResponsibilityDraft} onResolve={resolveSuggestion} onSave={saveResponsibilityDocument} onViewEvidence={viewEvidence} />
        </article>
      </div>
    </section>

  </div>;
}

function ResponsibilityStatementList({ autoUpdate, claims, dirty, document, draft, errors, onAutoUpdateChange, onCancel, onChangeDraft, onResolve, onSave, onViewEvidence }: { autoUpdate: boolean; claims: ResponsibilityClaim[]; dirty: boolean; document: ResponsibilityDocument; draft: string; errors: Record<string, string>; onAutoUpdateChange: (enabled: boolean) => void; onCancel: () => void; onChangeDraft: (value: string) => void; onResolve: (claim: ResponsibilityClaim, decision: "accepted" | "hidden") => void; onSave: () => void; onViewEvidence: (taskId: string) => void }) {
  const m = useModuleCopy();
  const { locale } = useI18n();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const paragraphs = toResponsibilityParagraphs(document.content);
  const currentClaims = claims.map((claim) => rebaseResponsibilityUpdateProposal(document, claim));

  return <div className="responsibility-document-copy">
    <div className="responsibility-document-editor">
      <div className="responsibility-document-editor-head">
        <label htmlFor="responsibility-document-editor">{m('responsibilityDescription')}</label>
        <div className="responsibility-document-editor-tools">
          <label className="responsibility-auto-update" htmlFor="responsibility-auto-update" title={m('whenEnabledAiResponsibilitySuggestionsForThe')}>
            <span>{m('automaticUpdates')}</span>
            <input aria-describedby="responsibility-auto-update-description" checked={autoUpdate} className="sr-only" id="responsibility-auto-update" onChange={(event) => onAutoUpdateChange(event.target.checked)} role="switch" type="checkbox" />
            <span aria-hidden="true" data-slot="switch-track" />
          </label>
          {currentClaims.length ? <Button aria-controls="responsibility-ai-suggestions" aria-expanded={suggestionsOpen} aria-label={suggestionsOpen ? m('hideAiSuggestions') : m('viewAiSuggestions')} className="responsibility-update-trigger" id="responsibility-ai-suggestions-trigger" onClick={() => setSuggestionsOpen((open) => !open)} size="sm" type="button" variant="inference"><Sparkles aria-hidden="true" data-icon="inline-start" /><span>{m('aiSuggestions')}</span></Button> : null}
        </div>
      </div>
      <p className="sr-only" id="responsibility-auto-update-description">{m('whenEnabledAiResponsibilitySuggestionsForThe')}</p>
      <Textarea aria-label={m('responsibilityDescription')} id="responsibility-document-editor" onChange={(event) => onChangeDraft(event.target.value)} placeholder={m('describeYourResponsibilitiesInTheCurrentTeam')} rows={8} value={settingsMockText(locale, document.revisionId, draft)} variant="responsibility" />
      <div className="responsibility-document-editor-footer">
        <span>{m("lastUpdated", { name: mockPersonName(locale, document.updatedBy, document.updatedBy), time: m.text(document.updatedAt) })}</span>
        <div className="responsibility-document-editor-actions">
          <Button disabled={!dirty} onClick={onCancel} size="sm" type="button" variant="ghost">{m('cancel')}</Button>
          <Button disabled={!dirty} onClick={onSave} size="sm" type="button">{m('save')}</Button>
        </div>
      </div>
      {autoUpdate && (dirty || currentClaims.length > 0) ? <p className="responsibility-auto-update-status" role="status">{dirty ? m('editingInProgressAutomaticUpdatesResumeAfter') : m('suggestionsThatCouldNotBeAppliedAutomatically')}</p> : null}
    </div>
    {suggestionsOpen && currentClaims.length ? <ul aria-label={m('aiResponsibilitySuggestions')} className="responsibility-suggestion-list" id="responsibility-ai-suggestions">
      {currentClaims.map((claim) => {
        const proposal = claim.proposal;
        if (proposal?.operation === "add") return <ResponsibilityAddRow actionsDisabled={dirty} claim={claim} error={errors[claim.id]} key={claim.id} onResolve={onResolve} onViewEvidence={onViewEvidence} />;
        const targetText = proposal?.operation === "update" ? paragraphs[proposal.target.paragraphIndex] : undefined;
        const isCurrentTarget = proposal?.operation === "update" && proposal.baseRevisionId === document.revisionId && targetText === proposal.target.expectedText;
        if (isCurrentTarget) return <li className="responsibility-suggestion-item" key={claim.id}><ResponsibilityUpdatePanel actionsDisabled={dirty} claim={claim} error={errors[claim.id]} onResolve={onResolve} onViewEvidence={onViewEvidence} targetText={targetText} /></li>;
        const conflict = !proposal ? m('thisSuggestionHasNoOperationTypeIgnore') : m('theOriginalResponsibilityHasChangedIgnoreThis');
        return <ResponsibilityConflictRow claim={claim} error={errors[claim.id] || conflict} key={claim.id} onResolve={onResolve} onViewEvidence={onViewEvidence} />;
      })}
    </ul> : null}
  </div>;
}

function ResponsibilityUpdatePanel({ actionsDisabled, claim, error, onResolve, onViewEvidence, targetText }: { actionsDisabled: boolean; claim: ResponsibilityClaim; error?: string; onResolve: (claim: ResponsibilityClaim, decision: "accepted" | "hidden") => void; onViewEvidence: (taskId: string) => void; targetText: string }) {
  const m = useModuleCopy();
  const { locale } = useI18n();
  const messageId = error ? `responsibility-proposal-${claim.id}-message` : undefined;
  return <div aria-label={m("updateContent", { text: targetText })} className="responsibility-update-panel" id={`responsibility-update-panel-${claim.id}`} role="region">
    <div className="responsibility-update-copy"><small>{m('suggestedUpdate')}</small><p>{settingsMockText(locale, claim.id, claim.description)}</p></div>
    {error ? <p className="responsibility-proposal-message" id={messageId} role="alert" tabIndex={-1}>{error}</p> : null}
    <div className="responsibility-proposal-footer">
      <ResponsibilityEvidenceDisclosure claim={claim} label={m("updateEvidence", { text: targetText })} onViewEvidence={onViewEvidence} />
      <div className="responsibility-proposal-actions"><Button id={`responsibility-proposal-${claim.id}-ignore`} onClick={() => onResolve(claim, "hidden")} size="sm" type="button" variant="ghost"><EyeOff data-icon="inline-start" />{m('ignore')}</Button><Button disabled={actionsDisabled || !claim.description.trim()} id={`responsibility-proposal-${claim.id}-apply`} onClick={() => onResolve(claim, "accepted")} size="sm" title={actionsDisabled ? m('saveOrCancelYourResponsibilityChangesFirst2') : undefined} type="button">{m('update')}</Button></div>
    </div>
  </div>;
}

function ResponsibilityAddRow({ actionsDisabled, claim, error, onResolve, onViewEvidence }: { actionsDisabled: boolean; claim: ResponsibilityClaim; error?: string; onResolve: (claim: ResponsibilityClaim, decision: "accepted" | "hidden") => void; onViewEvidence: (taskId: string) => void }) {
  const m = useModuleCopy();
  const { locale } = useI18n();
  const messageId = error ? `responsibility-proposal-${claim.id}-message` : undefined;
  return <li className="responsibility-add-row">
    <span aria-hidden="true" className="responsibility-statement-marker is-proposed" />
    <details className="responsibility-add-details">
      <summary aria-label={m("newEvidence", { text: settingsMockText(locale, claim.id, claim.description) })}>
        <span className="responsibility-add-text">{settingsMockText(locale, claim.id, claim.description)}</span>
        <span className="responsibility-add-evidence-cue"><FileCheck2 aria-hidden="true" /><span>{m("evidenceCount", { count: claim.evidence?.length ?? 0 })}</span><ChevronDown aria-hidden="true" /></span>
      </summary>
      <div className="responsibility-add-evidence">
        <ResponsibilityEvidenceList claim={claim} label={m("newEvidence", { text: settingsMockText(locale, claim.id, claim.description) })} onOpenEvidence={onViewEvidence} />
        <Button id={`responsibility-proposal-${claim.id}-ignore`} onClick={() => onResolve(claim, "hidden")} size="sm" type="button" variant="ghost"><EyeOff data-icon="inline-start" />{m('ignore')}</Button>
      </div>
    </details>
    <Button aria-describedby={messageId} aria-label={m("addResponsibility", { text: settingsMockText(locale, claim.id, claim.description) })} className="responsibility-add-action" disabled={actionsDisabled || !claim.description.trim()} id={`responsibility-proposal-${claim.id}-apply`} onClick={() => onResolve(claim, "accepted")} size="icon-sm" title={actionsDisabled ? m('saveOrCancelYourResponsibilityChangesFirst2') : m('addThisResponsibility')} type="button" variant="ghost"><Plus aria-hidden="true" /></Button>
    {error ? <p className="responsibility-proposal-message" id={messageId} role="alert" tabIndex={-1}>{error}</p> : null}
  </li>;
}

function ResponsibilityConflictRow({ claim, error, onResolve, onViewEvidence }: { claim: ResponsibilityClaim; error: string; onResolve: (claim: ResponsibilityClaim, decision: "accepted" | "hidden") => void; onViewEvidence: (taskId: string) => void }) {
  const m = useModuleCopy();
  const { locale } = useI18n();
  return <li className="responsibility-conflict-row">
    <span aria-hidden="true" className="responsibility-statement-marker is-conflict" />
    <div>
      <p>{settingsMockText(locale, claim.id, claim.description)}</p>
      <p className="responsibility-proposal-message" id={`responsibility-proposal-${claim.id}-message`} role="status" tabIndex={-1}>{error}</p>
      <div className="responsibility-proposal-footer">
        <ResponsibilityEvidenceDisclosure claim={claim} label={m('evidenceForTheBlockedResponsibilityUpdate')} onViewEvidence={onViewEvidence} />
        <Button id={`responsibility-proposal-${claim.id}-ignore`} onClick={() => onResolve(claim, "hidden")} size="sm" type="button" variant="ghost"><EyeOff data-icon="inline-start" />{m('ignore')}</Button>
      </div>
    </div>
  </li>;
}

function ResponsibilityEvidenceDisclosure({ claim, label, onViewEvidence }: { claim: ResponsibilityClaim; label: string; onViewEvidence: (taskId: string) => void }) {
  const m = useModuleCopy();
  return <details className="responsibility-proposal-evidence">
    <summary><FileCheck2 aria-hidden="true" /><span className="responsibility-evidence-show">{m('viewEvidence')}</span><span className="responsibility-evidence-hide">{m('hideEvidence')}</span><span>({claim.evidence?.length ?? 0})</span><ChevronDown aria-hidden="true" /></summary>
    <ResponsibilityEvidenceList claim={claim} label={label} onOpenEvidence={onViewEvidence} />
  </details>;
}

function ResponsibilityEvidenceList({ claim, label, onOpenEvidence }: { claim: ResponsibilityClaim; label: string; onOpenEvidence: (taskId: string) => void }) {
  const m = useModuleCopy();
  const { locale } = useI18n();
  return claim.evidence?.length ? <ul aria-label={label}>{claim.evidence.map((evidence) => <li className="responsibility-evidence-row" key={evidence.id}><span className="responsibility-evidence-summary"><span aria-hidden="true" className="responsibility-evidence-bullet" /><span><strong>{settingsMockText(locale, evidence.id, evidence.label)}</strong><small>{settingsMockText(locale, evidence.id, evidence.meta)}</small></span></span>{evidence.taskId ? <Button aria-label={m("viewEvidenceTitle", { text: settingsMockText(locale, evidence.id, evidence.label) })} onClick={() => onOpenEvidence(evidence.taskId!)} size="sm" type="button" variant="link">{m('view')}<ArrowRight aria-hidden="true" /></Button> : null}</li>)}</ul> : <p>{m('noEvidenceIsAvailable')}</p>;
}
