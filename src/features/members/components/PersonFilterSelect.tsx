import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { cn } from "@/shared/lib/utils";
import { useResponsiveControlSize } from "@/shared/lib/useResponsiveControlSize";
import type { PersonOption } from "@/shared/model/task-model";
import { PersonAvatar, usePersonLabels } from "@/shared/ui/PersonAvatar";
import { selectTriggerClassName } from "@/shared/ui/select";
import "@/features/members/styles/person-filter.css";

type PersonFilterSelectProps = {
  align?: "end" | "start";
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  emptyLabel?: string;
  members: PersonOption[];
  menuLabel?: string;
  onChange: (personId: string) => void;
  scopeOption: { id: string; label: string };
  searchPlaceholder?: string;
  size?: "default" | "sm" | "touch";
  value: string;
};

/** A compact single-person filter; member assignment remains in PersonPicker. */
export function PersonFilterSelect({ align = "start", ariaLabel, className, disabled = false, emptyLabel, members, menuLabel, onChange, scopeOption, searchPlaceholder, size, value }: PersonFilterSelectProps) {
  const d = useDetailCopy();
  const labels = usePersonLabels();
  const responsiveSize = useResponsiveControlSize();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const allPeople = useMemo<PersonOption>(() => ({ id: scopeOption.id, name: scopeOption.label, email: "", role: "" }), [scopeOption.id, scopeOption.label]);
  const items = useMemo(() => [allPeople, ...members.filter(person => person.id !== allPeople.id)], [allPeople, members]);
  const selected = items.find(person => person.id === value) ?? allPeople;
  const optionLabel = (person: PersonOption) => person.id === allPeople.id ? allPeople.name : labels.name(person);
  const searchLabel = searchPlaceholder ?? d("searchMembers");

  return <Combobox.Root<PersonOption>
    autoHighlight
    filter={(person, keyword) => (person.id === allPeople.id ? person.name : labels.searchText(person)).toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase())}
    inputValue={query}
    isItemEqualToValue={(person, selectedPerson) => person.id === selectedPerson.id}
    itemToStringLabel={optionLabel}
    itemToStringValue={person => person.id}
    items={items}
    onInputValueChange={setQuery}
    onOpenChange={setOpen}
    onOpenChangeComplete={nextOpen => { if (!nextOpen) setQuery(""); }}
    onValueChange={person => { if (person) { onChange(person.id); setOpen(false); } }}
    open={open}
    value={selected}
  >
    <Combobox.Trigger aria-label={ariaLabel} className={cn(selectTriggerClassName, "workspace-filter-control person-filter-trigger text-(--ad-ink)", className)} data-size={size ?? responsiveSize} disabled={disabled}>
      {selected.id !== allPeople.id && <PersonAvatar name={selected.name} profile={selected} profilePreviewFocusable={false} showProfilePreview={false} size="xs" />}
      <span className="min-w-0 flex-1 truncate text-left">{optionLabel(selected)}</span>
      <Combobox.Icon className="shrink-0 text-muted-foreground"><ChevronDown aria-hidden="true" size={16} /></Combobox.Icon>
    </Combobox.Trigger>
    <Combobox.Portal>
      <Combobox.Positioner align={align} className="isolate z-100" collisionPadding={12} sideOffset={4}>
        <Combobox.Popup aria-label={menuLabel ?? ariaLabel} className="person-filter-popup">
          <div className="person-filter-search">
            <Search aria-hidden="true" size={14} />
            <Combobox.Input aria-label={searchLabel} autoFocus className="person-filter-input" placeholder={searchLabel} />
          </div>
          <Combobox.Empty className="person-filter-empty">{emptyLabel ?? d("noMatchingMembers")}</Combobox.Empty>
          <Combobox.List className="person-filter-list">
            {(person: PersonOption) => <Combobox.Item className="person-filter-option" key={person.id} value={person}>
              {person.id === allPeople.id
                ? <span aria-hidden="true" className="person-filter-scope-icon"><UsersRound size={16} /></span>
                : <PersonAvatar name={person.name} profile={person} profilePreviewFocusable={false} showProfilePreview={false} size="xs" />}
              <span className="person-filter-option-label" title={optionLabel(person)}>{optionLabel(person)}</span>
              <Combobox.ItemIndicator className="person-filter-check"><Check aria-hidden="true" size={14} /></Combobox.ItemIndicator>
            </Combobox.Item>}
          </Combobox.List>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  </Combobox.Root>;
}
