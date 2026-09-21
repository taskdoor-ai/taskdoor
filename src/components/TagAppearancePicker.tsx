import { useGlobalUi } from "../i18n/globalUi";
import type { TagColorName, TagDefinition, TagIconName } from "../data/tagGroups";
import { TagBadge, tagColorOptions, tagIconOptions } from "./TagBadge";
import { AppearancePicker } from "./AppearancePicker";

type Props = {
  color: TagColorName;
  icon: TagIconName;
  previewTag: TagDefinition;
  onColorChange: (color: TagColorName) => void;
  onIconChange: (icon: TagIconName) => void;
};

export function TagAppearancePicker({ color, icon, onColorChange, onIconChange, previewTag }: Props) {
  const ui = useGlobalUi();
  return <AppearancePicker
    color={color} icon={icon}
    colorOptions={tagColorOptions.map(option => ({ value: option.name, label: option.label, color: option.name }))}
    iconOptions={tagIconOptions.map(option => ({ value: option.name, label: option.label, icon: option.icon }))}
    onColorChange={onColorChange} onIconChange={onIconChange}
    preview={<TagBadge tag={previewTag} />} previewNote={ui("任务、列表与筛选中保持一致")}
  />;
}
