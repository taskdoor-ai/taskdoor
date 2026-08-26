import { Check } from "lucide-react";
import type { TagColorName, TagDefinition, TagIconName } from "../data/tagGroups";
import { TagBadge, tagColorOptions, tagIconOptions } from "./TagBadge";

type Props = {
  color: TagColorName;
  icon: TagIconName;
  previewTag: TagDefinition;
  onColorChange: (color: TagColorName) => void;
  onIconChange: (icon: TagIconName) => void;
};

export function TagAppearancePicker({ color, icon, onColorChange, onIconChange, previewTag }: Props) {
  const selectedColor = tagColorOptions.find((option) => option.name === color)?.label;

  return <div className="tag-appearance-picker">
    <div className="tag-editor-preview-stage" data-color={color}>
      <span className="tag-editor-preview-label">实时预览</span>
      <TagBadge tag={previewTag} />
      <span className="tag-editor-preview-note">任务、列表与筛选中保持一致</span>
    </div>

    <fieldset className="tag-editor-section">
      <legend><span>图标</span><small>选择一个易于识别的符号</small></legend>
      <div className="tag-icon-grid">{tagIconOptions.map((option) => {
        const Icon = option.icon;
        return <button className="tag-icon-option" aria-label={option.label} aria-pressed={icon === option.name} key={option.name} onClick={() => onIconChange(option.name)} title={option.label} type="button"><Icon aria-hidden="true" /></button>;
      })}</div>
    </fieldset>

    <fieldset className="tag-editor-section">
      <legend><span>底色</span><small>{selectedColor}</small></legend>
      <div className="tag-color-grid">{tagColorOptions.map((option) => <button className="tag-color-option" aria-label={option.label} aria-pressed={color === option.name} data-color={option.name} key={option.name} onClick={() => onColorChange(option.name)} title={option.label} type="button"><span className="tag-color-swatch">{color === option.name && <Check aria-hidden="true" />}</span></button>)}</div>
    </fieldset>
  </div>;
}
