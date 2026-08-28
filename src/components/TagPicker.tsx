import { Check, ChevronDown } from "lucide-react";
import type { TagDefinition } from "../data/tagGroups";
import { TagBadge } from "./TagBadge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type Props = {
  tags: TagDefinition[];
  onChange: (names: string[]) => void;
  selected: string[];
};

export function TagPicker({ onChange, selected, tags }: Props) {
  const selectedNames = new Set(selected);
  const toggleTag = (name: string) => {
    onChange(selectedNames.has(name) ? selected.filter((item) => item !== name) : [...selected, name]);
  };

  return <Popover>
    <PopoverTrigger aria-label="添加标签" className="tag-picker-trigger" disabled={!tags.length} type="button">
      添加标签<ChevronDown aria-hidden="true" />
    </PopoverTrigger>
    <PopoverContent aria-label="选择标签" className="tag-picker-popover">
      <div aria-label="可选标签" className="tag-picker-options" role="group">
        {tags.map((tag) => {
          const checked = selectedNames.has(tag.name);
          return <button aria-pressed={checked} className="tag-picker-option" key={tag.id} onClick={() => toggleTag(tag.name)} type="button">
            <TagBadge size="sm" tag={tag} />
            <span aria-hidden="true" className="tag-picker-option-check">{checked && <Check />}</span>
          </button>;
        })}
      </div>
    </PopoverContent>
  </Popover>;
}
