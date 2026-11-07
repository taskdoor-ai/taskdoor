import { useI18n } from "@/shared/i18n/I18nProvider";
import type { TagColorName, TagDefinition, TagIconName } from "@/shared/model/task-model";
import { TagBadge, tagColorOptions, tagIconOptions } from "@/shared/ui/TagBadge";
import { AppearancePicker } from "@/shared/ui/AppearancePicker";

type Props = {
  color: TagColorName;
  icon: TagIconName;
  previewTag?: TagDefinition;
  onColorChange: (color: TagColorName) => void;
  onIconChange: (icon: TagIconName) => void;
};

export function TagAppearancePicker({ color, icon, onColorChange, onIconChange, previewTag }: Props) {
  const { locale } = useI18n();
  return <AppearancePicker
    color={color} icon={icon}
    colorOptions={tagColorOptions.map(option => ({ value: option.name, label: locale === "en" ? option.name : option.label, color: option.name }))}
    iconOptions={tagIconOptions.map(option => ({ value: option.name, label: locale === "en" ? option.name : option.label, icon: option.icon }))}
    onColorChange={onColorChange} onIconChange={onIconChange}
    preview={previewTag && <TagBadge size="sm" tag={previewTag} />} showHints={false}
  />;
}
