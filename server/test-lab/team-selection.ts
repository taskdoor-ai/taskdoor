import { defaultActiveTeamLimit, type LabTeam } from '../../src/test-lab/types.ts';

export const representativeActiveTeamIds = [
  'lab-content',
  'lab-legal',
  'lab-short-video',
  'import-REAL-A-REL-01',
  'import-REAL-A-SAAS-01',
  'import-REAL-A-ECOM-01',
  'import-REAL-A-CS-01',
  'import-REAL-C-03',
] as const;

export function defaultActiveTeamIds(teams: LabTeam[]) {
  const available = new Set(teams.map((team) => team.id));
  const selected = new Set<string>();
  const add = (id: string) => {
    if (selected.size < defaultActiveTeamLimit && available.has(id)) selected.add(id);
  };

  // Keep active user-created teams, then fill the sample set with representative industries.
  teams.filter((team) => !team.archived && !team.id.startsWith('import-')).forEach((team) => add(team.id));
  representativeActiveTeamIds.forEach(add);
  // Legacy or partial libraries may not contain every preferred sample.
  teams.filter((team) => !team.archived).forEach((team) => add(team.id));
  return selected;
}
