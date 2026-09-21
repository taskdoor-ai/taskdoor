import { useI18n } from "../i18n/I18nProvider";
import { mockPersonName } from "../i18n/mockContent";
import { useDetailCopy } from "../i18n/detailMessages";
import { X } from "lucide-react";
import type { TaskMemberRecommendations } from "../lib/taskMemberRecommendations";
import { PersonAvatar, PersonAvatarGroup, PersonName, PersonOverflowList, type PersonInvitationStatus } from "./PersonAvatar";
import { PersonPicker, type PersonOption } from "./PersonPicker";

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
  showInvitationStatus?: boolean;
  showTriggerProfilePreview?: boolean;
  stacked?: boolean;
};

// Adapted from 21st.dev Member Selector #9908 by osiris-balonga.
// Preserves selected-first avatars, add/search, check state and click-away behavior.
export function MemberSelector({ avatarSize = "md", allowInvitations = true, allowUnassigned = true, disabled = false, displayMax, hideHeader = false, hideSelectedName = false, invitationStatusById = {}, label, max, memberRecommendations, members, min = 0, onChange, onInviteMembers, selected, showInvitationStatus = true, showTriggerProfilePreview = true, stacked = false }: MemberSelectorProps) {
  const d = useDetailCopy();
  const { locale } = useI18n();
  const selectedMembers = members.filter((member) => selected.includes(member.id));
  const visibleSelectedMembers = displayMax ? selectedMembers.slice(0, displayMax) : selectedMembers;
  const hiddenSelectedCount = selectedMembers.length - visibleSelectedMembers.length;

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
        {member ? <div className="member-selector-person selected is-single">
          <span><PersonAvatar invitationStatus={showInvitationStatus ? invitationStatusById[member.id] ?? "accepted" : undefined} name={member.name} profile={member} profilePreviewFocusable={false} showProfilePreview={showTriggerProfilePreview} size={avatarSize} />{selected.length > min && <button aria-label={`${d("remove")} ${label}: ${mockPersonName(locale, member.id, member.name)}`} className="member-selector-remove" disabled={disabled} onClick={() => onChange([])} type="button"><X aria-hidden="true" /></button>}</span>
          {!hideSelectedName && <strong><PersonName name={member.name} profile={member} /></strong>}
        </div> : <PersonPicker allowInvitations={allowInvitations} allowUnassigned={allowUnassigned && min === 0} ariaLabel={`${d("add")} ${label}`} className={allowUnassigned ? "person-picker-trigger-unassigned" : undefined} disabled={disabled} hideSelectedName={hideSelectedName} memberRecommendations={memberRecommendations} members={members} menuLabel={`${d("select")} ${label}`} onChange={(id) => onChange(id ? [id] : [])} onInviteMembers={onInviteMembers} showTriggerProfilePreview={false} triggerVariant={allowUnassigned ? "member" : "add"} value="" />}
      </div>
    );
  }

  if (stacked) {
    return <div className="member-selector member-selector-stacked">
      {!hideHeader && <div className="member-selector-label"><span>{label}</span></div>}
      <div className="member-selector-stacked-row">
        {selectedMembers.length > 0 && <PersonAvatarGroup invitationStatusById={showInvitationStatus ? invitationStatusById : {}} maxVisible={displayMax ?? 4} onRemove={disabled || selected.length <= min ? undefined : toggle} people={selectedMembers} removeLabel={label} size={avatarSize} />}
        <PersonPicker allowInvitations={allowInvitations} allowUnassigned={allowUnassigned && min === 0} ariaLabel={`${d("add")} ${label}`} disabled={disabled} hideSelectedName={hideSelectedName} max={max} memberRecommendations={memberRecommendations} members={members} menuLabel={`${d("select")} ${label}`} min={min} multiple onChange={onChange} onInviteMembers={onInviteMembers} triggerVariant="add" value={selected} />
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
