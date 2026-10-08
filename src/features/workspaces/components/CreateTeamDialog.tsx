import { useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { loadPersonalCenterDirectory, savePersonalCenterDirectory } from '../data/memberProfiles';
import { countCreatedTeams, MAX_CREATED_TEAMS, prepareCreatedTeam } from '../lib/teamLimits';
import { readWorkspaceSession, saveWorkspaceSession, onboardingStorageKey } from '../lib/workspaceSession';
import { restoreOnboardingPreview } from '../lib/onboardingPreview';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
export function CreateTeamDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { locale } = useI18n();
  const en = locale === 'en';
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const saving = useRef(false);
  const directory = loadPersonalCenterDirectory();
  const session = readWorkspaceSession();
  const identity = session ?? { userId: '周岚', email: directory.profile.email, name: directory.profile.name };
  const count = countCreatedTeams(directory.teams, identity);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="create-team-dialog" aria-describedby={undefined}>
    <DialogTitle>{en ? 'Create team' : '创建团队'}</DialogTitle>
    <form onSubmit={event => {
      event.preventDefault(); if (saving.current) return;
      saving.current = true;
      try {
        const result = prepareCreatedTeam(loadPersonalCenterDirectory(), identity, name);
        if (!savePersonalCenterDirectory(result.directory)) throw new Error(en ? 'Could not save. Please retry.' : '保存失败，请重试');
        const nextSession = { ...identity, activeTeamId: result.team.id };
        saveWorkspaceSession(nextSession);
        const saved = restoreOnboardingPreview(sessionStorage.getItem(onboardingStorageKey));
        if (saved?.accounts[identity.email]) {
          const account = saved.accounts[identity.email];
          const teams = [...account.teams, { id: result.team.id, name: result.team.name, role: 'admin' as const }];
          sessionStorage.setItem(onboardingStorageKey, JSON.stringify({ ...saved, email: identity.email, name: identity.name, verified: true, step: 'workspace', teams, activeTeamId: result.team.id, accounts: { ...saved.accounts, [identity.email]: { ...account, teams, activeTeamId: result.team.id } } }));
        }
        window.location.assign('/');
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : '';
        setError(en ? message.includes('最多可创建') ? `You can create up to ${MAX_CREATED_TEAMS} teams.` : message.includes('60') ? 'Enter a team name of 1–60 characters.' : 'Could not create the team. Please retry.' : message || '创建失败，请重试');
        saving.current = false;
      }
    }}>
      <label htmlFor="new-team-name">{en ? 'Team name' : '团队名称'}</label>
      <Input id="new-team-name" autoFocus maxLength={60} value={name} onChange={event => { setName(event.target.value); setError(''); }} placeholder={en ? 'Enter team name' : '填写团队名称'} />
      {count >= MAX_CREATED_TEAMS && <p role="status">{en ? `You have reached the ${MAX_CREATED_TEAMS}-team limit.` : `已达到 ${MAX_CREATED_TEAMS} 个团队的创建上限。`}</p>}
      {error && <p role="alert">{error}</p>}
      <footer><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{en ? 'Cancel' : '取消'}</Button><Button type="submit" disabled={!name.trim() || count >= MAX_CREATED_TEAMS}>{en ? 'Create team' : '创建团队'}</Button></footer>
    </form>
  </DialogContent></Dialog>;
}
