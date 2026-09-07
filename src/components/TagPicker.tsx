import { Check, Plus, Settings2 } from "lucide-react";
import { useRef, useState } from "react";
import type { TagDefinition } from "../data/tagGroups";
import { TagBadge } from "./TagBadge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { usePersonalTags } from "./PersonalTags";

type Props = {
  tags: TagDefinition[];
  onChange: (names: string[]) => void;
  selected: string[];
};

export function TagPicker({ onChange, selected, tags }: Props) {
  const personalTags = usePersonalTags();
  const availableTags = personalTags?.tags ?? tags;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const selectedNames = new Set(selected);
  const toggleTag = (name: string) => {
    onChange(selectedNames.has(name) ? selected.filter((item) => item !== name) : [...selected, name]);
  };

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger aria-label="添加标签" className="tag-picker-trigger" ref={trigger} type="button">
      <Plus aria-hidden="true" /><span>添加</span>
    </PopoverTrigger>
    <PopoverContent aria-label="选择标签" className="tag-picker-popover">
      <div aria-label="可选标签" className="tag-picker-options" role="group">
        {!availableTags.length && <p className="tag-picker-empty">还没有个人标签，可在「我的标签」中新建。</p>}
        {availableTags.map((tag) => {
          const checked = selectedNames.has(tag.name);
          return <button aria-pressed={checked} className="tag-picker-option" key={tag.id} onClick={() => toggleTag(tag.name)} type="button">
            <TagBadge size="sm" tag={tag} />
            <span aria-hidden="true" className="tag-picker-option-check">{checked && <Check />}</span>
          </button>;
        })}
      </div>
      {personalTags && <footer className="tag-picker-footer"><button className="tag-picker-manage" onClick={() => { setOpen(false); personalTags.onManage(trigger.current); }} type="button"><Settings2 aria-hidden="true" /><span>我的标签</span></button></footer>}
    </PopoverContent>
  </Popover>;
}
