import { ArrowRight, ChevronDown, Copy, EyeOff, FileCheck2, Mail, Pencil, Plus, RefreshCw, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getTeamInviteLink, savePersonalCenterState, type PersonalCenterState, type ResponsibilityClaim, type ResponsibilityDocument, type TeamAccessRole } from "../data/memberProfiles";
import type { Member } from "./MemberSelector";
import { PersonAvatar, PersonName } from "./PersonAvatar";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Input, Textarea } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select as TeamSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { TeamLogo } from "./TeamLogo";
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
  const selectedTeam = state.teams.find((team) => team.id === activeTeamId) ?? state.teams[0];
  const [nameDraft, setNameDraft] = useState(selectedTeam.name);
  const [savedMessage, setSavedMessage] = useState("");
  const [dangerAction, setDangerAction] = useState<"delete" | "leave" | null>(null);
  const currentMembership = selectedTeam.memberships.find((membership) => membership.memberId === "周岚" || membership.email === state.profile.email);
  const canDelete = currentMembership?.status === "active" && currentMembership.role === "admin";
  const hasFallbackTeam = state.teams.length > 1;

  useEffect(() => {
    setNameDraft(selectedTeam.name);
    setSavedMessage("");
    setDangerAction(null);
  }, [selectedTeam.id, selectedTeam.name]);

  const saveTeamInformation = () => {
    const name = nameDraft.trim();
    if (!name) return;
    const next = { ...state, teams: state.teams.map((team) => team.id === selectedTeam.id ? { ...team, name } : team) };
    if (!savePersonalCenterState(next)) {
      setSavedMessage("保存失败，团队名称没有改变");
      return;
    }
    onStateChange(next);
    setSavedMessage("已保存");
  };

  const removeTeam = () => {
    if (!dangerAction) return;
    if (!hasFallbackTeam) {
      setSavedMessage("至少需要保留一个团队");
      setDangerAction(null);
      return;
    }
    if (dangerAction === "delete" && !canDelete) {
      setSavedMessage("只有团队管理员可以删除团队");
      setDangerAction(null);
      return;
    }
    const teams = state.teams.filter((team) => team.id !== selectedTeam.id);
    const next = { ...state, teams };
    if (!savePersonalCenterState(next)) {
      setSavedMessage(dangerAction === "delete" ? "删除失败，团队仍然保留" : "离开失败，你仍在当前团队中");
      setDangerAction(null);
      return;
    }
    onStateChange(next);
    onActiveTeamChange(teams[0].id);
    setDangerAction(null);
  };

  return <section aria-labelledby="team-information-title" className="personal-team-panel">
    <div className="responsibility-toolbar"><div><h2 id="team-information-title">通用</h2></div></div>
    <div className="team-general-settings">
      <section aria-labelledby="team-logo-label"><h3 id="team-logo-label">团队标志</h3><TeamLogo name={selectedTeam.name} size="xl" teamId={selectedTeam.id} /></section>
      <label><span>团队名称</span><Input aria-label="团队名称" onChange={(event) => { setNameDraft(event.target.value); setSavedMessage(""); }} value={nameDraft} /></label>
      <div className="team-general-actions"><span aria-live="polite">{savedMessage}</span><Button disabled={!nameDraft.trim() || nameDraft.trim() === selectedTeam.name} onClick={saveTeamInformation} type="button">保存团队信息</Button></div>
      <section className="team-danger-setting"><div><h3>离开团队</h3><p>离开此团队。如果再次受邀，你可以重新加入。</p></div><Button disabled={!hasFallbackTeam} onClick={() => setDangerAction("leave")} type="button" variant="destructive">离开团队</Button></section>
      <section className="team-danger-setting"><div><h3>删除团队</h3><p>永久删除该团队及其数据。此操作无法撤销。</p></div><Button disabled={!canDelete || !hasFallbackTeam} onClick={() => setDangerAction("delete")} type="button" variant="destructive">删除团队</Button></section>
    </div>
    <AlertDialog onOpenChange={(open) => { if (!open) setDangerAction(null); }} open={Boolean(dangerAction)}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{dangerAction === "delete" ? `删除“${selectedTeam.name}”？` : `离开“${selectedTeam.name}”？`}</AlertDialogTitle><AlertDialogDescription>{dangerAction === "delete" ? "团队资料、成员邀请和责任说明将被删除，操作后无法在界面内恢复。" : "确认后将切换到你的其他团队；当前团队将不再显示。"}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel size="touch">取消</AlertDialogCancel><AlertDialogAction onClick={removeTeam} size="touch" variant="destructive">{dangerAction === "delete" ? "确认删除团队" : "确认离开团队"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}

const accessRoleLabel: Record<TeamAccessRole, string> = { admin: "管理员", member: "成员" };

export function TeamMembersPanel({ activeTeamId, members, onStateChange, state }: TeamContextProps & { members: Member[]; onStateChange: (state: PersonalCenterState) => void }) {
  const selectedTeam = state.teams.find((team) => team.id === activeTeamId) ?? state.teams[0];
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamAccessRole>("member");
  const [inviteError, setInviteError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null);
  const [responsibilityDraft, setResponsibilityDraft] = useState("");
  const currentMembership = selectedTeam.memberships.find((membership) => membership.memberId === "周岚" || membership.email === state.profile.email);
  const canManage = currentMembership?.status === "active" && currentMembership.role === "admin";
  const inviteLink = getTeamInviteLink(selectedTeam);

  useEffect(() => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteError("");
    setFeedback("");
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
    setFeedback("");
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
      setFeedback("保存失败，责任内容没有改变");
      return;
    }
    if (result.changed) onStateChange(result.state);
    setFeedback(result.changed ? "责任已保存" : "责任没有变化");
    setEditingMembershipId(null);
    setResponsibilityDraft("");
    focusResponsibilityEdit(membershipId);
  };

  const commitTeam = (team: typeof selectedTeam, successMessage: string) => {
    const next = { ...state, teams: state.teams.map((item) => item.id === team.id ? team : item) };
    if (!savePersonalCenterState(next)) {
      setFeedback("保存失败，当前成员信息没有改变");
      return false;
    }
    onStateChange(next);
    setFeedback(successMessage);
    return true;
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setFeedback("邀请链接已复制");
    } catch {
      setFeedback("复制失败，请选中链接后手动复制");
    }
  };

  const regenerateInviteLink = () => {
    if (!canManage) return;
    const token = `${selectedTeam.id}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
    commitTeam({ ...selectedTeam, inviteToken: token }, "邀请链接已重新生成，旧链接已失效");
  };

  const inviteMember = () => {
    const email = inviteEmail.trim().toLocaleLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("请输入有效的邮箱地址");
      return;
    }
    if (selectedTeam.memberships.some((membership) => membership.email.toLocaleLowerCase() === email)) {
      setInviteError("该邮箱已经是成员或处于邀请中");
      return;
    }
    const knownMember = members.find((member) => member.email.toLocaleLowerCase() === email);
    const membership = { email, id: `${selectedTeam.id}-invite-${crypto.randomUUID()}`, invitedAt: "刚刚", ...(knownMember ? { memberId: knownMember.id } : {}), role: inviteRole, status: "invited" as const };
    if (!commitTeam({ ...selectedTeam, memberships: [...selectedTeam.memberships, membership] }, `已为 ${email} 创建邀请`)) return;
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("member");
    setInviteError("");
  };

  const changeRole = (membershipId: string, role: TeamAccessRole) => {
    if (!canManage) return;
    const membership = selectedTeam.memberships.find((item) => item.id === membershipId);
    if (!membership || membership.role === role) return;
    const activeAdminCount = selectedTeam.memberships.filter((item) => item.status === "active" && item.role === "admin").length;
    if (membership.status === "active" && membership.role === "admin" && role === "member" && activeAdminCount === 1) {
      setFeedback("团队必须至少保留一位管理员");
      return;
    }
    commitTeam({ ...selectedTeam, memberships: selectedTeam.memberships.map((item) => item.id === membershipId ? { ...item, role } : item) }, `已将 ${membership.email} 设为${accessRoleLabel[role]}`);
  };

  return <section aria-labelledby="team-members-title" className="team-members-panel">
    <div className="responsibility-toolbar"><div><h2 id="team-members-title">成员</h2></div></div>
    <section className="team-invite-link"><h3>邀请链接</h3><div><Input aria-label="邀请链接" readOnly value={inviteLink} /><Button aria-label="复制邀请链接" onClick={copyInviteLink} size="icon" type="button" variant="ghost"><Copy aria-hidden="true" /></Button></div><p>该链接可多人使用。你也可以<button disabled={!canManage} onClick={regenerateInviteLink} type="button"><RefreshCw aria-hidden="true" />重新生成链接</button>。</p></section>
    <div className="team-members-summary">
      <strong>成员（{selectedTeam.memberships.length}）</strong>
      <Popover onOpenChange={(open) => {
        setInviteOpen(open);
        if (!open) {
          setInviteEmail("");
          setInviteRole("member");
          setInviteError("");
        }
      }} open={inviteOpen}>
        <PopoverTrigger disabled={!canManage} render={<Button type="button" variant="outline" />}><UserPlus aria-hidden="true" />邀请成员</PopoverTrigger>
        <PopoverContent align="end" aria-label="邀请成员" className="team-invite-popover">
          <header><strong>邀请成员</strong><p>输入成员邮箱并选择加入团队后的角色。</p></header>
          <form className="team-invite-form" noValidate onSubmit={(event) => { event.preventDefault(); inviteMember(); }}>
            <label><span>邮箱</span><Input autoFocus onChange={(event) => { setInviteEmail(event.target.value); setInviteError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); inviteMember(); } }} placeholder="name@company.com" type="email" value={inviteEmail} /></label>
            <label><span>角色</span><TeamSelect onValueChange={(value) => setInviteRole(String(value) as TeamAccessRole)} value={inviteRole}><SelectTrigger aria-label="邀请角色"><SelectValue>{accessRoleLabel[inviteRole]}</SelectValue></SelectTrigger><SelectContent alignItemWithTrigger={false}><SelectItem value="member">成员</SelectItem><SelectItem value="admin">管理员</SelectItem></SelectContent></TeamSelect></label>
            {inviteError && <p role="alert">{inviteError}</p>}
            <footer><Button onClick={() => setInviteOpen(false)} type="button" variant="ghost">取消</Button><Button disabled={!inviteEmail.trim()} type="submit">发送邀请</Button></footer>
          </form>
        </PopoverContent>
      </Popover>
    </div>
    <div className="team-member-table"><div aria-hidden="true" className="team-member-list-head"><span>用户</span><span>责任</span><span>角色</span></div><ul aria-label="团队成员" className="team-member-list">{selectedTeam.memberships.map((membership) => {
      const member = members.find((item) => item.id === membership.memberId || item.email.toLocaleLowerCase() === membership.email.toLocaleLowerCase());
      const isCurrentUser = membership.memberId === "周岚" || membership.email === state.profile.email;
      const responsibility = resolveTeamMemberResponsibility(membership, member);
      const memberLabel = member?.name ?? membership.email;
      const isEditingResponsibility = editingMembershipId === membership.id;
      return <li key={membership.id}><div>{membership.status === "active" ? <PersonAvatar name={member?.name ?? membership.email} personId={member?.id ?? membership.memberId} profile={member} size="md" /> : <span className="team-invited-avatar"><Mail aria-hidden="true" /></span>}<span><strong>{membership.status === "active" && member ? <PersonName name={member.name} profile={member} /> : membership.email}{isCurrentUser && <em>你</em>}{membership.status === "invited" && <em className="invited">已邀请</em>}</strong><small>{membership.status === "active" ? member?.email ?? membership.email : `邀请于 ${membership.invitedAt ?? "刚刚"}`}</small></span></div><div className="team-member-responsibility">{isEditingResponsibility ? <div className="team-member-responsibility-editor"><Input aria-label={`${memberLabel}的责任`} autoFocus onChange={(event) => setResponsibilityDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveMemberResponsibility(membership.id); if (event.key === "Escape") cancelResponsibilityEdit(membership.id); }} value={responsibilityDraft} /><div><Button onClick={() => cancelResponsibilityEdit(membership.id)} size="sm" type="button" variant="ghost">取消</Button><Button onClick={() => saveMemberResponsibility(membership.id)} size="sm" type="button">保存</Button></div></div> : <><p className="team-member-responsibility-text" title={responsibility}>{responsibility}</p>{canManage && membership.status === "active" ? <Button aria-label={`编辑${member?.name ?? membership.email}的责任`} className="team-member-responsibility-edit" id={`edit-member-responsibility-${membership.id}`} onClick={() => beginResponsibilityEdit(membership.id, responsibility)} size="icon-sm" title="编辑责任" type="button" variant="ghost"><Pencil aria-hidden="true" /></Button> : null}</>}</div><TeamSelect disabled={!canManage} onValueChange={(value) => changeRole(membership.id, String(value) as TeamAccessRole)} value={membership.role}><SelectTrigger aria-label={`修改 ${member?.name ?? membership.email} 的角色`} className="team-member-role-select" size="sm"><SelectValue>{accessRoleLabel[membership.role]}</SelectValue></SelectTrigger><SelectContent align="end" alignItemWithTrigger={false}><SelectItem value="admin">管理员</SelectItem><SelectItem value="member">成员</SelectItem></SelectContent></TeamSelect></li>;
    })}</ul></div>
    <p aria-live="polite" className="team-settings-feedback">{feedback}</p>
  </section>;
}

export function PersonalResponsibilityPanel({ activeTeamId, onActiveTeamChange, onDirtyChange, onOpenEvidence, onRequestContextChange, onStateChange, state }: { activeTeamId: string; onActiveTeamChange: (teamId: string) => void; onDirtyChange: (dirty: boolean) => void; onOpenEvidence: (taskId: string) => void; onRequestContextChange: (action: () => void) => void; onStateChange: (state: PersonalCenterState) => void; state: PersonalCenterState }) {
  const selectedTeam = useMemo(() => state.teams.find((team) => team.id === activeTeamId) ?? state.teams[0], [activeTeamId, state.teams]);
  const [responsibilityDraft, setResponsibilityDraft] = useState(selectedTeam.responsibilityDocument.content);
  const [draftSnapshot, setDraftSnapshot] = useState({ content: selectedTeam.responsibilityDocument.content, revisionId: selectedTeam.responsibilityDocument.revisionId });
  const [savedMessage, setSavedMessage] = useState("");
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
      setSavedMessage("保存失败，未改变当前内容；请检查浏览器存储设置后重试");
      window.setTimeout(() => setSavedMessage(""), 3200);
      return false;
    }
    onStateChange(next);
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(""), 1800);
    return true;
  };

  const resetResponsibilityDraft = () => {
    setResponsibilityDraft(selectedTeam.responsibilityDocument.content);
    setDraftSnapshot({ content: selectedTeam.responsibilityDocument.content, revisionId: selectedTeam.responsibilityDocument.revisionId });
    onDirtyChange(false);
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
      setSavedMessage("责任内容已经变化，请取消修改后重试");
      window.setTimeout(() => setSavedMessage(""), 3200);
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
    if (commit(next, "责任已保存")) {
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
      setSavedMessage("请先保存或取消当前责任修改");
      window.setTimeout(() => setSavedMessage(""), 2400);
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
      ? application?.status === "duplicate" ? "内容没有变化，待确认项已处理" : claim.proposal?.operation === "update" ? "责任已更新" : "责任已添加"
      : "已忽略这条待确认责任";
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
        <div><small>个人设置</small><h2 id="personal-responsibility-title">我的责任</h2><p>查看并维护你在当前团队中的责任说明。</p></div>
        <div className="responsibility-toolbar-actions">
          <div className="responsibility-team-control">
            <span>当前团队</span>
            <TeamSelect onValueChange={(value) => changeTeam(String(value))} value={selectedTeam.id}>
              <SelectTrigger aria-label={`切换责任所属团队，当前为${selectedTeam.name}`} className="responsibility-team-select" size="sm">
                <SelectValue>{selectedTeam.name}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">{state.teams.map((team) => <SelectItem className="responsibility-team-option" key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent>
            </TeamSelect>
          </div>
        </div>
      </div>

      <div className="personal-responsibility-workspace">
        <article aria-label="责任说明" className="responsibility-document">
          <ResponsibilityStatementList claims={pendingClaims} dirty={responsibilityDirty} document={selectedTeam.responsibilityDocument} draft={responsibilityDraft} errors={proposalErrors} key={selectedTeam.id} onCancel={cancelResponsibilityEdit} onChangeDraft={changeResponsibilityDraft} onResolve={resolveSuggestion} onSave={saveResponsibilityDocument} onViewEvidence={viewEvidence} />
        </article>
      </div>
    </section>

    <div aria-live="polite" className={`personal-center-toast ${savedMessage ? "visible" : ""}`} role="status">{savedMessage}</div>
  </div>;
}

function ResponsibilityStatementList({ claims, dirty, document, draft, errors, onCancel, onChangeDraft, onResolve, onSave, onViewEvidence }: { claims: ResponsibilityClaim[]; dirty: boolean; document: ResponsibilityDocument; draft: string; errors: Record<string, string>; onCancel: () => void; onChangeDraft: (value: string) => void; onResolve: (claim: ResponsibilityClaim, decision: "accepted" | "hidden") => void; onSave: () => void; onViewEvidence: (taskId: string) => void }) {
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const paragraphs = toResponsibilityParagraphs(document.content);
  const currentClaims = claims.map((claim) => rebaseResponsibilityUpdateProposal(document, claim));

  return <div className="responsibility-document-copy">
    <div className="responsibility-document-editor">
      <div className="responsibility-document-editor-head">
        <label htmlFor="responsibility-document-editor">责任说明</label>
        {currentClaims.length ? <Button aria-controls="responsibility-ai-suggestions" aria-expanded={suggestionsOpen} aria-label={suggestionsOpen ? "收起 AI 建议" : "查看 AI 建议"} className="responsibility-update-trigger" id="responsibility-ai-suggestions-trigger" onClick={() => setSuggestionsOpen((open) => !open)} size="sm" type="button" variant="inference"><Sparkles aria-hidden="true" data-icon="inline-start" /><span>AI 建议</span></Button> : null}
      </div>
      <Textarea aria-label="责任说明" id="responsibility-document-editor" onChange={(event) => onChangeDraft(event.target.value)} placeholder="填写你在当前团队中的责任说明" rows={8} value={draft} variant="responsibility" />
      <div className="responsibility-document-editor-footer">
        <span>最近由 {document.updatedBy} 更新于 {document.updatedAt}</span>
        <div className="responsibility-document-editor-actions">
          <Button disabled={!dirty} onClick={onCancel} size="sm" type="button" variant="ghost">取消</Button>
          <Button disabled={!dirty} onClick={onSave} size="sm" type="button">保存</Button>
        </div>
      </div>
    </div>
    {suggestionsOpen && currentClaims.length ? <ul aria-label="AI 责任建议" className="responsibility-suggestion-list" id="responsibility-ai-suggestions">
      {currentClaims.map((claim) => {
        const proposal = claim.proposal;
        if (proposal?.operation === "add") return <ResponsibilityAddRow actionsDisabled={dirty} claim={claim} error={errors[claim.id]} key={claim.id} onResolve={onResolve} onViewEvidence={onViewEvidence} />;
        const targetText = proposal?.operation === "update" ? paragraphs[proposal.target.paragraphIndex] : undefined;
        const isCurrentTarget = proposal?.operation === "update" && proposal.baseRevisionId === document.revisionId && targetText === proposal.target.expectedText;
        if (isCurrentTarget) return <li className="responsibility-suggestion-item" key={claim.id}><ResponsibilityUpdatePanel actionsDisabled={dirty} claim={claim} error={errors[claim.id]} onResolve={onResolve} onViewEvidence={onViewEvidence} targetText={targetText} /></li>;
        const conflict = !proposal ? "这条待确认责任缺少操作类型，请忽略并等待重新生成。" : "原责任已经变化，无法安全更新；请忽略并等待重新生成。";
        return <ResponsibilityConflictRow claim={claim} error={errors[claim.id] || conflict} key={claim.id} onResolve={onResolve} onViewEvidence={onViewEvidence} />;
      })}
    </ul> : null}
  </div>;
}

function ResponsibilityUpdatePanel({ actionsDisabled, claim, error, onResolve, onViewEvidence, targetText }: { actionsDisabled: boolean; claim: ResponsibilityClaim; error?: string; onResolve: (claim: ResponsibilityClaim, decision: "accepted" | "hidden") => void; onViewEvidence: (taskId: string) => void; targetText: string }) {
  const messageId = error ? `responsibility-proposal-${claim.id}-message` : undefined;
  return <div aria-label={`“${targetText}”的更新内容`} className="responsibility-update-panel" id={`responsibility-update-panel-${claim.id}`} role="region">
    <div className="responsibility-update-copy"><small>建议更新为</small><p>{claim.description}</p></div>
    {error ? <p className="responsibility-proposal-message" id={messageId} role="alert" tabIndex={-1}>{error}</p> : null}
    <div className="responsibility-proposal-footer">
      <ResponsibilityEvidenceDisclosure claim={claim} label={`“${targetText}”的更新依据`} onViewEvidence={onViewEvidence} />
      <div className="responsibility-proposal-actions"><Button id={`responsibility-proposal-${claim.id}-ignore`} onClick={() => onResolve(claim, "hidden")} size="sm" type="button" variant="ghost"><EyeOff data-icon="inline-start" />忽略</Button><Button disabled={actionsDisabled || !claim.description.trim()} id={`responsibility-proposal-${claim.id}-apply`} onClick={() => onResolve(claim, "accepted")} size="sm" title={actionsDisabled ? "先保存或取消当前责任编辑" : undefined} type="button">更新</Button></div>
    </div>
  </div>;
}

function ResponsibilityAddRow({ actionsDisabled, claim, error, onResolve, onViewEvidence }: { actionsDisabled: boolean; claim: ResponsibilityClaim; error?: string; onResolve: (claim: ResponsibilityClaim, decision: "accepted" | "hidden") => void; onViewEvidence: (taskId: string) => void }) {
  const messageId = error ? `responsibility-proposal-${claim.id}-message` : undefined;
  return <li className="responsibility-add-row">
    <span aria-hidden="true" className="responsibility-statement-marker is-proposed" />
    <details className="responsibility-add-details">
      <summary aria-label={`新增责任依据：${claim.description}`}>
        <span className="responsibility-add-text">{claim.description}</span>
        <span className="responsibility-add-evidence-cue"><FileCheck2 aria-hidden="true" /><span>依据 {claim.evidence?.length ?? 0}</span><ChevronDown aria-hidden="true" /></span>
      </summary>
      <div className="responsibility-add-evidence">
        <ResponsibilityEvidenceList claim={claim} label={`新增责任依据：${claim.description}`} onOpenEvidence={onViewEvidence} />
        <Button id={`responsibility-proposal-${claim.id}-ignore`} onClick={() => onResolve(claim, "hidden")} size="sm" type="button" variant="ghost"><EyeOff data-icon="inline-start" />忽略</Button>
      </div>
    </details>
    <Button aria-describedby={messageId} aria-label={`添加责任：${claim.description}`} className="responsibility-add-action" disabled={actionsDisabled || !claim.description.trim()} id={`responsibility-proposal-${claim.id}-apply`} onClick={() => onResolve(claim, "accepted")} size="icon-sm" title={actionsDisabled ? "先保存或取消当前责任编辑" : "添加这条责任"} type="button" variant="ghost"><Plus aria-hidden="true" /></Button>
    {error ? <p className="responsibility-proposal-message" id={messageId} role="alert" tabIndex={-1}>{error}</p> : null}
  </li>;
}

function ResponsibilityConflictRow({ claim, error, onResolve, onViewEvidence }: { claim: ResponsibilityClaim; error: string; onResolve: (claim: ResponsibilityClaim, decision: "accepted" | "hidden") => void; onViewEvidence: (taskId: string) => void }) {
  return <li className="responsibility-conflict-row">
    <span aria-hidden="true" className="responsibility-statement-marker is-conflict" />
    <div>
      <p>{claim.description}</p>
      <p className="responsibility-proposal-message" id={`responsibility-proposal-${claim.id}-message`} role="status" tabIndex={-1}>{error}</p>
      <div className="responsibility-proposal-footer">
        <ResponsibilityEvidenceDisclosure claim={claim} label="无法更新责任的依据" onViewEvidence={onViewEvidence} />
        <Button id={`responsibility-proposal-${claim.id}-ignore`} onClick={() => onResolve(claim, "hidden")} size="sm" type="button" variant="ghost"><EyeOff data-icon="inline-start" />忽略</Button>
      </div>
    </div>
  </li>;
}

function ResponsibilityEvidenceDisclosure({ claim, label, onViewEvidence }: { claim: ResponsibilityClaim; label: string; onViewEvidence: (taskId: string) => void }) {
  return <details className="responsibility-proposal-evidence">
    <summary><FileCheck2 aria-hidden="true" /><span className="responsibility-evidence-show">查看依据</span><span className="responsibility-evidence-hide">收起依据</span><span>（{claim.evidence?.length ?? 0}）</span><ChevronDown aria-hidden="true" /></summary>
    <ResponsibilityEvidenceList claim={claim} label={label} onOpenEvidence={onViewEvidence} />
  </details>;
}

function ResponsibilityEvidenceList({ claim, label, onOpenEvidence }: { claim: ResponsibilityClaim; label: string; onOpenEvidence: (taskId: string) => void }) {
  return claim.evidence?.length ? <ul aria-label={label}>{claim.evidence.map((evidence) => <li className="responsibility-evidence-row" key={evidence.id}><span className="responsibility-evidence-summary"><span aria-hidden="true" className="responsibility-evidence-bullet" /><span><strong>{evidence.label}</strong><small>{evidence.meta}</small></span></span>{evidence.taskId ? <Button aria-label={`查看依据：${evidence.label}`} onClick={() => onOpenEvidence(evidence.taskId!)} size="sm" type="button" variant="link">查看<ArrowRight aria-hidden="true" /></Button> : null}</li>)}</ul> : <p>暂无可展示依据。</p>;
}
