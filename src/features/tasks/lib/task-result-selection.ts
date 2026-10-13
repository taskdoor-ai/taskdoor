/** Scope changes start at the first result; other filters retain a matching selection. */
export function taskResultSelection(ids: readonly string[], current: string | null, scopeChanged: boolean): string | null {
  if (!ids.length) return null;
  return scopeChanged || !current || !ids.includes(current) ? ids[0] : current;
}
