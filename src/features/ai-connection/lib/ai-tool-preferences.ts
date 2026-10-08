import { aiToolIds, isAiTool, type AiTool } from "./aiTools";

export const aiToolPreferenceKey = "agentdoor:ai-tool-shortcuts:v1";
export type AiToolPreferences = { version: 1; order: AiTool[]; used: AiTool[] };
const empty = (): AiToolPreferences => ({ version: 1, order: [...aiToolIds], used: [] });
const uniqueIds = (value: unknown): AiTool[] => Array.isArray(value) ? [...new Set(value.map(id => id === "CodeBuddy" ? "WorkBuddy" : id).filter(isAiTool))] : [];

export function parseAiToolPreferences(raw: string | null): AiToolPreferences {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || value.version !== 1) return empty();
    const order = uniqueIds(value.order);
    return { version: 1, order: [...order, ...aiToolIds.filter(id => !order.includes(id))], used: uniqueIds(value.used) };
  } catch { return empty(); }
}

export function defaultAiTool(preferences: AiToolPreferences): AiTool | null {
  return preferences.used.length ? preferences.order[0] : null;
}

type StorageAccess = {
  read: () => string | null;
  write: (value: string) => void;
  listen?: (changed: (value: string | null) => void) => () => void;
};

/** Preferences contain only tool IDs. A launch attempt is never a connection receipt. */
export function createAiToolPreferenceStore(access?: StorageAccess) {
  let state = empty();
  let loaded = false;
  let stopListening: (() => void) | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: AiToolPreferences, persist: boolean) => {
    if (JSON.stringify(state) === JSON.stringify(next)) return;
    state = next;
    if (persist) { try { access?.write(JSON.stringify(state)); } catch { /* Keep this session usable with memory preferences. */ } }
    listeners.forEach(listener => listener());
  };
  const getSnapshot = () => {
    if (!loaded) {
      loaded = true;
      try { state = parseAiToolPreferences(access?.read() ?? null); } catch { /* Storage may be disabled. */ }
    }
    return state;
  };
  return {
    getSnapshot,
    subscribe(listener: () => void) {
      getSnapshot();
      listeners.add(listener);
      if (!stopListening) stopListening = access?.listen?.(raw => publish(parseAiToolPreferences(raw), false));
      return () => { listeners.delete(listener); if (!listeners.size) { stopListening?.(); stopListening = undefined; } };
    },
    recordAttempt(agent: AiTool, status: string) {
      if (status !== "open-attempted" || !isAiTool(agent)) return;
      const current = getSnapshot();
      publish({ version: 1, used: [agent, ...current.used.filter(id => id !== agent)], order: [agent, ...current.order.filter(id => id !== agent)] }, true);
    },
  };
}

export type AiToolPreferenceStore = ReturnType<typeof createAiToolPreferenceStore>;
/** Explicit development-only presentation mode; never reads or writes real tool preferences. */
export const isAiToolPreview = Boolean(import.meta.env?.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("aiToolPreview") === "codex");
export const aiToolPreferences = createAiToolPreferenceStore(isAiToolPreview ? undefined : {
  read: () => typeof window === "undefined" ? null : window.localStorage.getItem(aiToolPreferenceKey),
  write: value => { if (typeof window !== "undefined") window.localStorage.setItem(aiToolPreferenceKey, value); },
  listen: changed => {
    if (typeof window === "undefined") return () => {};
    const handler = (event: StorageEvent) => {
      if (event.key !== null && event.key !== aiToolPreferenceKey) return;
      // Ignore sessionStorage and unrelated storage events.
      try { if (event.storageArea && event.storageArea !== window.localStorage) return; } catch { return; }
      changed(event.key === null ? null : event.newValue);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
});

if (isAiToolPreview) aiToolPreferences.recordAttempt("ChatGPT", "open-attempted");
