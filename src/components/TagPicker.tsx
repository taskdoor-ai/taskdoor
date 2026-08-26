import { Panel as CascaderPanel, type DefaultOptionType } from "@rc-component/cascader";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import type { TagDefinition, TagGroup } from "../data/tagGroups";
import { TagBadge } from "./TagBadge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type Props = {
  groups: TagGroup[];
  onChange: (names: string[]) => void;
  selected: string[];
};

type TagCascaderOption = DefaultOptionType & {
  children?: TagCascaderOption[];
  label: string;
  tag?: TagDefinition;
  value: string;
};

export function TagPicker({ groups, onChange, selected }: Props) {
  const availableGroups = useMemo(() => groups.filter((group) => group.tags.length > 0), [groups]);
  const options = useMemo<TagCascaderOption[]>(() => availableGroups.map((group) => ({
    children: group.tags.map((tag) => ({ label: tag.name, tag, value: tag.id })),
    disableCheckbox: true,
    label: group.name,
    value: group.id,
  })), [availableGroups]);

  const selectedPaths = useMemo(() => availableGroups.flatMap((group) => group.tags
    .filter((tag) => selected.includes(tag.name))
    .map((tag) => [group.id, tag.id])), [availableGroups, selected]);

  const knownTagNames = useMemo(() => new Set(availableGroups.flatMap((group) => group.tags.map((tag) => tag.name))), [availableGroups]);

  const handleChange = (_paths: string[][], selectedOptions: TagCascaderOption[][]) => {
    const retainedNames = selected.filter((name) => !knownTagNames.has(name));
    const chosenNames = selectedOptions.flatMap((path) => {
      const tag = path.at(-1)?.tag;
      return tag ? [tag.name] : [];
    });
    const chosenNameSet = new Set(chosenNames);
    const retainedSelectedNames = selected.filter((name) => knownTagNames.has(name) && chosenNameSet.has(name));
    const addedNames = chosenNames.filter((name) => !selected.includes(name));
    onChange([...retainedNames, ...retainedSelectedNames, ...addedNames]);
  };

  return <Popover>
    <PopoverTrigger aria-label="添加标签" className="tag-picker-trigger" disabled={!availableGroups.length} type="button">
      添加标签<ChevronDown aria-hidden="true" />
    </PopoverTrigger>
    <PopoverContent aria-label="选择标签" className="tag-cascader-popover">
      <CascaderPanel<TagCascaderOption, "value", true>
        checkable
        checkStrictly
        expandIcon={<ChevronRight aria-hidden="true" />}
        expandTrigger="click"
        notFoundContent="暂无标签"
        onChange={handleChange}
        optionRender={(option) => option.tag ? <TagBadge size="sm" tag={option.tag} /> : option.label}
        options={options}
        prefixCls="ad-tag-cascader"
        value={selectedPaths}
      />
    </PopoverContent>
  </Popover>;
}
