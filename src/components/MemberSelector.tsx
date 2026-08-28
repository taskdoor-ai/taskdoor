import { PersonAvatar, type PersonInvitationStatus } from "./PersonAvatar";
import { PersonPicker, type PersonOption } from "./PersonPicker";

export type Member = PersonOption;

type MemberSelectorProps = {
  disabled?: boolean;
  invitationStatusById?: Record<string, PersonInvitationStatus>;
  hideHeader?: boolean;
  label: string;
  max?: number;
  members: Member[];
  min?: number;
  onChange: (selected: string[]) => void;
  selected: string[];
};

// Adapted from 21st.dev Member Selector #9908 by osiris-balonga.
// Preserves selected-first avatars, add/search, check state and click-away behavior.
export function MemberSelector({ disabled = false, hideHeader = false, invitationStatusById = {}, label, max, members, min = 0, onChange, selected }: MemberSelectorProps) {
  const selectedMembers = members.filter((member) => selected.includes(member.id));

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      if (selected.length <= min) return;
      onChange(selected.filter((memberId) => memberId !== id));
      return;
    }
    if (max && selected.length >= max) return;
    onChange([...selected, id]);
  };

  if (min === 1 && max === 1) {
    return (
      <div className="member-selector member-selector-single">
        {!hideHeader && <div className="member-selector-label"><span>{label}</span></div>}
        <PersonPicker ariaLabel={`更换${label}，${invitationStatusById[selected[0]] === "pending" ? "等待接受邀请" : "邀请已接受"}`} disabled={disabled} invitationStatus={invitationStatusById[selected[0]]} members={members} menuLabel={`选择${label}`} onChange={(id) => onChange([id])} triggerVariant="member" value={selected[0] ?? ""} />
      </div>
    );
  }

  return (
    <div className="member-selector">
      {!hideHeader && <div className="member-selector-label"><span>{label}</span></div>}
      <div className="member-selector-row">
        {selectedMembers.map((member) => (
          <button aria-label={`移除 ${member.name}，${invitationStatusById[member.id] === "pending" ? "等待接受邀请" : "邀请已接受"}`} className="member-selector-person selected" disabled={disabled} key={member.id} onClick={() => toggle(member.id)} type="button">
            <span><PersonAvatar invitationStatus={invitationStatusById[member.id] ?? "accepted"} name={member.name} size="md" /><b aria-hidden="true" className="member-selector-remove-overlay">移除</b></span>
            <strong>{member.name}</strong>
          </button>
        ))}
        <PersonPicker ariaLabel={`添加${label}`} disabled={disabled} max={max} members={members} menuLabel={`选择${label}`} min={min} multiple onChange={onChange} triggerVariant="add" value={selected} />
      </div>
    </div>
  );
}
