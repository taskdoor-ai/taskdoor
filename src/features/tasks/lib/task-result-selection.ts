/** Retain the current matching task; otherwise fall back to the first displayed result. */
export function taskResultSelection(ids: readonly string[], current: string | null): string | null {
  if (!ids.length) return null;
  return current && ids.includes(current) ? current : ids[0];
}
