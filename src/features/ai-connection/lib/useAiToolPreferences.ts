import { useSyncExternalStore } from "react";
import { aiToolPreferences, type AiToolPreferenceStore } from "./aiToolPreferences";

export function useAiToolPreferences(store: AiToolPreferenceStore = aiToolPreferences) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
