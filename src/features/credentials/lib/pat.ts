/**
 * Personal access tokens, as the production app shapes them (W3-016): a person's own credentials
 * for the Open API and MCP. A token reaches every team its holder is in, or only the listed ones;
 * scopes and tasks narrow it further. The PM demo keeps them in memory: nothing is issued.
 */
export type CredentialScope = (typeof credentialScopes)[number];
export type TokenWorkspaces = { mode: 'ALL' | 'LISTED'; workspaceIds: string[] };
export type PersonalAccessToken = {
  id: string;
  name: string;
  workspaces: TokenWorkspaces;
  taskWorkspaceId: string | null;
  taskIds: string[];
  scopes: CredentialScope[];
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string | null;
};
/** A team a token may be limited to. */
export type TokenWorkspace = { id: string; name: string };

export const ALL_WORKSPACES: TokenWorkspaces = { mode: 'ALL', workspaceIds: [] };
export const credentialScopes = [
  'tasks:read',
  'tasks:write',
  'comments:write',
  'files:read',
  'files:write',
  'members:read',
  'members:write',
  'audit:read',
  'account:read',
  'account:write',
  'notifications:read',
] as const;
export const MAX_TOKEN_NAME = 120;
export const MAX_TOKEN_TASKS = 100;
export const MAX_TOKEN_WORKSPACES = 50;
export const MAX_TOKEN_DAYS = 365;
export const DEFAULT_TOKEN_DAYS = 90;

/** The end of `date` in the viewer's time zone: the token works through that day. */
export function expiryOf(date: string): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day, 23, 59, 59).toISOString();
}

/** `YYYY-MM-DD`, `days` from today in the viewer's time zone. */
export function dayFromToday(days: number, today = new Date()) {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A demo secret in the production format's shape; it opens nothing. */
export function demoTokenSecret(random: () => number = Math.random) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return `tdp_${Array.from({ length: 40 }, () => alphabet[Math.floor(random() * alphabet.length)]).join('')}`;
}
