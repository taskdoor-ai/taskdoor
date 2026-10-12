import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Check } from "lucide-react";
import type { TaskIconName, TaskIconTone } from "@/shared/model/task-model";
import { TaskIcon } from "@/features/tasks/components/TaskIcon";
import { taskIconOptions, taskIconToneOptions } from "@/shared/model/appearance-options";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

type TaskAppearancePickerProps = {
  iconName?: TaskIconName;
  onChange: (appearance: { iconName: TaskIconName; iconTone: TaskIconTone }) => void;
  tone?: TaskIconTone;
};

export function TaskAppearancePicker({ iconName = "list-todo", onChange, tone = "neutral" }: TaskAppearancePickerProps) {
  const { locale } = useI18n();
  const [customOpen, setCustomOpen] = useState(false);
  const [hex, setHex] = useState<string>(tone.startsWith("#") ? tone : "#719fff");
  useEffect(() => { if (tone.startsWith("#")) setHex(tone); }, [tone]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<(() => void) | null>(null);
  const flushColor = () => {
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const save = pendingSave.current;
    pendingSave.current = null;
    save?.();
  };
  const cancelPendingColor = () => {
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    pendingSave.current = null;
  };
  useEffect(() => () => {
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    pendingSave.current?.();
    pendingSave.current = null;
  }, []);
  const validHex = /^#[0-9a-f]{6}$/i.test(hex);
  const applyHex = (value: string) => {
    setHex(value);
    cancelPendingColor();
    if (!/^#[0-9a-f]{6}$/i.test(value)) return;
    const color = value.toLowerCase() as TaskIconTone;
    if (color === tone) return;
    pendingSave.current = () => onChange({ iconName, iconTone: color });
    saveTimer.current = setTimeout(flushColor, 180);
  };
  const label = locale === "en" ? "Task icon and color" : "设置任务图标与颜色";
  const englishLabels = ["Default", "Blue", "Green", "Amber", "Orange", "Purple", "Pink", "Olive"];
  return <Popover onOpenChange={open => { if (!open) flushColor(); }}>
    <PopoverTrigger aria-label={label} title={label} className="task-appearance-trigger task-color-trigger" type="button">
      <TaskIcon iconName={iconName} tone={tone} />
    </PopoverTrigger>
    <PopoverContent align="end" aria-label={label} className="task-color-popover" collisionPadding={16}>

      <div className="task-color-options">{taskIconToneOptions.filter(option => option.value !== "neutral").map((option) => {
        const name = locale === "en" ? englishLabels[taskIconToneOptions.findIndex(item => item.value === option.value)] : option.value === "neutral" ? "默认" : option.label;
        return <button aria-label={name} aria-pressed={tone === option.value} key={option.value} title={name} type="button"
          style={{ background: `color-mix(in srgb, var(--ad-tag-${option.value}-ink) 12%, var(--ad-tag-${option.value}-bg))`, color: `var(--ad-tag-${option.value}-ink)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(--ad-tag-${option.value}-ink) 20%, transparent)` }}
          onClick={() => { cancelPendingColor(); onChange({ iconName, iconTone: option.value }); }}>
          {tone === option.value && <Check aria-hidden="true" size={13} />}
        </button>;
      })}
      <button type="button" className="task-custom-color" aria-label={locale === "en" ? "Custom color" : "自定义颜色"} aria-expanded={customOpen} onClick={() => setCustomOpen(value => !value)} />
      </div>
      {customOpen && <div className="task-custom-color-panel">
        <input type="color" aria-label={locale === "en" ? "Color picker" : "取色器"} value={validHex ? hex : "#719fff"} onChange={event => applyHex(event.target.value)} onBlur={flushColor} />
        <label>HEX <input aria-label={locale === "en" ? "HEX color" : "HEX 颜色"} value={hex} spellCheck={false} maxLength={7} aria-invalid={!validHex} onChange={event => applyHex(event.target.value)} onBlur={() => { flushColor(); if (!validHex) setHex(tone.startsWith("#") ? tone : "#719fff"); }} /></label>
      </div>}
      <button type="button" className="task-color-reset" aria-pressed={tone === "neutral"} onClick={() => { cancelPendingColor(); onChange({ iconName, iconTone: "neutral" }); }}>{locale === "en" ? "Default color" : "默认色"}{tone === "neutral" && <Check size={12} aria-hidden="true" />}</button>
      <div className="task-symbol-options">{taskIconOptions.map(option => <button key={option.value} type="button" aria-label={option.label} title={option.label} aria-pressed={iconName === option.value} onClick={() => { const selectedTone = pendingSave.current && validHex ? hex.toLowerCase() as TaskIconTone : tone; cancelPendingColor(); onChange({ iconName: option.value, iconTone: selectedTone }); }}><option.icon size={17} /></button>)}</div>
    </PopoverContent>
  </Popover>;
}
