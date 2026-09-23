import { MAX_TEAM_MEMBERS, occupiedTeamSeats } from "../lib/teamLimits";
import { useI18n } from "../i18n/I18nProvider";
import { mockTeamName } from "../i18n/mockContent";
import { useModuleCopy } from "../i18n/moduleMessages";
import { createContext, useContext, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { savePersonalCenterState, type PersonalCenterState, type TeamAccessRole } from "../data/memberProfiles";
import type { PersonOption } from "../data/sharedTypes";
import { canInviteTeamMembers, createTeamEmailInvitation, normalizeInvitationEmail } from "../lib/teamInvitations";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { toast } from "./ui/toast";

type InviteRequest = {
  name?: string;
  email?: string;
  allowRoleSelection?: boolean;
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
  invite: (email: string, role?: TeamAccessRole, renew?: boolean, name?: string) => PersonOption;
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
  useEffect(() => {
    setInviteOpen(false); setRequest(null);
    return () => toast.dismiss(invitationToastId);
  }, [teamId, invitationToastId]);

  const closeInvite = (didSubmit = false) => {
    submitted.current = didSubmit;
    if (didSubmit) request?.onSubmitted?.();
    setInviteOpen(false);
  };

  const invite: InvitationContext["invite"] = (email, role = "member", renew = false, name) => {
    const result = createTeamEmailInvitation(latest.current, { teamId, email, name, role, renew, members });
    if (result.state !== latest.current) {
      if (!savePersonalCenterState(result.state)) throw new Error(m('invitationSaveFailed'));
      latest.current = result.state;
      onStateChange(result.state);
      if (result.membership.status === "invited") toast.success(renew ? m('invitationResent') : m('invitationSent'), {
        id: invitationToastId,
      });
    }
    return result.person;
  };
  return <Context.Provider value={{ teamId, teamName: team?.name ?? m('currentTeam'), canInvite: canInviteTeamMembers(state, teamId), invite, openInvite }}>
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

function MemberInvitationForm({ request, state, teamId, onClose }: { request: InviteRequest; state: PersonalCenterState; teamId: string; onClose: (submitted?: boolean) => void }) {
  const m = useModuleCopy();
  const invitations = useMemberInvitations()!;
  const [name, setName] = useState(request.name ?? "");
  const [email, setEmail] = useState(request.email ?? "");
  const [role, setRole] = useState<TeamAccessRole>("member");
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const { locale } = useI18n();
  const normalizedEmail = normalizeInvitationEmail(email);
  const existing = state.teams.find(team => team.id === teamId)?.memberships.find(member => member.email.toLowerCase() === normalizedEmail);
  const selectedTeam = state.teams.find(team => team.id === teamId);
  const atCapacity = !existing && Boolean(selectedTeam && occupiedTeamSeats(selectedTeam) >= MAX_TEAM_MEMBERS);
  return <form className="member-invitation-form" noValidate onSubmit={event => {
    event.preventDefault();
    if (submitting.current || !invitations.canInvite || (existing && !request.onInvited)) return;
    if (!normalizedEmail) { setError(m('invalidInvitationEmail')); return; }
    submitting.current = true;
    try {
      const person = invitations.invite(email, role, false, name);
      request.onInvited?.(person);
      onClose(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : m('invitationFailed')); }
    finally { submitting.current = false; }
  }}>
    <label><span>{m('invitationName')}<small>{m('optional')}</small></span><Input aria-label={m('invitationName')} autoFocus={!request.name} autoComplete="off" maxLength={100} placeholder={m('teammateName')} value={name} onChange={event => { setName(event.target.value); setError(""); }} /></label>
    <label><span>{m('email')}</span><Input aria-label={m('email')} autoFocus={Boolean(request.name)} autoComplete="off" required type="email" placeholder="name@company.com" value={email} onChange={event => { setEmail(event.target.value); setError(""); }} aria-invalid={Boolean(error)} /></label>
    {request.allowRoleSelection !== false && <label><span>{m('role')}</span><Select value={role} onValueChange={value => setRole(value as TeamAccessRole)}><SelectTrigger aria-label={m('invitationRole')}><SelectValue>{role === "admin" ? m('administrator') : m('member')}</SelectValue></SelectTrigger><SelectContent alignItemWithTrigger={false}><SelectItem value="member">{m('member')}</SelectItem><SelectItem value="admin">{m('administrator')}</SelectItem></SelectContent></Select></label>}
    {atCapacity && <p role="status">{locale === "en" ? "Team limit reached: 50 members, including pending invitations." : "团队人数已达 50 人上限（含待接受邀请）。"}</p>}
    {existing && <p role="status">{request.onInvited ? m('existingMemberAvailable') : m('alreadyMember')}</p>}
    {!invitations.canInvite && <p role="status">{m('onlyAdminsInvite')}</p>}
    {error && <p role="alert">{m.text(error)}</p>}
    <footer><Button type="button" variant="ghost" onClick={() => onClose()}>{m('cancel')}</Button><Button type="submit" disabled={atCapacity || !invitations.canInvite || !normalizedEmail || Boolean(existing && !request.onInvited)}>{existing && request.onInvited ? m('useExistingMember') : m('sendInvitation')}</Button></footer>
  </form>;
}
