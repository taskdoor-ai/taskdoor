import { Combobox } from "@base-ui/react/combobox";
import { Tooltip } from "@base-ui/react/tooltip";
import { AtSign, Check, ChevronDown, Plus, Search, Sparkles, UserRoundX, UsersRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { sortMembersByRecommendation, type TaskMemberRecommendations } from "../lib/taskMemberRecommendations";
import { PersonAvatar, PersonName, type PersonInvitationStatus } from "./PersonAvatar";
import type { PersonOption } from "../data/sharedTypes";
export type { PersonOption } from "../data/sharedTypes";

type PersonPickerCommonProps = {
  allowUnassigned?: boolean;
  align?: "end" | "start";
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  emptyLabel?: string;
  hideSelectedName?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean, details?: Combobox.Root.ChangeEventDetails) => void;
  finalFocus?: ComponentProps<typeof Combobox.Popup>["finalFocus"];
  members: PersonOption[];
  menuLabel?: string;
  invitationStatus?: PersonInvitationStatus;
  memberRecommendations?: TaskMemberRecommendations;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
  searchPlaceholder?: string;
  size?: "sm" | "touch";
  selfId?: string;
  selfOptionLabel?: string;
  scopeOption?: {
    description: string;
    id: string;
    label: string;
  };
  showTriggerProfilePreview?: boolean;
  triggerLabel?: string;
  triggerVariant?: "action" | "add" | "filter" | "identity" | "member" | "mention";
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

export function getMemberMatchTone(score: number) {
  if (score >= 80) return "high";
  if (score < 50) return "low";
  return "medium";
}

export function PersonPicker(props: PersonPickerProps) {
  const { allowUnassigned = false, align = "start", ariaLabel, className, disabled = false, emptyLabel = "没有找到匹配的成员", hideSelectedName = false, invitationStatus, memberRecommendations = {}, members, menuLabel = "选择成员", onInviteMembers, scopeOption, searchPlaceholder = "搜索姓名、职责或邮箱", selfId, selfOptionLabel = "我自己处理", showTriggerProfilePreview = true, size = "sm", triggerLabel = "更换", triggerVariant = "action", unassignedDescription = "没找到合适的人，邀请更多同事进来协作", unassignedLabel = "暂不分配" } = props;
  const [internalOpen, setOpen] = useState(false);
  const open = props.open ?? internalOpen;
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const multiple = props.multiple === true;
  const isUnassigned = multiple ? props.value.length === 0 : props.value === "";
  const canUnassign = allowUnassigned && (!props.multiple || !props.min);
  const sortedMembers = useMemo(() => sortMembersByRecommendation(members, memberRecommendations), [memberRecommendations, members]);
  const unassignedPerson = useMemo<PersonOption>(() => ({ email: "", id: unassignedPersonId, name: unassignedLabel, role: unassignedDescription }), [unassignedDescription, unassignedLabel]);
  const scopePerson = useMemo<PersonOption | null>(() => scopeOption ? ({ email: "", id: scopeOption.id, name: scopeOption.label, role: scopeOption.description }) : null, [scopeOption]);
  const availablePeople = useMemo(() => [
    ...(scopePerson ? [scopePerson] : []),
    ...sortedMembers,
  ], [scopePerson, sortedMembers]);
  const selectedIds = multiple ? props.value : [props.value];
  const selectedPeople = useMemo(() => {
    if (!multiple && allowUnassigned && props.value === "") return [unassignedPerson];
    return availablePeople.filter((member) => selectedIds.includes(member.id));
  }, [allowUnassigned, availablePeople, multiple, props.value, selectedIds, unassignedPerson]);
  const selectedPerson = selectedPeople[0] ?? null;
  const selectedInternalIds = selectedPeople.map((person) => person.id);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const closeAndReset = (nextOpen: boolean, details?: Combobox.Root.ChangeEventDetails) => {
    setOpen(nextOpen);
    props.onOpenChange?.(nextOpen, details);
    if (!nextOpen) setQuery("");
  };

  const selectUnassigned = () => {
    if (!canUnassign) return;
    if (props.multiple) props.onChange([]);
    else props.onChange("");
    closeAndReset(false);
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
        data-hide-name={hideSelectedName || undefined}
        className={cn(
          "person-picker-trigger inline-flex items-center justify-center gap-(--ad-space-2) rounded-(--ad-radius-control) border border-transparent bg-transparent font-sans text-(length:--ad-text-caption) font-semibold text-(--ad-route-ink) outline-none transition-[background-color,border-color,box-shadow] hover:border-(--ad-border) hover:bg-(--ad-surface) focus-visible:ring-2 focus-visible:ring-(--ad-focus) focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          size === "touch" ? "min-h-(--ad-control-touch-min)" : "min-h-(--ad-control-height-sm)",
          (triggerVariant === "add" || triggerVariant === "member") && "person-picker-trigger-avatar",
          triggerVariant === "action" ? "px-(--ad-space-2)" : triggerVariant === "add" ? "person-picker-trigger-add flex-col gap-(--ad-space-1) px-0 text-(--ad-ink-secondary)" : triggerVariant === "member" ? "person-picker-trigger-member flex-col gap-(--ad-space-1) px-0 text-(--ad-ink-secondary)" : triggerVariant === "filter" ? "person-picker-trigger-filter justify-start px-(--ad-space-3) text-left text-(--ad-ink)" : "person-picker-trigger-identity justify-start px-0 text-left text-(--ad-ink)",
          className,
        )}
        disabled={disabled}
        ref={triggerRef}
      >
        {triggerVariant === "mention" ? <AtSign aria-hidden="true" size={16} /> : triggerVariant === "filter" ? (
          <>
            {selectedPerson?.id === scopeOption?.id
              ? <span className="person-picker-filter-scope-icon grid shrink-0 place-items-center rounded-full bg-(--ad-surface-subtle) text-(--ad-ink-tertiary)"><UsersRound aria-hidden="true" size={14} /></span>
              : <PersonAvatar name={selectedPerson?.name ?? "未选择"} profile={selectedPerson} profilePreviewFocusable={false} showProfilePreview={showTriggerProfilePreview} size="xs" />}
            <strong className="min-w-0 flex-1 truncate text-(length:--ad-text-body-sm) font-medium">{selectedPerson?.name ?? "选择成员"}</strong>
          </>
        ) : triggerVariant === "identity" ? (
          <>
            {selectedPerson?.id === unassignedPersonId
              ? <span className="person-picker-empty-icon grid size-(--ad-control-height-md) shrink-0 place-items-center rounded-full bg-(--ad-surface-subtle) text-(--ad-ink-tertiary)"><UserRoundX aria-hidden="true" size={16} /></span>
              : <PersonAvatar invitationStatus={invitationStatus} name={selectedPerson?.name ?? "未选择"} profile={selectedPerson} profilePreviewFocusable={false} showProfilePreview={showTriggerProfilePreview} size="md" />}
            <span className="min-w-0 flex-1"><strong className="block truncate text-(length:--ad-text-label) font-semibold">{selectedPerson && selectedPerson.id !== unassignedPersonId ? <PersonName name={selectedPerson.name} profile={selectedPerson} /> : selectedPerson?.name ?? "选择成员"}</strong></span>
          </>
        ) : triggerVariant === "member" ? <>{selectedPerson?.id === unassignedPersonId
          ? <span className="person-picker-empty-icon grid size-(--ad-control-height-md) place-items-center rounded-full bg-(--ad-surface-subtle) text-(--ad-ink-tertiary)"><UserRoundX aria-hidden="true" size={16} /></span>
          : <PersonAvatar invitationStatus={invitationStatus} name={selectedPerson?.name ?? "未选择"} profile={selectedPerson} profilePreviewFocusable={false} showProfilePreview={showTriggerProfilePreview} size="md" />}{!hideSelectedName && selectedPerson?.id !== unassignedPersonId && <strong className="max-w-(--ad-person-name-max) truncate text-(length:--ad-text-caption) font-semibold"><PersonName name={selectedPerson?.name ?? "选择成员"} profile={selectedPerson} /></strong>}</> : triggerVariant === "add" ? <><span className="person-picker-empty-icon grid size-(--ad-control-height-md) place-items-center rounded-full bg-(--ad-surface-subtle) text-(--ad-ink-tertiary)">{canUnassign && isUnassigned ? <UserRoundX aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}</span>{!hideSelectedName && !(canUnassign && isUnassigned) && <strong className="text-(length:--ad-text-caption) font-semibold">添加</strong>}</> : <span>{triggerLabel}</span>}
        {triggerVariant !== "add" && triggerVariant !== "member" && triggerVariant !== "mention" && <Combobox.Icon className="grid size-(--ad-control-icon-sm) shrink-0 place-items-center text-(--ad-ink-tertiary)"><ChevronDown aria-hidden="true" size={16} /></Combobox.Icon>}
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner align={align} className="isolate z-100" collisionPadding={12} sideOffset={8}>
          <Combobox.Popup finalFocus={props.finalFocus} aria-label={menuLabel} className="person-picker-popup flex max-h-[var(--available-height)] w-(--ad-person-picker-width) max-w-[calc(100vw-var(--ad-space-6))] flex-col overflow-hidden rounded-(--ad-radius-card) bg-(--ad-surface) text-(--ad-ink) shadow-(--ad-shadow-float) ring-1 ring-(--ad-border) outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="person-picker-search flex min-h-(--ad-control-touch-min) items-center gap-(--ad-space-2) border-b border-(--ad-border-soft) px-(--ad-space-3) text-(--ad-ink-tertiary) transition-colors focus-within:bg-(--ad-surface-subtle)">
              <Search aria-hidden="true" className="shrink-0" size={16} />
              <Combobox.Input autoFocus aria-label={searchPlaceholder} className="h-(--ad-control-touch-min) min-w-0 flex-1 border-0 bg-transparent text-(length:--ad-text-body-sm) text-(--ad-ink) outline-none shadow-none placeholder:text-(--ad-ink-tertiary) focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none" data-slot="input" placeholder={searchPlaceholder} />
            </div>
            {canUnassign && <div className="person-picker-unassigned">
              <div className="person-picker-unassigned-card" data-selected={isUnassigned || undefined}>
                <button aria-pressed={isUnassigned} className="person-picker-unassigned-choice" onClick={selectUnassigned} type="button">
                  <span className="person-picker-unassigned-icon"><UserRoundX aria-hidden="true" size={16} /></span>
                  <span className="person-picker-unassigned-copy"><strong>{unassignedLabel}</strong></span>
                  {isUnassigned && <Check aria-hidden="true" className="person-picker-unassigned-check" size={16} />}
                </button>
                <div className="person-picker-invite-row">
                  <small title={unassignedDescription}>{unassignedDescription}</small>
                  {onInviteMembers && <button className="person-picker-invite-link" onClick={(event) => { event.stopPropagation(); closeAndReset(false); window.requestAnimationFrame(() => onInviteMembers(triggerRef.current)); }} type="button">立即邀请</button>}
                </div>
              </div>
            </div>}
            <Combobox.Empty className="empty:p-0 px-(--ad-space-4) py-(--ad-space-6) text-center text-(length:--ad-text-body-sm) text-(--ad-ink-tertiary)">
              <span>{emptyLabel}</span>
            </Combobox.Empty>
            <Combobox.List className="min-h-0 max-h-(--ad-person-picker-list-max) overflow-y-auto p-(--ad-space-2)" ref={listRef}>
              {(person: PersonOption) => {
                const isScope = person.id === scopeOption?.id;
                const isSelf = person.id === selfId;
                const selected = selectedInternalIds.includes(person.id);
                const atMaximum = multiple && Boolean(props.max && selectedIds.length >= props.max);
                const atMinimum = multiple && Boolean(selected && props.min && selectedIds.length <= props.min);
                const recommendation = !isScope ? memberRecommendations[person.id] : undefined;
                return (
                  <Combobox.Item className="person-picker-option grid min-h-(--ad-control-touch-min) cursor-default grid-cols-[var(--ad-control-height-md)_minmax(0,1fr)_auto] items-center gap-(--ad-space-3) rounded-(--ad-radius-control) px-(--ad-space-3) py-(--ad-space-2) outline-none transition-colors data-disabled:opacity-40 data-highlighted:bg-(--ad-surface-subtle) data-selected:bg-(--ad-route-soft)" disabled={(atMaximum && !selected) || atMinimum} key={person.id} value={person}>
                    {isScope
                      ? <span className="grid size-(--ad-control-height-md) place-items-center rounded-full bg-(--ad-surface-subtle) text-(--ad-ink-tertiary)"><UsersRound aria-hidden="true" size={16} /></span>
                      : <PersonAvatar name={person.name} profile={person} profilePreviewFocusable={false} size="md" />}
                    <span className="min-w-0"><strong className="block truncate text-(length:--ad-text-body-sm) font-semibold text-(--ad-ink)">{isScope ? person.name : isSelf ? selfOptionLabel : <PersonName name={person.name} profile={person} />}</strong>{isScope && <small className="person-picker-option-description mt-(--ad-space-1) block text-(length:--ad-text-caption) text-(--ad-ink-tertiary)">{person.role}</small>}</span>
                    <span className="person-picker-option-end">
                      {recommendation && <><span className="person-picker-match-score" data-match-tone={getMemberMatchTone(recommendation.score)}>{recommendation.score}%</span><Tooltip.Root><Tooltip.Trigger aria-label={`AI 建议理由：${person.name}`} className="person-picker-ai-reason" closeOnClick={false} delay={150} onClick={(event) => { event.preventDefault(); event.stopPropagation(); }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }} type="button"><Sparkles aria-hidden="true" size={14} /></Tooltip.Trigger><Tooltip.Portal><Tooltip.Positioner className="person-picker-ai-tip-positioner" collisionPadding={12} side="top" sideOffset={6}><Tooltip.Popup className="person-picker-ai-tip" role="tooltip">{recommendation.reason}</Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal></Tooltip.Root></>}
                      <Combobox.ItemIndicator className="grid size-(--ad-control-icon-sm) place-items-center text-(--ad-route-ink)"><Check aria-hidden="true" size={16} /></Combobox.ItemIndicator>
                    </span>
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
