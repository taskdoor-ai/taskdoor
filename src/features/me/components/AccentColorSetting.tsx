import { useId, useState } from "react";
import { Palette } from "lucide-react";
import { DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator } from "@/shared/ui/dropdown-menu";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { toast } from "@/shared/ui/toast";
import { getAccentTextColor } from "@/features/me/lib/accent-color";

const colors = ["#4b6edf", "#7c3aed", "#c0266b", "#b45309", "#047857", "#087e8b"];
const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
const key = "taskdoor-accent-color";
export function applySavedAccentColor() {
  try {
    const value = localStorage.getItem(key);
    if (value && isHexColor(value)) apply(value);
  } catch { /* Default palette remains usable when storage is unavailable. */ }
}
function apply(value: string) {
  const style = document.documentElement.style;
  // Personal accent marks primary actions and inline references; ordinary controls stay neutral.
  for (const token of ["route", "route-ink", "route-hover", "route-active", "route-soft", "route-soft-hover", "route-border", "focus", "focus-soft", "action-ink", "button-soft-ink", "button-soft-bg", "button-soft-hover-bg"]) {
    style.removeProperty(`--ad-${token}`);
  }
  style.setProperty("--ad-button-primary-bg", value);
  style.setProperty("--ad-accent-ink-light", getAccentTextColor(value, "#f3f3f3"));
  style.setProperty("--ad-accent-ink-dark", getAccentTextColor(value, "#303030"));
  // Mix with theme surfaces so the same saved accent works in light and dark mode.
  style.setProperty("--ad-button-primary-hover-bg", `color-mix(in srgb, ${value} 88%, #000)`);
  style.setProperty("--ad-button-primary-active-bg", `color-mix(in srgb, ${value} 76%, #000)`);
  style.setProperty("--ad-button-primary-border", `color-mix(in srgb, ${value} 45%, var(--ad-surface))`);
  style.setProperty("--ad-button-focus", value);
  style.setProperty("--ad-button-focus-soft", `color-mix(in srgb, ${value} 16%, var(--ad-surface))`);
  const foreground = (factor: number) => {
    const channels = [1, 3, 5].map((offset) => {
      const channel = parseInt(value.slice(offset, offset + 2), 16) * factor / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    // Keep white on saturated action colors when it meets 4.5:1 contrast.
    return 1.05 / (luminance + 0.05) >= 4.5 ? "#fff" : "#000";
  };
  style.setProperty("--ad-button-primary-ink", foreground(1));
  style.setProperty("--ad-button-primary-hover-ink", foreground(0.88));
  style.setProperty("--ad-button-primary-active-ink", foreground(0.76));
}
export function AccentColorSetting() {
  const { locale } = useI18n();
  const hintId = useId();
  const [selected, setSelected] = useState(() => { try { const value = localStorage.getItem(key); return value && isHexColor(value) ? value.toLowerCase() : colors[0]; } catch { return colors[0]; } });
  const [draft, setDraft] = useState(selected);
  const valid = isHexColor(draft.trim());
  const save = (color: string) => {
    if (!isHexColor(color)) return;
    const normalized = color.toLowerCase();
    try { localStorage.setItem(key, normalized); apply(normalized); setSelected(normalized); setDraft(normalized); }
    catch { toast.error(locale === "en" ? "Could not save color." : "强调色保存失败，请重试。"); }
  };
  const names = locale === "en" ? ["Blue", "Purple", "Pink", "Amber", "Green", "Teal"] : ["蓝色", "紫色", "粉色", "琥珀色", "绿色", "青色"];
  const label = locale === "en" ? "Accent color" : "强调色";
  return <DropdownMenuSub>
    <DropdownMenuSubTrigger><Palette aria-hidden="true" /><span>{label}</span></DropdownMenuSubTrigger>
    <DropdownMenuSubContent align="end" alignOffset={3} aria-label={label} className="min-w-[136px]">
      <DropdownMenuRadioGroup value={selected} onValueChange={save}>
        {colors.map((color, index) => <DropdownMenuRadioItem key={color} value={color} className="min-h-[34px]" closeOnClick>
          <span aria-hidden="true" style={{ width: 14, height: 14, flexShrink: 0, borderRadius: "50%", background: color }} />
          <span>{names[index]}</span>
        </DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="min-h-[34px]" onClick={() => setDraft(selected)}>
          <span>{locale === "en" ? "Custom" : "自定义"}</span>
          {!colors.includes(selected) && <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: "50%", background: selected }} />}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent align="end" alignOffset={3} aria-label={locale === "en" ? "Custom accent color" : "自定义强调色"}>
          <form className="grid w-56 gap-3 p-2" onKeyDown={(event) => { if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation(); }} onSubmit={(event) => { event.preventDefault(); if (valid) save(draft.trim()); }}>
            <label className="grid gap-2 text-sm">
              <span>{locale === "en" ? "Choose color" : "选择颜色"}</span>
              <input className="h-10 w-full cursor-pointer" type="color" value={valid ? draft.trim() : selected} onChange={(event) => setDraft(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm">
              <span>HEX</span>
              <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="#4b6edf" spellCheck={false} aria-invalid={!valid} aria-describedby={hintId} />
            </label>
            <p id={hintId} className="text-xs text-muted-foreground">{locale === "en" ? "Enter # followed by 6 hexadecimal digits." : "输入 # 加 6 位十六进制色值。"}</p>
            <Button type="submit" disabled={!valid || draft.trim().toLowerCase() === selected}>{locale === "en" ? "Apply" : "应用"}</Button>
          </form>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuSubContent>
  </DropdownMenuSub>;
}
