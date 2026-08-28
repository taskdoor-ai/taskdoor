import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Plus, Search, UserRoundX } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PersonAvatar, type PersonInvitationStatus } from "./PersonAvatar";

export type PersonOption = {
  availability?: string;
  currentWork?: string[];
  dynamicResponsibility?: string;
  email: string;
  id: string;
  name: string;
  recentActivity?: string;
  role: string;
};

type PersonPickerCommonProps = {
  allowUnassigned?: boolean;
  align?: "end" | "start";
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  emptyLabel?: string;
  members: PersonOption[];
  menuLabel?: string;
  invitationStatus?: PersonInvitationStatus;
  searchPlaceholder?: string;
  size?: "sm" | "touch";
  selfId?: string;
  selfOptionLabel?: string;
  triggerLabel?: string;
  triggerVariant?: "action" | "add" | "identity" | "member";
  unassignedDescription?: string;
  unassignedLabel?: string;
};

type PersonPickerProps = PersonPickerCommonProps & ({
  max?: never;
  min?: never;
  multiple?: false;
  onChange: (personId: string) => void;
  value: string;
} | {
  max?: number;
  min?: number;
  multiple: true;
  onChange: (personIds: string[]) => void;
  value: string[];
});

// Behavior: Base UI Combobox input-inside-popup pattern.
// Visual anatomy: adapted from 21st.dev Member Selector and shadcn custom Combobox items.
const unassignedPersonId = "__agentdoor_unassigned__";

export function PersonPicker(props: PersonPickerProps) {
  const { allowUnassigned = false, align = "start", ariaLabel, className, disabled = false, emptyLabel = "没有找到匹配的成员", invitationStatus, members, menuLabel = "选择成员", searchPlaceholder = "搜索姓名、职责或邮箱", selfId, selfOptionLabel = "我自己处理", size = "sm", triggerLabel = "更换", triggerVariant = "action", unassignedDescription = "创建后再决定由谁处理", unassignedLabel = "暂不分配" } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const multiple = props.multiple === true;
  const unassignedPerson = useMemo<PersonOption>(() => ({ email: "", id: unassignedPersonId, name: unassignedLabel, role: unassignedDescription }), [unassignedDescription, unassignedLabel]);
  const availablePeople = useMemo(() => allowUnassigned && !multiple ? [unassignedPerson, ...members] : members, [allowUnassigned, members, multiple, unassignedPerson]);
  const selectedIds = multiple ? props.value : [props.value];
  const selectedPeople = useMemo(() => {
    if (!multiple && allowUnassigned && props.value === "") return [unassignedPerson];
    return availablePeople.filter((member) => selectedIds.includes(member.id));
  }, [allowUnassigned, availablePeople, multiple, props.value, selectedIds, unassignedPerson]);
  const selectedPerson = selectedPeople[0] ?? null;
  const selectedInternalIds = selectedPeople.map((person) => person.id);

  const closeAndReset = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  };

  return (
    <Combobox.Root<PersonOption, boolean>
      autoHighlight
      filter={(person, keyword) => {
        const normalized = keyword.trim().toLocaleLowerCase();
        if (!normalized) return true;
        return `${person.name} ${person.role} ${person.dynamicResponsibility ?? ""} ${person.email}`.toLocaleLowerCase().includes(normalized);
      }}
      inputValue={query}
      isItemEqualToValue={(person, selected) => person.id === selected.id}
      itemToStringLabel={(person) => person.name}
      itemToStringValue={(person) => person.id}
      items={availablePeople}
      multiple={multiple}
      onInputValueChange={setQuery}
      onOpenChange={closeAndReset}
      onValueChange={(nextValue) => {
        if (multiple) {
          const nextPeople = Array.isArray(nextValue) ? nextValue : [];
          props.onChange(nextPeople.map((person) => person.id));
          return;
        }
        const person = Array.isArray(nextValue) ? nextValue[0] : nextValue;
        if (!person) return;
        props.onChange(person.id === unassignedPersonId ? "" : person.id);
        closeAndReset(false);
      }}
      open={open}
      value={multiple ? selectedPeople : selectedPerson}
    >
      <Combobox.Trigger
        aria-label={ariaLabel}
        className={cn(
          "person-picker-trigger inline-flex items-center justify-center gap-(--ad-space-2) rounded-(--ad-radius-control) border border-transparent bg-transparent text-(--ad-text-caption) font-semibold text-(--ad-route-ink) outline-none transition-[background-color,border-color,box-shadow] hover:border-(--ad-border) hover:bg-(--ad-surface) focus-visible:ring-2 focus-visible:ring-(--ad-focus) focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          size === "touch" ? "min-h-(--ad-control-touch-min)" : "min-h-(--ad-control-height-sm)",
          triggerVariant === "action" ? "px-(--ad-space-2)" : triggerVariant === "add" ? "person-picker-trigger-add flex-col gap-(--ad-space-1) px-0 text-(--ad-ink-secondary)" : triggerVariant === "member" ? "person-picker-trigger-member flex-col gap-(--ad-space-1) px-0 text-(--ad-ink-secondary)" : "person-picker-trigger-identity justify-start px-0 text-left text-(--ad-ink)",
          className,
        )}
        disabled={disabled}
      >
        {triggerVariant === "identity" ? (
          <>
            {selectedPerson?.id === unassignedPersonId
              ? <span className="grid size-(--ad-control-height-md) shrink-0 place-items-center rounded-full bg-(--ad-surface-subtle) text-(--ad-ink-tertiary)"><UserRoundX aria-hidden="true" size={16} /></span>
              : <PersonAvatar invitationStatus={invitationStatus} name={selectedPerson?.name ?? "未选择"} size="md" />}
            <span className="min-w-0 flex-1"><strong className="block truncate text-(--ad-text-label) font-semibold">{selectedPerson?.name ?? "选择成员"}</strong></span>
          </>
        ) : triggerVariant === "member" ? <><PersonAvatar invitationStatus={invitationStatus} name={selectedPerson?.name ?? "未选择"} size="md" /><strong className="max-w-(--ad-person-name-max) truncate text-(--ad-text-caption) font-semibold">{selectedPerson?.name ?? "选择成员"}</strong></> : triggerVariant === "add" ? <><span className="grid size-(--ad-control-height-md) place-items-center rounded-full border border-dashed border-(--ad-border-strong)"><Plus aria-hidden="true" size={16} /></span><strong className="text-(--ad-text-caption) font-semibold">添加</strong></> : <span>{triggerLabel}</span>}
        {triggerVariant !== "add" && triggerVariant !== "member" && <Combobox.Icon className="grid size-(--ad-control-icon-sm) shrink-0 place-items-center text-(--ad-ink-tertiary)"><ChevronDown aria-hidden="true" size={16} /></Combobox.Icon>}
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner align={align} className="isolate z-100" sideOffset={8}>
          <Combobox.Popup aria-label={menuLabel} className="person-picker-popup w-(--ad-person-picker-width) max-w-[calc(100vw-var(--ad-space-6))] overflow-hidden rounded-(--ad-radius-card) bg-(--ad-surface) text-(--ad-ink) shadow-(--ad-shadow-float) ring-1 ring-(--ad-border) outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="person-picker-search flex min-h-(--ad-control-touch-min) items-center gap-(--ad-space-2) border-b border-(--ad-border-soft) px-(--ad-space-3) text-(--ad-ink-tertiary) transition-colors focus-within:bg-(--ad-surface-subtle)">
              <Search aria-hidden="true" className="shrink-0" size={16} />
              <Combobox.Input autoFocus aria-label={searchPlaceholder} className="h-(--ad-control-touch-min) min-w-0 flex-1 border-0 bg-transparent text-(--ad-text-body-sm) text-(--ad-ink) outline-none shadow-none placeholder:text-(--ad-ink-tertiary) focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none" data-slot="input" placeholder={searchPlaceholder} />
            </div>
            <Combobox.Empty className="empty:p-0 px-(--ad-space-4) py-(--ad-space-6) text-center text-(--ad-text-body-sm) text-(--ad-ink-tertiary)">{emptyLabel}</Combobox.Empty>
            <Combobox.List className="max-h-(--ad-person-picker-list-max) overflow-y-auto p-(--ad-space-2)">
              {(person: PersonOption) => {
                const isUnassigned = person.id === unassignedPersonId;
                const isSelf = person.id === selfId;
                const selected = selectedInternalIds.includes(person.id);
                const atMaximum = multiple && Boolean(props.max && selectedIds.length >= props.max);
                const atMinimum = multiple && Boolean(selected && props.min && selectedIds.length <= props.min);
                return (
                  <Combobox.Item className="person-picker-option grid min-h-(--ad-control-touch-min) cursor-default grid-cols-[var(--ad-control-height-md)_minmax(0,1fr)_var(--ad-control-icon-sm)] items-center gap-(--ad-space-3) rounded-(--ad-radius-control) px-(--ad-space-3) py-(--ad-space-2) outline-none transition-colors data-disabled:opacity-40 data-highlighted:bg-(--ad-surface-subtle) data-selected:bg-(--ad-route-soft)" disabled={(atMaximum && !selected) || atMinimum} key={person.id} value={person}>
                    {isUnassigned
                      ? <span className="grid size-(--ad-control-height-md) place-items-center rounded-full bg-(--ad-surface-subtle) text-(--ad-ink-tertiary)"><UserRoundX aria-hidden="true" size={16} /></span>
                      : <PersonAvatar name={person.name} size="md" />}
                    <span className="min-w-0"><strong className="block truncate text-(--ad-text-body-sm) font-semibold text-(--ad-ink)">{isSelf ? selfOptionLabel : person.name}</strong><small className="mt-(--ad-space-1) block truncate text-(--ad-text-caption) text-(--ad-ink-tertiary)">{isSelf && selfOptionLabel === "我自己处理" ? `${person.name} · ${person.role}` : person.role}</small></span>
                    <Combobox.ItemIndicator className="grid size-(--ad-control-icon-sm) place-items-center text-(--ad-route-ink)"><Check aria-hidden="true" size={16} /></Combobox.ItemIndicator>
                  </Combobox.Item>
                );
              }}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
