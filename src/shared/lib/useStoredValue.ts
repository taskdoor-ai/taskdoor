import { useCallback, useSyncExternalStore } from "react";

const STORED_VALUE_CHANGED = "agentdoor-stored-value-changed";
const cache = new Map<string, { raw: string | null; value: unknown }>();

function readRaw(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function subscribe(onChange: () => void) {
  window.addEventListener(STORED_VALUE_CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(STORED_VALUE_CHANGED, onChange); window.removeEventListener("storage", onChange); };
}

/**
 * A value kept in localStorage under `key`, shared by every component that reads the same key and
 * updated across tabs. `parse` turns the stored text (null when absent) into the value.
 * `write` returns false when the browser refuses to store it.
 */
export function useStoredValue<T>(key: string, parse: (raw: string | null) => T) {
  const read = () => {
    const raw = readRaw(key);
    const cached = cache.get(key);
    if (cached && cached.raw === raw) return cached.value as T;
    const value = parse(raw);
    cache.set(key, { raw, value });
    return value;
  };
  const value = useSyncExternalStore(subscribe, read, read);
  const write = useCallback((update: (current: T) => T) => {
    const raw = readRaw(key);
    const current = cache.get(key)?.raw === raw ? cache.get(key)!.value as T : parse(raw);
    try { window.localStorage.setItem(key, JSON.stringify(update(current))); }
    catch { return false; }
    window.dispatchEvent(new Event(STORED_VALUE_CHANGED));
    return true;
  }, [key, parse]);
  return [value, write] as const;
}
