import { useI18n } from "../i18n/I18nProvider";
import { mockPersonName } from "../i18n/mockContent";
import { settingsMockText } from "../i18n/settingsMock";
import { recommendationReason } from "../i18n/recommendationCopy";
import { useGlobalUi } from "../i18n/globalUi";
import { useDetailCopy } from "../i18n/detailMessages";
import { Combobox } from "@base-ui/react/combobox";
import { Tooltip } from "@base-ui/react/tooltip";
import { AtSign, Check, ChevronDown, Plus, Search, Sparkles, UserPlus, UserRoundX, UsersRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { sortMembersByRecommendation, type TaskMemberRecommendationLevel, type TaskMemberRecommendations } from "../lib/taskMemberRecommendations";
import { PersonAvatar, PersonName, type PersonInvitationStatus } from "./PersonAvatar";
import type { PersonOption } from "../data/sharedTypes";
import { useMemberInvitations } from "./MemberInvitations";
import { getInvitationDraft } from "../lib/teamInvitations";
export type { PersonOption } from "../data/sharedTypes";

type PersonPickerCommonProps = {
  allowInvitations?: boolean;
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

export function getMemberRecommendationLabel(level: TaskMemberRecommendationLevel) {
  if (level === "high") return "推荐度较高";
  if (level === "medium") return "推荐度适中";
  return "推荐度较低";
}

export function PersonPicker(props: PersonPickerProps) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const d = useDetailCopy();
  const { allowUnassigned = false, align = "start", ariaLabel, className, disabled = false, emptyLabel = d('noMatchingMembers'), hideSelectedName = false, invitationStatus, memberRecommendations = {}, members, menuLabel = d('selectMember'), onInviteMembers, scopeOption, searchPlaceholder = d('searchMembers'), selfId, selfOptionLabel = d('assignToMe'), showTriggerProfilePreview = true, size = "sm", triggerLabel = d('change'), triggerVariant = "action", unassignedDescription = props.allowInvitations === false ? d('leaveUnassigned') : d('inviteTeammate'), unassignedLabel = d('unassigned') } = props;
  const [internalOpen, setOpen] = useState(false);
  const open = props.open ?? internalOpen;
  const [query, setQuery] = useState("");
  const invitations = useMemberInvitations();
  const invitationActive = useRef(false);
  const [suppressReturnFocus, setSuppressReturnFocus] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const latestProps = useRef(props);
  latestProps.current = props;
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
  const matchesQuery = (person: PersonOption, keyword: string) => `${person.name} ${mockPersonName(locale, person.id, person.name)} ${person.role} ${settingsMockText(locale, person.id, person.dynamicResponsibility ?? "")} ${person.dynamicResponsibility ?? ""} ${person.email}`.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase());
  const allowInvitations = props.allowInvitations !== false;
  const inviteCandidate = Boolean(allowInvitations && invitations && triggerVariant !== "filter" && triggerVariant !== "mention"
    && query.trim() && !availablePeople.some(person => matchesQuery(person, query)));
  const inviteAtMaximum = multiple && Boolean(props.max && selectedIds.length >= props.max);
  const openInvitation = (selectAfterInvite: boolean) => {
    if (!allowInvitations || !invitations?.canInvite || (selectAfterInvite && inviteAtMaximum) || disabled || invitationActive.current) return;
    invitationActive.current = true;
    setSuppressReturnFocus(true);
    invitations.openInvite({
      ...getInvitationDraft(query), returnFocus: triggerRef.current,
      cancelFocus: () => searchRef.current,
      onSubmitted: () => closeAndReset(false),
      onDismiss: submitted => {
        invitationActive.current = false;
        if (!submitted) setSuppressReturnFocus(false);
      },
      onInvited: selectAfterInvite ? person => {
        const current = latestProps.current;
        if (current.multiple) current.onChange([...new Set([...current.value, person.id])]);
        else current.onChange(person.id);
      } : undefined,
    });
  };

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const closeAndReset = (nextOpen: boolean, details?: Combobox.Root.ChangeEventDetails) => {
    if (nextOpen) setSuppressReturnFocus(false);
    setOpen(nextOpen);
    props.onOpenChange?.(nextOpen, details);
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
      filter={matchesQuery}
      inputValue={query}
      isItemEqualToValue={(person, selected) => person.id === selected.id}
      itemToStringLabel={(person) => mockPersonName(locale, person.id, person.name)}
      itemToStringValue={(person) => person.id}
      items={availablePeople}
      multiple={multiple}
      onInputValueChange={value => { if (!invitationActive.current) setQuery(value); }}
      onOpenChange={(nextOpen, details) => {
        if (invitationActive.current) { details.cancel(); return; }
        closeAndReset(nextOpen, details);
      }}
      onOpenChangeComplete={nextOpen => { if (!nextOpen) setQuery(""); }}
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
              : <PersonAvatar name={selectedPerson?.name ?? d('notSelected')} profile={selectedPerson} profilePreviewFocusable={false} showProfilePreview={showTriggerProfilePreview} size="xs" />}
            <strong className="min-w-0 flex-1 truncate text-(length:--ad-text-body-sm) font-medium">{selectedPerson ? mockPersonName(locale, selectedPerson.id, selectedPerson.name) : d('selectMember')}</strong>
          </>
        ) : triggerVariant === "identity" ? (
          <>
            {selectedPerson?.id === unassignedPersonId
              ? <span className="person-picker-empty-icon grid size-(--ad-control-height-md) shrink-0 place-items-center rounded-full bg-(--ad-surface-subtle) text-(--ad-ink-tertiary)"><UserRoundX aria-hidden="true" size={16} /></span>
              : <PersonAvatar invitationStatus={invitationStatus} name={selectedPerson?.name ?? d('notSelected')} profile={selectedPerson} profilePreviewFocusable={false} showProfilePreview={showTriggerProfilePreview} size="md" />}
            <span className="min-w-0 flex-1"><strong className="block truncate text-(length:--ad-text-label) font-semibold">{selectedPerson && selectedPerson.id !== unassignedPersonId ? <PersonName name={selectedPerson.name} profile={selectedPerson} /> : selectedPerson?.name ?? d('selectMember')}</strong></span>
          </>
        ) : triggerVariant === "member" ? <>{selectedPerson?.id === unassignedPersonId
          ? <span className="person-picker-empty-icon grid size-(--ad-control-height-md) place-items-center rounded-full bg-(--ad-surface-subtle) text-(--ad-ink-tertiary)"><UserRoundX aria-hidden="true" size={16} /></span>
          : <PersonAvatar invitationStatus={invitationStatus} name={selectedPerson?.name ?? d('notSelected')} profile={selectedPerson} profilePreviewFocusable={false} showProfilePreview={showTriggerProfilePreview} size="md" />}{!hideSelectedName && selectedPerson?.id !== unassignedPersonId && <strong className="max-w-(--ad-person-name-max) truncate text-(length:--ad-text-caption) font-semibold"><PersonName name={selectedPerson ? mockPersonName(locale, selectedPerson.id, selectedPerson.name) : d('selectMember')} profile={selectedPerson} /></strong>}</> : triggerVariant === "add" ? <><span className="person-picker-empty-icon grid size-(--ad-control-height-md) place-items-center rounded-full bg-(--ad-surface-subtle) text-(--ad-ink-tertiary)">{canUnassign && isUnassigned ? <UserRoundX aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}</span>{!hideSelectedName && !(canUnassign && isUnassigned) && <strong className="text-(length:--ad-text-caption) font-semibold">{d('append')}</strong>}</> : <span>{triggerLabel}</span>}
        {triggerVariant !== "add" && triggerVariant !== "member" && triggerVariant !== "mention" && <Combobox.Icon className="grid size-(--ad-control-icon-sm) shrink-0 place-items-center text-(--ad-ink-tertiary)"><ChevronDown aria-hidden="true" size={16} /></Combobox.Icon>}
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner align={align} className="isolate z-100" collisionPadding={12} sideOffset={8}>
          <Combobox.Popup finalFocus={suppressReturnFocus ? false : props.finalFocus} aria-label={menuLabel} className="person-picker-popup flex max-h-[var(--available-height)] w-(--ad-person-picker-width) max-w-[calc(100vw-var(--ad-space-6))] flex-col overflow-hidden rounded-(--ad-radius-card) bg-(--ad-surface) text-(--ad-ink) shadow-(--ad-shadow-float) ring-1 ring-(--ad-border) outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="person-picker-search flex min-h-(--ad-control-touch-min) items-center gap-(--ad-space-2) border-b border-(--ad-border-soft) px-(--ad-space-3) text-(--ad-ink-tertiary) transition-colors focus-within:bg-(--ad-surface-subtle)">
              <Search aria-hidden="true" className="shrink-0" size={16} />
              <Combobox.Input ref={searchRef} autoFocus aria-label={searchPlaceholder} className="h-(--ad-control-touch-min) min-w-0 flex-1 border-0 bg-transparent text-(length:--ad-text-body-sm) text-(--ad-ink) outline-none shadow-none placeholder:text-(--ad-ink-tertiary) focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none" data-slot="input" placeholder={searchPlaceholder} />
            </div>
            {canUnassign && <div className="person-picker-unassigned">
              <div className="person-picker-unassigned-card" data-selected={isUnassigned || undefined}>
                <button aria-pressed={isUnassigned} className="person-picker-unassigned-choice" onClick={selectUnassigned} type="button">
                  <span className="person-picker-unassigned-icon"><UserRoundX aria-hidden="true" size={16} /></span>
                  <span className="person-picker-unassigned-copy"><strong>{unassignedLabel}</strong></span>
                  {isUnassigned && <Check aria-hidden="true" className="person-picker-unassigned-check" size={16} />}
                </button>
                {!inviteCandidate && <div className="person-picker-invite-row">
                  <small title={unassignedDescription}>{unassignedDescription}</small>
                  {allowInvitations && onInviteMembers && <button className="person-picker-invite-link" onClick={(event) => { event.stopPropagation(); if (invitations) openInvitation(false); else { closeAndReset(false); onInviteMembers(triggerRef.current); } }} type="button">{d('inviteNow')}</button>}
                </div>}
              </div>
            </div>}
            <Combobox.Empty className="empty:p-0 px-(--ad-space-4) py-(--ad-space-6) text-center text-(length:--ad-text-body-sm) text-(--ad-ink-tertiary)">
              {!inviteCandidate && <span>{emptyLabel}</span>}
            </Combobox.Empty>
            <Combobox.List className="min-h-0 max-h-(--ad-person-picker-list-max) overflow-y-auto p-(--ad-space-2) empty:p-0" ref={listRef}>
              {(person: PersonOption) => {
                const isScope = person.id === scopeOption?.id;
                const isSelf = person.id === selfId;
                const selected = selectedInternalIds.includes(person.id);
                const atMaximum = multiple && Boolean(props.max && selectedIds.length >= props.max);
                const atMinimum = multiple && Boolean(selected && props.min && selectedIds.length <= props.min);
                const recommendation = !selected && !isScope && person.membershipStatus !== "invited" ? memberRecommendations[person.id] : undefined;
                return (
                  <Combobox.Item className="person-picker-option grid min-h-(--ad-control-touch-min) cursor-default grid-cols-[var(--ad-control-height-md)_minmax(0,1fr)_auto] items-center gap-(--ad-space-3) rounded-(--ad-radius-control) px-(--ad-space-3) py-(--ad-space-2) outline-none transition-colors data-disabled:opacity-40 data-highlighted:bg-(--ad-surface-subtle) data-selected:bg-(--ad-route-soft)" disabled={(atMaximum && !selected) || atMinimum} key={person.id} value={person}>
                    {isScope
                      ? <span className="grid size-(--ad-control-height-md) place-items-center rounded-full bg-(--ad-surface-subtle) text-(--ad-ink-tertiary)"><UsersRound aria-hidden="true" size={16} /></span>
                      : <PersonAvatar name={person.name} profile={person} profilePreviewFocusable={false} size="md" />}
                    <span className="min-w-0"><strong className="block truncate text-(length:--ad-text-body-sm) font-semibold text-(--ad-ink)">{isScope ? person.name : isSelf ? selfOptionLabel : <PersonName name={person.name} profile={person} />}</strong>{isScope && <small className="person-picker-option-description mt-(--ad-space-1) block text-(length:--ad-text-caption) text-(--ad-ink-tertiary)">{person.role}</small>}</span>
                    <span className="person-picker-option-end">
                      {recommendation && <Tooltip.Root><Tooltip.Trigger aria-label={`${mockPersonName(locale, person.id, person.name)}: ${ui(getMemberRecommendationLabel(recommendation.level))}`} className="person-picker-ai-reason" closeOnClick={false} data-recommendation-level={recommendation.level} delay={150} onClick={(event) => { event.preventDefault(); event.stopPropagation(); }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }} type="button"><Sparkles aria-hidden="true" size={14} /></Tooltip.Trigger><Tooltip.Portal><Tooltip.Positioner className="person-picker-ai-tip-positioner" collisionPadding={12} side="top" sideOffset={6}><Tooltip.Popup className="person-picker-ai-tip" role="tooltip">{ui(getMemberRecommendationLabel(recommendation.level))}: {recommendationReason(locale, person, recommendation.reason)}</Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal></Tooltip.Root>}
                      <Combobox.ItemIndicator className="grid size-(--ad-control-icon-sm) place-items-center text-(--ad-route-ink)"><Check aria-hidden="true" size={16} /></Combobox.ItemIndicator>
                    </span>
                  </Combobox.Item>
                );
              }}
            </Combobox.List>
            {inviteCandidate && <div className="person-picker-email-invite">
              <strong>{emptyLabel}</strong>
              <p>{!invitations?.canInvite ? d('askAdminInvite') : inviteAtMaximum ? d('memberLimit') : ui("发送邮件邀请对方加入「{0}」，一起协作。", {0: invitations.teamName})}</p>
              <button disabled={!invitations?.canInvite || inviteAtMaximum} onClick={() => openInvitation(true)} type="button"><UserPlus aria-hidden="true" size={18} /><span>{d('inviteMembers')}</span></button>
            </div>}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
