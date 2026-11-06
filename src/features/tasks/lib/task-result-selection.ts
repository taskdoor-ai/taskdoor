/** Only an explicit task click opens details; a missing selection returns to the list. */
export function taskResultSelection(ids: readonly string[], current: string | null): string | null {
  return current && ids.includes(current) ? current : null;
}
