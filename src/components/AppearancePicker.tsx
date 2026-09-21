import { useRemainingCopy } from "../i18n/remainingMessages";
import { Check, type LucideIcon } from "lucide-react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import type { TagColorName } from "../data/tagGroups";

type Props<Icon extends string, Color extends string> = {
  icon: Icon;
  color: Color;
  iconOptions: Array<{ value: Icon; label: string; icon: LucideIcon }>;
  colorOptions: Array<{ value: Color; label: string; color: TagColorName }>;
  onIconChange: (icon: Icon) => void;
  onColorChange: (color: Color) => void;
  preview: ReactNode;
  previewNote: string;
  iconColumns?: number;
  colorColumns?: number;
};

function moveChoice<Value>(event: KeyboardEvent<HTMLButtonElement>, index: number, options: Array<{ value: Value }>, columns: number, onChange: (value: Value) => void) {
  const offset = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[event.key];
  if (offset === undefined && event.key !== "Home" && event.key !== "End") return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + offset! + options.length) % options.length;
  (event.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined)?.focus();
  onChange(options[next].value);
}

export function AppearancePicker<Icon extends string, Color extends string>({ color, icon, iconOptions, colorOptions, onColorChange, onIconChange, preview, previewNote, iconColumns = 6, colorColumns = 5 }: Props<Icon, Color>) {
  const u = useRemainingCopy();
  const selectedColor = colorOptions.find(option => option.value === color);
  return <div className="tag-appearance-picker">
    <div className="tag-editor-preview-stage" data-color={selectedColor?.color ?? "gray"}>
      <span className="tag-editor-preview-label">{u('livePreview')}</span>
      {preview}
      <span className="tag-editor-preview-note">{previewNote}</span>
    </div>
    <fieldset className="tag-editor-section">
      <legend><span>{u('icon')}</span><small>{u('iconHint')}</small></legend>
      <div className="tag-icon-grid" style={{ "--appearance-columns": iconColumns } as CSSProperties}>{iconOptions.map((option, index) => {
        const IconGlyph = option.icon;
        return <button className="tag-icon-option" aria-label={option.label} aria-pressed={icon === option.value} key={option.value} onClick={() => onIconChange(option.value)} onKeyDown={event => moveChoice(event, index, iconOptions, iconColumns, onIconChange)} title={option.label} type="button"><IconGlyph aria-hidden="true" /></button>;
      })}</div>
    </fieldset>
    <fieldset className="tag-editor-section">
      <legend><span>{u('background')}</span><small>{selectedColor?.label}</small></legend>
      <div className="tag-color-grid" style={{ "--appearance-columns": colorColumns } as CSSProperties}>{colorOptions.map((option, index) => <button className="tag-color-option" aria-label={option.label} aria-pressed={color === option.value} data-color={option.color} key={option.value} onClick={() => onColorChange(option.value)} onKeyDown={event => moveChoice(event, index, colorOptions, colorColumns, onColorChange)} title={option.label} type="button"><span className="tag-color-swatch">{color === option.value && <Check aria-hidden="true" />}</span></button>)}</div>
    </fieldset>
  </div>;
}
