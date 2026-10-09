import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRightLeft, Check, ChevronLeft, ChevronRight, Crown, MoreHorizontal, Search } from 'lucide-react';
import type { TeamMembership, TeamResponsibilityProfile } from '@/ai/mock/data/memberProfiles';
import type { TaskNode, WorkspaceNode } from '@/shared/model/task-model';
import type { Member } from '@/features/members/components/MemberSelector';
import { PersonPicker } from '@/features/members/components/PersonPicker';
import { activeMembership, canRemoveTeamMember, getHandoffTasks, handoffSignature } from '@/features/members/lib/team-membership-lifecycle';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { mockPersonName, mockTaskField, mockTeamName } from '@/ai/mock/i18n/mockContent';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { toast } from '@/shared/ui/toast';
import '@/features/members/styles/team-lifecycle.css';

export type TeamLifecycleAction =
  | { kind: 'exit'; memberId: string; replacements: Record<string, string>; signature: string; note: string }
  | { kind: 'transfer'; successorId: string }
  | { kind: 'role'; memberId: string; role: 'admin' | 'member' }
  | { kind: 'delete'; name: string };
type Request = { kind: 'exit'; memberId: string } | { kind: 'transfer' | 'delete' };
type Lifecycle = { actorId: string; team?: TeamResponsibilityProfile; request: (request: Request) => void; commit: (action: TeamLifecycleAction) => void };
const Context = createContext<Lifecycle | null>(null);
export const useTeamLifecycle = () => useContext(Context);
export function TeamLifecycleProvider({ children, team, nodes, members, actorId, onCommit }: { children: ReactNode; team?: TeamResponsibilityProfile; nodes: WorkspaceNode[]; members: Member[]; actorId: string; onCommit: (action: TeamLifecycleAction) => void }) {
  const [request, setRequest] = useState<Request | null>(null);
  return <Context.Provider value={{ actorId, team, request: setRequest, commit: onCommit }}>
    {children}
    {team && request && <LifecycleDialog key={`${team.id}:${request.kind}:${'memberId' in request ? request.memberId : ''}`} request={request} team={team} nodes={nodes} members={members} actorId={actorId} onClose={() => setRequest(null)} onCommit={onCommit} />}
  </Context.Provider>;
}
export function TeamMemberActions({ membership }: { membership: TeamMembership }) {
  const lifecycle = useTeamLifecycle();
  const { locale } = useI18n(); const en = locale === 'en';
  if (!lifecycle?.team || membership.status !== 'active' || !membership.memberId) return null;
  const { actorId, team } = lifecycle;
  const owner = activeMembership(team, actorId)?.role === 'owner';
  const removable = canRemoveTeamMember(team, actorId, membership.memberId);
  const canSetRole = owner && membership.role !== 'owner';
  if (!removable && !canSetRole) return null;
  const changeRole = () => { try { lifecycle.commit({ kind: 'role', memberId: membership.memberId!, role: membership.role === 'admin' ? 'member' : 'admin' }); toast.success(en ? 'Role updated' : '角色已更新'); } catch (error) { toast.error(en ? 'Could not update. Check your permissions and retry.' : error instanceof Error ? error.message : '修改失败，请重试'); } };
  return <DropdownMenu><DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={en ? `Manage ${membership.name ?? membership.email}` : `管理 ${membership.name ?? membership.email}`} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end" className="team-member-menu">
    {canSetRole && <DropdownMenuItem onClick={changeRole}>{membership.role === 'admin' ? (en ? 'Remove admin role' : '取消管理员') : (en ? 'Make administrator' : '设为管理员')}</DropdownMenuItem>}
    {removable && <DropdownMenuItem className="team-menu-destructive" onClick={() => lifecycle.request({ kind: 'exit', memberId: membership.memberId! })}>{membership.memberId === actorId ? (en ? 'Leave team' : '离开团队') : (en ? 'Remove member' : '移除成员')}</DropdownMenuItem>}
  </DropdownMenuContent></DropdownMenu>;
}
export function TeamOwnershipSettings() {
  const lifecycle = useTeamLifecycle(); const { locale } = useI18n(); const en = locale === 'en';
  if (!lifecycle?.team) return null;
  const current = activeMembership(lifecycle.team, lifecycle.actorId);
  if (!current) return null;
  const owner = current.role === 'owner';
  return <>
    {owner && <section className="team-danger-setting"><div><h3>{en ? 'Team ownership' : '团队所有权'}</h3><p>{en ? 'Transfer ownership to another member. Task assignments stay unchanged.' : '将拥有者身份转让给其他成员，不改变任务分工。'}</p></div><Button variant="outline" onClick={() => lifecycle.request({ kind: 'transfer' })}><ArrowRightLeft />{en ? 'Transfer ownership' : '转让拥有者'}</Button></section>}
    <section className="team-danger-setting"><div><h3>{en ? 'Leave team' : '离开团队'}</h3><p>{owner ? (en ? 'Transfer ownership before handing off tasks and leaving.' : '先转让拥有者身份，再交接未完成任务并离开。') : (en ? 'Hand off unfinished tasks before leaving this team.' : '交接负责和参与的未完成任务后，退出本团队。')}</p></div><Button variant="outline" onClick={() => lifecycle.request(owner ? { kind: 'transfer' } : { kind: 'exit', memberId: lifecycle.actorId })}>{owner ? (en ? 'Transfer first' : '先转让拥有者') : (en ? 'Leave team' : '离开团队')}</Button></section>
    {owner && <section className="team-danger-setting"><div><h3>{en ? 'Delete team' : '删除团队'}</h3><p>{en ? 'Deleted teams are kept for 30 days and can be restored in Settings › My teams. After 30 days they cannot be restored.' : '删除后团队保留 30 天，期间可在「设置 › 我的团队」中恢复；超过 30 天将无法恢复。'}</p></div><Button variant="destructive" onClick={() => lifecycle.request({ kind: 'delete' })}>{en ? 'Delete team' : '删除团队'}</Button></section>}
  </>;
}
function LifecycleDialog({ request, team, nodes, members, actorId, onClose, onCommit }: { request: Request; team: TeamResponsibilityProfile; nodes: WorkspaceNode[]; members: Member[]; actorId: string; onClose: () => void; onCommit: (action: TeamLifecycleAction) => void }) {
  const { locale } = useI18n(); const en = locale === 'en';
  const [tab, setTab] = useState<'owner' | 'participant'>('owner');
  const [statusFilter, setStatusFilter] = useState('all');
  const statusLabel = (status: TaskNode['status']) => en ? ({ '待开始': 'Not started', '进行中': 'In progress', '已阻塞': 'Blocked', '待审核': 'In review', '已完成': 'Completed', '已取消': 'Cancelled' })[status] : status;
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(''); const [onlyMissing, setOnlyMissing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]); const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [successor, setSuccessor] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(''); const busy = useRef(false);
  const memberId = request.kind === 'exit' ? request.memberId : actorId;
  const [signature, setSignature] = useState(() => handoffSignature(team, nodes, memberId));
  const currentSignature = handoffSignature(team, nodes, memberId);
  const stale = request.kind === 'exit' && signature !== currentSignature;
  const tasks = getHandoffTasks(team.id, nodes, memberId);
  const candidates = team.memberships.filter(m => m.status === 'active' && m.memberId && m.memberId !== memberId);
  const personName = (id: string) => { const member = members.find(m => m.id === id); const membership = team.memberships.find(m => m.memberId === id); return mockPersonName(locale, id, member?.name ?? membership?.name ?? membership?.email ?? id); };
  const name = personName(memberId); const leaving = memberId === actorId;
  const teamName = mockTeamName(locale, team.id, team.name);
  const owned = tasks.filter(t => t.ownerId === memberId);
  const participating = tasks.filter(t => t.ownerId !== memberId);
  const validReplacement = (id: string) => candidates.some(c => c.memberId === replacements[id]);
  const assigned = tasks.filter(t => validReplacement(t.id)).length;
  const titleFor = (task: TaskNode) => mockTaskField(locale, task.id, 'title', task.name);
  const pathFor = (task: TaskNode) => { const path: string[] = []; const seen = new Set([task.id]); let parentId = task.parentTaskId; while (parentId && !seen.has(parentId)) { seen.add(parentId); const parent = nodes.find((n): n is TaskNode => n.kind === 'task' && n.teamId === team.id && n.id === parentId); if (!parent) break; path.unshift(titleFor(parent)); parentId = parent.parentTaskId; } return path.join(' / '); };
  const visible = (tab === 'owner' ? owned : participating).filter(t => (statusFilter === 'all' || t.status === statusFilter) && (!onlyMissing || !validReplacement(t.id)) && `${titleFor(t)} ${pathFor(t)}`.toLowerCase().includes(query.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(visible.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pageNumbers = [...new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1])].filter(number => number >= 1 && number <= pageCount).sort((a, b) => a - b);
  const pageTasks = visible.slice((currentPage - 1) * 10, currentPage * 10);
  const selectedOnPage = pageTasks.filter(task => selected.includes(task.id)).length;
  useEffect(() => { setPage(currentPage); listRef.current?.scrollTo({ top: 0 }); }, [currentPage, tab, query, onlyMissing, statusFilter]);
  const selectedPageIds = pageTasks.filter(task => selected.includes(task.id)).map(task => task.id);
  const eligible = request.kind === 'exit' ? canRemoveTeamMember(team, actorId, memberId) : activeMembership(team, actorId)?.role === 'owner';
  const ready = eligible && !stale && (request.kind === 'exit' ? assigned === tasks.length : request.kind === 'transfer' ? candidates.some(c => c.memberId === successor) : confirmation === teamName);
  const candidatePeople = candidates.map(candidate => members.find(member => member.id === candidate.memberId) ?? {
    id: candidate.memberId!, name: candidate.name ?? candidate.email ?? candidate.memberId!, email: candidate.email ?? '', role: '',
  });
  const choose = (value: string, onChange: (id: string) => void, label: string, disabled = false, bulk = false) => <PersonPicker
    ariaLabel={label} menuLabel={label} className="handoff-person-select" triggerVariant={bulk ? "action" : "select"} triggerLabel={en ? "Bulk assign" : "批量设置"}
    members={candidatePeople} value={value} onChange={onChange} disabled={disabled || !candidates.length}
    allowInvitations={false} allowUnassigned={false} showTriggerProfilePreview={false}
  />;
  const submit = () => {
    if (!ready || busy.current) return;
    busy.current = true; setError('');
    try {
      onCommit(request.kind === 'exit' ? { kind: 'exit', memberId, replacements, signature, note: '' } : request.kind === 'transfer' ? { kind: 'transfer', successorId: successor } : { kind: 'delete', name: team.name });
      onClose(); toast.success(en ? (request.kind === 'exit' ? `${tasks.length} tasks handed off. ${leaving ? 'You left the team.' : 'Member removed.'}` : request.kind === 'transfer' ? 'Ownership transferred' : 'Team deleted. You can restore it within 30 days.') : request.kind === 'exit' ? `${tasks.length} 项任务已交接，${leaving ? '已离开团队' : '成员已移除'}` : request.kind === 'transfer' ? '拥有者已转让' : '团队已删除，30 天内可在「我的团队」中恢复');
    } catch (failure) { setError(en ? 'Could not save. Your selections are kept. Check for changes and retry.' : failure instanceof Error ? failure.message : '保存失败，选择已保留，请重试。'); }
    finally { busy.current = false; }
  };
  const title = request.kind === 'exit' ? (leaving ? (en ? 'Leave team' : '离开团队') : (en ? `Remove ${name}` : `移除${name}`)) : request.kind === 'transfer' ? (en ? 'Transfer ownership' : '转让团队拥有者') : (en ? `Delete ${teamName}` : `删除「${teamName}」`);
  const confirmLabel = request.kind === 'exit' ? (tasks.length ? (en ? `Hand off & ${leaving ? 'leave' : 'remove'}` : `确认交接并${leaving ? '离开' : '移除'}`) : (en ? `Confirm ${leaving ? 'leaving' : 'removal'}` : `确认${leaving ? '离开' : '移除'}`)) : request.kind === 'transfer' ? (en ? 'Transfer ownership' : '确认转让') : (en ? 'Delete team' : '删除团队');
  return <Dialog open onOpenChange={open => { if (!open && !busy.current) onClose(); }}><DialogContent className={`team-lifecycle-dialog ${request.kind === 'exit' && tasks.length ? 'handoff-dialog' : ''}`}>
    <header><span className="handoff-eyebrow">{teamName}</span><DialogTitle>{title}</DialogTitle><DialogDescription>{request.kind === 'exit' ? (tasks.length ? (en ? 'Assign successors for unfinished tasks. Team access ends after the handoff.' : '为未完成任务指定接手人。交接完成后，将失去本团队访问权限。') : (en ? 'No unfinished tasks to hand off. Collaboration history will be preserved.' : '没有需要交接的未完成任务，历史协作记录将保留。')) : request.kind === 'transfer' ? (en ? 'The new owner can manage administrators and delete the team. You will become an administrator; task assignments stay unchanged.' : '新拥有者可以管理管理员和删除团队。你将成为管理员，任务分工保持不变。') : (en ? 'All members lose access immediately. The team, its tasks, discussions and files are kept for 30 days; you can restore it in Settings › My teams. After 30 days it is permanently deleted and cannot be restored. Other teams and accounts are not affected.' : '所有成员将立即失去访问权限。团队及其任务、讨论与文件保留 30 天，期间可在「设置 › 我的团队」中恢复；超过 30 天将永久删除，无法恢复。其他团队与成员账号不受影响。')}</DialogDescription></header>
    {!eligible && <p role="alert" className="handoff-error">{en ? 'You no longer have permission for this action.' : '当前已无此操作权限，请关闭后重新查看成员。'}</p>}
    {stale && <div className="handoff-stale" role="alert"><span>{en ? 'Tasks or members changed. Review the updated list.' : '任务或成员已变化，请核对更新后的清单。'}</span><Button variant="outline" size="sm" onClick={() => { setSignature(currentSignature); setSelected([]); setError(''); }}>{en ? 'Confirm updated list' : '已核对最新清单'}</Button></div>}
    {request.kind === 'exit' && tasks.length > 0 && <>
      <div className="handoff-tabs" role="tablist" aria-label={en ? 'Task role' : '任务身份'} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'owner' : event.key === 'End' ? 'participant' : tab === 'owner' ? 'participant' : 'owner'; setTab(next); setPage(1); document.getElementById(`handoff-tab-${next}`)?.focus(); } }}>
        {(['owner', 'participant'] as const).map(role => <button type="button" role="tab" id={`handoff-tab-${role}`} aria-selected={tab === role} aria-controls="handoff-panel" tabIndex={tab === role ? 0 : -1} key={role} onClick={() => { setTab(role); setPage(1); }}>{role === 'owner' ? (en ? 'Responsible for' : '负责的任务') : (en ? 'Participating in' : '参与的任务')}<span>{role === 'owner' ? owned.length : participating.length}</span></button>)}
      </div>
      <div className="handoff-toolbar">
        <div className="handoff-search"><Search size={16} /><Input aria-label={en ? 'Search tasks' : '搜索任务'} placeholder={en ? 'Search tasks' : '搜索任务'} value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></div>
        <Select value={statusFilter} onValueChange={value => { if (value) { setStatusFilter(String(value)); setPage(1); } }}>
          <SelectTrigger className="handoff-status-filter" aria-label={en ? 'Filter task status' : '筛选任务状态'}><SelectValue>{statusFilter === 'all' ? (en ? 'All statuses' : '全部状态') : statusLabel(statusFilter as TaskNode['status'])}</SelectValue></SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="all">{en ? 'All statuses' : '全部状态'}</SelectItem>
            {(['待开始', '进行中', '已阻塞', '待审核'] as const).map(status => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}
          </SelectContent>
        </Select>
        <label><input type="checkbox" checked={onlyMissing} onChange={e => { setOnlyMissing(e.target.checked); setPage(1); }} />{en ? 'Unassigned only' : '只看未指定'}</label>
      </div>
      {!candidates.length && <p className="handoff-error" role="alert">{en ? 'No eligible successor. Invite a member to join before continuing.' : '暂无可接手的有效成员，请先邀请成员加入团队。'}</p>}
      <div className="handoff-table-heading">
        <input type="checkbox" aria-label={en ? 'Select this page' : '全选本页'} ref={element => { if (element) element.indeterminate = selectedOnPage > 0 && selectedOnPage < pageTasks.length; }} checked={pageTasks.length > 0 && selectedOnPage === pageTasks.length} disabled={!pageTasks.length} onChange={e => setSelected(e.target.checked ? [...new Set([...selected, ...pageTasks.map(t => t.id)])] : selected.filter(id => !pageTasks.some(t => t.id === id)))} />
        <span>{en ? 'Task' : '任务'}</span><span>{en ? 'Status' : '状态'}</span><div className="handoff-heading-actions"><span>{en ? 'Members' : '成员'}</span>{choose('', id => { setReplacements(old => ({ ...old, ...Object.fromEntries(selectedPageIds.map(taskId => [taskId, id])) })); }, en ? 'Assign selected tasks on this page' : '批量设置本页已选任务', !selectedPageIds.length, true)}</div>
      </div>
      <div id="handoff-panel" ref={listRef} role="tabpanel" aria-labelledby={`handoff-tab-${tab}`} className="handoff-task-list">
        {pageTasks.length ? pageTasks.map(task => <div key={task.id} className="handoff-task-row">
          <input type="checkbox" aria-label={`${en ? 'Select' : '选择'} ${titleFor(task)}`} checked={selected.includes(task.id)} onChange={e => setSelected(old => e.target.checked ? [...old, task.id] : old.filter(id => id !== task.id))} />
          <div className="handoff-task-copy"><strong title={titleFor(task)}>{titleFor(task)}</strong></div>
          <span className="handoff-task-status">{statusLabel(task.status)}</span>
          {choose(validReplacement(task.id) ? replacements[task.id] : '', id => setReplacements(old => ({ ...old, [task.id]: id })), `${en ? 'Successor for' : '接手人：'} ${titleFor(task)}`)}
        </div>) : <p className="handoff-empty">{en ? 'No matching tasks' : '没有符合条件的任务'}</p>}
      </div>
      {visible.length > 10 && <nav className="handoff-pagination" aria-label={en ? 'Task pages' : '任务分页'}>
        <span aria-live="polite">{en ? `${visible.length} tasks` : `共 ${visible.length} 项`}</span>
        <div className="handoff-page-controls">
          <Button variant="ghost" size="icon-sm" aria-label={en ? 'Previous page' : '上一页'} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></Button>
          {pageNumbers.map((number, index) => <span className="handoff-page-item" key={number}>
            {index > 0 && number - pageNumbers[index - 1] > 1 && <span className="handoff-page-gap" aria-hidden="true">…</span>}
            <Button variant="ghost" size="icon-sm" aria-label={en ? `Page ${number}` : `第 ${number} 页`} aria-current={currentPage === number ? 'page' : undefined} onClick={() => setPage(number)}>{number}</Button>
          </span>)}
          <Button variant="ghost" size="icon-sm" aria-label={en ? 'Next page' : '下一页'} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></Button>
        </div>
      </nav>}
    </>}
    {request.kind === 'transfer' && <div className="ownership-successor"><Crown size={20} aria-hidden="true" />{choose(successor, setSuccessor, en ? 'New owner' : '新拥有者')}{!candidates.length && <p>{en ? 'Invite a member to join first.' : '请先邀请成员加入团队。'}</p>}</div>}
    {request.kind === 'delete' && <label className="handoff-note">{en ? `Type “${teamName}” to confirm` : `输入「${teamName}」以确认`}<Input autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} aria-label={en ? 'Confirm team name' : '确认团队名称'} /></label>}
    {error && <p className="handoff-error" role="alert">{error}</p>}
    <footer className="handoff-footer"><span aria-live="polite">{request.kind === 'exit' && tasks.length > 0 && <>{assigned === tasks.length && <Check size={16} />}{en ? `${assigned} / ${tasks.length} assigned` : `已指定 ${assigned} / ${tasks.length} 项`}</>}</span><Button variant="ghost" onClick={onClose}>{en ? 'Cancel' : '取消'}</Button><Button variant={request.kind === 'transfer' ? 'default' : 'destructive'} disabled={!ready} onClick={submit}>{confirmLabel}</Button></footer>
  </DialogContent></Dialog>;
}
