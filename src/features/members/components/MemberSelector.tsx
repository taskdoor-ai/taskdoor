import { useI18n } from "@/shared/i18n/I18nProvider";
import { mockPersonName } from "@/ai/mock/i18n/mockContent";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { ChevronDown, ChevronUp, Plus, UserRoundPen, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { TaskMemberRecommendations } from "@/ai/mock/lib/taskMemberRecommendations";
import { PersonAvatar, PersonAvatarGroup, PersonName, PersonOverflowList, type PersonInvitationStatus } from "@/shared/ui/PersonAvatar";
import { PersonPicker, type PersonOption } from "@/features/members/components/PersonPicker";
import { summaryCapacity, summaryControlsWidth } from "@/features/members/lib/member-summary-capacity";

export type Member = PersonOption;

type MemberSelectorProps = {
  avatarSize?: "sm" | "md";
  allowInvitations?: boolean;
  allowUnassigned?: boolean;
  disabled?: boolean;
  displayMax?: number;
  invitationStatusById?: Record<string, PersonInvitationStatus>;
  hideHeader?: boolean;
  hideSelectedName?: boolean;
  label: string;
  max?: number;
  memberRecommendations?: TaskMemberRecommendations;
  members: Member[];
  min?: number;
  onChange: (selected: string[]) => void;
  onInviteMembers?: (returnFocus?: HTMLElement | null) => void;
  selected: string[];
  showFullList?: boolean;
  participantSummary?: boolean;
  showInvitationStatus?: boolean;
  showTriggerProfilePreview?: boolean;
  stacked?: boolean;
};

// Adapted from 21st.dev Member Selector #9908 by osiris-balonga.
// Preserves selected-first avatars, add/search, check state and click-away behavior.
export function MemberSelector({ avatarSize = "md", allowInvitations = true, allowUnassigned = true, disabled = false, displayMax, hideHeader = false, hideSelectedName = false, invitationStatusById = {}, label, max, memberRecommendations, members, min = 0, onChange, onInviteMembers, selected, showFullList = false, participantSummary = false, showInvitationStatus = true, showTriggerProfilePreview = true, stacked = false }: MemberSelectorProps) {
  const [participantsExpanded, setParticipantsExpanded] = useState(false);
  const d = useDetailCopy();
  const { locale } = useI18n();
  const selectedMembers = members.filter((member) => selected.includes(member.id));
  if (participantSummary) {
    selectedMembers.sort((a, b) =>
      Number(a.membershipStatus === "invited") - Number(b.membershipStatus === "invited")
      || selected.indexOf(a.id) - selected.indexOf(b.id),
    );
  }
  const canExpandParticipants = participantSummary ? selectedMembers.length > 0 : selectedMembers.length > 1;
  const visibleSelectedMembers = displayMax ? selectedMembers.slice(0, displayMax) : selectedMembers;
  const hiddenSelectedCount = selectedMembers.length - visibleSelectedMembers.length;
  const stackedRowRef = useRef<HTMLDivElement>(null);
  const [summaryCapacityCount, setSummaryCapacityCount] = useState(Number.POSITIVE_INFINITY);
  useLayoutEffect(() => {
    if (!canExpandParticipants) setParticipantsExpanded(false);
    const row = stackedRowRef.current;
    if (!participantSummary || !row) return;
    const measure = () => {
      const width = row.clientWidth;
      if (!width) return;
      setSummaryCapacityCount(summaryCapacity(width, summaryControlsWidth(!disabled)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [participantSummary, avatarSize, canExpandParticipants, stacked, max, disabled]);

  // The badge lives inside the avatar's hover trigger, so the profile card stays open while moving onto it.
  const removeBadge = (member: Member, remove: () => void) => <button aria-label={`${d("remove")} ${label}: ${mockPersonName(locale, member.id, member.name)}`} className="member-selector-remove" onClick={(event) => { event.stopPropagation(); remove(); }} onPointerDown={(event) => event.stopPropagation()} type="button"><X aria-hidden="true" /></button>;

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      if (selected.length <= min) return;
      onChange(selected.filter((memberId) => memberId !== id));
      return;
    }
    if (max && selected.length >= max) return;
    onChange([...selected, id]);
  };

  if (max === 1) {
    const member = selectedMembers[0];
    return (
      <div className="member-selector member-selector-single">
        {!hideHeader && <div className="member-selector-label"><span>{label}</span></div>}
        {member ? (stacked ? hideSelectedName ? <div className="member-selector-person selected is-single">
          <span><PersonAvatar adornment={!disabled && selected.length > min ? removeBadge(member, () => onChange([])) : undefined} invitationStatus={showInvitationStatus ? invitationStatusById[member.id] ?? "accepted" : undefined} name={member.name} profile={member} profilePreviewFocusable={showTriggerProfilePreview} showProfilePreview={showTriggerProfilePreview} size={avatarSize} /></span>
          {!disabled && <PersonPicker allowInvitations={allowInvitations} ariaLabel={d("changeOwner")} className="member-selector-change" hideSelectedName memberRecommendations={memberRecommendations} members={members} menuLabel={`${d("select")} ${label}`} onChange={(id) => onChange(id ? [id] : [])} onInviteMembers={onInviteMembers} showTriggerProfilePreview={false} triggerIcon={<UserRoundPen aria-hidden="true" size={16} />} triggerTitle={d("changeOwner")} triggerVariant="add" value={member.id} />}
        </div> : <div className="member-selector-inline-person">
          <PersonAvatar invitationStatus={showInvitationStatus ? invitationStatusById[member.id] ?? "accepted" : undefined} name={member.name} profile={member} profilePreviewFocusable={false} showProfilePreview={showTriggerProfilePreview} size={avatarSize} />
          <span className="member-selector-inline-name" title={mockPersonName(locale, member.id, member.name)}>{mockPersonName(locale, member.id, member.name)}</span>
          {!disabled && selected.length > min && <button aria-label={`${d("remove")} ${label}: ${mockPersonName(locale, member.id, member.name)}`} className="member-selector-inline-remove" onClick={() => onChange([])} type="button"><X aria-hidden="true" /></button>}
        </div> : <div className="member-selector-person selected is-single"><span><PersonAvatar invitationStatus={showInvitationStatus ? invitationStatusById[member.id] ?? "accepted" : undefined} name={member.name} profile={member} profilePreviewFocusable={false} showProfilePreview={showTriggerProfilePreview} size={avatarSize} />{selected.length > min && <button aria-label={`${d("remove")} ${label}: ${mockPersonName(locale, member.id, member.name)}`} className="member-selector-remove" disabled={disabled} onClick={() => onChange([])} type="button"><X aria-hidden="true" /></button>}</span>{!hideSelectedName && <strong><PersonName name={member.name} profile={member} /></strong>}</div>) : <PersonPicker allowInvitations={allowInvitations} allowUnassigned={allowUnassigned && min === 0} ariaLabel={`${d("add")} ${label}`} className={allowUnassigned ? "person-picker-trigger-unassigned" : undefined} disabled={disabled} hideSelectedName={hideSelectedName} memberRecommendations={memberRecommendations} members={members} menuLabel={`${d("select")} ${label}`} onChange={(id) => onChange(id ? [id] : [])} onInviteMembers={onInviteMembers} showTriggerProfilePreview={false} triggerVariant={allowUnassigned ? "member" : "add"} value="" />}
      </div>
    );
  }

  if (stacked && participantSummary) {
    const count = selectedMembers.length;
    const overflowing = count > summaryCapacityCount;
    const shownMembers = overflowing ? selectedMembers.slice(0, Math.max(0, summaryCapacityCount - 1)) : selectedMembers;
    const moreCount = count - shownMembers.length;
    // Collapsed, the count goes under the label in English, and in Chinese from ten on; open, it follows inline.
    const countWraps = !participantsExpanded && (locale === "en" || count >= 10);
    const canRemove = !disabled && selected.length > min;
    const addPicker = !disabled && <PersonPicker allowInvitations={allowInvitations} allowUnassigned={allowUnassigned && min === 0} ariaLabel={`${d("add")} ${label}`} className="member-selector-summary-add" triggerIcon={<Plus aria-hidden="true" size={16} />} hideSelectedName max={max} memberRecommendations={memberRecommendations} members={members} menuLabel={`${d("select")} ${label}`} min={min} multiple onChange={onChange} onInviteMembers={onInviteMembers} triggerVariant="add" value={selected} />;
    return <div className="member-selector member-selector-stacked member-selector-summary">
      {!hideHeader && <div className="member-selector-label"><span>{label}</span></div>}
      <div className="member-selector-summary-heading">
        <div className="member-selector-summary-title" data-open={participantsExpanded || undefined} data-sizer={locale === "en" ? label : `${label} (0)`}>
          <span className="member-selector-summary-text">{label}{countWraps ? null : " "}<span className="member-selector-summary-count" data-wrap={countWraps || undefined}>({count})</span></span>
        </div>
      </div>
      <div className="member-selector-stacked-row" ref={stackedRowRef}>
        {count > 0 ? <div className="member-selector-summary-controls">
          {addPicker}
          <button
            type="button"
            className="member-selector-expand-toggle"
            aria-label={participantsExpanded
              ? (locale === "en" ? "Collapse collaborators" : "收起参与者列表")
              : (locale === "en" ? `Show all ${count} collaborators` : `展开全部 ${count} 位参与者`)}
            aria-expanded={participantsExpanded}
            onClick={() => setParticipantsExpanded(value => !value)}
          >
            {participantsExpanded ? <ChevronUp aria-hidden="true" size={16} /> : <ChevronDown aria-hidden="true" size={16} />}
          </button>
        </div> : addPicker}
        {!participantsExpanded && count > 0 && <div className="member-selector-summary-avatars">
          {shownMembers.map(member => <span className="member-selector-person" key={member.id}><span><PersonAvatar adornment={canRemove ? removeBadge(member, () => toggle(member.id)) : undefined} name={member.name} profile={member} size={avatarSize} /></span></span>)}
          {moreCount > 0 && <button aria-label={d("moreCollaborators").replace("{count}", String(moreCount))} className="member-selector-more" onClick={() => setParticipantsExpanded(true)} type="button">+{moreCount}</button>}
        </div>}
      </div>
      {participantsExpanded && <ul className="member-selector-inline-list" aria-label={label}>
        {selectedMembers.map(member => <li key={member.id}>
          <PersonAvatar name={member.name} profile={member} size="sm" />
          <div className="member-selector-list-identity" title={`${mockPersonName(locale, member.id, member.name)}${member.membershipStatus !== "invited" && member.role ? ` · ${member.role}` : ""}`}>
            <PersonName name={member.name} profile={member} showProfilePreview={false} />
            {member.membershipStatus !== "invited" && member.role && <span className="member-selector-list-role" title={member.role}>{member.role}</span>}
          </div>
          {canRemove && <button type="button" className="member-selector-list-remove" aria-label={`${d("remove")} ${label}: ${mockPersonName(locale, member.id, member.name)}`} onClick={() => toggle(member.id)}><X aria-hidden="true" size={14} /></button>}
        </li>)}
        {!selectedMembers.length && <li className="member-selector-list-empty">{locale === "en" ? "No collaborators" : "暂无参与者"}</li>}
      </ul>}
    </div>;
  }

  if (stacked) {
    return <div className="member-selector member-selector-stacked">
      {!hideHeader && <div className="member-selector-label"><span>{label}</span></div>}
      <div className="member-selector-stacked-row" ref={stackedRowRef}>
        {!hideSelectedName && selectedMembers.map(member => <span className="member-selector-inline-person" key={member.id}><PersonAvatar invitationStatus={showInvitationStatus ? invitationStatusById[member.id] : undefined} name={member.name} profile={member} size={avatarSize} /><span className="member-selector-inline-name" title={mockPersonName(locale, member.id, member.name)}>{mockPersonName(locale, member.id, member.name)}</span>{!disabled && selected.length > min && <button className="member-selector-inline-remove" aria-label={`${d("remove")} ${label}: ${mockPersonName(locale, member.id, member.name)}`} onClick={() => toggle(member.id)} type="button"><X aria-hidden="true" /></button>}</span>)}
        {hideSelectedName && selectedMembers.length > 0 && <PersonAvatarGroup invitationStatusById={showInvitationStatus ? invitationStatusById : {}} maxVisible={displayMax ?? 4} onRemove={disabled || selected.length <= min ? undefined : (id) => { if (selectedMembers.length === 1) stackedRowRef.current?.querySelector<HTMLButtonElement>(".person-picker-trigger")?.focus(); toggle(id); }} people={selectedMembers} removeLabel={label} showFullList={showFullList} size={avatarSize} />}
        <PersonPicker allowInvitations={allowInvitations} allowUnassigned={allowUnassigned && min === 0} ariaLabel={`${d("add")} ${label}`} disabled={disabled} hideSelectedName max={max} memberRecommendations={memberRecommendations} members={members} menuLabel={`${d("select")} ${label}`} min={min} multiple onChange={onChange} onInviteMembers={onInviteMembers} triggerVariant="add" value={selected} />
      </div>
    </div>;
  }

  return (
    <div className="member-selector">
      {!hideHeader && <div className="member-selector-label"><span>{label}</span></div>}
      <div className="member-selector-row">
        {visibleSelectedMembers.map((member) => (
          <div className="member-selector-person selected" key={member.id}>
            <span><PersonAvatar invitationStatus={showInvitationStatus ? invitationStatusById[member.id] ?? "accepted" : undefined} name={member.name} profile={member} profilePreviewFocusable={false} size="md" />{selected.length > min && <button aria-label={`${d("remove")} ${label}: ${mockPersonName(locale, member.id, member.name)}`} className="member-selector-remove" disabled={disabled} onClick={() => toggle(member.id)} type="button"><X aria-hidden="true" /></button>}</span>
            {!hideSelectedName && <strong><PersonName name={member.name} profile={member} /></strong>}
          </div>
        ))}
        {hiddenSelectedCount > 0 && <PersonOverflowList className="member-selector-overflow" invitationStatusById={showInvitationStatus ? invitationStatusById : {}} label={label} people={selectedMembers.slice(visibleSelectedMembers.length)} />}
        <PersonPicker allowInvitations={allowInvitations} allowUnassigned={allowUnassigned && min === 0} ariaLabel={`${d("add")} ${label}`} disabled={disabled} hideSelectedName={hideSelectedName} max={max} memberRecommendations={memberRecommendations} members={members} menuLabel={`${d("select")} ${label}`} min={min} multiple onChange={onChange} onInviteMembers={onInviteMembers} triggerVariant="add" value={selected} />
      </div>
    </div>
  );
}
