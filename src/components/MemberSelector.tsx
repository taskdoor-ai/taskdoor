import { Check, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PersonAvatar } from "./PersonAvatar";
import { CheckboxIndicator } from "./ui/Checkbox";

export type Member = {
  availability?: string;
  currentWork?: string[];
  dynamicResponsibility?: string;
  email: string;
  id: string;
  name: string;
  recentActivity?: string;
  role: string;
};

type MemberSelectorProps = {
  hideHeader?: boolean;
  label: string;
  max?: number;
  members: Member[];
  onChange: (selected: string[]) => void;
  selected: string[];
};

// Adapted from 21st.dev Member Selector #9908 by osiris-balonga.
// Preserves selected-first avatars, add/search, check state and click-away behavior.
export function MemberSelector({ hideHeader = false, label, max, members, onChange, selected }: MemberSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedMembers = members.filter((member) => selected.includes(member.id));
  const filteredMembers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return [...members]
      .filter((member) => !keyword || member.name.toLowerCase().includes(keyword) || member.email.toLowerCase().includes(keyword))
      .sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)));
  }, [members, query, selected]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((memberId) => memberId !== id));
      return;
    }
    if (max && selected.length >= max) {
      onChange(max === 1 ? [id] : selected);
      return;
    }
    onChange([...selected, id]);
  };

  return (
    <div className={`member-selector ${open ? "open" : ""}`} ref={rootRef}>
      {!hideHeader && <div className="member-selector-label"><span>{label}</span></div>}
      <div className="member-selector-row">
        {selectedMembers.map((member) => (
          <button aria-label={`移除 ${member.name}`} className="member-selector-person selected" key={member.id} onClick={() => toggle(member.id)} type="button">
            <span><PersonAvatar name={member.name} size="md" /><i><Check size={9} /></i><b aria-hidden="true" className="member-selector-remove-overlay">移除</b></span>
            <strong>{member.name}</strong>
          </button>
        ))}
        {(max !== 1 || selected.length === 0) && <button aria-expanded={open} aria-label={open ? "关闭成员选择" : `添加${label}`} className="member-selector-add" onClick={() => setOpen((value) => !value)} type="button">
          <span>{open ? <X size={16} /> : <Plus size={16} />}</span><strong>{open ? "收起" : "添加"}</strong>
        </button>}
      </div>

      {open && (
        <div className="member-selector-dropdown">
          <label><Search size={14} /><input autoFocus onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名或邮箱" value={query} /></label>
          <div className="member-selector-options">
            {filteredMembers.map((member) => {
              const isSelected = selected.includes(member.id);
              const isDisabled = Boolean(!isSelected && max && max > 1 && selected.length >= max);
              return (
                <button className={isSelected ? "selected" : ""} disabled={isDisabled} key={member.id} onClick={() => toggle(member.id)} type="button">
                  <PersonAvatar name={member.name} size="sm" />
                  <span><strong>{member.name}</strong><small>{member.role} · {member.availability ?? member.email}</small></span>
                  <CheckboxIndicator checked={isSelected} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
