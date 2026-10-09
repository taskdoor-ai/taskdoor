import { useMemo, useState } from 'react';
import { activeMembership } from '@/features/members/lib/team-membership-lifecycle';
import { readDeletedTeams, type DeletedTeam } from '@/features/members/lib/team-lifecycle-storage';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Button } from '@/shared/ui/button';
import { TeamLogo } from '@/shared/ui/TeamLogo';
import { toast } from '@/shared/ui/toast';
import '@/features/members/styles/my-teams.css';

type Team = Parameters<typeof activeMembership>[0];
type TeamAccessRole = NonNullable<ReturnType<typeof activeMembership>>['role'];
const DAY_MS = 86400000;
const roleLabel: Record<TeamAccessRole, [string, string]> = { owner: ['拥有者', 'Owner'], admin: ['管理员', 'Admin'], member: ['成员', 'Member'] };

/** Lists the teams the viewer belongs to, plus deleted teams still inside their 30-day retention window. */
export function MyTeamsPanel({ state, actorId, onRestore, teamName = team => team.name }: { state: { teams: Team[] }; actorId: string; onRestore: (teamId: string) => void; teamName?: (team: Team) => string }) {
  const { locale } = useI18n(); const en = locale === 'en';
  const [busyId, setBusyId] = useState('');
  const [now] = useState(() => Date.now());
  const deleted = useMemo(() => {
    try { return { teams: readDeletedTeams(localStorage, now).filter(entry => activeMembership(entry.team, actorId)), error: '' }; }
    catch (failure) { return { teams: [] as DeletedTeam[], error: failure instanceof Error ? failure.message : '无法读取已删除团队，请重试。' }; }
  }, [actorId, now, state.teams]);
  const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString(en ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const restore = (teamId: string) => {
    if (busyId) return;
    setBusyId(teamId);
    try { onRestore(teamId); toast.success(en ? 'Team restored' : '团队已恢复'); }
    catch (failure) { toast.error(en ? 'Could not restore the team. Refresh and retry.' : failure instanceof Error ? failure.message : '恢复失败，请重试。'); }
    finally { setBusyId(''); }
  };
  const row = (team: Team, entry?: DeletedTeam) => {
    const membership = activeMembership(team, actorId);
    const role = membership?.role ?? 'member';
    const memberCount = team.memberships.filter(m => m.status === 'active').length;
    const remaining = entry ? entry.expiresAt - now : 0;
    return <li className={`my-team-row ${entry ? 'is-deleted' : ''}`} key={team.id}>
      <TeamLogo name={team.name} size="md" teamId={team.id} />
      <div className="my-team-copy">
        <strong>{teamName(team)}</strong>
        <small>{roleLabel[role][en ? 1 : 0]} · {en ? `Joined ${dateLabel(membership?.joinedAt)}` : `${dateLabel(membership?.joinedAt)} 加入`} · {en ? `${memberCount} members` : `${memberCount} 名成员`}</small>
      </div>
      {entry && <div className="my-team-deleted">
        <span className="my-team-countdown">{remaining < DAY_MS ? (en ? 'Deleted · expires today' : '已删除 · 今天到期') : (en ? `Deleted · ${Math.ceil(remaining / DAY_MS)} days left` : `已删除 · 剩 ${Math.ceil(remaining / DAY_MS)} 天`)}</span>
        {role === 'owner'
          ? <Button disabled={Boolean(busyId)} onClick={() => restore(team.id)} size="sm" variant="outline">{en ? 'Restore' : '恢复'}</Button>
          : <span className="my-team-owner-only">{en ? 'Only the owner can restore' : '仅拥有者可恢复'}</span>}
      </div>}
    </li>;
  };
  return <section aria-labelledby="my-teams-title" className="personal-team-panel my-teams-panel">
    <div className="responsibility-toolbar"><div><h2 id="my-teams-title">{en ? 'My teams' : '我的团队'}</h2></div></div>
    <p className="my-teams-hint">{en ? 'Deleted teams are kept for 30 days. The owner can restore them here; after that they are permanently deleted.' : '删除的团队保留 30 天，期间拥有者可在此恢复；超过 30 天将永久删除，无法恢复。'}</p>
    {deleted.error && <p className="personal-edit-error" role="alert">{deleted.error}</p>}
    {state.teams.length || deleted.teams.length
      ? <ul className="my-teams-list">{state.teams.map(team => row(team))}{deleted.teams.map(entry => row(entry.team, entry))}</ul>
      : <p className="my-teams-empty">{en ? 'You have not joined any team.' : '你还没有加入任何团队。'}</p>}
  </section>;
}

export function hasRestorableTeams(actorId: string) {
  try { return readDeletedTeams(localStorage).some(entry => activeMembership(entry.team, actorId)); }
  catch { return false; }
}
