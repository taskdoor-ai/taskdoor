/** Changed search/filter context starts at the first result; other updates retain selection. */
export function taskResultSelection(ids: readonly string[], current: string | null, contextChanged: boolean): string | null {
  if (!ids.length) return null;
  return contextChanged || !current || !ids.includes(current) ? ids[0] : current;
}
