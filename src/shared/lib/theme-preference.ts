import type { Theme } from "@/shared/ui/ThemeToggle";

/** The Demo's theme preference: "light" or "dark", stored as plain text; anything else reads as light. */
export const THEME_STORAGE_KEY = "agentdoor-theme";

export function readThemePreference(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}
