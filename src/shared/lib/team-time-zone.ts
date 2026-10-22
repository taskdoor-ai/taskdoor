import { getDateTimeFormatter } from "@/shared/lib/date-time-format";

/** Teams saved before timezone metadata keep the demo's original calendar. */
export const LEGACY_TEAM_TIME_ZONE = "Asia/Shanghai";

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try { getDateTimeFormatter("en-US", { timeZone: value }); return true; }
  catch { return false; }
}

export function detectBrowserTimeZone(): { timeZone: string; fallback: boolean } {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (isValidTimeZone(timeZone)) return { timeZone, fallback: false };
  } catch { /* Detection failure is distinct from a saved legacy team. */ }
  return { timeZone: "UTC", fallback: true };
}

export function getTeamTimeZone(team?: { timezone?: string }): string {
  return team?.timezone ?? LEGACY_TEAM_TIME_ZONE;
}
