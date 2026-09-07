import { Moon, Sun } from "lucide-react";
import { DropdownMenuItem } from "./ui/dropdown-menu";

export type Theme = "light" | "dark";

type ThemeToggleProps = {
  onToggle: () => void;
  theme: Theme;
};

export function ThemeToggle({ onToggle, theme }: ThemeToggleProps) {
  const label = theme === "light" ? "切换到深色" : "切换到浅色";
  const Icon = theme === "light" ? Moon : Sun;

  return <DropdownMenuItem aria-label={label} onClick={onToggle} title={label}>
    <Icon aria-hidden="true" />
    <span>{label}</span>
  </DropdownMenuItem>;
}
