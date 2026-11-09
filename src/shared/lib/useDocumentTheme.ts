import { useEffect } from "react";
import { applyTheme, readThemePreference, THEME_STORAGE_KEY } from "@/shared/lib/theme-preference";

/**
 * Keeps <html data-theme> on the stored preference on every route, the onboarding pages and the
 * loading fallback included, and follows a change made in another tab. The workspace still
 * changes the preference itself; public/theme-boot.js sets it before first paint.
 */
export function useDocumentTheme() {
  useEffect(() => {
    applyTheme(readThemePreference());
    const sync = (event: StorageEvent) => { if (event.key === THEME_STORAGE_KEY || event.key === null) applyTheme(readThemePreference()); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
}
