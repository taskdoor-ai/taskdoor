/** Coarse display only: preserve the original workload and never round unfinished work to 100. */
export function taskProgressPercent(percent: number | null): 0 | 25 | 50 | 75 | 100 | null {
  if (percent === null || !Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  if (percent === 0 || percent === 100) return percent;
  return Math.min(75, Math.max(25, Math.round(percent / 25) * 25)) as 25 | 50 | 75;
}
