import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { Check, Plus, Settings2 } from "lucide-react";
import { useRef, useState } from "react";
import type { TagDefinition } from "@/ai/mock/data/tagGroups";
import { TagBadge } from "@/shared/ui/TagBadge";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { usePersonalTags } from "@/features/me/components/PersonalTags";

type Props = {
  iconOnly?: boolean;
  tags: TagDefinition[];
  onChange: (names: string[]) => void;
  selected: string[];
  triggerLabel?: string;
  disabled?: boolean;
};

export function TagPicker({ onChange, selected, tags, triggerLabel, disabled = false, iconOnly = false }: Props) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const personalTags = usePersonalTags();
  const availableTags = personalTags?.tags ?? tags;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const selectedNames = new Set(selected);
  const toggleTag = (name: string) => {
    if (disabled) return;
    onChange(selectedNames.has(name) ? selected.filter((item) => item !== name) : [...selected, name]);
  };

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger aria-label={d('addTags')} className={`tag-picker-trigger${iconOnly ? " tag-picker-trigger-icon-only" : ""}`} disabled={disabled} ref={trigger} type="button">
      <Plus aria-hidden="true" />{!iconOnly && <span>{triggerLabel ?? d('append')}</span>}
    </PopoverTrigger>
    <PopoverContent aria-label={ui("选择标签")} className="tag-picker-popover">
      <div aria-label={ui("可选标签")} className="tag-picker-options" role="group">
        {!availableTags.length && <p className="tag-picker-empty">{ui("还没有个人标签，可在「我的标签」中新建。")}</p>}
        {availableTags.map((tag) => {
          const checked = selectedNames.has(tag.name);
          return <button aria-pressed={checked} className="tag-picker-option" key={tag.id} onClick={() => toggleTag(tag.name)} type="button">
            <TagBadge size="sm" tag={tag} />
            <span aria-hidden="true" className="tag-picker-option-check">{checked && <Check />}</span>
          </button>;
        })}
      </div>
      {personalTags && <footer className="tag-picker-footer"><button className="tag-picker-manage" onClick={() => { setOpen(false); personalTags.onManage(trigger.current); }} type="button"><Settings2 aria-hidden="true" /><span>{ui("我的标签")}</span></button></footer>}
    </PopoverContent>
  </Popover>;
}
