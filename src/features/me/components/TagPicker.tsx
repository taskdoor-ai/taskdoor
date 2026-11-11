import { useGlobalUi } from "@/shared/i18n/global-ui";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Check, Plus, Search, Settings2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import type { TagAppearance, TagDefinition, TaskTagSuggestions } from "@/shared/model/task-model";
import { getTagDisplayName, TagBadge } from "@/shared/ui/TagBadge";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { usePersonalTags } from "@/features/me/components/PersonalTags";

type Props = {
  iconOnly?: boolean;
  tags: TagDefinition[];
  onChange: (names: string[]) => void;
  selected: string[];
  triggerLabel?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  suggestions?: TaskTagSuggestions;
  onCreateAndSelect?: (name: string, appearance?: TagAppearance) => void;
};

const tagNameKey = (name: string) => name.trim().normalize("NFKC").toLowerCase();

export function TagPicker({ onChange, selected, tags, triggerLabel, onCreateAndSelect, suggestions, allowCreate = true, disabled = false, iconOnly = false }: Props) {
  const ui = useGlobalUi();
  const d = useDetailCopy();
  const { locale } = useI18n();
  const teamTags = usePersonalTags();
  const availableTags = teamTags?.tags ?? tags;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const selectedNames = new Set(selected);
  const selectedNameKeys = new Set(selected.map(tagNameKey));
  const query = tagNameKey(search);
  const nameKeys = (tag: TagDefinition) => [tagNameKey(tag.name), tagNameKey(getTagDisplayName(locale, tag))];
  const existingMatch = query ? availableTags.find(tag => nameKeys(tag).includes(query)) : undefined;
  const recommendedNames = new Set(suggestions?.existing);
  const matchingTags = query
    ? availableTags.filter(tag => nameKeys(tag).some(name => name.includes(query)))
    : [...availableTags].sort((a, b) => Number(recommendedNames.has(b.name)) - Number(recommendedNames.has(a.name)));
  const canCreate = allowCreate && !disabled && teamTags?.canCreate !== false && Boolean(onCreateAndSelect);
  const canCreateName = (name: string) => {
    if (!canCreate || !name || name.length > 24) return false;
    const key = tagNameKey(name);
    return !selectedNameKeys.has(key) && !availableTags.some(tag => nameKeys(tag).includes(key));
  };
  const newName = search.trim();
  const customName = canCreateName(newName) ? newName : undefined;
  const proposedName = suggestions?.proposed?.trim() ?? "";
  const proposed = canCreateName(proposedName) ? proposedName : undefined;
  const emptyMessage = query
    ? canCreate && newName.length > 24 ? "标签名称须为 1–24 个字符。" : "没有匹配的标签"
    : canCreate ? "输入名称即可新建团队标签" : "还没有标签";
  const hasSuggestion = !disabled && (Boolean(proposed) || availableTags.some(tag => recommendedNames.has(tag.name) && !selectedNames.has(tag.name)));

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSearch("");
      setError("");
    }
  };

  const toggleTag = (name: string) => {
    if (disabled) return;
    try {
      onChange(selectedNames.has(name) ? selected.filter(item => item !== name) : [...selected, name]);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "标签未能保存，请重试。");
    }
  };

  const createTag = (name: string, appearance?: TagAppearance) => {
    if (!canCreate || !onCreateAndSelect) return;
    try {
      onCreateAndSelect(name, appearance);
      changeOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "标签未能保存，请重试。");
    }
  };

  const triggerClass = hasSuggestion ? " tag-picker-trigger-suggestion" : iconOnly ? " tag-picker-trigger-icon-only" : "";
  return <Popover open={open} onOpenChange={changeOpen}>
    <PopoverTrigger aria-label={hasSuggestion ? ui("AI 建议标签") : triggerLabel ?? d("addTags")} className={`tag-picker-trigger${triggerClass}`} disabled={disabled} ref={trigger} type="button">
      {hasSuggestion ? <><Sparkles aria-hidden="true" /><span>{ui("AI 建议")}</span></> : <><Plus aria-hidden="true" />{!iconOnly && <span>{triggerLabel ?? d("append")}</span>}</>}
    </PopoverTrigger>
    <PopoverContent aria-label={ui("选择标签")} className="tag-picker-popover" collisionPadding={12}>
      <div className="tag-picker-search">
        <Input aria-label={ui("搜索标签")} placeholder={ui(canCreate ? "搜索或新建标签" : "搜索标签")} leadingIcon={<Search />} value={search} onChange={event => {
          setSearch(event.target.value);
          setError("");
        }} onKeyDown={event => {
          if (event.key !== "Enter") return;
          event.stopPropagation();
          if (event.nativeEvent.isComposing) return;
          event.preventDefault();
          if (existingMatch && !selectedNames.has(existingMatch.name)) toggleTag(existingMatch.name);
          if (customName) createTag(customName);
        }} />
      </div>
      {error && <p className="tag-editor-field-error tag-picker-error" role="alert">{ui(error)}</p>}
      <div aria-label={ui("可选标签")} className="tag-picker-options" role="group">
        {!query && proposed && <button className="tag-picker-create" onClick={() => createTag(proposed, suggestions?.appearance)} type="button">
          {suggestions?.appearance ? <TagBadge tag={{ id: proposed, name: proposed, ...suggestions.appearance }} size="sm" renderName={name => <span>{ui("新建并添加「{0}」", { 0: name })}</span>} /> : <><Sparkles aria-hidden="true" /><span>{ui("新建并添加「{0}」", { 0: proposed })}</span></>}
          <small>{ui("AI 建议")}</small>
        </button>}
        {matchingTags.map(tag => {
          const checked = selectedNames.has(tag.name);
          return <button aria-pressed={checked} className="tag-picker-option" disabled={disabled} key={tag.id} onClick={() => toggleTag(tag.name)} type="button">
            <TagBadge size="sm" tag={tag} />
            {!checked && recommendedNames.has(tag.name) && <small>{ui("AI 建议")}</small>}
            <span aria-hidden="true" className="tag-picker-option-check">{checked && <Check />}</span>
          </button>;
        })}
        {customName && <button aria-label={ui("新建并添加「{0}」", { 0: customName })} className="tag-picker-create" onClick={() => createTag(customName)} type="button">
          <Plus aria-hidden="true" /><span>{ui("新建并添加「{0}」", { 0: customName })}</span>
        </button>}
        {!matchingTags.length && !customName && (query || !proposed) && <p className="tag-picker-empty" role="status">{ui(emptyMessage)}</p>}
      </div>
      {teamTags && allowCreate && <footer className="tag-picker-footer"><button className="tag-picker-manage" onClick={() => { changeOpen(false); teamTags.onManage(trigger.current); }} type="button"><Settings2 aria-hidden="true" /><span>{ui(teamTags.canManage ? "管理团队标签" : "团队标签")}</span></button></footer>}
    </PopoverContent>
  </Popover>;
}
