const FORMATTER_CACHE_LIMIT = 64;
const formatters = new Map<string, Intl.DateTimeFormat>();

function cacheKey(locale: string, options: Intl.DateTimeFormatOptions): string | null {
  const prototype = Object.getPrototypeOf(options);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const descriptors = Object.getOwnPropertyDescriptors(options);
  // Implicit local timezones must follow system changes immediately. Accessors
  // and coercible objects keep Intl's native reads rather than being read twice.
  if (typeof descriptors.timeZone?.value !== "string") return null;
  const entries: Array<[string, unknown]> = [];
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!("value" in descriptor)) return null;
    const value: unknown = descriptor.value;
    if (value !== null && !["undefined", "string", "boolean", "number"].includes(typeof value)) return null;
    if (value !== undefined) entries.push([key, value]);
  }
  entries.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return JSON.stringify([locale, entries]);
}

/** Reuse complete explicit-timezone formats without fixing a local default. */
export function getDateTimeFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = cacheKey(locale, options);
  if (key === null) return new Intl.DateTimeFormat(locale, options);
  const cached = formatters.get(key);
  if (cached) {
    formatters.delete(key);
    formatters.set(key, cached);
    return cached;
  }
  const formatter = new Intl.DateTimeFormat(locale, options);
  formatters.set(key, formatter);
  if (formatters.size > FORMATTER_CACHE_LIMIT) formatters.delete(formatters.keys().next().value!);
  return formatter;
}
