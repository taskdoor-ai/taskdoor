import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { PersonOption, WorkspaceNode } from '@/shared/model/task-model';

import { canManageRecycledTask, type RecycledTask } from '@/features/tasks/lib/task-recycle-bin';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { formatDisplayDateTime } from '@/shared/lib/date-time';
import { useMockText } from '@/ai/task-display';
import { TaskBranchDisclosure } from '@/features/tasks/components/TaskBranchDisclosure';
import { PersonAvatar } from '@/shared/ui/PersonAvatar';
import { PersonPicker } from '@/features/members/components/PersonPicker';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Check, Minus } from 'lucide-react';
function Checkbox({ checked, ...props }: Omit<BaseCheckbox.Root.Props, 'checked'> & { checked?: boolean | 'indeterminate' }) { return <BaseCheckbox.Root {...props} checked={checked === true} indeterminate={checked === 'indeterminate'} className="recycle-checkbox"><BaseCheckbox.Indicator>{checked === 'indeterminate' ? <Minus size={12}/> : <Check size={12}/>}</BaseCheckbox.Indicator></BaseCheckbox.Root>; }
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/shared/ui/alert-dialog';
import '@/features/tasks/styles/task-recycle-bin.css';

type Props = { entries: RecycledTask[]; error: string; onRefresh: () => void;
  team?: Parameters<typeof canManageRecycledTask>[1]; actorId: string; members: PersonOption[]; nodes: WorkspaceNode[];
  onCommit: (ids: string[], action: 'restore' | 'purge', replacementOwner: string) => void };
export function TaskRecycleBinPage({ entries, error, onRefresh, team, actorId, members, nodes, onCommit }: Props) {
  const { locale } = useI18n();
  const text = (zh: string, en: string) => locale === 'zh-CN' ? zh : en;
  const mock = useMockText();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<{ ids: string[]; action: 'restore' | 'purge' } | null>(null);
  const [replacement, setReplacement] = useState('');
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const permitted = team?.memberships.some(m => m.status === 'active' && m.memberId === actorId);
  const title = (entry: RecycledTask) => mock.field(entry.tasks[0].id, 'title', entry.tasks[0].name);
  const filtered = entries.filter(e => e.expiresAt > now && canManageRecycledTask(e, team, actorId) && title(e).toLowerCase().includes(query.trim().toLowerCase())).sort((a,b) => b.deletedAt-a.deletedAt);
  const pages = Math.max(1, Math.ceil(filtered.length/10));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage-1)*10, currentPage*10);
  const selected = rows.filter(e => checked.includes(e.id)).map(e => e.id);
  const targets = entries.filter(e => confirmation?.ids.includes(e.id));
  const activeIds = new Set(team?.memberships.filter(m => m.status === 'active').map(m => m.memberId));
  const needOwner = targets.some(e => e.tasks.some(t => t.ownerId && !activeIds.has(t.ownerId)));
  const restoringIds = new Set(targets.flatMap(e => e.tasks.map(t => t.id)));
  const missingParent = targets.some(e => e.tasks[0].parentTaskId && !nodes.some(n => n.id === e.tasks[0].parentTaskId) && !restoringIds.has(e.tasks[0].parentTaskId));
  const prepare = (ids: string[], action: 'restore' | 'purge') => { setFailure(''); setReplacement(''); setConfirmation({ ids, action }); };
  const commit = () => {
    if (!confirmation) return;
    try { onCommit(confirmation.ids, confirmation.action, replacement); setChecked(v => v.filter(id => !confirmation.ids.includes(id))); setConfirmation(null); setNotice(confirmation.action === 'restore' ? text('任务已恢复。', 'Tasks restored.') : text('任务已彻底删除。', 'Tasks permanently deleted.')); }
    catch (e) { setFailure(e instanceof Error ? e.message : text('操作失败，请重试。', 'Could not save. Try again.')); }
  };
  return <>
    <section aria-labelledby="task-recycle-bin-heading" className="task-recycle-page">
        <header className="recycle-header">
          {team?.name && <span className="recycle-team-name text-xs text-muted-foreground">{team.name}</span>}
          <h1 id="task-recycle-bin-heading" tabIndex={-1}>{text('任务回收站', 'Task recycle bin')}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{text('任务保留 30 天，到期后自动彻底删除。恢复时会一并恢复子任务。', 'Tasks are kept for 30 days, then permanently deleted. Subtasks are restored together.')}</p>
        </header>
        {!permitted ? <p role="alert">{text('你已不在此团队中，无法访问回收站。', 'You no longer have access to this team.')}</p> : error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={onRefresh}>{text('重试', 'Retry')}</Button></div> : <>
          <div className="recycle-toolbar"><div className="recycle-search"><Search size={16} aria-hidden="true"/><Input aria-label={text('搜索已删除任务', 'Search deleted tasks')} placeholder={text('搜索任务', 'Search tasks')} value={query} onChange={e => {setQuery(e.target.value); setPage(1); setChecked([]);}} /></div></div>
          <div className="recycle-results">
            {rows.length ? <div className="recycle-table-scroll">
              <table className="recycle-table">
                <thead><tr>
                  <th scope="col"><Checkbox aria-label={text('选择本页任务', 'Select this page')} checked={selected.length === rows.length ? true : selected.length ? 'indeterminate' : false} onCheckedChange={value => setChecked(value ? rows.map(entry => entry.id) : [])} /></th>
                  <th scope="col">{text('任务', 'Task')}</th>
                  <th scope="col">{text('删除人', 'Deleted by')}</th>
                  <th scope="col">{text('删除时间', 'Deleted on')}</th>
                  <th scope="col">{text('剩余时间', 'Time left')}</th>
                  <th scope="col" className="recycle-action-heading">
                    {selected.length > 1 ? <div className="recycle-actions">
                      <Button size="sm" variant="ghost" onClick={() => prepare(selected, 'restore')}>{text('恢复', 'Restore')}</Button>
                      <Button size="sm" variant="ghost" className="recycle-purge" onClick={() => prepare(selected, 'purge')}>{text('彻底删除', 'Delete permanently')}</Button>
                    </div> : text('操作', 'Actions')}
                  </th>
                </tr></thead>
                <tbody>{rows.map(entry => {
                  const taskTitle = title(entry);
                  const deletedBy = members.find(member => member.id === entry.deletedBy);
                  const remainingDays = Math.ceil((entry.expiresAt - now) / 86400000);
                  return <tr key={entry.id}>
                    <td><Checkbox aria-label={`${text('选择', 'Select')} ${taskTitle}`} checked={checked.includes(entry.id)} onCheckedChange={value => setChecked(previous => value ? [...previous, entry.id] : previous.filter(id => id !== entry.id))} /></td>
                    <td><span className="recycle-task-title" title={taskTitle}>{taskTitle}</span><TaskBranchDisclosure tasks={entry.tasks} rootId={entry.tasks[0].id} /></td>
                    <td><span className="recycle-person"><PersonAvatar personId={entry.deletedBy} name={entry.deletedByName} profile={deletedBy} size="xs" /><span>{deletedBy?.name ?? entry.deletedByName}</span></span></td>
                    <td className="recycle-muted recycle-time"><time dateTime={new Date(entry.deletedAt).toISOString()} title={formatDisplayDateTime(entry.deletedAt, { locale, year: 'always' }) ?? undefined}>{formatDisplayDateTime(entry.deletedAt, { locale }) ?? '—'}</time></td>
                    <td className="recycle-muted recycle-time" title={formatDisplayDateTime(entry.expiresAt, { locale, year: 'always' }) ?? undefined}>{text(`${remainingDays} 天`, `${remainingDays} days`)}</td>
                    <td><div className="recycle-actions">
                      <Button size="sm" variant="ghost" onClick={() => prepare([entry.id], 'restore')}>{text('恢复', 'Restore')}</Button>
                      <Button size="sm" variant="ghost" className="recycle-purge" onClick={() => prepare([entry.id], 'purge')}>{text('彻底删除', 'Delete permanently')}</Button>
                    </div></td>
                  </tr>;
                })}</tbody>
              </table>
            </div> : <div className="recycle-empty" role="status">
              <svg aria-hidden="true" width={24} height={24} viewBox="0 0 1024 1024" fill="currentColor">
                <path d="M927.232 224.256h-200.704V160.768c0-52.736-42.496-95.744-95.232-95.744H393.216c-52.736 0-95.744 43.008-95.744 95.744v64H96.768c-17.408 0-31.744 14.336-31.744 31.744 0 17.92 14.336 31.744 31.744 31.744H926.72c17.408 0 31.744-14.336 31.744-31.744 0.512-17.92-13.312-32.256-31.232-32.256zM361.472 160.768c0-17.408 14.336-31.744 31.744-31.744h238.08c17.408 0 31.232 13.824 31.232 31.744v64H361.472V160.768zM757.76 958.976H266.752c-57.856 0-104.96-43.008-104.96-95.744V383.488c-0.512-11.776 6.144-22.528 16.896-28.672s24.576-6.144 35.84 0c10.752 6.144 17.408 16.896 16.896 28.672v479.232c0 17.408 15.872 31.744 34.816 31.744h491.52c9.216 0 18.432-3.584 24.576-9.216 6.656-6.144 10.24-14.336 10.24-22.528V385.024c-0.512-11.776 6.144-22.528 16.896-28.672s24.576-6.144 35.84 0c10.752 6.144 17.408 16.896 16.896 28.672v478.208c0.512 52.736-46.592 95.744-104.448 95.744z" />
                <path d="M496.64 788.992l3.584-90.624s-97.792-3.584-116.224-6.656c-5.12 6.656-24.576 54.784-13.824 73.728 5.632 9.728 12.8 19.456 25.088 22.016l101.376 7.168v-5.632z m-140.8-53.76c5.12-47.104 59.392-110.08 59.392-110.08l35.328 22.528-43.52-93.184-103.936-4.096 33.792 20.992s-18.944 30.72-27.648 46.08c-8.704 15.36 1.024 29.696 1.024 29.696l45.568 88.064z m314.88-198.656l-78.848 41.984s45.568 88.064 52.224 105.984c8.192 1.536 58.88-5.632 69.632-24.576 5.632-9.728 10.24-20.992 6.144-33.28l-44.544-93.184-4.608 3.072z m24.576 151.552c-42.496 18.944-122.88 2.56-122.88 2.56l1.536-42.496-57.344 84.992 48.64 94.208 1.024-40.448s35.328 1.536 52.736 1.024c17.408 0 24.576-15.36 24.576-15.36l51.712-84.48z m-325.12-179.2l75.264 48.64s52.224-84.48 64-99.328c-3.072-8.192-34.304-49.152-55.296-49.152-11.264 0-23.04 1.536-31.232 11.264L365.568 505.856l4.608 3.072z m115.712-97.28c37.376 28.16 64 107.52 64 107.52l-36.864 19.968 100.864 8.192 55.808-90.112-34.816 19.456s-16.384-32.256-25.6-47.104c-8.704-15.36-25.6-13.824-25.6-13.824l-97.792-4.096z" />
              </svg>
              <strong>{query.trim() ? text('没有匹配的任务', 'No matching tasks') : text('回收站为空', 'The recycle bin is empty')}</strong>
              <span>{query.trim() ? text('试试其他关键词。', 'Try another search.') : text('删除的任务会出现在这里。', 'Deleted tasks will appear here.')}</span>
            </div>}
            {rows.length > 0 && <div className="recycle-pagination">
              <span>{text(`共 ${filtered.length} 项`, `${filtered.length} items`)}</span>
              {pages > 1 && <nav aria-label={text('回收站分页', 'Recycle bin pages')}>
                <Button size="icon-sm" variant="ghost" disabled={currentPage === 1} aria-label={text('上一页', 'Previous page')} onClick={() => { setPage(currentPage - 1); setChecked([]); }}><ChevronLeft /></Button>
                {Array.from({ length: pages }, (_, index) => index + 1).filter(number => number === 1 || number === pages || Math.abs(number - currentPage) <= 1).map((number, index, numbers) => <span key={number}>
                  {index > 0 && number - numbers[index - 1] > 1 && <span className="px-1">…</span>}
                  <Button size="icon-sm" variant={number === currentPage ? 'secondary' : 'ghost'} aria-current={number === currentPage ? 'page' : undefined} onClick={() => { setPage(number); setChecked([]); }}>{number}</Button>
                </span>)}
                <Button size="icon-sm" variant="ghost" disabled={currentPage === pages} aria-label={text('下一页', 'Next page')} onClick={() => { setPage(currentPage + 1); setChecked([]); }}><ChevronRight /></Button>
              </nav>}
            </div>}
          </div>
          {notice && <p className="text-xs text-muted-foreground" role="status">{notice}</p>}
        </>}
    </section>
    <AlertDialog open={Boolean(confirmation)} onOpenChange={v=>{if(!v)setConfirmation(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmation?.action==='purge' ? text('彻底删除所选任务？', 'Permanently delete selected tasks?') : text('恢复所选任务？', 'Restore selected tasks?')}</AlertDialogTitle><AlertDialogDescription>{text(`共 ${targets.reduce((sum,e)=>sum+e.tasks.length,0)} 个任务（包含子任务）。`, `${targets.reduce((sum,e)=>sum+e.tasks.length,0)} tasks, including subtasks. `)}{confirmation?.action==='purge' ? text('删除后无法恢复。', 'This cannot be undone.') : text('保留原有任务状态和内容。已离开的成员不会重新加入。', 'Original status and content are retained. Former members will not be re-added.')}</AlertDialogDescription></AlertDialogHeader>
      {confirmation?.action==='restore' && <>{missingParent&&<p className="text-sm text-muted-foreground">{text('原父任务已不存在，将恢复为顶层任务。', 'The original parent no longer exists. Tasks will be restored at the top level.')}</p>}{needOwner&&<div className="space-y-2"><p>{text('原负责人已离开，请为这些任务指定新负责人。', 'A former assignee has left. Choose a new assignee for their tasks.')}</p><PersonPicker ariaLabel={text('新负责人', 'New assignee')} members={members.filter(m=>activeIds.has(m.id))} value={replacement} onChange={setReplacement} triggerVariant="select" triggerLabel={text('选择成员', 'Select member')} allowInvitations={false}/></div>}</>}
      {failure&&<p role="alert" className="text-sm text-destructive">{failure}</p>}<AlertDialogFooter><Button variant="outline" onClick={()=>setConfirmation(null)}>{text('取消', 'Cancel')}</Button><Button variant={confirmation?.action==='purge'?'destructive':'default'} disabled={confirmation?.action==='restore'&&needOwner&&!replacement} onClick={commit}>{confirmation?.action==='purge'?text('彻底删除','Delete permanently'):text('确认恢复','Restore')}</Button></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </>;
}
