import { useI18n } from "@/shared/i18n/I18nProvider";
import { mockPersonName } from "@/ai/mock/i18n/mockContent";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { TaskMemberRecommendations } from "@/ai/mock/lib/taskMemberRecommendations";
import { PersonAvatar, PersonAvatarGroup, PersonName, PersonOverflowList, type PersonInvitationStatus } from "@/shared/ui/PersonAvatar";
import { PersonPicker, type PersonOption } from "@/features/members/components/PersonPicker";

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
  const canExpandParticipants = selectedMembers.length > 1;
  const visibleSelectedMembers = displayMax ? selectedMembers.slice(0, displayMax) : selectedMembers;
  const hiddenSelectedCount = selectedMembers.length - visibleSelectedMembers.length;
  const stackedRowRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [summaryVisibleCount, setSummaryVisibleCount] = useState(5);
  useLayoutEffect(() => {
    if (!canExpandParticipants) setParticipantsExpanded(false);
    const element = summaryRef.current;
    if (!participantSummary || !element) return;
    const measure = () => {
      const row = stackedRowRef.current;
      const width = row?.clientWidth ?? 0;
      if (!width) return;
      const size = avatarSize === "sm" ? 28 : 36;
      const step = size - 6;
      // Reserve room for the expand control only when there are multiple participants.
      const toggleWidth = canExpandParticipants ? 28 + 4 : 0;
      setSummaryVisibleCount(Math.max(0, Math.floor((width - toggleWidth - size + 6) / step) + 1));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [participantSummary, avatarSize, selectedMembers.length, canExpandParticipants, participantsExpanded, disabled]);
  const toggleSummary = () => {
    setParticipantsExpanded(value => !value);
    requestAnimationFrame(() => summaryRef.current?.querySelector<HTMLButtonElement>("[data-summary-toggle]")?.focus({ preventScroll: true }));
  };


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
        {member ? (stacked ? <div className={hideSelectedName ? "member-selector-person selected is-single" : "member-selector-inline-person"}>
          <PersonAvatar invitationStatus={showInvitationStatus ? invitationStatusById[member.id] ?? "accepted" : undefined} name={member.name} profile={member} profilePreviewFocusable={hideSelectedName && showTriggerProfilePreview} showProfilePreview={showTriggerProfilePreview} size={avatarSize} />
          {!hideSelectedName && <span className="member-selector-inline-name" title={mockPersonName(locale, member.id, member.name)}>{mockPersonName(locale, member.id, member.name)}</span>}
          {!disabled && selected.length > min && <button aria-label={`${d("remove")} ${label}: ${mockPersonName(locale, member.id, member.name)}`} className={hideSelectedName ? "member-selector-remove" : "member-selector-inline-remove"} onClick={() => onChange([])} type="button"><X aria-hidden="true" /></button>}
        </div> : <div className="member-selector-person selected is-single"><span><PersonAvatar invitationStatus={showInvitationStatus ? invitationStatusById[member.id] ?? "accepted" : undefined} name={member.name} profile={member} profilePreviewFocusable={false} showProfilePreview={showTriggerProfilePreview} size={avatarSize} />{selected.length > min && <button aria-label={`${d("remove")} ${label}: ${mockPersonName(locale, member.id, member.name)}`} className="member-selector-remove" disabled={disabled} onClick={() => onChange([])} type="button"><X aria-hidden="true" /></button>}</span>{!hideSelectedName && <strong><PersonName name={member.name} profile={member} /></strong>}</div>) : <PersonPicker allowInvitations={allowInvitations} allowUnassigned={allowUnassigned && min === 0} ariaLabel={`${d("add")} ${label}`} className={allowUnassigned ? "person-picker-trigger-unassigned" : undefined} disabled={disabled} hideSelectedName={hideSelectedName} memberRecommendations={memberRecommendations} members={members} menuLabel={`${d("select")} ${label}`} onChange={(id) => onChange(id ? [id] : [])} onInviteMembers={onInviteMembers} showTriggerProfilePreview={false} triggerVariant={allowUnassigned ? "member" : "add"} value="" />}
      </div>
    );
  }

  if (stacked) {
    return <div ref={summaryRef} className={`member-selector member-selector-stacked${participantSummary ? " member-selector-summary" : ""}`}>
      {!hideHeader && <div className="member-selector-label"><span>{label}</span></div>}
      {participantSummary && <div className="member-selector-summary-heading">
        <div className="member-selector-summary-title"><span>{label} ({selectedMembers.length})</span></div>
      </div>}


      {!(participantSummary && participantsExpanded) && <div className="member-selector-stacked-row" ref={stackedRowRef}>
        {participantSummary && <div className="member-selector-summary-avatars">{selectedMembers.slice(0, summaryVisibleCount).map(member => <PersonAvatar key={member.id} name={member.name} profile={member} size={avatarSize} />)}{canExpandParticipants && <button type="button" data-summary-toggle className="member-selector-expand-toggle member-selector-stack-expand" aria-label={locale === "en" ? `Show all ${selectedMembers.length} collaborators` : `展开全部 ${selectedMembers.length} 位参与者`} aria-expanded={false} onClick={toggleSummary}><ChevronDown aria-hidden="true" size={16} /></button>}</div>}
        {!(participantSummary && participantsExpanded) && !hideSelectedName && selectedMembers.map(member => <span className="member-selector-inline-person" key={member.id}><PersonAvatar invitationStatus={showInvitationStatus ? invitationStatusById[member.id] : undefined} name={member.name} profile={member} size={avatarSize} /><span className="member-selector-inline-name" title={mockPersonName(locale, member.id, member.name)}>{mockPersonName(locale, member.id, member.name)}</span>{!disabled && selected.length > min && <button className="member-selector-inline-remove" aria-label={`${d("remove")} ${label}: ${mockPersonName(locale, member.id, member.name)}`} onClick={() => toggle(member.id)} type="button"><X aria-hidden="true" /></button>}</span>)}
        {!participantSummary && hideSelectedName && selectedMembers.length > 0 && <PersonAvatarGroup invitationStatusById={showInvitationStatus ? invitationStatusById : {}} maxVisible={displayMax ?? 4} onRemove={disabled || selected.length <= min ? undefined : (id) => { if (selectedMembers.length === 1) stackedRowRef.current?.querySelector<HTMLButtonElement>(".person-picker-trigger")?.focus(); toggle(id); }} people={selectedMembers} removeLabel={label} showFullList={showFullList && !participantSummary} size={avatarSize} />}
        {!participantSummary && <PersonPicker allowInvitations={allowInvitations} allowUnassigned={allowUnassigned && min === 0} ariaLabel={`${d("add")} ${label}`} disabled={disabled} hideSelectedName max={max} memberRecommendations={memberRecommendations} members={members} menuLabel={`${d("select")} ${label}`} min={min} multiple onChange={onChange} onInviteMembers={onInviteMembers} triggerVariant="add" value={selected} />}
      </div>}
      {participantSummary && participantsExpanded && <ul className="member-selector-inline-list" aria-label={label}>
        {selectedMembers.map(member => <li key={member.id}>
          <PersonAvatar name={member.name} profile={member} size="sm" />
          <div className="member-selector-list-identity" title={`${mockPersonName(locale, member.id, member.name)}${member.role ? ` · ${member.role}` : ""}`}><PersonName name={member.name} profile={member} showProfilePreview={false} /><span title={member.role}>{member.role}</span></div>
          {!disabled && selected.length > min && <button type="button" className="member-selector-list-remove" aria-label={`${d("remove")} ${label}: ${mockPersonName(locale, member.id, member.name)}`} onClick={() => toggle(member.id)}><X aria-hidden="true" size={14} /></button>}
        </li>)}
        {!selectedMembers.length && <li className="member-selector-list-empty">{locale === "en" ? "No collaborators" : "暂无参与者"}</li>}
      </ul>}
      {participantSummary && participantsExpanded && <div className="member-selector-list-footer"><button type="button" data-summary-toggle className="member-selector-expand-toggle member-selector-collapse-list" aria-label={locale === "en" ? "Collapse collaborators" : "收起参与者列表"} aria-expanded={true} onClick={toggleSummary}><ChevronUp aria-hidden="true" size={16} /><span>{locale === "en" ? "Collapse" : "收起"}</span></button></div>}
      {participantSummary && !disabled && <PersonPicker allowInvitations={allowInvitations} allowUnassigned={allowUnassigned && min === 0} ariaLabel={`${d("add")} ${label}`} className="member-selector-summary-add" triggerIcon={<Plus aria-hidden="true" size={16} />} hideSelectedName max={max} memberRecommendations={memberRecommendations} members={members} menuLabel={`${d("select")} ${label}`} min={min} multiple onChange={onChange} onInviteMembers={onInviteMembers} triggerVariant="add" value={selected} />}
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
