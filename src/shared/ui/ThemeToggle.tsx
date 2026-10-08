import { useI18n } from "../i18n/I18nProvider";
import { Moon, Sun } from "lucide-react";
import { DropdownMenuItem } from "./ui/dropdown-menu";

export type Theme = "light" | "dark";

type ThemeToggleProps = {
  onToggle: () => void;
  theme: Theme;
};

export function ThemeToggle({ onToggle, theme }: ThemeToggleProps) {
  const { t } = useI18n();
  const label = theme === "light" ? t('theme.dark') : t('theme.light');
  const Icon = theme === "light" ? Moon : Sun;

  return <DropdownMenuItem aria-label={label} onClick={onToggle} title={label}>
    <Icon aria-hidden="true" />
    <span>{label}</span>
  </DropdownMenuItem>;
}
