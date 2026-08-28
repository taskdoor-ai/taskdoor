import { Check, Copy, EyeOff, FileCheck2, FileText, Mail, Pencil, Plus, RefreshCw, Sparkles, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { savePersonalCenterState, type PersonalCenterState, type ResponsibilityClaim, type TeamAccessRole } from "../data/memberProfiles";
import type { Member } from "./MemberSelector";
import { PersonAvatar } from "./PersonAvatar";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Input, Textarea } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select as TeamSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { TeamLogo } from "./TeamLogo";
import "../styles/personal-center.css";

const toResponsibilityParagraphs = (value: string) => value.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
type ResponsibilityDraftItem = { id: string; value: string };
const toResponsibilityDraft = (value: string): ResponsibilityDraftItem[] => {
  const items = toResponsibilityParagraphs(value).map((item, index) => ({ id: `responsibility-${index}`, value: item }));
  return items.length ? items : [{ id: "responsibility-empty", value: "" }];
};
const serializeResponsibilityDraft = (items: ResponsibilityDraftItem[]) => items.map((item) => item.value.trim()).filter(Boolean).join("\n\n");

type TeamContextProps = {
  activeTeamId: string;
  onActiveTeamChange: (teamId: string) => void;
  state: PersonalCenterState;
};

function TeamContextSelect({ activeTeamId, onActiveTeamChange, state }: TeamContextProps) {
  const selectedTeam = state.teams.find((team) => team.id === activeTeamId) ?? state.teams[0];
  return <label className="team-switcher"><span>当前团队</span><TeamSelect onValueChange={(value) => onActiveTeamChange(String(value))} value={selectedTeam.id}><SelectTrigger aria-label="切换团队" className="team-switcher-trigger"><TeamLogo name={selectedTeam.name} size="sm" teamId={selectedTeam.id} /><SelectValue>{selectedTeam.name}</SelectValue></SelectTrigger><SelectContent align="end" alignItemWithTrigger={false}>{state.teams.map((team) => <SelectItem key={team.id} value={team.id}><TeamLogo name={team.name} size="sm" teamId={team.id} />{team.name}</SelectItem>)}</SelectContent></TeamSelect></label>;
}

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
      <section className="team-danger-setting"><div><h3>删除团队</h3><p>永久删除该团队及其本机数据。此操作无法撤销。</p></div><Button disabled={!canDelete || !hasFallbackTeam} onClick={() => setDangerAction("delete")} type="button" variant="destructive">删除团队</Button></section>
    </div>
    <AlertDialog onOpenChange={(open) => { if (!open) setDangerAction(null); }} open={Boolean(dangerAction)}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{dangerAction === "delete" ? `删除“${selectedTeam.name}”？` : `离开“${selectedTeam.name}”？`}</AlertDialogTitle><AlertDialogDescription>{dangerAction === "delete" ? "团队资料、成员邀请和责任说明将从本机原型中删除，操作后无法在界面内恢复。" : "确认后将切换到你的其他团队；当前团队在本机设置中不再显示。"}</AlertDialogDescription></AlertDialogHeader>
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
  const currentMembership = selectedTeam.memberships.find((membership) => membership.memberId === "周岚" || membership.email === state.profile.email);
  const canManage = currentMembership?.status === "active" && currentMembership.role === "admin";
  const inviteLink = `https://agentdoor.local/t/${selectedTeam.id}/join/${selectedTeam.inviteToken}`;

  useEffect(() => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteError("");
    setFeedback("");
  }, [selectedTeam.id]);

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
    if (!commitTeam({ ...selectedTeam, memberships: [...selectedTeam.memberships, membership] }, `已创建发送给 ${email} 的本机邀请`)) return;
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
    <div className="team-member-table"><div aria-hidden="true" className="team-member-list-head"><span>用户</span><span>角色</span></div><ul aria-label="团队成员" className="team-member-list">{selectedTeam.memberships.map((membership) => {
      const member = members.find((item) => item.id === membership.memberId || item.email.toLocaleLowerCase() === membership.email.toLocaleLowerCase());
      const isCurrentUser = membership.memberId === "周岚" || membership.email === state.profile.email;
      return <li key={membership.id}><div>{membership.status === "active" ? <PersonAvatar name={member?.name ?? membership.email} size="md" /> : <span className="team-invited-avatar"><Mail aria-hidden="true" /></span>}<span><strong>{membership.status === "active" ? member?.name ?? membership.email : membership.email}{isCurrentUser && <em>你</em>}{membership.status === "invited" && <em className="invited">已邀请</em>}</strong><small>{membership.status === "active" ? member?.email ?? membership.email : `邀请于 ${membership.invitedAt ?? "刚刚"}`}</small></span></div><TeamSelect disabled={!canManage} onValueChange={(value) => changeRole(membership.id, String(value) as TeamAccessRole)} value={membership.role}><SelectTrigger aria-label={`修改 ${member?.name ?? membership.email} 的角色`} className="team-member-role-select" size="sm"><SelectValue>{accessRoleLabel[membership.role]}</SelectValue></SelectTrigger><SelectContent align="end" alignItemWithTrigger={false}><SelectItem value="admin">管理员</SelectItem><SelectItem value="member">成员</SelectItem></SelectContent></TeamSelect></li>;
    })}</ul></div>
    <p aria-live="polite" className="team-settings-feedback">{feedback || "当前操作只保存到本机原型，不发送真实邮件，也不改变组织权限。"}</p>
  </section>;
}

export function PersonalResponsibilityPanel({ activeTeamId, onActiveTeamChange, onDirtyChange, onRequestContextChange, onStateChange, state }: { activeTeamId: string; onActiveTeamChange: (teamId: string) => void; onDirtyChange: (dirty: boolean) => void; onRequestContextChange: (action: () => void) => void; onStateChange: (state: PersonalCenterState) => void; state: PersonalCenterState }) {
  const [documentDraft, setDocumentDraft] = useState<ResponsibilityDraftItem[] | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const selectedTeam = useMemo(() => state.teams.find((team) => team.id === activeTeamId) ?? state.teams[0], [activeTeamId, state.teams]);
  const responsibilityParagraphs = useMemo(() => toResponsibilityParagraphs(selectedTeam.responsibilityDocument.content), [selectedTeam.responsibilityDocument.content]);

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

  const changeTeam = (teamId: string) => {
    if (teamId === selectedTeam.id) return;
    onRequestContextChange(() => {
      onActiveTeamChange(teamId);
      setDocumentDraft(null);
      onDirtyChange(false);
    });
  };

  const saveDocument = () => {
    if (!documentDraft) return;
    const content = serializeResponsibilityDraft(documentDraft);
    const next = {
      ...state,
      teams: state.teams.map((team) => team.id !== selectedTeam.id ? team : {
        ...team,
        responsibilityDocument: {
          content,
          updatedAt: "刚刚",
          updatedBy: state.profile.name,
          revisionId: `RESP-${team.id.toUpperCase()}-${Date.now()}`,
        },
      }),
    };
    if (commit(next, "团队责任已保存")) {
      setDocumentDraft(null);
      onDirtyChange(false);
      window.setTimeout(() => document.getElementById("edit-responsibility-document")?.focus({ preventScroll: true }), 250);
    }
  };

  const cancelDocumentEdit = () => {
    setDocumentDraft(null);
    onDirtyChange(false);
    window.setTimeout(() => document.getElementById("edit-responsibility-document")?.focus({ preventScroll: true }), 250);
  };

  const updateResponsibilityItem = (id: string, value: string) => {
    if (!documentDraft) return;
    const nextDraft = documentDraft.map((item) => item.id === id ? { ...item, value } : item);
    setDocumentDraft(nextDraft);
    onDirtyChange(serializeResponsibilityDraft(nextDraft) !== selectedTeam.responsibilityDocument.content.trim());
  };

  const addResponsibilityItem = () => {
    if (!documentDraft) return;
    const id = `responsibility-new-${Date.now()}`;
    const nextDraft = [...documentDraft, { id, value: "" }];
    setDocumentDraft(nextDraft);
    onDirtyChange(serializeResponsibilityDraft(nextDraft) !== selectedTeam.responsibilityDocument.content.trim());
    window.setTimeout(() => document.getElementById(id)?.focus({ preventScroll: true }), 80);
  };

  const removeResponsibilityItem = (id: string) => {
    if (!documentDraft) return;
    const index = documentDraft.findIndex((item) => item.id === id);
    const nextDraft = documentDraft.length === 1
      ? [{ ...documentDraft[0], value: "" }]
      : documentDraft.filter((item) => item.id !== id);
    setDocumentDraft(nextDraft);
    onDirtyChange(serializeResponsibilityDraft(nextDraft) !== selectedTeam.responsibilityDocument.content.trim());
    const focusId = nextDraft[Math.min(index, nextDraft.length - 1)]?.id;
    window.setTimeout(() => (focusId ? document.getElementById(focusId) : document.getElementById("add-responsibility-item"))?.focus({ preventScroll: true }), 80);
  };

  const resolveSuggestion = (claim: ResponsibilityClaim, decision: "accepted" | "hidden") => {
    const currentContent = selectedTeam.responsibilityDocument.content.trim();
    const alreadyPresent = responsibilityParagraphs.includes(claim.description.trim());
    const nextPendingClaim = selectedTeam.observedClaims.find((item) => item.id !== claim.id && (!item.reviewState || item.reviewState === "active"));
    const nextContent = decision === "accepted" && !alreadyPresent ? `${currentContent}${currentContent ? "\n\n" : ""}${claim.description.trim()}` : currentContent;
    const next = {
      ...state,
      teams: state.teams.map((team) => team.id !== selectedTeam.id ? team : {
        ...team,
        responsibilityDocument: decision === "accepted" && !alreadyPresent ? {
          content: nextContent,
          updatedAt: "刚刚",
          updatedBy: state.profile.name,
          revisionId: `RESP-${team.id.toUpperCase()}-${Date.now()}`,
        } : team.responsibilityDocument,
        observedClaims: team.observedClaims.map((item) => item.id !== claim.id ? item : {
          ...item,
          reviewState: decision,
          updatedAt: "刚刚",
          changeHistory: [...(item.changeHistory ?? []), { id: `CS-SELF-${Date.now()}`, actor: state.profile.name, action: decision, at: "刚刚" }],
        }),
      }),
    };
    const message = decision === "accepted"
      ? alreadyPresent ? "已采纳，责任说明中已有相同内容" : "已采纳并加入责任说明"
      : "已忽略这条建议";
    if (commit(next, message)) {
      window.setTimeout(() => {
        const focusTarget = nextPendingClaim
          ? document.getElementById(`responsibility-suggestion-${nextPendingClaim.id}-${documentDraft !== null ? "ignore" : "accept"}`)
          : document.getElementById("responsibility-suggestions-title");
        focusTarget?.focus({ preventScroll: true });
      }, 80);
    }
  };

  return <div className="personal-responsibility-panel">
    <section aria-labelledby="personal-responsibility-title">
      <div className="responsibility-toolbar">
        <div><small>团队设置</small><h2 id="personal-responsibility-title">我的责任</h2><p>查看并维护你在当前团队中的责任说明。</p></div>
        <TeamContextSelect activeTeamId={selectedTeam.id} onActiveTeamChange={changeTeam} state={state} />
      </div>

      <div className="personal-responsibility-workspace">
        <article className="responsibility-document" aria-labelledby="responsibility-document-title">
          <header>
            <div><FileText aria-hidden="true" /><span><small>一份可共同修订的正文</small><h3 id="responsibility-document-title">团队责任说明</h3></span></div>
            {documentDraft === null && <Button id="edit-responsibility-document" onClick={() => { setDocumentDraft(toResponsibilityDraft(selectedTeam.responsibilityDocument.content)); onDirtyChange(false); }} size="sm" type="button" variant="ghost"><Pencil data-icon="inline-start" />编辑</Button>}
          </header>
          {documentDraft === null ? <div className={`responsibility-document-copy ${responsibilityParagraphs.length ? "" : "is-empty"}`}>{responsibilityParagraphs.length ? <ul aria-label="团队责任正文">{responsibilityParagraphs.map((paragraph, index) => <li key={`${index}-${paragraph}`}><span aria-hidden="true" /><p>{paragraph}</p></li>)}</ul> : <p>还没有填写团队责任说明。</p>}</div> : <div className="responsibility-document-editor"><fieldset className="responsibility-item-editor"><legend>责任条目</legend><div className="responsibility-item-list">{documentDraft.map((item, index) => <div className="responsibility-item-row" key={item.id}><span aria-hidden="true" className="responsibility-item-marker" /><Textarea aria-label={`责任 ${index + 1}`} autoFocus={index === 0} id={item.id} onChange={(event) => updateResponsibilityItem(item.id, event.target.value)} rows={2} value={item.value} variant="responsibility" /><Button aria-label={`删除责任 ${index + 1}`} onClick={() => removeResponsibilityItem(item.id)} size="icon-sm" type="button" variant="ghost"><Trash2 /></Button></div>)}</div><Button id="add-responsibility-item" onClick={addResponsibilityItem} size="sm" type="button" variant="ghost"><Plus data-icon="inline-start" />添加一条责任</Button></fieldset><div className="responsibility-editor-actions"><span>{documentDraft.filter((item) => item.value.trim()).length} 条责任</span><div><Button onClick={cancelDocumentEdit} size="sm" type="button" variant="ghost">取消</Button><Button onClick={saveDocument} size="sm" type="button">保存</Button></div></div></div>}
          <footer><span>当前演示：本人可编辑</span><span>最近由 {selectedTeam.responsibilityDocument.updatedBy} 更新于 {selectedTeam.responsibilityDocument.updatedAt}</span></footer>
        </article>

        <ResponsibilitySuggestions claims={selectedTeam.observedClaims} editingDocument={documentDraft !== null} onResolve={resolveSuggestion} />
      </div>
    </section>

    <div aria-live="polite" className={`personal-center-toast ${savedMessage ? "visible" : ""}`} role="status">{savedMessage}</div>
  </div>;
}

function ResponsibilitySuggestions({ claims, editingDocument, onResolve }: { claims: ResponsibilityClaim[]; editingDocument: boolean; onResolve: (claim: ResponsibilityClaim, decision: "accepted" | "hidden") => void }) {
  const pendingClaims = claims.filter((claim) => !claim.reviewState || claim.reviewState === "active");
  return <aside className="responsibility-suggestions" aria-labelledby="responsibility-suggestions-title">
    <header><div><Sparkles aria-hidden="true" /><span><small>由你决定是否写入</small><h3 id="responsibility-suggestions-title" tabIndex={-1}>AI 建议</h3></span></div><strong>{pendingClaims.length}</strong></header>
    <p className="responsibility-suggestions-intro">AI 已整理好建议文本。采纳会直接加入左侧责任说明，忽略后不再显示。</p>
    {editingDocument && <p className="responsibility-accept-disabled-note" id="responsibility-accept-disabled-note" role="status">请先保存或取消左侧的责任修改，再采纳建议。忽略仍可使用。</p>}
    <div className="responsibility-suggestion-list">{pendingClaims.length ? pendingClaims.map((claim) => <article key={claim.id}>
      <div className="responsibility-suggestion-title"><strong>{claim.label}</strong><span>待确认</span></div>
      <div className="responsibility-suggestion-copy"><small>建议写入内容</small><p>{claim.description}</p></div>
      <details><summary>查看依据与记录</summary><dl className="claim-provenance"><div><dt>更新者</dt><dd>{claim.aiActor}</dd></div><div><dt>规则</dt><dd>{claim.ruleVersion}</dd></div><div><dt>原始变更</dt><dd>{claim.changeSetId}</dd></div></dl>{claim.evidence?.length ? <ul aria-label="建议依据">{claim.evidence.map((evidence) => <li key={evidence.id}><FileCheck2 aria-hidden="true" /><span><strong>{evidence.label}</strong><small>{evidence.meta}</small></span></li>)}</ul> : null}</details>
      <footer><span>更新于 {claim.updatedAt}</span><div><Button id={`responsibility-suggestion-${claim.id}-ignore`} onClick={() => onResolve(claim, "hidden")} size="sm" type="button" variant="ghost"><EyeOff data-icon="inline-start" />忽略</Button><Button aria-describedby={editingDocument ? "responsibility-accept-disabled-note" : undefined} disabled={editingDocument} id={`responsibility-suggestion-${claim.id}-accept`} onClick={() => onResolve(claim, "accepted")} size="sm" type="button"><Check data-icon="inline-start" />采纳</Button></div></footer>
    </article>) : <div className="responsibility-empty"><Sparkles aria-hidden="true" /><div><strong>{claims.length ? "建议已处理完" : "暂时没有建议"}</strong><p>{claims.length ? "出现新的可复核结果后，AI 会在这里提供下一条建议。" : "等待新的可复核结果，AI 不会在没有依据时生成责任内容。"}</p></div></div>}</div>
  </aside>;
}
