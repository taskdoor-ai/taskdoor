import { useSyncExternalStore } from "react";
import { aiToolPreferences, type AiToolPreferenceStore } from "@/features/ai-connection/lib/ai-tool-preferences";

export function useAiToolPreferences(store: AiToolPreferenceStore = aiToolPreferences) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
