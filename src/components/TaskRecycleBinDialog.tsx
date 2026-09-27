import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react';
import type { TeamResponsibilityProfile } from '../data/memberProfiles';
import type { PersonOption } from '../data/sharedTypes';
import type { WorkspaceNode } from '../data/workspaceNodes';
import { canManageRecycledTask, type RecycledTask } from '../lib/taskRecycleBin';
import { useI18n } from '../i18n/I18nProvider';
import { useMockText } from '../i18n/MockDataProvider';
import { TaskBranchDisclosure } from './TaskBranchDisclosure';
import { PersonAvatar } from './PersonAvatar';
import { PersonPicker } from './PersonPicker';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Check, Minus } from 'lucide-react';
function Checkbox({ checked, ...props }: Omit<BaseCheckbox.Root.Props, 'checked'> & { checked?: boolean | 'indeterminate' }) { return <BaseCheckbox.Root {...props} checked={checked === true} indeterminate={checked === 'indeterminate'} className="recycle-checkbox"><BaseCheckbox.Indicator>{checked === 'indeterminate' ? <Minus size={12}/> : <Check size={12}/>}</BaseCheckbox.Indicator></BaseCheckbox.Root>; }
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from './ui/alert-dialog';
import '../styles/task-recycle-bin.css';

type Props = { open: boolean; onClose: () => void; entries: RecycledTask[]; error: string; onRefresh: () => void;
  team?: TeamResponsibilityProfile; actorId: string; members: PersonOption[]; nodes: WorkspaceNode[];
  onCommit: (ids: string[], action: 'restore' | 'purge', replacementOwner: string) => void };
export function TaskRecycleBinDialog({ open, onClose, entries, error, onRefresh, team, actorId, members, nodes, onCommit }: Props) {
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
  useEffect(() => { if (open) { setQuery(''); setPage(1); setChecked([]); setConfirmation(null); setFailure(''); setNotice(''); setNow(Date.now()); } }, [open, team?.id]);
  useEffect(() => { if (!open) return; const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, [open]);
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
    <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
      <DialogContent className="task-recycle-dialog">
        <DialogHeader><span className="text-xs text-muted-foreground">{team?.name}</span><DialogTitle>{text('任务回收站', 'Task recycle bin')}</DialogTitle><DialogDescription>{text('任务保留 30 天，到期后自动彻底删除。恢复时会一并恢复子任务。', 'Tasks are kept for 30 days, then permanently deleted. Subtasks are restored together.')}</DialogDescription></DialogHeader>
        {!permitted ? <p role="alert">{text('你已不在此团队中，无法访问回收站。', 'You no longer have access to this team.')}</p> : error ? <div role="alert"><p>{error}</p><Button variant="outline" onClick={onRefresh}>{text('重试', 'Retry')}</Button></div> : <>
          <div className="recycle-toolbar"><div className="recycle-search"><Search size={16} aria-hidden="true"/><Input aria-label={text('搜索已删除任务', 'Search deleted tasks')} placeholder={text('搜索任务', 'Search tasks')} value={query} onChange={e => {setQuery(e.target.value); setPage(1); setChecked([]);}} /></div></div>
          <div className="recycle-table-scroll"><table className="recycle-table"><thead><tr><th className="recycle-check"><Checkbox aria-label={text('选择本页任务', 'Select this page')} checked={rows.length > 0 && selected.length === rows.length ? true : selected.length ? 'indeterminate' : false} disabled={!rows.length} onCheckedChange={v => setChecked(v ? rows.map(e=>e.id) : [])}/></th><th>{text('任务', 'Task')}</th><th>{text('删除人', 'Deleted by')}</th><th>{text('删除时间', 'Deleted on')}</th><th>{text('剩余时间', 'Time left')}</th><th className="recycle-actions">{selected.length > 1 && <><Button size="sm" variant="ghost" onClick={() => prepare(selected,'restore')}>{text('恢复', 'Restore')}</Button><Button size="sm" variant="ghost" className="recycle-purge" onClick={()=>prepare(selected,'purge')}>{text('彻底删除', 'Delete permanently')}</Button></>}</th></tr></thead>
          <tbody>{rows.map(entry => <tr key={entry.id}><td><Checkbox aria-label={`${text('选择', 'Select')} ${title(entry)}`} checked={checked.includes(entry.id)} onCheckedChange={v=>setChecked(prev=>v ? [...prev,entry.id] : prev.filter(id=>id!==entry.id))}/></td><td><span className="recycle-task-title" title={title(entry)}>{title(entry)}</span><TaskBranchDisclosure tasks={entry.tasks} rootId={entry.tasks[0].id}/></td><td><span className="recycle-person"><PersonAvatar personId={entry.deletedBy} name={entry.deletedByName} profile={members.find(m=>m.id===entry.deletedBy)} size="xs"/><span>{members.find(m=>m.id===entry.deletedBy)?.name ?? entry.deletedByName}</span></span></td><td className="recycle-muted">{new Intl.DateTimeFormat(locale, {month:'short',day:'numeric'}).format(entry.deletedAt)}</td><td className="recycle-muted" title={new Date(entry.expiresAt).toLocaleString(locale)}>{text(`${Math.ceil((entry.expiresAt-now)/86400000)} 天`, `${Math.ceil((entry.expiresAt-now)/86400000)} days`)}</td><td><div className="recycle-actions"><Button size="sm" variant="ghost" onClick={()=>prepare([entry.id],'restore')}>{text('恢复', 'Restore')}</Button><Button size="sm" variant="ghost" className="recycle-purge" onClick={()=>prepare([entry.id],'purge')}>{text('彻底删除', 'Delete permanently')}</Button></div></td></tr>)}</tbody></table>
          {!rows.length && <div className="recycle-empty"><Trash2 size={28} strokeWidth={1.4}/><strong>{query ? text('没有匹配的任务', 'No matching tasks') : text('回收站为空', 'The recycle bin is empty')}</strong><span>{query ? text('试试其他关键词。', 'Try another search.') : text('删除的任务会出现在这里。', 'Deleted tasks will appear here.')}</span></div>}</div>
          <div className="recycle-pagination"><span>{text(`共 ${filtered.length} 项`, `${filtered.length} items`)}</span><nav aria-label={text('回收站分页', 'Recycle bin pages')}><Button size="icon-sm" variant="ghost" disabled={currentPage===1} aria-label={text('上一页', 'Previous page')} onClick={()=>{setPage(currentPage-1);setChecked([]);}}><ChevronLeft/></Button>{Array.from({length:pages},(_,i)=>i+1).filter(n=>n===1||n===pages||Math.abs(n-currentPage)<=1).map((n,i,arr)=><span key={n}>{i>0&&n-arr[i-1]>1&&<span className="px-1">…</span>}<Button size="icon-sm" variant={n===currentPage?'secondary':'ghost'} aria-current={n===currentPage?'page':undefined} onClick={()=>{setPage(n);setChecked([]);}}>{n}</Button></span>)}<Button size="icon-sm" variant="ghost" disabled={currentPage===pages} aria-label={text('下一页', 'Next page')} onClick={()=>{setPage(currentPage+1);setChecked([]);}}><ChevronRight/></Button></nav></div>
          {notice && <p className="text-xs text-muted-foreground" role="status">{notice}</p>}
        </>}
      </DialogContent>
    </Dialog>
    <AlertDialog open={Boolean(confirmation)} onOpenChange={v=>{if(!v)setConfirmation(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmation?.action==='purge' ? text('彻底删除所选任务？', 'Permanently delete selected tasks?') : text('恢复所选任务？', 'Restore selected tasks?')}</AlertDialogTitle><AlertDialogDescription>{text(`共 ${targets.reduce((sum,e)=>sum+e.tasks.length,0)} 个任务（包含子任务）。`, `${targets.reduce((sum,e)=>sum+e.tasks.length,0)} tasks, including subtasks. `)}{confirmation?.action==='purge' ? text('删除后无法恢复。', 'This cannot be undone.') : text('保留原有任务状态和内容。已离开的成员不会重新加入。', 'Original status and content are retained. Former members will not be re-added.')}</AlertDialogDescription></AlertDialogHeader>
      {confirmation?.action==='restore' && <>{missingParent&&<p className="text-sm text-muted-foreground">{text('原父任务已不存在，将恢复为顶层任务。', 'The original parent no longer exists. Tasks will be restored at the top level.')}</p>}{needOwner&&<div className="space-y-2"><p>{text('原负责人已离开，请为这些任务指定新负责人。', 'A former owner has left. Choose a new owner for their tasks.')}</p><PersonPicker ariaLabel={text('新负责人', 'New owner')} members={members.filter(m=>activeIds.has(m.id))} value={replacement} onChange={setReplacement} triggerVariant="select" triggerLabel={text('选择成员', 'Select member')} allowInvitations={false}/></div>}</>}
      {failure&&<p role="alert" className="text-sm text-destructive">{failure}</p>}<AlertDialogFooter><Button variant="outline" onClick={()=>setConfirmation(null)}>{text('取消', 'Cancel')}</Button><Button variant={confirmation?.action==='purge'?'destructive':'default'} disabled={confirmation?.action==='restore'&&needOwner&&!replacement} onClick={commit}>{confirmation?.action==='purge'?text('彻底删除','Delete permanently'):text('确认恢复','Restore')}</Button></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </>;
}
