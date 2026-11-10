import { MAX_TEAM_MEMBERS, occupiedTeamSeats } from "@/features/members/lib/team-limits";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { mockTeamName } from "@/ai/mock/i18n/mockContent";
import { useModuleCopy } from "@/shared/i18n/module-messages";
import { createContext, useContext, useEffect, useId, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { Plus, X } from "lucide-react";
import { savePersonalCenterState, type PersonalCenterState, type TeamAccessRole } from "@/ai/mock/data/memberProfiles";
import type { PersonOption } from "@/shared/model/task-model";
import { createTeamEmailInvitation, createTeamEmailInvitations, getTeamInvitationActor, normalizeInvitationEmail, normalizeInvitationRecipients, type InvitationRecipient } from "@/features/members/lib/team-invitations";
import { currentWorkspaceUserId } from "@/shared/lib/workspace-session";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/ui/dialog";
import { toast } from "@/shared/ui/toast";

type InviteRequest = {
  email?: string;
  returnFocus?: HTMLElement | null;
  cancelFocus?: () => HTMLElement | null;
  onSubmitted?: () => void;
  onDismiss?: (submitted: boolean) => void;
  onInvited?: (person: PersonOption) => void;
};
export type MemberInvitationHandle = { openInvite: (request?: InviteRequest) => void };

type InvitationContext = MemberInvitationHandle & {
  teamId: string;
  teamName: string;
  canInvite: boolean;
  canInviteAdmins: boolean;
  invite: (email: string, role?: TeamAccessRole, renew?: boolean) => PersonOption;
  inviteMany: (recipients: readonly InvitationRecipient[]) => PersonOption[];
};
const Context = createContext<InvitationContext | null>(null);
export const useMemberInvitations = () => useContext(Context);

export function MemberInvitationProvider({ children, state, onStateChange, teamId, members, ref }: {
  ref?: Ref<MemberInvitationHandle>; children: ReactNode; state: PersonalCenterState; onStateChange: (state: PersonalCenterState) => void; teamId: string; members: PersonOption[];
}) {
  const m = useModuleCopy();
  const { locale } = useI18n();
  const latest = useRef(state);
  latest.current = state;
  const [request, setRequest] = useState<InviteRequest | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const submitted = useRef(false);
  const cancelFocus = useRef<InviteRequest["cancelFocus"]>(undefined);
  const returnFocus = useRef<HTMLElement | null>(null);
  const returnFocusParent = useRef<HTMLElement | null>(null);
  const invitationToastId = `member-invitation:${teamId}`;
  const openInvite: MemberInvitationHandle["openInvite"] = (next = {}) => {
    submitted.current = false;
    cancelFocus.current = next.cancelFocus;
    returnFocus.current = next.returnFocus ?? null;
    returnFocusParent.current = next.returnFocus?.parentElement ?? null;
    toast.dismiss(invitationToastId);
    setRequest(next);
    setInviteOpen(true);
  };
  useImperativeHandle(ref, () => ({ openInvite }));
  const team = state.teams.find(team => team.id === teamId);
  const actorMemberId = currentWorkspaceUserId();
  const actor = getTeamInvitationActor(state, teamId, actorMemberId);
  useEffect(() => {
    setInviteOpen(false); setRequest(null);
    return () => toast.dismiss(invitationToastId);
  }, [teamId, invitationToastId]);

  const closeInvite = (didSubmit = false) => {
    submitted.current = didSubmit;
    if (didSubmit) request?.onSubmitted?.();
    setInviteOpen(false);
  };

  const saveInvitations = (nextState: PersonalCenterState) => {
    if (nextState === latest.current) return false;
    if (!savePersonalCenterState(nextState)) throw new Error(m('invitationSaveFailed'));
    latest.current = nextState;
    onStateChange(nextState);
    return true;
  };
  const invite: InvitationContext["invite"] = (email, role = "member", renew = false) => {
    const result = createTeamEmailInvitation(latest.current, { teamId, email, role, renew, members, actorMemberId });
    if (saveInvitations(result.state)) toast.success(renew ? m('invitationResent') : m('invitationSent'), { id: invitationToastId });
    return result.person;
  };
  const inviteMany: InvitationContext["inviteMany"] = recipients => {
    const result = createTeamEmailInvitations(latest.current, { teamId, recipients, members, actorMemberId });
    if (saveInvitations(result.state)) {
      toast.success(result.sentCount === 1 ? m('invitationSent') : m('invitationsSent', { count: result.sentCount }), { id: invitationToastId });
    }
    return result.people;
  };
  return <Context.Provider value={{ teamId, teamName: team?.name ?? m('currentTeam'), canInvite: Boolean(actor), canInviteAdmins: actor?.role === "owner" || actor?.role === "admin", invite, inviteMany, openInvite }}>
    {children}
    <Dialog open={inviteOpen} onOpenChange={open => { if (!open) closeInvite(); }} onOpenChangeComplete={open => { if (!open) { request?.onDismiss?.(submitted.current); setRequest(null); } }}>
      <DialogContent className={`member-invite-dialog${request?.cancelFocus ? " z-[121]" : ""}`} overlayClassName={`member-invite-backdrop${request?.cancelFocus ? " z-[120]" : ""}`} finalFocus={() => {
        const search = !submitted.current ? cancelFocus.current?.() : null;
        if (search?.isConnected) return search;
        return returnFocus.current?.isConnected ? returnFocus.current : returnFocusParent.current?.querySelector<HTMLButtonElement>("button") ?? false;
      }}>
        <DialogTitle>{m('invitePeople')}</DialogTitle>
        <DialogDescription>{m("invitationDescription", { team: team ? mockTeamName(locale, team.id, team.name) : m("currentTeam") })}</DialogDescription>
        {request && <MemberInvitationForm request={request} state={state} teamId={teamId} onClose={closeInvite} />}
      </DialogContent>
    </Dialog>
  </Context.Provider>;
}

type InvitationRow = InvitationRecipient & { id: number };

function MemberInvitationForm({ request, state, teamId, onClose }: { request: InviteRequest; state: PersonalCenterState; teamId: string; onClose: (submitted?: boolean) => void }) {
  const m = useModuleCopy();
  const invitations = useMemberInvitations()!;
  const [rows, setRows] = useState<InvitationRow[]>(() => [{ id: 0, email: request.email?.trim() ?? "", role: "member" }]);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const nextRowId = useRef(rows.length);
  const focusRowId = useRef<number | null>(null);
  const formId = useId();
  const emailHelpId = `${formId}-help`;
  const roleHelpId = `${formId}-role-help`;
  const { recipients, error: recipientError } = normalizeInvitationRecipients(rows);
  const selectedTeam = state.teams.find(team => team.id === teamId);
  const existingEmails = new Set(selectedTeam?.memberships.filter(member => member.status !== "disabled").map(member => member.email.toLowerCase()));
  const recipientCount = recipients?.length ?? 0;
  const newCount = recipients?.filter(({ email }) => !existingEmails.has(email)).length ?? 0;
  const allExisting = recipientCount > 0 && newCount === 0;
  const useExisting = allExisting && recipientCount === 1 && Boolean(request.onInvited);
  const overCapacity = Boolean(selectedTeam && newCount > Math.max(0, MAX_TEAM_MEMBERS - occupiedTeamSeats(selectedTeam)));
  const canSubmit = Boolean(recipientCount || recipientError) && invitations.canInvite && !overCapacity && (!allExisting || useExisting);

  useEffect(() => {
    if (focusRowId.current === null) return;
    document.getElementById(`${formId}-email-${focusRowId.current}`)?.focus();
    focusRowId.current = null;
  }, [formId, rows]);

  const updateRow = (id: number, changes: Partial<InvitationRecipient>) => {
    setRows(current => current.map(row => row.id === id ? { ...row, ...changes } : row));
    setError("");
  };
  const addRow = () => {
    const row: InvitationRow = { id: nextRowId.current++, email: "", role: "member" };
    focusRowId.current = row.id;
    setRows(current => [...current, row]);
    setError("");
  };
  const removeRow = (index: number) => {
    focusRowId.current = (rows[index + 1] ?? rows[index - 1]).id;
    setRows(current => current.filter(row => row.id !== rows[index].id));
    setError("");
  };

  return <form className="member-invitation-form" noValidate onSubmit={event => {
    event.preventDefault();
    if (submitting.current || !canSubmit) return;
    if (!recipients) {
      setError(m(recipientError === "conflictingRoles" ? 'invitationConflictingRoles' : 'invalidInvitationEmail'));
      return;
    }
    submitting.current = true;
    try {
      const people = invitations.inviteMany(recipients);
      if (people.length === 1) request.onInvited?.(people[0]);
      onClose(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : m('invitationFailed')); }
    finally { submitting.current = false; }
  }}>
    <div className="member-invitation-recipients" data-removable={rows.length > 1 || undefined}>
      <div aria-hidden="true" className="member-invitation-fields member-invitation-labels">
        <span>{m('email')}</span>
        <span>{m('role')}</span>
      </div>
      {rows.map((row, index) => {
        const number = index + 1;
        return <div className="member-invitation-fields" key={row.id}>
          <Input
            aria-label={m('invitationEmailRow', { number })}
            aria-describedby={index === 0 ? emailHelpId : undefined}
            aria-invalid={Boolean(error && recipientError === "invalidEmail" && row.email.trim() && !normalizeInvitationEmail(row.email))}
            id={`${formId}-email-${row.id}`}
            autoFocus={index === 0}
            autoComplete="off"
            type="email"
            placeholder="name@company.com"
            value={row.email}
            onChange={event => updateRow(row.id, { email: event.target.value })}
          />
          <Select value={row.role} disabled={!invitations.canInvite} onValueChange={role => {
            if (role === "member" || (role === "admin" && invitations.canInviteAdmins)) updateRow(row.id, { role });
          }}>
            <SelectTrigger aria-label={m('invitationRoleRow', { number })} aria-describedby={!invitations.canInviteAdmins ? roleHelpId : undefined} className="member-invitation-role">
              <SelectValue>{row.role === "admin" ? m('administrator') : m('member')}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} positionerClassName={request.cancelFocus ? "z-[122]" : undefined}>
              <SelectItem value="member">{m('member')}</SelectItem>
              <SelectItem value="admin" disabled={!invitations.canInviteAdmins}>{m('administrator')}</SelectItem>
            </SelectContent>
          </Select>
          {rows.length > 1 && <Button aria-label={m('invitationRemoveEmailRow', { number })} size="icon" type="button" variant="ghost" onClick={() => removeRow(index)}><X aria-hidden="true" /></Button>}
        </div>;
      })}
      <small id={emailHelpId}>{m('invitationEmailHelp')}</small>
      {!invitations.canInviteAdmins && <small id={roleHelpId}>{m('onlyTeamManagersInviteAdmins')}</small>}
      <Button className="member-invitation-add-email" size="sm" type="button" variant="ghost" onClick={addRow}><Plus aria-hidden="true" />{m('invitationAddEmail')}</Button>
    </div>
    {overCapacity && <p role="status">{m('invitationTeamLimit', { count: MAX_TEAM_MEMBERS })}</p>}
    {allExisting && <p role="status">{useExisting ? m('existingMemberAvailable') : recipientCount === 1 ? m('alreadyMember') : m('alreadyInvitedEmails')}</p>}
    {recipientCount > 1 && request.onInvited && !allExisting && <p>{m('assignAfterBatchInvitation')}</p>}
    {!invitations.canInvite && <p role="status">{m('onlyJoinedMembersInvite')}</p>}
    {error && <p role="alert">{m.text(error)}</p>}
    <footer><Button type="button" variant="ghost" onClick={() => onClose()}>{m('cancel')}</Button><Button type="submit" disabled={!canSubmit}>{useExisting ? m('useExistingMember') : m('sendInvitation')}</Button></footer>
  </form>;
}
