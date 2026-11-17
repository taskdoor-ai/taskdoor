/** Legacy display labels are not timestamps; reject impossible calendar dates too. */
export function taskFileTimestamp(value: string | undefined): number | null {
  if (typeof value !== "string") return null;
  const date = value.match(/^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/);
  if (!date) return null;
  const year = Number(date[1]), month = Number(date[2]), day = Number(date[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const timestamp = Date.parse(value);
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && Number.isFinite(timestamp) ? timestamp : null;
}
